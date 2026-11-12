# 02. 기술 아키텍처

> 2026-11-10 공개 경로 변경: URL 상태는 live/normal로 고정하며 데이터 모드 선택을 제공하지 않는다. 공개 저장소 factory는 합성 저장소를 불러오지 않는다. `/demo`는 기존 링크 호환용 실데이터 리다이렉트이며 합성 데이터는 내부 fixture로만 유지한다.

기준: v1.0.0 / 2026-10-14  
외부 문서 식별자 S01~S18의 주소는 `03_DATA_AND_API.md`에 정리한다. 라이브러리의 세부 API는 설치한 버전의 공식 문서로 재확인한다.

## 1. 기술 선택

| 영역 | 선택 | 이유와 경계 |
| --- | --- | --- |
| 웹 프레임워크 | Next.js App Router | UI와 얇은 조회/수집 서버를 한 저장소에서 운영 |
| 언어 | TypeScript strict | 정규화 계약과 화면 모델의 타입 공유 |
| 패키지 관리 | npm | 단일 lockfile, 재현 가능한 설치 |
| 스타일 | MUI theme, CSS theme variables, sx | src/theme의 토큰, 8px 간격과 반응형 규칙을 단일 기준으로 관리 |
| UI 기본 요소 | Material UI 9.5.0, 공식 Material Icons 9.5.0 | 공통 UI와 이후 기능에 같은 컴포넌트/상태/스타일 적용 |
| 서버 상태 | TanStack Query | 재조회, 캐시, 로딩과 오류 상태 관리 |
| 차트 | 무료 MUI X Charts 9.15.0 | 1시간별 마지막 관측 범위 중앙값 막대와 null 결측 유지. 비교 그래프는 같은 시간축/인구축을 공유. 상하한은 툴팁과 표에 보존 |
| 지도 | MapLibre GL JS | GeoJSON 영역 렌더링과 지도 인터랙션 |
| 유효성 검사 | Zod | 환경변수, URL, 외부 정규화 결과, API 입력 검증 |
| XML | fast-xml-parser 5.11.2 | M2 서버 전용 파서. 엔티티 확장 중지, 선언/깊이/바이트 제한. 동작 테스트 미실행 |
| 저장 | Supabase Postgres, supabase-js 2.117.3 | 최신 상태, 이력, 수집 상태와 제한 관리. Node 22 이상 필요, 프로젝트는 24 LTS |
| 수집 예약 | Supabase Cron + pg_net | 예약 HTTP 요청으로 Node 수집기 실행 |
| 테스트 | Vitest, Testing Library, Playwright | 순수 로직, UI와 실제 사용자 흐름 분리 |

현재 지원되는 안정 Next.js 버전과 호환되는 React, Node.js LTS를 선택하고 실제 버전을 `PROGRESS.md`에 기록한다. 문서를 이유로 기존 저장소를 자동으로 major upgrade하지 않는다.

처음부터 Redux, Zustand, Redis, NestJS, 별도 큐, Docker 배포와 마이크로서비스를 추가하지 않는다. 필요가 확인된 항목만 변경 근거를 남기고 도입한다.

사용자의 MUI 통일 요청에 따라 기존 공통 UI/대시보드/안내/오류 화면을 MUI로 전환했다. Next.js 16용 `AppRouterCacheProvider`가 서버 스트리밍의 Emotion CSS를 수집하고, client `Providers`가 theme/CssBaseline과 기존 TanStack Query를 연결한다. MUI 컴포넌트와 아이콘은 개별 경로로 import하고 차트는 지연 로딩한다. 데이터 안내 경로의 환경/URL 처리는 서버에 남기고 표시만 client 컴포넌트에 전달한다. 사용자 값과 원천 키를 theme에 넣지 않는다.

MUI 9의 폐기된 system props를 사용하지 않고 스타일을 `sx`에 작성한다. NextLink와 결합하는 버튼은 client 내부에서 구성하고 anchor 의미를 명시한다. Tailwind/Recharts 의존성과 PostCSS 설정은 제거했으며 `globals.css`에는 스크린리더 전용 문구와 본문 이동 링크의 접근성 규칙만 남는다. `react-is`는 React 19.3.0과 같은 버전으로 고정해 MUI와 호환성을 유지한다.

## 2. 실행 흐름

