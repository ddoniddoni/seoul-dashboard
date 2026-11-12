-- 20곳 수집의 중복 방지 슬롯을 5분으로 변경한다. 예약 작업은 활성화하지 않는다.
-- 적용 시 COLLECTION_INTERVAL_MINUTES=5 및 기존 Cron 주기 변경도 함께 반영한다.
begin;
create or replace function public.acquire_collection_run(p_max_areas integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare l private.collection_leases; r private.collection_runs; t timestamptz; bucket timestamptz; codes text[];
  token uuid; reason text;
begin
  if p_max_areas is null or p_max_areas not between 1 and 20 then raise exception 'INVALID_CONFIG'; end if;
  select * into l from private.collection_leases where job_name='seoul-citydata-v1' for update;
  t := pg_catalog.clock_timestamp(); bucket := pg_catalog.date_bin(interval '5 minutes',t,'2020-01-01T00:00:00Z'::timestamptz);
  select * into r from private.collection_runs where job_name='seoul-citydata-v1' and bucket_start=bucket;
  if r.id is not null then
    return pg_catalog.jsonb_build_object('state','duplicate','runId',r.id,'bucketStart',r.bucket_start,'previousStatus',r.status);
  end if;
  if l.lease_token is not null and l.expires_at > t then reason := 'locked'; else
    if l.run_id is not null then
      update private.collection_runs set status='error',finished_at=t,error_code='LEASE_EXPIRED'
        where id=l.run_id and status='running';
    end if;
    select coalesce(pg_catalog.array_agg(a.code order by latest.last_attempt_at asc nulls first, a.code),'{}'::text[]) into codes
      from public.areas a left join public.area_latest latest on latest.area_code=a.code
      where a.is_public and a.collection_enabled;
    if pg_catalog.cardinality(codes) = 0 then reason := 'no-active-areas';
    elsif pg_catalog.cardinality(codes) > p_max_areas then reason := 'area-limit'; end if;
  end if;
  if reason is not null then
    insert into private.collection_runs(job_name,bucket_start,status,started_at,deadline_at,finished_at,error_code)
      values('seoul-citydata-v1',bucket,case when reason='area-limit' then 'error' else 'skipped' end,t,t,t,
        case reason when 'locked' then 'LEASE_BUSY' when 'area-limit' then 'AREA_LIMIT' else 'NO_ACTIVE_AREAS' end) returning * into r;
    return pg_catalog.jsonb_build_object('state',reason,'runId',r.id,'bucketStart',bucket);
  end if;
  token := pg_catalog.gen_random_uuid();
  insert into private.collection_runs(job_name,bucket_start,status,lease_token,started_at,deadline_at,area_codes)
    values('seoul-citydata-v1',bucket,'running',token,t,t+interval '50 seconds',codes) returning * into r;
  update private.collection_leases set lease_token=token,run_id=r.id,expires_at=t+interval '120 seconds'
    where job_name='seoul-citydata-v1';
  return pg_catalog.jsonb_build_object('state','acquired','runId',r.id,'bucketStart',bucket,'leaseToken',token,
    'serverNow',t,'deadlineAt',r.deadline_at,'areaCodes',codes);
end $fn$;
revoke execute on function public.acquire_collection_run(integer) from public,anon,authenticated;
grant execute on function public.acquire_collection_run(integer) to service_role;
commit;
