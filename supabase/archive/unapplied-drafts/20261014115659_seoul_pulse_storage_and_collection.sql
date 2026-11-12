-- M3 로컬 migration 초안. 이번 작업에서 DB에 적용하지 않았다.
-- private 스키마를 Data API의 exposed schemas에 추가하지 않는다.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create function private.number_valid(p jsonb, integer_only boolean, minimum numeric, maximum numeric)
returns boolean language plpgsql immutable security invoker set search_path = '' as $fn$
declare n numeric;
begin
  if pg_catalog.jsonb_typeof(p) is distinct from 'number' then return false; end if;
  n := p::text::numeric;
  return (not integer_only or n = pg_catalog.trunc(n))
    and (minimum is null or n >= minimum) and (maximum is null or n <= maximum);
exception when others then return false;
end $fn$;

create function private.section_valid(p jsonb, kind text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $fn$
declare v jsonb; observed timestamptz; fetched timestamptz;
begin
  if p is null or pg_catalog.jsonb_typeof(p) <> 'object' or kind not in ('population','weather') then return false; end if;
  if not p ?& array['value','observedAt','fetchedAt','lastResult']
    or p - array['value','observedAt','fetchedAt','lastResult'] <> '{}'::jsonb
    or not coalesce(p->>'lastResult' in ('valid','not-provided','invalid','fetch-failed'),false) then return false; end if;
  v := p->'value';
  if v = 'null'::jsonb then
    return p->'observedAt' = 'null'::jsonb and p->'fetchedAt' = 'null'::jsonb and p->>'lastResult' <> 'valid';
  end if;
  if pg_catalog.jsonb_typeof(v) <> 'object'
    or not coalesce(p->>'observedAt' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$',false)
    or not coalesce(p->>'fetchedAt' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$',false) then return false; end if;
  observed := (p->>'observedAt')::timestamptz; fetched := (p->>'fetchedAt')::timestamptz;
  if not pg_catalog.isfinite(observed) or not pg_catalog.isfinite(fetched)
    or observed > fetched + interval '5 minutes' then return false; end if;
  if kind = 'population' then
    return coalesce(v ?& array['min','max','midpoint','congestion','message']
      and v - array['min','max','midpoint','congestion','message'] = '{}'::jsonb
      and private.number_valid(v->'min',true,0,9007199254740991)
      and private.number_valid(v->'max',true,0,9007199254740991)
      and (v->>'min')::numeric <= (v->>'max')::numeric
      and private.number_valid(v->'midpoint',false,0,9007199254740991)
      and (v->>'midpoint')::numeric = ((v->>'min')::numeric + (v->>'max')::numeric)/2
      and v->>'congestion' in ('relaxed','normal','slightly-busy','busy','unknown')
      and (v->'message' = 'null'::jsonb or pg_catalog.jsonb_typeof(v->'message') = 'string' and pg_catalog.length(v->>'message') <= 1024),false);
  end if;
  return coalesce(v ?& array['temperatureC','humidityPct','pm25MicrogramsPerM3']
    and v - array['temperatureC','humidityPct','pm25MicrogramsPerM3'] = '{}'::jsonb
    and (v->'temperatureC' = 'null'::jsonb or private.number_valid(v->'temperatureC',false,null,null))
    and (v->'humidityPct' = 'null'::jsonb or private.number_valid(v->'humidityPct',false,0,100))
    and (v->'pm25MicrogramsPerM3' = 'null'::jsonb or private.number_valid(v->'pm25MicrogramsPerM3',false,0,null))
    and (v->>'temperatureC' is not null or v->>'humidityPct' is not null or v->>'pm25MicrogramsPerM3' is not null),false);
exception when others then return false;
end $fn$;

create table public.areas (
  code text primary key check (code ~ '^POI[0-9]{3}$'),
  official_name text not null check (pg_catalog.length(official_name) between 1 and 100),
  display_name text,
  category text not null,
  collection_enabled boolean not null default false,
  geometry_available boolean not null default false,
  is_public boolean not null default true,
  catalog_version text not null
);
create table public.area_latest (
  area_code text primary key references public.areas(code),
  population jsonb not null default '{"value":null,"observedAt":null,"fetchedAt":null,"lastResult":"not-provided"}',
  weather jsonb not null default '{"value":null,"observedAt":null,"fetchedAt":null,"lastResult":"not-provided"}',
  last_attempt_at timestamptz,
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  check (private.section_valid(population,'population')),
  check (private.section_valid(weather,'weather')),
  check (last_attempt_at is null or pg_catalog.isfinite(last_attempt_at))
);
create table public.population_observations (
  area_code text not null references public.areas(code),
  observed_at timestamptz not null check (pg_catalog.isfinite(observed_at)),
  ppl_min bigint not null check (ppl_min between 0 and 9007199254740991),
  ppl_max bigint not null check (ppl_max between ppl_min and 9007199254740991),
  congestion text not null check (congestion in ('relaxed','normal','slightly-busy','busy','unknown')),
  first_fetched_at timestamptz not null,
  last_fetched_at timestamptz not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  revision integer not null default 1 check (revision >= 1),
  primary key (area_code,observed_at),
  check (pg_catalog.isfinite(first_fetched_at) and pg_catalog.isfinite(last_fetched_at)),
  check (first_fetched_at <= last_fetched_at and observed_at <= first_fetched_at + interval '5 minutes')
);
create index population_observations_retention_idx on public.population_observations(observed_at);

create table private.collection_runs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  job_name text not null check (job_name = 'seoul-citydata-v1'),
  bucket_start timestamptz not null,
  status text not null check (status in ('running','success','partial','error','skipped')),
  lease_token uuid,
  started_at timestamptz not null,
  deadline_at timestamptz not null,
  finished_at timestamptz,
  area_codes text[] not null default '{}',
  success_count integer not null default 0 check (success_count >= 0),
  partial_count integer not null default 0 check (partial_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  request_count integer not null default 0 check (request_count between 0 and 10),
  source_requests_started integer not null default 0 check (source_requests_started >= 0),
  error_code text check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  unique(job_name,bucket_start),
  check (pg_catalog.cardinality(area_codes) <= 5),
  check (source_requests_started <= request_count)
);
create index collection_runs_retention_idx on private.collection_runs(started_at);
create table private.collection_leases (
  job_name text primary key check (job_name = 'seoul-citydata-v1'),
  lease_token uuid,
  run_id uuid references private.collection_runs(id),
  expires_at timestamptz not null
);
insert into private.collection_leases(job_name,expires_at) values('seoul-citydata-v1','1970-01-01T00:00:00Z');

create table private.provider_budgets (
  provider text not null check (provider = 'seoul-citydata'),
  budget_window_start timestamptz not null,
  daily_limit integer not null check (daily_limit between 1 and 1000),
  attempt_count integer not null default 0 check (attempt_count between 0 and 1000),
  circuit_open_until timestamptz,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  primary key(provider,budget_window_start)
);
create table private.provider_attempts (
  run_id uuid not null references private.collection_runs(id) on delete cascade,
  area_code text not null references public.areas(code),
  attempt_no integer not null check (attempt_no between 1 and 2),
  reserved_at timestamptz not null,
  primary key(run_id,area_code,attempt_no)
);

-- 공공 장소 정보만 초기화한다. 관측/최신값/활성 수집은 생성하지 않는다.
insert into public.areas(code,official_name,category,catalog_version) values
('POI014','강남역','인구밀집지역','2026-04-02'),
('POI007','홍대 관광특구','관광특구','2026-04-02'),
('POI003','명동 관광특구','관광특구','2026-04-02'),
('POI072','여의도','발달상권','2026-04-02'),
('POI068','성수카페거리','발달상권','2026-04-02');

alter table public.areas enable row level security;
alter table public.area_latest enable row level security;
alter table public.population_observations enable row level security;
alter table private.collection_runs enable row level security;
alter table private.collection_leases enable row level security;
alter table private.provider_budgets enable row level security;
alter table private.provider_attempts enable row level security;
create policy areas_public_read on public.areas for select to anon, authenticated using(is_public);
create policy latest_public_read on public.area_latest for select to anon, authenticated
  using(exists(select 1 from public.areas a where a.code = area_code and a.is_public));
create policy observations_public_read on public.population_observations for select to anon, authenticated
  using(exists(select 1 from public.areas a where a.code = area_code and a.is_public));
revoke all on public.areas, public.area_latest, public.population_observations from public, anon, authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant select on public.areas, public.area_latest, public.population_observations to anon, authenticated;
grant select,insert,update,delete on public.areas, public.area_latest, public.population_observations to service_role;
revoke all on private.collection_runs,private.collection_leases,private.provider_budgets,private.provider_attempts from public,anon,authenticated;
grant select,insert,update,delete on private.collection_runs,private.collection_leases,private.provider_budgets,private.provider_attempts to service_role;

create function private.lock_run(p_run_id uuid,p_token uuid,allow_finished_deadline boolean default false)
returns private.collection_runs language plpgsql volatile security invoker set search_path = '' as $fn$
declare l private.collection_leases; r private.collection_runs; t timestamptz;
begin
  select * into l from private.collection_leases where job_name = 'seoul-citydata-v1' for update;
  t := pg_catalog.clock_timestamp();
  if l.run_id is distinct from p_run_id or l.lease_token is distinct from p_token or l.expires_at <= t then
    raise exception using errcode='P0001',message='LEASE_LOST';
  end if;
  select * into r from private.collection_runs where id = p_run_id for update;
  if r.id is null or r.status <> 'running' or r.lease_token is distinct from p_token then
    raise exception using errcode='P0001',message='LEASE_LOST';
  end if;
  if not allow_finished_deadline and r.deadline_at <= t then
    raise exception using errcode='P0001',message='DEADLINE';
  end if;
  return r;
end $fn$;

create function public.acquire_collection_run(p_max_areas integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare l private.collection_leases; r private.collection_runs; t timestamptz; bucket timestamptz; codes text[];
  token uuid; reason text;
begin
  if p_max_areas is null or p_max_areas not between 1 and 5 then raise exception 'INVALID_CONFIG'; end if;
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
    select coalesce(pg_catalog.array_agg(code order by code),'{}'::text[]) into codes
      from public.areas where is_public and collection_enabled;
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

create function public.reserve_provider_attempt(p_run_id uuid,p_lease_token uuid,p_area_code text,p_attempt integer,p_daily_limit integer)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare r private.collection_runs; t timestamptz; day_start timestamptz; b private.provider_budgets; blocked timestamptz;
begin
  r := private.lock_run(p_run_id,p_lease_token);
  t := pg_catalog.clock_timestamp();
  if p_daily_limit is null or p_daily_limit not between 1 and 1000 or p_attempt is null or p_attempt not between 1 and 2
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

create function private.merge_section(previous jsonb,incoming jsonb)
returns jsonb language plpgsql immutable security invoker set search_path = '' as $fn$
begin
  if incoming->'value' = 'null'::jsonb then return pg_catalog.jsonb_set(previous,'{lastResult}',incoming->'lastResult'); end if;
  if previous->'value' = 'null'::jsonb or (incoming->>'observedAt')::timestamptz > (previous->>'observedAt')::timestamptz then return incoming; end if;
  if (incoming->>'observedAt')::timestamptz = (previous->>'observedAt')::timestamptz
    and (incoming->>'fetchedAt')::timestamptz >= (previous->>'fetchedAt')::timestamptz then return incoming; end if;
  -- 과거 자료를 다시 받았다는 사실은 최신 관측/유효 수신 시각을 바꾸지 않는다.
  return pg_catalog.jsonb_set(previous,'{lastResult}',incoming->'lastResult');
end $fn$;

create function public.commit_area_update(p_run_id uuid,p_lease_token uuid,p_area_code text,p_attempt_at timestamptz,p_population jsonb,p_weather jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare r private.collection_runs; latest public.area_latest; observed timestamptz; fetched timestamptz;
  n_min bigint; n_max bigint; level text; fingerprint text; t timestamptz;
begin
  r := private.lock_run(p_run_id,p_lease_token);
  t := pg_catalog.clock_timestamp();
  if p_area_code is null or not p_area_code=any(r.area_codes)
    or not exists(select 1 from private.provider_attempts where run_id=p_run_id and area_code=p_area_code)
    or p_attempt_at is null or not pg_catalog.isfinite(p_attempt_at)
    or p_attempt_at < r.started_at-interval '1 minute' or p_attempt_at > t+interval '5 minutes'
    or not private.section_valid(p_population,'population') or not private.section_valid(p_weather,'weather')
    then raise exception 'INVALID_OBSERVATION'; end if;
  if (p_population->'value' <> 'null'::jsonb and (p_population->>'fetchedAt')::timestamptz <> p_attempt_at)
    or (p_weather->'value' <> 'null'::jsonb and (p_weather->>'fetchedAt')::timestamptz <> p_attempt_at)
    then raise exception 'INVALID_OBSERVATION'; end if;
  insert into public.area_latest(area_code) values(p_area_code) on conflict(area_code) do nothing;
  select * into latest from public.area_latest where area_code=p_area_code for update;
  if latest.last_attempt_at is not null and p_attempt_at < latest.last_attempt_at then
    return pg_catalog.jsonb_build_object('stored',false,'reason','older-attempt');
  end if;
  if p_population->'value' <> 'null'::jsonb then
    observed := (p_population->>'observedAt')::timestamptz;
    fetched := (p_population->>'fetchedAt')::timestamptz;
    if observed > t+interval '5 minutes' then raise exception 'INVALID_OBSERVATION'; end if;
    n_min := (p_population->'value'->>'min')::numeric::bigint;
    n_max := (p_population->'value'->>'max')::numeric::bigint;
    level := p_population->'value'->>'congestion';
    fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(n_min::text||'|'||n_max::text||'|'||level,'UTF8')),'hex');
    insert into public.population_observations as o(area_code,observed_at,ppl_min,ppl_max,congestion,first_fetched_at,last_fetched_at,payload_hash)
      values(p_area_code,observed,n_min,n_max,level,fetched,fetched,fingerprint)
      on conflict(area_code,observed_at) do update set
        ppl_min=excluded.ppl_min,ppl_max=excluded.ppl_max,congestion=excluded.congestion,
        first_fetched_at=least(o.first_fetched_at,excluded.first_fetched_at),
        last_fetched_at=greatest(o.last_fetched_at,excluded.last_fetched_at),
        payload_hash=excluded.payload_hash,revision=o.revision+case when o.payload_hash<>excluded.payload_hash then 1 else 0 end
      where excluded.last_fetched_at>=o.last_fetched_at;
  end if;
  if p_weather->'value' <> 'null'::jsonb and (p_weather->>'observedAt')::timestamptz > t+interval '5 minutes'
    then raise exception 'INVALID_OBSERVATION'; end if;
  update public.area_latest set population=private.merge_section(latest.population,p_population),
    weather=private.merge_section(latest.weather,p_weather),last_attempt_at=p_attempt_at,updated_at=t where area_code=p_area_code;
  return pg_catalog.jsonb_build_object('stored',true,'reason',null);
end $fn$;

create function public.record_provider_failure(p_run_id uuid,p_lease_token uuid,p_error_code text,p_retry_after_seconds integer default null)
returns void language plpgsql volatile security invoker set search_path = '' as $fn$
declare r private.collection_runs; t timestamptz; until_at timestamptz;
begin
  r := private.lock_run(p_run_id,p_lease_token,true);
  t := pg_catalog.clock_timestamp();
  if p_error_code not in ('RATE_LIMITED','SOURCE_AUTHENTICATION') then raise exception 'INVALID_FAILURE'; end if;
  if p_error_code='SOURCE_AUTHENTICATION' then until_at := '9999-12-31T00:00:00Z'::timestamptz;
  elsif p_retry_after_seconds between 1 and 86400 then until_at := t+pg_catalog.make_interval(secs=>p_retry_after_seconds);
  else until_at := pg_catalog.date_bin(interval '10 minutes',t,'2020-01-01T00:00:00Z'::timestamptz)+interval '10 minutes'; end if;
  update private.provider_budgets set circuit_open_until=greatest(coalesce(circuit_open_until,t),until_at),last_error_code=p_error_code
    where provider='seoul-citydata' and budget_window_start=pg_catalog.date_trunc('day',t at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  -- 날짜 경계의 첫 실패도 전날 실제 예약 row에 circuit을 남긴다.
  if not found then
    update private.provider_budgets set circuit_open_until=greatest(coalesce(circuit_open_until,t),until_at),last_error_code=p_error_code
      where provider='seoul-citydata' and budget_window_start=(select max(budget_window_start) from private.provider_budgets where provider='seoul-citydata');
  end if;
end $fn$;

create function public.finish_collection_run(p_run_id uuid,p_lease_token uuid,p_status text,p_success integer,p_partial integer,p_failed integer,p_skipped integer,p_source_requests integer,p_error_code text default null)
returns void language plpgsql volatile security invoker set search_path = '' as $fn$
declare r private.collection_runs;
begin
  r := private.lock_run(p_run_id,p_lease_token,true);
  if p_status not in ('success','partial','error','skipped')
    or p_success<0 or p_partial<0 or p_failed<0 or p_skipped<0 or p_source_requests<0
    or p_source_requests>r.request_count or p_success+p_partial+p_failed+p_skipped<>pg_catalog.cardinality(r.area_codes)
    or (p_error_code is not null and p_error_code !~ '^[A-Z][A-Z0-9_]{0,63}$') then raise exception 'INVALID_SUMMARY'; end if;
  update private.collection_runs set status=p_status,success_count=p_success,partial_count=p_partial,
    failure_count=p_failed,skipped_count=p_skipped,source_requests_started=p_source_requests,error_code=p_error_code,
    finished_at=pg_catalog.clock_timestamp() where id=p_run_id;
  update private.collection_leases set lease_token=null,run_id=null,expires_at=pg_catalog.clock_timestamp()
    where job_name='seoul-citydata-v1' and run_id=p_run_id and lease_token=p_lease_token;
end $fn$;

create function public.cleanup_seoul_pulse()
returns jsonb language plpgsql volatile security invoker set search_path = '' as $fn$
declare observations_deleted integer; runs_deleted integer; budgets_deleted integer;
begin
  -- 수집과 같은 lease row를 잠가 정리/교체의 경합을 직렬화한다. 외부 호출은 없다.
  perform 1 from private.collection_leases where job_name='seoul-citydata-v1' for update;
  delete from public.population_observations where observed_at<pg_catalog.clock_timestamp()-interval '30 days';
  get diagnostics observations_deleted = row_count;
  delete from private.collection_runs where started_at<pg_catalog.clock_timestamp()-interval '14 days'
    and status<>'running' and id not in(select run_id from private.collection_leases where run_id is not null);
  get diagnostics runs_deleted = row_count;
  delete from private.provider_budgets where budget_window_start<pg_catalog.clock_timestamp()-interval '14 days'
    and (circuit_open_until is null or circuit_open_until<=pg_catalog.clock_timestamp());
  get diagnostics budgets_deleted = row_count;
  return pg_catalog.jsonb_build_object('observations',observations_deleted,'runs',runs_deleted,'budgets',budgets_deleted);
end $fn$;

-- 이 migration에서 만든 함수에만 적용한다. 기존 프로젝트 전체 권한은 변경하지 않는다.
revoke execute on function private.number_valid(jsonb,boolean,numeric,numeric), private.section_valid(jsonb,text),
  private.lock_run(uuid,uuid,boolean),private.merge_section(jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.number_valid(jsonb,boolean,numeric,numeric),private.section_valid(jsonb,text),
  private.lock_run(uuid,uuid,boolean),private.merge_section(jsonb,jsonb) to service_role;
revoke execute on function public.acquire_collection_run(integer),public.reserve_provider_attempt(uuid,uuid,text,integer,integer),
  public.commit_area_update(uuid,uuid,text,timestamptz,jsonb,jsonb),public.record_provider_failure(uuid,uuid,text,integer),
  public.finish_collection_run(uuid,uuid,text,integer,integer,integer,integer,integer,text),public.cleanup_seoul_pulse() from public,anon,authenticated;
grant execute on function public.acquire_collection_run(integer),public.reserve_provider_attempt(uuid,uuid,text,integer,integer),
  public.commit_area_update(uuid,uuid,text,timestamptz,jsonb,jsonb),public.record_provider_failure(uuid,uuid,text,integer),
  public.finish_collection_run(uuid,uuid,text,integer,integer,integer,integer,integer,text),public.cleanup_seoul_pulse() to service_role;

-- 읽기 전용 RPC는 한 DB 스냅샷에서 이력과 가용 시작을 읽는다.
-- 배열은 scalar jsonb로 반환해 Data API의 행 상한으로 조용히 잘리지 않는다.
create function public.read_population_history(p_area_codes text[],p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security invoker set search_path = '' as $fn$
declare rows jsonb; available jsonb;
begin
  if p_area_codes is null or pg_catalog.cardinality(p_area_codes) not between 1 and 3
    or p_from is null or p_to is null or not pg_catalog.isfinite(p_from) or not pg_catalog.isfinite(p_to)
    or p_to-p_from <> interval '24 hours' then raise exception 'INVALID_RANGE'; end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) order by r.observed_at,r.area_code),'[]'::jsonb) into rows
    from (select area_code,observed_at,ppl_min,ppl_max,congestion from public.population_observations
      where area_code=any(p_area_codes) and observed_at>=p_from and observed_at<p_to
      order by observed_at,area_code limit 20001) r;
  if pg_catalog.jsonb_array_length(rows)>20000 then raise exception 'HISTORY_LIMIT'; end if;
  select coalesce(pg_catalog.jsonb_object_agg(a.code,(select min(o.observed_at) from public.population_observations o
    where o.area_code=a.code and o.observed_at<p_to)),'{}'::jsonb) into available
    from public.areas a where a.code=any(p_area_codes) and a.is_public;
  return pg_catalog.jsonb_build_object('rows',rows,'available',available);
end $fn$;
revoke execute on function public.read_population_history(text[],timestamptz,timestamptz) from public;
grant execute on function public.read_population_history(text[],timestamptz,timestamptz) to anon,authenticated,service_role;
commit;