```text
[정기 수집 경로]
Supabase Cron
    │ 고정된 운영 URL에 인증된 POST
    ▼
Next.js /api/internal/collect (Node.js)
    │ 잠금, 일일 예산, 활성 장소 목록 확인
    ▼
서울시 도시데이터 API (장소별 호출)
    │ XML 크기 제한 → 파싱 → 검증 → 정규화
    ▼
Supabase Postgres
    ├─ 장소별 최신 정상 데이터
    ├─ 인구 시계열
    └─ 수집 실행 기록과 사용량

[방문자 조회 경로]
브라우저 → Next.js 공개 조회 API → Supabase의 저장된 자료
              │ 공유 HTTP 캐시
              ▼
       TanStack Query → 지도 / 차트 / 테이블

[데모 경로]
브라우저 → 같은 내부 계약의 DemoRepository → 합성 fixture
```

Supabase Cron은 HTTP 요청을 예약할 수 있다. 이 프로젝트에서는 Supabase Edge Function을 추가하지 않고 Next.js의 Node.js 수집기를 호출한다. 이는 프로젝트 선택이며 공식 문서의 예제를 그대로 복제한 구조가 아니다. 근거: S05, S06.

Vercel Hobby의 Cron에는 일 단위 제약이 있어 10분 수집 스케줄을 맡기지 않는다. Vercel은 웹과 Node.js 함수를 실행하는 역할만 맡는다. 근거: S07.

## 3. 주요 설계 결정

### 수집과 조회 분리

사용자가 방문하거나 새로고침할 때 외부 원천 API를 호출하지 않는다. 따라서 방문자 수의 증가가 원천 수집 횟수 증가로 직접 이어지지 않는다. 단, 자체 조회 API와 DB의 사용량은 늘어나므로 별도 관리한다.

### Polling을 기본으로 사용

분 단위 원천 자료를 보여주는 데 자체 WebSocket은 필수가 아니다. 브라우저는 저장된 최신 요약만 주기적으로 읽는다. Supabase Realtime도 MVP 필수 기능이 아니다.

### 동일한 도메인 계약

`LiveRepository`와 `DemoRepository`는 같은 읽기 인터페이스를 구현한다. 컴포넌트는 원천 XML, DB 행과 합성 fixture 구조를 직접 알지 못한다. 실제 데이터의 장애를 이유로 Repository를 자동 교체하지 않는다.

M2는 `server/seoul/{config,client,xml,adapter,errors}.ts`와 명시 실행 CLI를 구현했다. public route, page와 DemoRepository는 이 모듈을 import하지 않는다. client는 한 장소 응답을 `AreaLatest`와 제한된 issue 코드로 변환한다. 인구/날씨가 invalid 또는 not-provided이면 value/observedAt/fetchedAt은 null이고 `lastAttemptAt`만 이번 시각이다. 직전 유효값 보존과 원자적 DB 병합은 M3의 저장 RPC가 맡는다. adapter에는 직전 유효 수신 시각을 실패 시각으로 덮어쓰는 처리를 넣지 않는다.

M3는 `server/database/read-client.ts`와 `admin-client.ts`를 분리했다. 공개 route/SSR은 읽기 factory에서 LiveRepository 또는 DemoRepository를 선택한다. 수집 service만 관리자 client와 원천 client를 import한다. 공개/수집의 공통 오류 응답은 `server/http.ts`에 두어 서로의 의존성을 가져오지 않는다. 이 경계의 계약 테스트는 작성했지만 미실행이다.

등록 코드와 확인된 origin을 서버 allowlist로 제한하고 8초 동안 헤더와 본문을 읽는다. 자동 재시도나 redirect는 없다. 원본 Error/cause, URL과 원천 오류 메시지는 호출 경계에서 제거한다. 원천 시각은 명시적인 `Asia/Seoul` 설정이 있을 때만 변환하며 공식 시간대 확인 상태를 설정 존재 여부와 구분한다.

### DB는 지속 캐시, HTTP는 짧은 공유 캐시

서버리스 프로세스의 전역 변수나 로컬 파일을 운영 캐시나 수집 잠금으로 사용하지 않는다. 여러 인스턴스에서 일관성이 필요한 정보는 DB에 둔다.

