# 운영 DB와 정기 수집

현재 계약은 서울 주요 **20곳 / 5분 수집 / 화면 최근 24시간 / DB 이력 48시간 보관**이다. 웹 조회는 저장된 자료만 읽으며 서울시 API나 DB 쓰기를 실행하지 않는다. 이 문서는 실행 절차이며 실제 적용 결과는 `PROGRESS.md`에 기록한다. 2026-11-12 기준 웹과 PC 수집기는 Supabase를 사용하며 첫 배치 20곳 저장을 확인했다. DB 정리 Cron은 활성화했으며, 원격 API 수집 Cron과 배포는 대기 상태다.

## 1. DB 준비와 권한 검증

설치 시 `migrations/20261111160340_sp_seoul_pulse_schema.sql` 다음에 `20261111170335_sp_retain_population_history_48_hours.sql`을 적용한다. 공개 3개와 내부 4개 테이블, 20곳/5분 수집, 화면 24시간 조회와 DB 48시간 보존 계약을 포함한다. 2026-11-12에 사용자가 지정한 공유 프로젝트에 Supabase MCP로 적용했다. 기존 접두사 없는 네 migration은 이 프로젝트에 적용된 적 없는 초안이므로 `archive/unapplied-drafts/`에 보관하며 실행하지 않는다.

- 공개 테이블: `public.sp_areas`, `public.sp_area_latest`, `public.sp_population_observations`
- 내부 테이블: `sp_private.sp_collection_runs`, `sp_collection_leases`, `sp_provider_budgets`, `sp_provider_attempts`
- 모든 관련 함수도 `sp_`로 시작한다. 기존 앱의 테이블, 함수, 스키마와 권한은 변경하지 않는다.

공개 장소는 anon/authenticated SELECT만 허용하며 수집 비활성 장소도 읽을 수 있다. 쓰기와 수집 RPC는 service_role 전용이다. `sp_private`를 Data API exposed schemas에 추가하지 않는다. 함수는 SECURITY INVOKER, 빈 search_path와 한정된 객체 이름을 사용한다. 익명 실행이 가능한 RPC는 `sp_read_population_history`뿐이다. 내부 테이블의 RLS는 기본 거부이며 service_role만 접근하므로 정책 없음 INFO 진단은 의도된 상태다.

새 프로젝트 설치는 동명 객체 여부를 확인하고 이 두 migration을 순서대로 적용한다. 공유 프로젝트의 다른 앱 migration을 임의로 초기화하거나 history를 변경하지 않는다. 원격 MCP가 부여한 migration 버전과 로컬 파일명을 일치시켰다. CLI 사용 전 설치 버전의 `--help`로 대상과 명령을 확인한다. `db reset`이나 공유 DB 전체를 바꾸는 diff를 자동 실행하지 않는다.

`supabase/tests/database/*.test.sql`의 pgTAP 및 `npm run test:integration`은 폐기 가능한 전용 로컬 DB용이다. 이번 연결 작업에서는 원격에 합성 테스트 자료를 쓰지 않았으며, 실제 읽기 요청과 시스템 카탈로그를 통해 테이블/RLS/RPC 권한을 확인했다.

통합 테스트는 localhost:54321만 허용한다. `M3_DB_TEST_ENABLED=true`, `M3_TEST_SUPABASE_URL`, `M3_TEST_SUPABASE_PUBLISHABLE_KEY`, `M3_TEST_SUPABASE_SECRET_KEY`를 전용 테스트 환경에 주입한다. 운영 키를 복사하지 않고 `COLLECTOR_ENABLED=false`를 유지한다. 테스트는 실제 원장에 기록하며 수집 플래그를 임시 변경 후 복원한다. 같은 날 재실행 시 예산 1회 검사의 전제가 달라지므로 기존 DB를 임의 초기화하지 않는다. pgTAP은 트랜잭션을 rollback한다.

## 2. 웹 읽기 연결

호스팅 서버에 `DATA_MODE=live`, `LIVE_DATA_BACKEND=supabase`, HTTPS `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`를 설정한다. 공개 키는 `sb_publishable_` 형식을 사용한다. 기존 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 이름도 서버에서 읽는다. 두 이름을 함께 설정할 경우 값이 일치해야 한다. `local-snapshot`은 production에서 차단되며 Preview도 실데이터 전용이다. Preview에는 수집용 비밀을 주입하지 않는다.

