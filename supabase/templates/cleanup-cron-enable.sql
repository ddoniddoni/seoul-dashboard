-- 승인된 DB 이력 자동 정리만 활성화한다. 서울시 API/웹 서버/비밀키를 사용하지 않는다.
begin;
create extension if not exists pg_cron with schema pg_catalog;

do $guard$
begin
  if exists(select 1 from cron.job where jobname='seoul-pulse-cleanup-v1') then
    raise exception 'EXISTING_CLEANUP_JOB_REQUIRES_REVIEW';
  end if;
  if pg_catalog.strpos(pg_catalog.pg_get_functiondef('public.sp_cleanup_seoul_pulse()'::regprocedure),
    'interval ''48 hours''')=0 then raise exception 'RETENTION_MIGRATION_REQUIRED'; end if;
end $guard$;

-- 매시 23분: 관측 48시간, 완료 실행/요청 관리 기록 14일 보존.
select cron.schedule('seoul-pulse-cleanup-v1','23 * * * *',$job$
  begin;
  set local lock_timeout='5s';
  set local statement_timeout='30s';
  select public.sp_cleanup_seoul_pulse();
  delete from cron.job_run_details where end_time < now()-interval '14 days'
    and jobid in (select jobid from cron.job where jobname in ('seoul-pulse-collect-v1','seoul-pulse-cleanup-v1'));
  commit;
$job$);
commit;