2026-10-15 실제 API 표시 요청을 위해 `LIVE_DATA_BACKEND=local-snapshot` 개발 경로를 별도로 준비했다. `capture:seoul --execute`와 명시 실행한 개발용 `collector:local`만 외부 원천을 호출해 필요한 정규화 항목과 실제 관측을 .local/data에 저장한다. 공개 읽기 factory의 LocalSnapshotRepository는 파일만 읽으며 원천/수집/관리 client를 import하지 않는다. 파일이 없으면 오류이며 demo로 대체하지 않는다. 이 경로는 production에서 명시적으로 거부하고 기본 운영 backend는 계속 supabase다. HTTP 전송 게이트와 명시 실행 원칙도 유지한다. 최초 한 관측은 점으로 표시하고 과거를 채우지 않는다.

전체 공식 목록과 기존 수집본 호환성은 `docs/area-catalog.json`의 121곳을 유지한다. 화면, 데모, DB 조회와 기본 수집은 `monitoredAreaCatalog`의 20곳을 공유한다. `initialAreaCatalog`는 최초 5곳 선정 기록만 보존한다. 예전 5곳 수집본도 읽으며 빠진 장소는 null/자료 없음으로 채워 상태를 구분한다. `capture:seoul --all`은 각 1회 순차 요청, 요청 간 250ms, 최대 10분, 재시도 없음이며 신규 전송 승인이 필요하다. 2026-11-09 사용자 결정에 따라 저장 완료 시점 기준 최근 24시간 관측만 보관한다. 기존 파일 읽기 호환성과 비정상 증가 방지를 위한 전체 합계 100,000개/32MiB 안전 상한은 유지한다. 최신 현황은 이력과 별도로 보관하고 조회는 파일을 수정하지 않는다.

개발용 `collector:local`은 기본 5분/선택 10분 또는 30분/모니터링 20곳을 대상으로 detached Node 프로세스 하나를 실행한다. 상태/중지 명령을 제공하고 재부팅 자동 시작은 하지 않는다. 단일 CLI와 정기 작업은 `local-snapshot/capture.ts` 코어와 파일 잠금을 공유한다. 요청 전 KST 일일 예산(5분 5,760회, 10분 2,880회, 30분 960회)을 파일에 예약하고 선택 주기의 슬롯/150초 작업 기한/인증 및 요청 제한 circuit을 적용한다. 직전 유효 자료를 유지하고 `(areaCode, observedAt)`로 이력을 병합한다. 공개 저장소는 읽기 전용 scheduler-state.ts만 가져와 meta.collection과 collectionEnabled를 계산하며 원천/수집/쓰기 모듈을 가져오지 않는다. 수집 상태는 5초 heartbeat/30초 만료로 표시한다. PID 잠금은 활성 소유자를 덮어쓰지 않으며 종료된 PID의 잠금을 별도 회수 잠금 안에서 다시 확인해 회수한다. 이 구조는 한 컴퓨터의 개발 실행을 위한 것이며 운영용 DB/분산 lease/Cron 계약은 변경하지 않는다.

### 지도 렌더러와 지도 데이터 분리

MapLibre는 렌더러다. 외부 타일의 가격, 권리와 가용성은 별도다. 기본 지도는 공식 장소 영역 GeoJSON으로 동작하고, 타일이 없어도 핵심 기능을 제공한다. 근거: S10, S11.

후속 M1 첫 화면 개선은 MapLibre 이전의 SVG 위치 개요를 사용한다. `scripts/build-overview-map.py`가 보관한 서울시 공개 자치구 경계, 공식 표시 좌표와 기존 장소 SHP에서 `src/lib/geo/seoul-overview.json`을 생성한다. 원본 경위도와 표시 경로를 분리하고 앱에서 외부 지도/타일 요청은 하지 않는다. HTML 링크인 표식은 목록과 동일한 URL 상태를 따르며 오류 경계는 지도만 대체한다. 이 표시 자산 준비를 M4의 전체 GIS/카메라 검증 완료로 해석하지 않는다.

2026-11-10: `useMapCamera`가 1~4배의 배율과 중심 좌표, 제한된 이동을 로컬 상태로 관리한다. ResizeObserver로 실제 지도 패널 비율을 관찰해 SVG viewBox와 HTML 장소 링크의 위치를 같은 좌표계로 계산한다. 표식/선택 설명의 화면 크기는 유지하고 viewport는 overflow: clip으로 제한한다. Pointer Events의 드래그 임계값/캡처/취소 처리와 클릭 억제로 이동 중 장소 선택을 막으며, 키보드 확대/이동/초기화와 화면 밖 링크 포커스 시 위치 복원을 제공한다. 관찰자는 unmount 시 해제하고 지도 상태는 조회 데이터와 분리한다. 외부 타일/원천 요청이나 추가 의존성은 없다.