```sh
npm run check:deployment
npm run check:deployment -- --read
```

첫 명령은 네트워크 없이 형식만 확인한다. 두 번째는 공개 읽기 키로 20곳과 24시간 이력 RPC를 조회한다. Next.js production 환경 파일 우선순위를 사용한다. 설정 값, 키와 원본 오류를 출력하지 않는다. 읽기 성공은 RLS 쓰기 차단이나 수집 예약 성공의 증거가 아니다. 수집 전 `withPopulation=0`과 빈 이력은 정상이며 가짜 과거를 생성하지 않는다.

## 3. 지속 수집 연결

서버 수집 설정을 준비한다. 비밀은 배포 플랫폼의 비밀 설정에 저장하며 대화/명령행/문서에 넣지 않는다.

| 설정 | 값 또는 기준 |
| --- | --- |
| `SUPABASE_SECRET_KEY` | 서버 전용 `sb_secret_` 키. 기존 `SUPABASE_SERVICE_ROLE_KEY`의 service_role JWT도 지원 |
| `COLLECTOR_SECRET` | 무작위 영문/숫자/밑줄/하이픈 32~256자, Vault와 동일 |
| `COLLECTOR_ENABLED` | 수집 시작 시 true |
| `COLLECTION_INTERVAL_MINUTES` | 5 |
| `MAX_MONITORED_AREAS` | 20 |
| `SEOUL_DAILY_CALL_BUDGET` | 기본 6000, 발급 키의 실제 허용량 이하 |
| `SEOUL_API_BASE_URL` | 확인된 `http://openapi.seoul.go.kr:8088` |
| `SEOUL_API_KEY` | 서버 전용 서울시 키 |
| `SEOUL_SOURCE_TIME_ZONE` | 실행자가 해석 기준을 확인한 Asia/Seoul |
| `SEOUL_ALLOW_INSECURE_HTTP` | 운영 원천 구간의 평문 키 전송 승인 후 true |

`npm run check:deployment -- --collector`로 수집 설정 형식을 확인한다. 이 명령은 수집이나 DB 쓰기를 수행하지 않는다. 대상/전송 범위가 확인되면 `templates/collection-enable.sql`로 20곳을 활성화하고 `npm run collect:once -- --execute`로 첫 배치를 확인한다. 단일 배치 성공과 공개 읽기/인증 거부 결과를 확인한 뒤 예약을 연결한다.

Supabase의 pg_cron, pg_net과 Vault를 준비한다. Vault UI의 비밀 설정에 HTTPS 운영 origin을 `seoul_pulse_origin`, 서버와 같은 토큰을 `seoul_pulse_collector_secret` 이름으로 저장한다. `templates/cron-enable.sql`은 원격 5분 수집 예약만 만든다. DB 정리는 별도 템플릿으로 관리하며 기존 정리 예약 때문에 수집 활성화가 막히지 않는다. 기존 job이 있으면 중복 생성 대신 해당 설정부터 검토한다. Preview별 예약을 만들지 않는다.

수집은 브라우저가 닫혀 있어도 실행된다. 원천 동시성 2, 최대 1회 재시도, 8초 timeout, 앱 작업 예산 45초, DB 기한 50초, HTTP 대기 55초, 함수 maxDuration 60초다. 실제 호스팅 플랜의 시간 제한과 원천 포트 접근을 활성화 전에 확인한다. 키와 토큰이 들어간 URL/헤더를 로그에 남기지 않는다.

### 개발 PC에서 Supabase로 수집

`LIVE_DATA_BACKEND=supabase`에서 기존 `collector:local` 명령을 실행하면 DB 수집 RPC를 5분마다 호출한다. DB의 슬롯/lease/예산 검사를 그대로 사용한다. 개발 PC의 일일 상한은 기존 5,760회와 환경 설정 중 더 작은 값이며 재시도도 포함한다. 성공 여부와 별개로 각 배치 후 48시간 정리 RPC를 실행한다. 이 명령이 설정하는 수집 활성화와 HTTP 허용은 해당 프로세스에만 적용되고, 웹의 `COLLECTOR_ENABLED`나 원격 Cron은 변경하지 않는다. PC가 종료되면 수집도 멈춘다.

