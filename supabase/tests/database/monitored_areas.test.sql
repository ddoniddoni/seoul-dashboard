-- 전용 로컬 테스트 DB에서만 실행한다. 원천 호출 없이 rollback한다. 실행 대기.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);
update public.sp_areas set collection_enabled=true;
insert into public.sp_area_latest(area_code,last_attempt_at)
  values('POI014',pg_catalog.clock_timestamp())
  on conflict(area_code) do update set last_attempt_at=excluded.last_attempt_at;
create temporary table monitored_test_run as select public.sp_acquire_collection_run(20) as payload;
select extensions.is((select payload->>'state' from monitored_test_run),'acquired','20곳 수집 계약');
select extensions.is((select pg_catalog.jsonb_array_length(payload->'areaCodes') from monitored_test_run),20,'모든 모니터링 장소를 포함');
select extensions.is((select payload->'areaCodes'->>19 from monitored_test_run),'POI014','미시도 장소를 최근 시도보다 먼저 처리');
select extensions.lives_ok($test$
do $body$
declare payload jsonb; code text; attempt integer; result jsonb;
begin
  select r.payload into payload from monitored_test_run r;
  for code in select pg_catalog.jsonb_array_elements_text(payload->'areaCodes') loop
    for attempt in 1..2 loop
      result := public.sp_reserve_provider_attempt((payload->>'runId')::uuid,(payload->>'leaseToken')::uuid,code,attempt,6000);
      if not (result->>'allowed')::boolean then raise exception '예약 거부'; end if;
    end loop;
  end loop;
  if (select request_count from sp_private.sp_collection_runs where id=(payload->>'runId')::uuid) <> 40 then
    raise exception '20곳 각 1회 재시도 요청 상한 불일치';
  end if;
end $body$;
$test$,'20곳의 최초 시도와 재시도를 최대 40회까지 예약');
select * from extensions.finish();
rollback;