## 4. 권장 코드 구조

다음은 구현 목표 구조다. 이 문서 패키지에 해당 소스 파일들이 이미 들어 있다는 뜻은 아니다.

```text
src/
  app/
    layout.tsx
    page.tsx
    areas/[areaCode]/page.tsx
    compare/page.tsx
    data-info/page.tsx
    demo/page.tsx
    api/
      v1/[dataset]/
        areas/route.ts
        overview/route.ts
        areas/[areaCode]/route.ts
        history/route.ts
        status/route.ts
        export/route.ts
      internal/collect/route.ts
  features/
    dashboard/
    area-detail/
    compare/
    favorites/
    data-status/
  components/
    ui/
    layout/
    charts/
    maps/
  lib/
    contracts/           # 공개 DTO와 입력 검증
    domain/              # 추정 범위, 혼잡 단계, 시각과 freshness
    query/               # query keys, options, 클라이언트 fetcher
    url-state/           # 파싱, 정규화, 링크 생성
    fixtures/            # 합성 데이터와 시연 시나리오
    server/
      env.ts
      repositories/     # 공개 실데이터 읽기, 내부 개발용 demo fixture
      seoul/            # 원천 요청, XML adapter, 스키마 검사
      collector/        # 예약 수집 orchestration
      database/         # 읽기 클라이언트와 관리자 클라이언트 분리
      observability/    # 비밀값 제거, 구조화 로그
public/
  geo/                  # 검증 후 가공한 장소 GeoJSON
scripts/
  verify-seoul-api.ts
  import-area-catalog.ts
  collect-once.ts
supabase/
  migrations/
  tests/
  templates/            # 비밀값 없는 활성화/예약/해제 템플릿
tests/
  unit/
  integration/
  e2e/
```

작은 프로젝트이므로 빈 폴더를 모두 선제 생성하지 않는다. 해당 단계에서 필요한 구조만 추가한다. 같은 기능의 UI, hook과 테스트를 가까이 둔다.

## 5. 서버와 클라이언트 경계

서버에는 키 접근, 원천 XML 파싱, DB 접근, 수집 정책과 CSV 생성이 위치한다. `lib/server`의 진입 모듈은 `server-only` 경계를 둔다. 서버 비밀 모듈을 클라이언트 번들에서 import할 수 없어야 한다. 환경변수 공개 접두사 동작은 S13을 따른다.

클라이언트에는 지도, 차트, 필터, 즐겨찾기, 비교 선택, 자동 재조회와 접근성 상호작용이 위치한다. 외부 서울시 API URL을 브라우저에서 조합하지 않는다.

페이지 전체에 무조건 `use client`를 붙이지 않는다. 레이아웃과 초기 데이터 준비는 서버에 두고 상호작용 영역만 클라이언트로 분리한다. 지도는 클라이언트 경계 안에서 지연 로딩한다.

## 6. 상태의 단일 소유자

| 상태 | 소유자 |
| --- | --- |
| 최신 데이터, 이력, 요청 상태 | TanStack Query |
| 선택 장소, 검색, 기간, 비교 대상, 데이터셋 | URL |
| 즐겨찾기 | localStorage |
| 상세 시트 열림, 호버, 지도 카메라 | 해당 컴포넌트 |
| 원천 허용량, 활성 수집 장소, 수집 잠금 | 서버 설정과 DB |

URL과 별도 전역 저장소에 같은 선택 상태를 중복 저장하지 않는다. URL 파서는 서버와 클라이언트가 공유한다. 즐겨찾기는 `seoul-pulse:v1:favorites:live`와 `:demo`로 분리하고 손상된 JSON은 안전하게 초기화한다.

사용자 즐겨찾기가 원천 수집 대상을 늘려서는 안 된다. 수집 대상 확장은 운영자가 결정한다.

## 7. 조회와 캐시 정책

다음은 프로젝트 기본값이다. 실제 버전의 라이브러리 옵션을 적용하고 테스트한다. TanStack Query의 자동 재조회 기본 동작은 S12를 참고한다.