저장소 전환은 기존 프로세스 중지 → 오늘의 로컬 요청 수와 circuit을 DB에 이어받기 → 20곳 수집 활성화 → 저장소 환경변수 변경 → 같은 주기의 수집 재개 순서다. 요청 예산을 초기화하거나 로컬/DB 수집기를 동시에 실행하지 않는다. 과거 로컬 관측에는 개별 수신 시각이 없어 임의의 시각으로 DB 이력을 만들지 않는다. 기존 파일은 보존하고 DB 이력은 실제 DB 수집부터 누적한다. `resume`은 파일 수집 전용이며 DB 인증 circuit 해제는 관리자 템플릿으로 별도 처리한다.

### Supabase의 독립적인 이력 자동 정리

2026-11-12 사용자 요청으로 `templates/cleanup-cron-enable.sql`을 적용했다. `pg_cron`이 설치되고 `seoul-pulse-cleanup-v1` 작업이 **매시 23분(`23 * * * *`)**에 실행되도록 활성화됐다. PC와 웹 서버가 종료돼도 실행 중인 Supabase 프로젝트에서 정리하며, 원천 API나 비밀키를 사용하지 않는다.

원천 `observed_at < 실행 시각 - 48시간`인 인구 이력만 삭제한다. 장소별 마지막 현황은 보존하며 기존 수집 실행/요청 관리 기록과 우리 앱의 Cron 실행 기록은 14일 기준으로 정리한다. 다른 앱의 테이블/예약/실행 로그는 변경하지 않는다. 잠금 대기 5초, 전체 작업 30초 제한을 두었다. 익명/일반 사용자는 정리 함수를 실행할 수 없다.

새 프로젝트에서 자동 정리를 활성화할 때 두 migration 적용 후 `cleanup-cron-enable.sql`을 별도로 실행한다. 동명 작업이 있으면 자동 덮어쓰지 않고 중단한다. 자동 정리만 중지할 때는 `cleanup-cron-disable.sql`을 사용한다. 원격 수집 중지 템플릿은 이 정리 작업을 끄지 않는다.

## 4. 운영 확인과 중지

`templates/operational-status.sql`은 읽기 전용으로 migration, 권한, 예약, 실제 배치 결과, 장소별 시각과 정리 지연을 확인한다. 모든 migration과 Cron 설치 후 SQL Editor에서 실행한다. Vault 값, Cron 명령문과 HTTP 본문은 출력하지 않는다.

- 공개 장소 20곳, 수집 시작 후 활성 20곳과 최신값 20곳을 확인한다. 일부 실패는 숨기지 않는다.
- 현재 활성 예약은 정리용 `23 * * * *` 하나다. 이후 원격 수집을 승인하면 `*/5 * * * *`를 하나 추가한다. 적어도 두 수집 주기의 `sp_collection_runs`와 수신 시각을 확인한다. Cron SQL 성공만으로 수집 성공을 판단하지 않는다.
- 인구 원천 시각이 그대로여도 수신 성공일 수 있다. freshness는 원천 시각으로 판단한다. 공개 화면은 예약 실행 상태를 확인할 수 없으면 미확인으로 표시한다.
- 48시간이 지난 인구 이력을 매시 정리한다. 정상 실행 사이 약 1시간의 삭제 대기분이 남을 수 있다. `overdue_cleanup`은 49시간을 넘긴 기록을 뜻하며 정리 로그와 함께 확인한다. 최신값은 보존한다.
- 완료 실행/시도/예산/Cron 로그는 14일 보존한다. 활성 lease와 열린 circuit은 유지한다.
- 수집 중지는 서버 `COLLECTOR_ENABLED=false`와 `templates/cron-disable.sql`로 수행한다. 이미 시작한 요청까지 즉시 취소됐다고 가정하지 않는다. 수집 중지 자체는 데이터를 삭제하지 않으며 별도로 활성화된 이력 정리는 계속 실행된다.

내부 예산 6,000회 중 기본 20곳×288슬롯은 5,760회다. 재시도도 예산을 소비한다. 429는 제한된 Retry-After 또는 다음 5분 경계까지 중지한다. 인증 실패 circuit은 키/권한을 복구한 뒤 `auth-circuit-reset.sql`로 해제한다. 모든 읽기/검증 명령은 수집 활성화와 분리한다.

