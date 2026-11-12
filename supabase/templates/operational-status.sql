-- 운영자가 SQL Editor에서 실행하는 읽기 전용 점검. 모든 migration과 Cron 설치 후 사용한다.
-- 키, Vault 값, HTTP 요청/응답 본문과 Cron command를 출력하지 않는다.
begin transaction read only;

select version, name from supabase_migrations.schema_migrations where name like 'sp\_%' escape '\' order by version;
select count(*) filter (where is_public) as public_places,
  count(*) filter (where is_public and collection_enabled) as active_places
from public.sp_areas;

-- 공개 테이블은 RLS=true, anon/authenticated의 write=false여야 한다.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_read,
  has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE') as anon_write,
  has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE') as authenticated_write
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','sp_private') and c.relkind='r'
  and c.relname in ('sp_areas','sp_area_latest','sp_population_observations','sp_collection_runs','sp_collection_leases','sp_provider_budgets','sp_provider_attempts');

-- sp_read_population_history만 anon_execute=true, 모든 함수 security_definer=false여야 한다.
select p.proname, p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as collector_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('sp_read_population_history','sp_acquire_collection_run',
  'sp_reserve_provider_attempt','sp_commit_area_update','sp_record_provider_failure','sp_finish_collection_run','sp_cleanup_seoul_pulse');

select jobname, schedule, active from cron.job
where jobname in ('seoul-pulse-collect-v1','seoul-pulse-cleanup-v1');
-- Cron 성공은 HTTP 큐 등록일 수 있다. 아래 실제 수집 결과와 함께 확인한다.
select j.jobname, d.status, d.start_time, d.end_time
from cron.job_run_details d join cron.job j on j.jobid=d.jobid
where j.jobname in ('seoul-pulse-collect-v1','seoul-pulse-cleanup-v1')
order by d.start_time desc limit 12;
select started_at, finished_at, status, cardinality(area_codes) as places,
  success_count, partial_count, failure_count, skipped_count, error_code
from sp_private.sp_collection_runs order by started_at desc limit 12;

select a.code, a.official_name, l.population->>'observedAt' as source_at,
  l.population->>'fetchedAt' as received_at, l.last_attempt_at
from public.sp_areas a left join public.sp_area_latest l on l.area_code=a.code
where a.is_public order by a.code;
select count(*) as observations, min(observed_at) as oldest, max(observed_at) as newest,
  count(*) filter (where observed_at < now()-interval '49 hours') as overdue_cleanup
from public.sp_population_observations;
rollback;