| 위치 | 정책 |
| --- | --- |
| 서울시 원천 fetch | `cache: 'no-store'`, 수집기만 실행 |
| DB 조회 | 요청 시 조회, 프레임워크의 암묵적 캐시를 전제하지 않음 |
| 개요/최신 API | live HTTP 공유 캐시 15초, 추가 SWR 30초. demo는 no-store |
| 이력 API | live 조회 조건별 공유 캐시 15초, 추가 SWR 30초. demo는 no-store |
| 상태 API | live 공유 캐시 15초, 추가 SWR 30초. demo는 no-store |
| 내부 수집/오류/CSV | `no-store` |
| 클라이언트 개요 | staleTime 30초, refetchInterval 60초 |
| 클라이언트 이력 | staleTime 60초, 표시 중이면 1분마다 재확인 |
| 숨겨진 탭 | 주기적 조회 중지 |
| 오프라인 | 조회 중지, 복구 시 오래된 조회만 재실행 |

Next.js의 GET Route Handler 기본 캐시 동작에 의존하지 않는다. 사용 중인 버전의 동작을 확인하고 응답 헤더를 명시한다. M3 정책: `Cache-Control: public, s-maxage=15, stale-while-revalidate=30`. 오류와 내부 수집은 `no-store`다. 근거: S14.

서버에서 초기 데이터를 준비하면 같은 Repository 함수를 직접 사용한다. 자기 자신의 공개 HTTP API를 서버에서 다시 호출하지 않는다. 동일한 query key로 hydration하고 초기 시각을 전달해 첫 진입 직후 중복 요청을 막는다.

M1의 초기 자료 경로를 M3에서 비동기 읽기 factory로 확장했다. 서버에서 Repository를 직접 읽고 TanStack Query의 `initialData`와 `initialDataUpdatedAt`으로 전달한다. 개요와 선택 장소의 이력만 준비하고 MUI X Charts는 상세 차트에서 지연 로딩한다. 첫 로딩/오류 시연에는 초기 자료를 주입하지 않는다. Query key에는 데이터셋과 demo 시연 상태를 포함하고, 모드 전환 시 이전 모드의 조회를 취소하고 해당 캐시를 제거한다. live 설정/DB 조회 실패는 안전한 `LIVE_UNAVAILABLE`, 정상 빈 DB는 관측 없음으로 처리한다. 합성 데이터로 자동 전환하지 않는다. 공개 조회에는 원천 API 호출이나 DB 쓰기가 없다. 실제 중복 요청/오프라인/숨김 탭 동작의 브라우저 검증은 미실행이다.

query key에는 반드시 데이터셋을 포함한다.

```text
['overview', dataset]
['area', dataset, areaCode]
['history', dataset, sortedUniqueAreaCodes, range, resolution]
['status', dataset]
```

개요 데이터는 공개 대상 장소 전체를 받아 클라이언트에서 필터링한다. 수집 비활성 장소도 저장된 자료를 읽을 수 있으며 live KPI의 분모는 공개 대상이다. 검색 입력마다 외부나 DB 요청을 실행하지 않는다. 과거 조회는 서버에서 허용 구간과 최대 3개 장소를 검증한다.

필터의 순서만 다른 동일 요청은 같은 캐시 키를 사용한다. `live`와 `demo`는 URL 경로, query key, 즐겨찾기 키와 내보내기 메타데이터 모두에서 분리한다.

## 8. 수집기의 실행 제약

Next.js 수집기는 Node.js 런타임을 명시하고 완료할 작업을 응답 전에 await한다. 응답 후 작업이 계속 실행될 것이라고 가정하지 않는다.

DB 수집 기한은 50초, 앱의 작업 예산은 획득 지연을 포함해 최대 45초이며 DB 기한보다 5초 일찍 중단한다. 함수 설정은 `maxDuration=60`초, DB lease는 120초다. 종료 기록은 별도로 마무리한다. 이 값은 호스팅사의 모든 플랜에 공통인 제한을 뜻하지 않는다. M6에서 실제 플랜의 지원 여부를 확인한다. 근거: S09.

모니터링 20개 장소, 동시 요청 2개, 요청별 최대 8초, 일시 실패 재시도 최대 1회다. 실행 예산이 부족하면 나머지를 중단하고 `partial`로 끝낸다. DB에서 마지막 시도가 오래된 장소부터 반환해 기한 때문에 누락된 장소가 다음 실행에서 먼저 처리되도록 한다. 모든 20곳을 매번 수집한다는 보장은 없으며 실제 완료 시간 측정은 아직 수행하지 않았다.

