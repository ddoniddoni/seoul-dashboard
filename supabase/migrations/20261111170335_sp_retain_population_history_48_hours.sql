-- 원천 관측 시각 기준 48시간 보존. 화면 조회는 기존 24시간을 유지한다.
-- 최신 현황과 수집 관리 기록의 기존 14일 보존/예외 처리는 변경하지 않는다.
begin;
create or replace function public.sp_cleanup_seoul_pulse()
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare observations_deleted integer; runs_deleted integer; budgets_deleted integer; t timestamptz;
begin
  -- 수집과 같은 lease row를 잠가 정리/교체의 경합을 직렬화한다. 외부 호출은 없다.
  perform 1 from sp_private.sp_collection_leases where job_name='seoul-citydata-v1' for update;
  t := pg_catalog.clock_timestamp();
  delete from public.sp_population_observations where observed_at<t-interval '48 hours';
  get diagnostics observations_deleted = row_count;
  delete from sp_private.sp_collection_runs where started_at<t-interval '14 days'
    and status<>'running' and id not in(select run_id from sp_private.sp_collection_leases where run_id is not null);
  get diagnostics runs_deleted = row_count;
  delete from sp_private.sp_provider_budgets where budget_window_start<t-interval '14 days'
    and (circuit_open_until is null or circuit_open_until<=t);
  get diagnostics budgets_deleted = row_count;
  return pg_catalog.jsonb_build_object('observations',observations_deleted,'runs',runs_deleted,'budgets',budgets_deleted);
end $fn$;
revoke execute on function public.sp_cleanup_seoul_pulse() from public, anon, authenticated;
grant execute on function public.sp_cleanup_seoul_pulse() to service_role;
commit;