## 5. Vercel 배포

2026-11-12 사용자가 Vercel을 배포 대상으로 지정했다. 현재 폴더에는 `.vercel/project.json` 연결 정보가 없으며 실제 Vercel 배포는 수행하지 않았다. Next.js 프리셋, 프로젝트 루트, Node.js 24.x, 설치 `npm ci`, 빌드 `npm run build`, 기본 Output Directory를 사용한다. 수집 route의 `runtime=nodejs`, `maxDuration=60`을 유지한다. Vercel은 관리형 함수로 실행하므로 localhost에 바인딩하는 로컬 `npm start`를 수정할 필요가 없다.

| 환경 | 읽기 설정 | 수집 설정 |
| --- | --- | --- |
| Preview | `DATA_MODE=live`, `LIVE_DATA_BACKEND=supabase`, URL/공개 키, 실제 HTTPS origin | `COLLECTOR_ENABLED=false`; 관리자 키, 서울시 키와 수집 토큰 미등록 |
| Production | 같은 읽기 설정과 고정 운영 HTTPS `APP_BASE_URL` | 3절의 수집 서버 변수와 Vault에 대응하는 인증 토큰 등록; 원격 수집 전환 시 활성화 |

기존 `.env.local`의 호환 변수 이름도 지원한다. 파일 전체를 모든 환경에 복사하지 말고 용도에 맞는 값을 Vercel 프로젝트 환경 변수로 설정한다. `.vercelignore`는 `.env*`, `.local/`, 개발 도구 설정과 로컬 빌드/검사 산출물을 제외한다. `.vercel/`은 Git에서도 제외한다. 기존 `.env.local`을 덮어쓰는 `vercel env pull .env.local`은 실행하지 않는다. 환경 변수 변경은 새 배포에 적용된다.

실행 순서는 프로젝트 연결 → 읽기 전용 Preview와 화면 검증 → 운영 변수 등록과 Production 배포 → 인증 거부/실제 수집 배치 확인 → Supabase Vault의 운영 origin/토큰 등록 → `templates/cron-enable.sql`로 5분 원격 수집 예약 → 두 주기 저장 확인이다. 단일 운영 수집기로 전환하면서 PC 수집기를 종료하고 DB의 당일 예산은 초기화하지 않는다. 전환 실패 시 기존 PC 수집을 복구하고 실행 원장으로 중복 여부를 확인한다. 실제 배포, 원격 수집 활성화와 비밀 설정은 해당 실행 요청 범위에서 진행한다.

Vercel 내장 Cron은 추가하지 않는다. Hobby 내장 Cron은 하루 한 번 제한이 있으므로 기존 Supabase의 `*/5 * * * *` 예약이 Vercel의 `POST /api/internal/collect`를 호출하도록 한다. Vercel 함수 사용량은 발생하므로 배포 후 실행 시간/호출량을 확인한다. DB의 매시간 정리는 Vercel과 독립적으로 유지된다. Deployment Protection이 자동 요청을 막으면 해당 프로젝트의 공식 자동화 접근 설정을 검토하며 수집 API의 Bearer 인증은 유지한다.

현재 폴더에 Git 저장소는 없지만 Vercel CLI 배포도 지원된다. Git 연동을 선택하면 저장소 초기화/업로드를 별도 요청 범위에서 진행한다. 원격 Vercel 계정/프로젝트 목록, 환경 변수, 서울시 API 포트 접근과 실제 함수 timeout은 아직 확인하지 않았다.

공식 기준: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API 키](https://supabase.com/docs/guides/getting-started/api-keys), [Cron](https://supabase.com/docs/guides/cron/quickstart), [CLI 변경 사항](https://supabase.com/changelog.md), [Vercel CLI 배포](https://vercel.com/docs/projects/deploy-from-cli), [Vercel Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [함수 실행 시간](https://vercel.com/docs/functions/configuring-functions/duration), [Cron 제한](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing), [환경 변수](https://vercel.com/docs/environment-variables), [업로드 제외](https://vercel.com/docs/deployments/vercel-ignore).
