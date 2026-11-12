-- 전용 로컬 테스트 DB 실행 대기. 원천 호출 없이 rollback한다.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(2);
update public.sp_areas set collection_enabled=(code='POI014');
create temporary table interval_test_run as select public.sp_acquire_collection_run(20) as payload;
select extensions.is((select payload->>'state' from interval_test_run),'acquired','수집 실행 획득');
select extensions.is(
  (select (payload->>'bucketStart')::timestamptz from interval_test_run),
  (select pg_catalog.date_bin(interval '5 minutes',(payload->>'serverNow')::timestamptz,'2020-01-01T00:00:00Z'::timestamptz) from interval_test_run),
  '중복 방지 슬롯은 DB 기준 5분');
select * from extensions.finish();
rollback;