10개 이상에서 예산을 안정적으로 지키지 못하면 장소 배치를 분리하는 설계를 검토한다. 무료 플랜이라고 전체 장소를 하나의 큰 함수에 넣지 않는다.

## 9. 보안 경계

공개 조회는 Supabase publishable key와 읽기 전용 RLS로 제한한다. 수집에는 별도 Supabase secret key를 사용한다. 읽기 Repository가 관리자 클라이언트를 재사용하지 않게 한다. 근거: S15, S16.

수집 URL은 고정된 동일 서비스의 HTTPS 주소다. `Authorization: Bearer <collector-secret>`으로 호출하고 값은 Supabase Vault와 배포 비밀 설정에 각각 저장한다. 프런트 화면에서 해당 비밀을 요구하거나 전송하지 않는다.

사용자가 API host, 원천 URL 또는 수집 장소를 요청 본문으로 지정할 수 없게 한다. 원천 host와 서비스명은 서버의 allowlist로 고정한다. HTTP 전송 관련 미확인 사항은 운영 문서의 공개 전 게이트를 따른다.

## 10. 성능과 품질 방향

지도 인스턴스를 데이터 갱신마다 재생성하지 않는다. Feature ID를 장소 코드로 고정하고 변경된 데이터만 갱신한다. 지도 이벤트를 unmount 시 해제하고 개발 모드 재마운트에서도 리스너가 중복되지 않게 한다.

차트에는 조회 기간에 맞는 버킷 데이터를 전달한다. 전체 XML, 교통 세부 배열과 원천 기상 예보 전체를 클라이언트로 보내지 않는다. 목록 가상화는 데이터 수가 작을 때 선제 도입하지 않고 측정 후 결정한다.

카운트다운 같은 1초 타이머는 작은 상태 컴포넌트 안에 격리한다. 1초마다 대시보드 전체를 리렌더링하거나 가짜 숫자 변화를 만들지 않는다.

## 11. 변경 시 문서 책임

화면 요구사항은 01, 데이터 계약과 DB는 03, 설정/운영/검증은 04, 작업 순서는 05를 기준으로 한다. API 타입을 변경하면 테스트, fixture, Repository와 사용 화면을 함께 수정한다. 동작하지 않는 구형 문서를 별도 파일로 쌓지 않는다.


### 비교 화면 조회 경로 (2026-11-08)

`/compare`는 기존 URL 파서의 places를 사용한다. SSR은 readDashboardPageData에 2~3곳의 비교 코드를 전달해 같은 요청 clock에서 전체 현황과 복수 이력을 읽는다. 브라우저는 comparisonHistoryOptions의 정렬/중복 제거한 코드 배열을 query key와 단일 history 요청에 사용한다. 화면의 장소 순서는 URL에서 유지하며 응답 시리즈는 코드로 대응한다. 선택이 2곳 미만이면 이력은 읽지 않는다. getHourlyHistory는 지정된 시리즈 또는 명시적 null을 받아 다른 장소의 기록이 누락 장소에 표시되는 일을 막는다. 서버 API 계약, 데이터 저장과 수집 경로는 변경하지 않았다.

### 2026-11-09 워크스페이스 화면 구성

`AppShell`은 공통 MUI Drawer 사이드바와 상단 도구 모음을 렌더링한다. 실데이터의 ‘저장 자료’ 배지와 상시 수집 설명 배너는 제거했으며 수집 상태 설명은 자료 상태 화면에서 제공한다. 내부 합성 데이터 화면의 식별 배지는 유지한다. `ShellPreferencesProvider`는 접힘 여부 한 값만 유지하고, 서버 자료나 공유 선택은 기존 TanStack Query/URL이 소유한다. 사이드바 폭과 색은 `src/theme/tokens.ts`에서 관리한다.

`DashboardPage`/`Dashboard`에 view를 전달해 종합 현황, 장소 탐색, 지도, 자료 상태와 장소 상세를 분리한다. 새 경로 `/places`, `/map`, `/data-status`는 동일한 읽기 Repository를 재사용한다. 이 세 화면에서는 SSR/브라우저 모두 불필요한 인구 이력 요청을 생략한다. 장소 상세는 경로의 장소 코드가 선택창과 조회의 기준이며 변경 시 상세 경로 자체를 이동한다. 기존 공개 API, DB, 수집 계약은 변경하지 않는다.

