-- 인구 이력은 최근 24시간만 보관하고 area_latest는 별도로 유지한다.
-- 함수 정의만 교체하며 자료 삭제나 예약 활성화를 실행하지 않는다.
begin;

create or replace function public.cleanup_seoul_pulse()
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare observations_deleted integer; runs_deleted integer; budgets_deleted integer; t timestamptz;
begin
  -- 수집과 같은 lease row를 잠가 정리/교체의 경합을 직렬화한다. 외부 호출은 없다.
  perform 1 from private.collection_leases where job_name='seoul-citydata-v1' for update;
  t := pg_catalog.clock_timestamp();
  delete from public.population_observations where observed_at<t-interval '24 hours';
  get diagnostics observations_deleted = row_count;
  delete from private.collection_runs where started_at<t-interval '14 days'
    and status<>'running' and id not in(select run_id from private.collection_leases where run_id is not null);
  get diagnostics runs_deleted = row_count;
  delete from private.provider_budgets where budget_window_start<t-interval '14 days'
    and (circuit_open_until is null or circuit_open_until<=t);
  get diagnostics budgets_deleted = row_count;
  return pg_catalog.jsonb_build_object('observations',observations_deleted,'runs',runs_deleted,'budgets',budgets_deleted);
end $fn$;

revoke execute on function public.cleanup_seoul_pulse() from public, anon, authenticated;
grant execute on function public.cleanup_seoul_pulse() to service_role;

commit;
