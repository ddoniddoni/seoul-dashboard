-- 사용자 실행 지시 후 전용 로컬 테스트 DB에서만 실행한다. 모든 합성 자료는 rollback한다.
-- sp_retain_population_history_48_hours migration까지 적용해야 한다.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);
select extensions.ok(not pg_catalog.has_function_privilege('anon','public.sp_cleanup_seoul_pulse()','EXECUTE'),'익명 정리 실행 거부');
select extensions.ok(not pg_catalog.has_function_privilege('authenticated','public.sp_cleanup_seoul_pulse()','EXECUTE'),'일반 사용자 정리 실행 거부');
select extensions.ok(pg_catalog.has_function_privilege('service_role','public.sp_cleanup_seoul_pulse()','EXECUTE'),'관리 역할 정리 실행 허용');
select extensions.lives_ok($test$
do $body$
declare
  t timestamptz := pg_catalog.clock_timestamp();
  latest_before jsonb;
  result jsonb;
begin
  delete from public.sp_population_observations where area_code in ('POI014','POI007');
  -- 수신 시각은 모두 지금이다. 보존은 수신 시각이 아닌 원천 관측 시각을 따른다.
  insert into public.sp_population_observations
    (area_code, observed_at, ppl_min, ppl_max, congestion, first_fetched_at, last_fetched_at, payload_hash)
  values
    ('POI014', t-interval '49 hours', 10, 20, 'normal', t, t, repeat('a',64)),
    ('POI014', t-interval '48 hours 1 minute', 10, 20, 'normal', t, t, repeat('b',64)),
    ('POI014', t-interval '47 hours 59 minutes', 10, 20, 'normal', t, t, repeat('c',64)),
    ('POI014', t-interval '1 hour', 10, 20, 'normal', t, t, repeat('d',64)),
    ('POI014', t-interval '30 hours', 10, 20, 'normal', t, t, repeat('f',64)),
    ('POI007', t-interval '50 hours', 10, 20, 'normal', t, t, repeat('e',64));

  insert into public.sp_area_latest(area_code, population)
  values ('POI007', pg_catalog.jsonb_build_object(
    'value', pg_catalog.jsonb_build_object('min',10,'max',20,'midpoint',15,'congestion','normal','message',null),
    'observedAt',t-interval '50 hours','fetchedAt',t,'lastResult','valid'))
  on conflict (area_code) do update set population=excluded.population;
  select pg_catalog.to_jsonb(a) into latest_before from public.sp_area_latest a where area_code='POI007';

  result := public.sp_cleanup_seoul_pulse();
  if (result->>'observations')::integer < 3 then raise exception '오래된 관측 미삭제'; end if;
  if (select count(*) from public.sp_population_observations where area_code='POI014') <> 3
    or exists(select 1 from public.sp_population_observations where area_code='POI007')
    or not exists(select 1 from public.sp_population_observations where area_code='POI014' and observed_at=t-interval '47 hours 59 minutes')
    or not exists(select 1 from public.sp_population_observations where area_code='POI014' and observed_at=t-interval '30 hours')
    then raise exception '48시간 경계 안팎의 이력 정리 실패'; end if;
  if (select pg_catalog.to_jsonb(a) from public.sp_area_latest a where area_code='POI007') is distinct from latest_before
    then raise exception '오래된 장소별 최신값 또는 시각 변경'; end if;
  result := public.sp_cleanup_seoul_pulse();
  if (result->>'observations')::integer <> 0 then raise exception '반복 정리에서 최근 이력 삭제'; end if;
end $body$;
$test$, '48시간 이력 정리, 24~48시간 자료와 마지막 현황 보존');
select * from extensions.finish();
rollback;