### 2026-11-10 모니터용 종합 현황

`AppShell`의 layout은 page/dashboard/wallboard/detail/places로 구분한다. 종합 현황만 `SituationBoard`를 렌더링하며 기존 overview/history Query와 URL 선택을 전달한다. 1280×800 CSS 픽셀 이상에서 `wallboardLayout`이 사용 가능한 화면 높이를 지표/분석/20곳 목록에 배분한다. 지도 컨테이너의 너비와 높이에 맞춰 공식 벡터 비율을 유지하고, HistoryChart의 board 표현은 차트에 남은 높이를 배분한다. 작은 화면과 확대 화면에서는 자연스러운 세로 배치다.

장소 탐색의 places 레이아웃도 같은 화면 조건에서 남은 높이를 목록에 배정한다. `usePlaceGrid`는 검색/페이지 이동/자료 최신성 영역을 제외한 목록 컨테이너를 ResizeObserver로 관찰한다. `placeGrid` 토큰의 최소 열 너비 300px, 최대 4열, 최소 행 높이 152px과 가로/세로 간격 12px을 사용해 페이지 크기를 계산한다. 작은 화면은 3행으로 제한하고 자연스럽게 흐른다. 페이지 이동 영역은 한 페이지 결과에도 높이를 유지해 측정 결과의 진동을 막는다. `getPlacePage`는 계산된 표시 수를 받아 URL의 page와 선택 장소를 유효 범위에 맞추며 지도 옆 목록의 기존 3곳 규칙은 유지한다. 장소 카드의 경계, 상세 링크와 하단 동작 영역은 `placeCard`, `placeCardAction`, `placeCardFooter` 토큰으로 관리한다. 지도 옆 목록도 같은 카드를 사용하되 최소 행 높이 144px과 작은 내부 패딩으로 배치한다. 입체감은 라이트/다크별 `cardDepth` 토큰을 MUI palette CSS 변수로 생성해 적용하며 reduced-motion 설정에서는 기존 공통 규칙으로 전환 효과를 제거한다.

전체화면 상태는 AppShell의 로컬 상태이며 fullscreenchange로 브라우저의 Esc 종료도 반영한다. 전체화면 중 사이드바를 숨겨도 저장된 접힘 설정을 덮어쓰지 않는다. 화면 갱신, 수집 주기, API, 저장소와 데이터 계약은 그대로다.

### 라이트/다크 테마 (2026-11-10)

MUI colorSchemes와 useColorScheme으로 전환하며 기본 모드는 dark다. 브라우저 개인 설정은 MUI의 localStorage 저장 기능을 사용한다(`seoul-pulse-theme-v1`). 별도 Context나 서버 조회를 추가하지 않는다. 루트의 InitColorSchemeScript가 React 렌더링 전에 저장된 모드의 data 속성을 적용하며 ThemeProvider와 동일한 저장 키/기본값을 사용한다.

`src/theme/tokens.ts`의 두 팔레트가 MUI CSS 변수로 생성된다. 기존 pulse/shell/comparison 토큰도 이 변수를 참조하므로 SVG 지도와 차트 색까지 함께 바뀐다. 투명한 지도/상태 색은 CSS color-mix로 처리한다. 사이드바의 ThemeModeToggle은 단일 MUI Button에 현재 모드의 아이콘/문구를 표시한다. 누르면 기존 useColorScheme의 setMode로 반대 모드를 적용한다. hydration 또는 system 모드 확인 전에는 비활성화하며 접힌 메뉴에서는 문구만 숨긴다. 기본 버튼의 Enter/Space 동작, 전환 결과 툴팁과 현재/다음 모드를 설명하는 접근성 이름을 제공한다.

종합 현황의 BoardPlaces는 20곳의 표시와 공통 원천 시각/최신성 요약만 담당한다. 모든 장소가 같은 값을 가질 때만 헤더에 공통 정보로 표시하고, 서로 다른 최신성은 행에 표시한다. 정확한 장소별 시각은 툴팁/접근성 이름과 기존 자료 상태 대화상자에서 확인한다. 목록은 새로운 데이터 요청을 하지 않고 Dashboard의 overview 응답을 사용한다.

