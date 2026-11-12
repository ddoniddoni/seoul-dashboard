-- 승인된 전용 로컬 테스트 DB에서만 실행한다. 합성 관측은 rollback되며 원천 호출은 없다.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);
select extensions.is((select count(*) from public.sp_areas),20::bigint,'공식 모니터링 카탈로그 20곳');
select extensions.ok(not exists(select 1 from public.sp_areas where collection_enabled),'수집 기본 비활성');
select extensions.ok((select count(*)=7 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where c.relrowsecurity and ((n.nspname='public' and c.relname in ('sp_areas','sp_area_latest','sp_population_observations'))
    or (n.nspname='sp_private' and c.relname in ('sp_collection_runs','sp_collection_leases','sp_provider_budgets','sp_provider_attempts')))),'모든 앱 테이블 RLS');
select extensions.ok(pg_catalog.has_table_privilege('anon','public.sp_areas','SELECT'),'익명 공개 읽기');
select extensions.ok(not pg_catalog.has_table_privilege('anon','public.sp_area_latest','INSERT'),'익명 최신값 쓰기 거부');
select extensions.ok(not pg_catalog.has_table_privilege('authenticated','public.sp_population_observations','UPDATE'),'authenticated 수정 거부');
select extensions.ok(not pg_catalog.has_schema_privilege('anon','sp_private','USAGE'),'sp_private 스키마 접근 거부');
select extensions.ok(not pg_catalog.has_function_privilege('anon','public.sp_acquire_collection_run(integer)','EXECUTE'),'관리 RPC 익명 실행 거부');
select extensions.ok(pg_catalog.has_function_privilege('service_role','public.sp_commit_area_update(uuid,uuid,text,timestamptz,jsonb,jsonb)','EXECUTE'),'관리 역할 저장 RPC 실행');
select extensions.ok(pg_catalog.has_function_privilege('anon','public.sp_read_population_history(text[],timestamptz,timestamptz)','EXECUTE'),'읽기 RPC 익명 실행');
select extensions.ok(not sp_private.sp_section_valid('{"value":{"min":20,"max":10,"midpoint":15,"congestion":"normal","message":null},"observedAt":"2026-10-14T08:00:00Z","fetchedAt":"2026-10-14T08:01:00Z","lastResult":"valid"}','population'),'역전 범위 CHECK');
select extensions.lives_ok($test$
do $body$
declare r jsonb; first_pop jsonb; changed jsonb; old_pop jsonb; empty_section jsonb; weather_section jsonb; atomic_pop jsonb;
  t timestamptz; atomic_t timestamptz; observed timestamptz; run_id uuid; token uuid; latest public.sp_area_latest;
begin
  update public.sp_areas set collection_enabled=true where code='POI014';
  r := public.sp_acquire_collection_run(5);
  if r->>'state'<>'acquired' then raise exception '전용 빈 DB의 새 슬롯 필요'; end if;
  run_id := (r->>'runId')::uuid; token := (r->>'leaseToken')::uuid;
  if public.sp_acquire_collection_run(5)->>'state'<>'duplicate' then raise exception '중복 슬롯 차단 실패'; end if;
  if not (public.sp_reserve_provider_attempt(run_id,token,'POI014',1,1000)->>'allowed')::boolean then raise exception '예약 실패'; end if;
  t := pg_catalog.clock_timestamp(); observed := t-interval '5 minutes';
  empty_section := '{"value":null,"observedAt":null,"fetchedAt":null,"lastResult":"not-provided"}';
  first_pop := pg_catalog.jsonb_build_object('value',pg_catalog.jsonb_build_object('min',10,'max',20,'midpoint',15,'congestion','normal','message',null),
    'observedAt',observed,'fetchedAt',t,'lastResult','valid');
  perform public.sp_commit_area_update(run_id,token,'POI014',t,first_pop,empty_section);
  first_pop := pg_catalog.jsonb_set(first_pop,'{fetchedAt}',pg_catalog.to_jsonb(t+interval '1 second'));
  perform public.sp_commit_area_update(run_id,token,'POI014',t+interval '1 second',first_pop,empty_section);
  if (select count(*) from public.sp_population_observations where area_code='POI014')<>1
    or (select revision from public.sp_population_observations where area_code='POI014' and observed_at=observed)<>1 then raise exception '재수신 중복 생성'; end if;
  changed := pg_catalog.jsonb_set(first_pop,'{value}',pg_catalog.jsonb_build_object('min',12,'max',22,'midpoint',17,'congestion','busy','message',null));
  changed := pg_catalog.jsonb_set(changed,'{fetchedAt}',pg_catalog.to_jsonb(t+interval '2 seconds'));
  perform public.sp_commit_area_update(run_id,token,'POI014',t+interval '2 seconds',changed,empty_section);
  if (select revision from public.sp_population_observations where area_code='POI014' and observed_at=observed)<>2 then raise exception '동일 시각 수정 revision 실패'; end if;
  old_pop := pg_catalog.jsonb_set(first_pop,'{observedAt}',pg_catalog.to_jsonb(observed-interval '10 minutes'));
  old_pop := pg_catalog.jsonb_set(old_pop,'{fetchedAt}',pg_catalog.to_jsonb(t+interval '3 seconds'));
  perform public.sp_commit_area_update(run_id,token,'POI014',t+interval '3 seconds',old_pop,empty_section);
  select * into latest from public.sp_area_latest where area_code='POI014';
  if latest.population->'value'->>'min'<>'12' or (latest.population->>'observedAt')::timestamptz<>observed
    or (latest.population->>'fetchedAt')::timestamptz<>t+interval '2 seconds' then raise exception '과거 응답으로 최신값 회귀'; end if;
  perform public.sp_commit_area_update(run_id,token,'POI014',t+interval '4 seconds',pg_catalog.jsonb_set(empty_section,'{lastResult}','"fetch-failed"'),empty_section);
  if (select population->'value'->>'min' from public.sp_area_latest where area_code='POI014')<>'12' then raise exception '실패가 직전 정상값 삭제'; end if;
  weather_section := pg_catalog.jsonb_build_object('value',pg_catalog.jsonb_build_object('temperatureC',-3.5,'humidityPct',50,'pm25MicrogramsPerM3',null),
    'observedAt',t-interval '1 minute','fetchedAt',t+interval '5 seconds','lastResult','valid');
  perform public.sp_commit_area_update(run_id,token,'POI014',t+interval '5 seconds',empty_section,weather_section);
  select * into latest from public.sp_area_latest where area_code='POI014';
  if latest.population->'value'->>'min'<>'12' or latest.weather->'value'->>'temperatureC'<>'-3.5'
    or (latest.population->>'observedAt')::timestamptz<>observed then raise exception '날씨 독립 갱신 실패'; end if;
  if (public.sp_commit_area_update(run_id,token,'POI014',t+interval '3 seconds',old_pop,empty_section)->>'stored')::boolean
    then raise exception '과거 시도 저장 허용'; end if;
  -- 인구 이력 insert 후 날씨 검증이 실패하면 두 테이블의 변경이 함께 rollback되어야 한다.
  atomic_t := greatest(pg_catalog.clock_timestamp()+interval '1 second',t+interval '6 seconds');
  atomic_pop := pg_catalog.jsonb_set(first_pop,'{observedAt}',pg_catalog.to_jsonb(observed+interval '1 minute'));
  atomic_pop := pg_catalog.jsonb_set(atomic_pop,'{fetchedAt}',pg_catalog.to_jsonb(atomic_t));
  weather_section := pg_catalog.jsonb_set(weather_section,'{fetchedAt}',pg_catalog.to_jsonb(atomic_t));
  weather_section := pg_catalog.jsonb_set(weather_section,'{observedAt}',pg_catalog.to_jsonb(atomic_t+interval '5 minutes'));
  begin
    perform public.sp_commit_area_update(run_id,token,'POI014',atomic_t,atomic_pop,weather_section);
    raise exception '잘못된 날씨 미래 시각 허용';
  exception when sqlstate 'P0001' then if sqlerrm<>'INVALID_OBSERVATION' then raise; end if; end;
  select * into latest from public.sp_area_latest where area_code='POI014';
  if (select count(*) from public.sp_population_observations where area_code='POI014')<>2
    or latest.population->'value'->>'min'<>'12' or latest.last_attempt_at<>t+interval '5 seconds'
    then raise exception '장소 저장 트랜잭션의 부분 반영'; end if;
  begin
    perform public.sp_commit_area_update(run_id,pg_catalog.gen_random_uuid(),'POI014',t,first_pop,empty_section);
    raise exception '잘못된 lease 토큰 허용';
  exception when sqlstate 'P0001' then if sqlerrm<>'LEASE_LOST' then raise; end if; end;
  perform public.sp_finish_collection_run(run_id,token,'success',1,0,0,0,0,null);
end $body$;
$test$,'중복/수정/과거/실패/날씨/lease를 원자적으로 처리');
select * from extensions.finish();
rollback;
