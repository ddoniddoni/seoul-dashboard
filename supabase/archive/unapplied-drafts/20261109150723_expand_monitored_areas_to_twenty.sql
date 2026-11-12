-- 공식 카탈로그에서 선택한 20곳으로 확장한다. 신규 장소 수집은 비활성 상태다.
-- 원격 적용, 수집 활성화 및 환경 변수 변경은 별도 운영 절차다.
begin;
alter table private.collection_runs drop constraint collection_runs_area_codes_check,
  add constraint collection_runs_area_codes_check check (pg_catalog.cardinality(area_codes) <= 20),
  drop constraint collection_runs_request_count_check,
  add constraint collection_runs_request_count_check check (request_count between 0 and 40);
alter table private.provider_budgets drop constraint provider_budgets_daily_limit_check,
  add constraint provider_budgets_daily_limit_check check (daily_limit between 1 and 6000),
  drop constraint provider_budgets_attempt_count_check,
  add constraint provider_budgets_attempt_count_check check (attempt_count between 0 and 6000);

insert into public.areas(code,official_name,category,catalog_version) values
('POI014','강남역','인구밀집지역','2026-04-02'),
('POI007','홍대 관광특구','관광특구','2026-04-02'),
('POI003','명동 관광특구','관광특구','2026-04-02'),
('POI072','여의도','발달상권','2026-04-02'),
('POI068','성수카페거리','발달상권','2026-04-02'),
('POI002','동대문 관광특구','관광특구','2026-04-02'),
('POI005','잠실 관광특구','관광특구','2026-04-02'),
('POI008','경복궁','고궁·문화유산','2026-04-02'),
('POI009','광화문·덕수궁','고궁·문화유산','2026-04-02'),
('POI015','건대입구역','인구밀집지역','2026-04-02'),
('POI033','서울역','인구밀집지역','2026-04-02'),
('POI046','용산역','인구밀집지역','2026-04-02'),
('POI053','합정역','인구밀집지역','2026-04-02'),
('POI054','혜화역','인구밀집지역','2026-04-02'),
('POI060','광장(전통)시장','발달상권','2026-04-02'),
('POI073','연남동','발달상권','2026-04-02'),
('POI083','DDP(동대문디자인플라자)','발달상권','2026-04-02'),
('POI091','남산공원','공원','2026-04-02'),
('POI101','서울숲공원','공원','2026-04-02'),
('POI105','여의도한강공원','공원','2026-04-02')
on conflict (code) do nothing;

-- 작업 기한으로 빠진 장소가 다음 실행에서도 뒤로 밀리지 않도록 오래된 시도부터 처리한다.
create or replace function public.acquire_collection_run(p_max_areas integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare l private.collection_leases; r private.collection_runs; t timestamptz; bucket timestamptz; codes text[];
  token uuid; reason text;
begin
  if p_max_areas is null or p_max_areas not between 1 and 20 then raise exception 'INVALID_CONFIG'; end if;
  select * into l from private.collection_leases where job_name='seoul-citydata-v1' for update;
  t := pg_catalog.clock_timestamp(); bucket := pg_catalog.date_bin(interval '10 minutes',t,'2020-01-01T00:00:00Z'::timestamptz);
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

create or replace function public.reserve_provider_attempt(p_run_id uuid,p_lease_token uuid,p_area_code text,p_attempt integer,p_daily_limit integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare r private.collection_runs; t timestamptz; day_start timestamptz; b private.provider_budgets; blocked timestamptz;
begin
  r := private.lock_run(p_run_id,p_lease_token);
  t := pg_catalog.clock_timestamp();
  if p_daily_limit is null or p_daily_limit not between 1 and 6000 or p_attempt is null or p_attempt not between 1 and 2
    or p_area_code is null or not p_area_code = any(r.area_codes) then raise exception 'INVALID_ATTEMPT'; end if;
  if r.deadline_at < t + interval '8 seconds' then return pg_catalog.jsonb_build_object('allowed',false,'reason','deadline'); end if;
  if exists(select 1 from private.provider_attempts where run_id=p_run_id and area_code=p_area_code and attempt_no=p_attempt)
    then return pg_catalog.jsonb_build_object('allowed',false,'reason','duplicate-attempt'); end if;
  if p_attempt=2 and not exists(select 1 from private.provider_attempts where run_id=p_run_id and area_code=p_area_code and attempt_no=1)
    then raise exception 'INVALID_ATTEMPT'; end if;
  select max(circuit_open_until) into blocked from private.provider_budgets where provider='seoul-citydata' and circuit_open_until>t;
  if blocked is not null then return pg_catalog.jsonb_build_object('allowed',false,'reason','circuit'); end if;
  day_start := pg_catalog.date_trunc('day',t at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  insert into private.provider_budgets(provider,budget_window_start,daily_limit)
    values('seoul-citydata',day_start,p_daily_limit) on conflict(provider,budget_window_start) do nothing;
  select * into b from private.provider_budgets where provider='seoul-citydata' and budget_window_start=day_start for update;
  update private.provider_budgets set daily_limit=least(daily_limit,p_daily_limit)
    where provider='seoul-citydata' and budget_window_start=day_start returning * into b;
  if b.attempt_count >= b.daily_limit then return pg_catalog.jsonb_build_object('allowed',false,'reason','budget'); end if;
  insert into private.provider_attempts(run_id,area_code,attempt_no,reserved_at) values(p_run_id,p_area_code,p_attempt,t);
  update private.provider_budgets set attempt_count=attempt_count+1 where provider='seoul-citydata' and budget_window_start=day_start;
  update private.collection_runs set request_count=request_count+1 where id=p_run_id;
  return pg_catalog.jsonb_build_object('allowed',true,'reason',null);
end $fn$;
revoke execute on function public.acquire_collection_run(integer),
  public.reserve_provider_attempt(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.acquire_collection_run(integer),
  public.reserve_provider_attempt(uuid,uuid,text,integer,integer) to service_role;
commit;
