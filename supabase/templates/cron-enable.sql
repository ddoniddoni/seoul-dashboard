-- 운영자가 전송/한도/DB 권한과 별도 활성화를 승인한 뒤에만 실행할 템플릿이다.
-- 이번 개발에서 실행하지 않았다. pg_cron, pg_net와 Vault는 미리 설정되어 있어야 한다.
begin;
do $guard$
declare origin text; secret text;
begin
  select decrypted_secret into origin from vault.decrypted_secrets where name='seoul_pulse_origin';
  select decrypted_secret into secret from vault.decrypted_secrets where name='seoul_pulse_collector_secret';
  if origin is null or origin !~ '^https://[A-Za-z0-9.-]+(:443)?$'
    or secret is null or secret !~ '^[A-Za-z0-9_-]{32,256}$' then raise exception 'COLLECTOR_VAULT_CONFIGURATION'; end if;
  if not exists(select 1 from public.sp_areas where collection_enabled and is_public) then raise exception 'NO_ACTIVE_AREAS'; end if;
  if exists(select 1 from cron.job where jobname='seoul-pulse-collect-v1') then raise exception 'EXISTING_JOB_REQUIRES_REVIEW'; end if;
end $guard$;
select cron.schedule('seoul-pulse-collect-v1','*/5 * * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='seoul_pulse_origin') || '/api/internal/collect',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='seoul_pulse_collector_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 55000
  );
$job$);
-- DB 이력 정리는 cleanup-cron-enable.sql로 별도 관리한다.
commit;