글자색은 pulse의 text/heading/muted 역할로 나눈다. MUI 9의 Typography color prop에는 `textSecondary`, `warning`, `error`처럼 지원되는 이름을 사용한다. 기존 `color="text.secondary"`와 `color="warning.main"` 등은 스타일에 반영되지 않아 기본 글자색을 상속하는 문제를 확인하고 수정했다. `sx={{ color: "text.secondary" }}`에서는 기존 팔레트 경로 표기를 유지한다. 두 API의 표기법을 혼용하지 않는다.


### 마지막 관측 요약과 비교 진입 (2026-11-10)

`getObservationSummary`는 기존 최신성 판정 함수를 재사용하되 마지막 관측의 혼잡 분포를 별도로 계산한다. 인구 값이 없거나 시각이 누락/유효하지 않은 자료는 제외하고, unknown 단계는 별도 집계한다. 지연/만료 관측의 시각은 보존한다. `ObservationSummary`는 네 단계의 수, 관측 범위와 가장 오래된/최근 원천 시각, 기존 최신성 수치를 표시하며 자료 상태 대화상자로 연결한다. 자료 상태 화면과 API의 coverage 및 최신성 계약은 변경하지 않는다.

`ComparisonStarters`의 세 조합은 모니터링 카탈로그의 실제 코드를 참조하며 카탈로그에 없는 조합은 표시하지 않는다. 빈 선택에서 누르면 기존 compare URL에 places와 24h를 지정한다. 한 장소만 있으면 그 장소를 유지하고 한 곳을 추가한다. 별도 수집/조회 경로나 새로운 저장 상태를 만들지 않는다.

상황판은 1440px 이상에서 장소 목록을 5열 4행으로 바꾸고 지도와 차트가 늘어난 높이를 나눠 쓴다. HistoryChart의 메인 요약은 기존 getHourlyHistory와 peak 계산 결과를 재사용하며 동률을 함께 표시한다. 시간별 대표 관측만 비교하며 누락 시간이나 기록되지 않은 실제 최대를 추정하지 않는다.


### 전체 현황 진입과 장소 순위 (2026-11-10)

DashboardPage의 무조건적인 POI014 리다이렉트를 제거했다. area 없는 SSR은 기본 historyPlaces=[]로 개요만 읽고, 브라우저 이력 Query도 비활성화 및 주기 확인 중단 상태다. 명시적인 area 링크는 그대로 읽는다. Sidebar의 로고와 종합 현황 링크는 area만 해제하고 비교 등 다른 URL 조건은 유지한다. 레거시 demo 리다이렉트도 기본 장소를 채우지 않는다.

getPlaceRankings는 overview의 마지막 관측만 사용한다. 유효 값/시각을 선별한 뒤 혼잡 단계 또는 인구 중앙값으로 정렬하고, 전체 동률 수를 계산한 후 상위 표시 수를 제한한다. 동률은 경쟁 순위(1, 1, 3)와 장소명순으로 표시한다. unknown은 혼잡 순위에서만 제외하며 인구 0은 유효 관측이면 보존한다. 자료 없음은 순위에서 제외하고 원천/수집 시각을 변경하지 않는다.

SituationBoard는 선택이 없으면 OverviewRankings, 선택이 있으면 기존 HistoryChart를 렌더링한다. 상단 분포/지도/20곳 목록과 한 화면 레이아웃은 유지하고 새로운 API나 서버 집계를 추가하지 않는다. 순위 링크도 기존 area URL을 사용하며 전체 현황 버튼은 area=null로 복귀한다.

### 장소 상세의 화면 높이 배분 (2026-11-11)

AppShell의 detail 레이아웃은 기존 wallboardMedia(1280px 이상, 높이 800px 이상)에서 100dvh를 사용한다. 제목/선택과 비교 표시줄은 콘텐츠 높이를 유지하고 detailAnalysisLayout이 남은 높이를 나눈다. 그리드 행은 min-content를 하한으로 사용해 안내가 늘어나면 문서가 자연스럽게 늘어난다. 본문의 스크롤을 overflow:hidden으로 차단하지 않는다.

HistoryChart의 detail presentation은 기존 시간별 집계/툴팁/기록 표를 재사용하면서 플롯을 유연한 높이로 표시한다. 최소 플롯 높이는 180px이며 캡션과 하단 설명은 축소하지 않는다. 작은 뷰포트에서는 기존 260/300px 플롯과 세로 흐름을 유지한다. 상세 로딩도 두 패널의 스켈레톤으로 표시한다. 개요 화면과 다른 조회/API 계약은 변경하지 않는다.
