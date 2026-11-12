# SEOUL PULSE 진행 기록

문서 기준일: 2026-10-14  
문서 버전: 1.0.0  
현재 상태: M4 일부 구현 진행 중. 사이드바 워크스페이스와 화면별 탐색, 시간별 막대그래프와 최대 3곳 비교 화면 구현. M3 운영 DB 적용/외부 검증은 별도 대기. 2026-10-16 시작한 개발용 로컬 수집 이력과 후속 결과는 아래 기록을 따른다. 현재 실행 여부를 이 문서만으로 보증하지 않는다.  
다음 작업: 변경한 워크스페이스 구성에 대한 사용자 피드백 반영 후 남은 M4 범위 결정. 단위/통합/E2E 및 DB 검증은 명시적 테스트 실행 지시 이후 수행. 자동 단계 진행 없음

> 이 파일의 완료 표시는 실제 수행한 작업만 의미한다. 문서 작성은 앱 개발, API 실호출, 원격 DB 생성이나 배포 완료가 아니다.

## 1. 완료한 준비

- [x] 제품 범위와 초기 5개 장소 운영 방향 설계
- [x] 공개 조회와 원천 수집을 분리한 아키텍처 설계
- [x] 내부 데이터 계약, DB, 수집 정책과 상태 표시 기준 작성
- [x] 한국어 화면 명세, 운영 기준과 M0~M6 계획 작성
- [x] 공개 공식 자료의 메타정보와 관련 매뉴얼 부분 확인
- [x] 비밀값 없는 `.env.example` 작성
- [x] 문서 링크, 코드 블록, 예시 JSON과 ZIP 무결성 확인

실제 인증키 값은 공개 문서와 예시에 포함하지 않는다. 후속 요청에서 사용자가 예시에 입력한 키를 Git 제외 대상인 `.env.local`로 이동했다.

## 2. 단계 상태

| 단계 | 상태 | 실제 수행 결과 |
| --- | --- | --- |
| M0 기반과 외부 계약 | 구현 완료 / 일부 외부 검증 대기 | 최소 앱과 공식 5곳 카탈로그 준비. 최초 lint/typecheck/build 확인. 후속 강남역 실제 키 1회 성공 응답 확인. 단위/통합/E2E 미실행 |
| M1 데모 UI | 구현 완료 / 검증 대기 | 중앙 서울 위치 개요와 지표/상세의 3열 화면 유지. 후속 요청으로 UI/차트/아이콘과 디자인 토큰을 MUI로 통일. lint/typecheck/build 확인. 테스트/브라우저 미검증 |
| M2 API adapter | 구현 완료 / 외부 검증 대기 | 서버 전용 client/파서/정규화/확인 CLI와 계약 사례 29개 작성. 동작 테스트/새 실호출 미실행. 시간대/PM25/실패 envelope 미확인 |
| M3 DB와 수집 | 구현 완료 / 외부 검증 대기 | migration, 읽기 Repository/공개 API, 인증된 수집/예산/lease/보존 템플릿 준비. DB 적용/테스트/원천 호출/예약 활성화 미수행 |
| M4 지도와 분석 | 진행 중 | 정적 지도/시간별 막대와 최대 3곳 비교/링크 공유 구현. 비교의 lint/typecheck/build 및 시각 확인. 전체 GIS/MapLibre/즐겨찾기/7일/CSV와 자동 동작 검증은 남음 |
| M5 품질 검증 | 미시작 | 앱의 보안/성능/접근성 검사 미수행 |
| M6 공개 전환 | 미시작 | 실제 배포와 운영 검증 미수행 |

## 3. 외부 검증과 설정 상태

| 항목 | 확인 상태 | 다음 행동 |
| --- | --- | --- |
| 서울시 API 무료 제공 | 공개 공식 안내 확인 | M0에서 발급 계정 이용 조건 확인 |
| 통합 XML, 장소별 호출 | 공식 명세와 강남역 실제 성공 응답 확인 | 오류/결측, 다른 장소와 반복 구조 변형은 M2에서 추가 확인 |
| 과거 자료 제공 범위 | 공식 FAQ에서 이력 미제공 확인 | 직접 수집한 시점 이후의 이력만 사용 |
| 실제 인증키 동작 | 로컬 키로 강남역 1회 `INFO-000`, 장소 코드/이름 일치 | 키 노출에 따른 재발급 권고. 값은 출력하지 않음 |
| 초기 5개 장소 코드/정식명 | 공식 XLSX와 영역 DBF 대조 완료 | `docs/initial-area-catalog.json` 참고. 수집 비활성 |
| 장소별 영역/좌표계/변환 | 기존 SHP/WGS84/UTF-8 코드 연결과 후속 SVG 표시 가공. 5곳 표시 좌표는 공식 홈페이지에서 확보 | 도형 유효성/위상/대표점 전체 검증과 MapLibre는 M4에 남김 |
| 인증키의 실제 허용량 | 미확인 | 계정 또는 공식 안내로 확인 |
| 원천 HTTPS endpoint | 로컬에서 HTTPS 8088 TLS 오류, 443 8초 timeout. 지원 주소 미확정 | 배포 환경 미검증. TLS 검사 우회 없이 추가 확인 필요 |
| 원천 HTTP 위험 수용 | 사용자 승인으로 로컬 강남역 1회만 수행 | 공개 운영/정기 수집 승인 아님. HTTP 운영 허용 기본값 false 유지 |
| 원천 시간대와 날씨 단위 | M2에 공식 TEMP=℃/HUMIDITY=% 표시 확인. 시간대 표기 근거 미확인, PM25 단위는 공식 코드에서 혼용 | 시간대 명시 실행 게이트. PM25 연결 보류. 실제 실패/다른 장소와 함께 추가 확인 |
| Supabase 프로젝트와 권한 | 실제 프로젝트 미설정. M3 migration/RLS/RPC 코드 준비 | 승인된 전용 로컬 테스트 DB에서 적용/권한/경합 검사 후 원격 적용 검토 |
| 원격 DB 변경 | 승인 및 실행 없음 | migration 검토 후 별도 승인 |
| Cron 등록/활성화 | 미수행 | 고정 URL, 비밀 설정과 사용량 조건 확인 후 승인 |
| 공개 배포 | 미수행 | 배포 후보 검증과 사용자 승인 |

공개 자료의 출처와 확인 범위는 `docs/03_DATA_AND_API.md`의 S01~S18과 실응답 축약본을 따른다. 강남역 성공 응답 1개를 전체 API 계약 검증으로 표시하지 않는다.

## 4. 구현 환경

| 항목 | 상태 |
| --- | --- |
| Node.js / npm 버전 | 프로젝트 로컬 24.21.0 LTS / 11.19.0. 기존 전역 26.4.0 / 12.2.0은 변경 안 함 |
| Next.js / React 버전 | 16.4.5 / 19.3.0 (React DOM 19.3.0) |
| TypeScript와 기타 라이브러리 | TypeScript 6.0.3 strict, Zod 4.6.7, Vitest 5.0.4, ESLint 9.39.5, TanStack Query 5.104.2, react-is 19.3.0, fast-xml-parser 5.11.2. MUI/아이콘/Next 통합 9.5.0, 무료 Charts 9.15.0, Emotion과 supabase-js 2.117.3 적용. Tailwind/Recharts 제거 |
| npm lockfile | `package-lock.json` 생성. 직접 의존성은 정확한 버전으로 고정 |
| Supabase 환경 | 설정 전 |
| 배포 URL | 없음 |
| 실제 수집 시작 시각 | 없음 |
| 실제 데이터 가용 기간 | 없음 |

## 5. 검사 기록

### 개발 문서 패키지

2026-10-14 문서 자체 검사 완료. Markdown 8개와 환경변수 예시 1개, 총 9개 파일을 확인했다.

| 검사 | 결과 |
| --- | --- |
| 예상 파일 구성과 UTF-8 읽기 | 통과 |
| 문서의 상대 링크 5개 | 대상 파일 존재 확인 |
| Markdown 코드 블록 경계 | 짝 일치 확인 |
| JSON 예시 1개 | 구문 검사 통과 |
| 환경변수 13개 | 운영 문서와 대조 |
| 예시 인증정보 | 값이 비어 있음 확인 |
| 기본 보안 설정 | demo, 수집 중지, HTTP 기본 거부 확인 |
| 공식 출처 식별자 18개 | 참조 정의 존재 확인 |
| 기본 요청 수와 보존 행 수 계산 | 산술 검사 통과 |
| ZIP | CRC 무결성과 압축 내부 파일 내용 일치 확인 |

이 검사는 문서의 구조와 예시를 대상으로 한다. 실제 앱 동작, 원천 API 접근, DB 권한이나 배포 보안을 검증한 결과가 아니다.

### 앱과 외부 시스템

최초 M0에서 lint/typecheck/build와 개발 서버 기동을 확인했다. 후속 요청으로 실제 API 연결 1회와 해당 응답의 크기/수신 시간을 확인했다. 단위/통합/E2E, DB 권한, 정기 수집과 앱 성능 측정은 수행하지 않았다. 최초 기록은 8절, 후속 확인은 9절에 구분한다.

## 6. 변경 기록

| 날짜 | 변경 | 검증 범위 |
| --- | --- | --- |
| 2026-10-14 | v1.0.0 한국어 개발 문서 패키지 작성 | 공개 자료 확인과 문서 자체 검사만 해당 |
| 2026-10-14 | M0 최소 앱, 로컬 LTS, 공식 카탈로그와 설정 경계 구성 | lint/typecheck/build 및 기동 로그 확인. 테스트 미실행 |
| 2026-10-14 | 후속 서울시 API 조사, 로컬 비밀 설정 이동과 강남역 실호출 1회 | 공식 명세, 공개 샘플/TLS 탐색, 승인된 실응답 확인과 축약본 보관. 단위/통합/E2E 미실행 |
| 2026-10-14 | 사용자 후속 지시에 따른 M1 합성 데이터 대시보드 구현 | 최종 lint/typecheck/build와 정적 파일 확인. 테스트 19개 추가 작성, 기존 6개 포함 모두 미실행. 브라우저 QA 미실행 |
| 2026-10-14 | 참고 이미지에 따른 첫 화면 대시보드 재구성 | 공식 자치구/표시 좌표 확보와 SVG 가공, 최종 lint/typecheck/build. 기능/브라우저 테스트 미실행 |
| 2026-10-14 | M3 DB/수집/공개 live 조회 구현과 비활성 운영 템플릿 | lint/typecheck/demo build, SQL/PL/pgSQL 정적 문법, 의존성 audit. 단위/DB/HTTP/브라우저 테스트와 DB 적용 미실행 |

## 7. 다음 작업

M3 코드 준비 결과를 보고한 뒤 정지한다. 테스트와 DB 적용은 별도 실행 지시를 기다린다. M4 지도/비교/7일/CSV로 자동 진행하지 않는다. M2의 공식 시간대/PM25, 실제 오류/다른 장소, 키 한도와 전송 조건 미확인 상태를 유지한다. 추가 실호출과 정기/공개 HTTP 운영은 이전 로컬 1회 승인에 포함하지 않는다. 현재 실제 수집 시작 시각과 이력은 없다.


## 8. M0 수행 기록 (2026-10-14)

아래는 최초 M0 종료 시점의 기록이다. 당시 API 실호출 미수행/로컬 키 없음 상태는 후속 확인을 기록한 9절과 현재 상태 표에서 갱신했다.

### 범위와 보존

- 경로: `/Users/ddoni/dev/seoul-pulse`. 작업 전 대상 폴더는 없었으며 첨부는 앱 코드 없는 9개 파일의 문서 패키지였다. Git 메타데이터가 없음을 파일시스템으로 확인했다. Git 명령은 실행하지 않았다.
- `/Users/ddoni/Downloads/seoul-pulse-dev-docs` 원본의 SHA-256을 작업 전후 비교해 모든 파일이 그대로임을 확인했다. 프로젝트에는 복사본을 통합했다.
- `AGENTS.md`의 기존 지시문을 보존하고 사용자 최신 지시인 테스트 실행 보류를 덧붙였다. 개발 서버가 추가한 Next.js 자동 블록은 그 블록만 제거했고 `agentRules=false`로 재생성을 막았다. 재기동 후 사용자 지시문 보존과 자동 블록 부재를 확인했다.
- Git 초기화/브랜치/commit/push/PR, 원격 DB 변경, Cron 활성화와 실제 배포를 수행하지 않았다. M1 이후 작업도 시작하지 않았다.

### 구현과 핵심 파일

| 파일 | 역할 |
| --- | --- |
| `package.json`, `package-lock.json`, `.npmrc` | npm 실행 명령, 버전 고정과 Node/npm 설치 경계 |
| `.nvmrc`, `.node-version`, `.local/node` | Node 24.21.0 LTS. 현재 Mac 전용 바이너리는 Git 제외 |
| `src/app/layout.tsx`, `page.tsx`, `globals.css` | 한국어 최소 App Router 화면, 기본 스타일, 데이터 없음 안내, 공식 출처 링크 |
| `src/lib/server/env.ts` | server-only 설정 경계, demo 기본값, 명시적 bool 파싱, 입력값 없는 오류 |
| `scripts/check-env.ts` | Next.js 로컬 환경 파일 로딩 후 비밀과 URL의 존재 여부만 출력. 외부 요청 없음 |
| `tests/unit/env.test.ts`, `vitest.config.ts` | 기본값, bool, 잘못된 모드, live 보존과 비밀 출력 방지 6개 사례 준비. 미실행 |
| `next.config.ts`, `tsconfig.json`, ESLint/PostCSS 설정 | strict 타입, 린트, 스타일, 자동 AGENTS 변경 차단 |
| `.env.example`, `.gitignore` | 원본 비밀값 없는 예시 유지, env와 런타임/생성 산출물 제외 |
| `docs/initial-area-catalog.json`, `docs/sources/*` | 공식 5개 장소와 내려받은 XLSX/ZIP 원본 |
| `docs/M0_VERIFICATION.md` | 출처, 체크섬, 선택 근거, 좌표계와 API 미확인 항목 |
| `README.md`, `docs/03_DATA_AND_API.md`, `PROGRESS.md` | 현재 실행 방법과 실제 확인 범위 반영 |

사용자는 기본 페이지에서 아직 수집한 데이터가 없다는 안내와 공식 자료 링크를 볼 수 있도록 구현했다. 실제/합성 인구, 지도, 시계열, 조회 API와 수집기는 구현하지 않았다. `DATA_MODE=live`는 연결 준비 화면으로 명시하며 demo로 자동 대체하지 않는다. 이 화면의 브라우저 동작은 테스트하지 않았다.

### 실행한 확인과 검사

아래 npm 명령은 프로젝트의 `.local/node/bin`을 PATH 앞에 둔 Node 24.21.0 / npm 11.19.0 환경에서 실행했다. Next.js 명령에는 `NEXT_TELEMETRY_DISABLED=1`을 적용했다.

| 확인/명령 | 결과 | 한계 |
| --- | --- | --- |
| 파일 목록과 `.git` 존재 여부 확인 | 신규 대상, 문서 패키지, Git 없음 확인 | Git 상태/차이 명령 사용 안 함 |
| 원본 9개 파일 SHA-256 대조 | 변경 없음 | 복사된 README/진행 문서 등은 M0 결과를 반영 |
| `node --version`, `npm --version`, 공식 LTS 체크섬 | 프로젝트 버전 24.21.0 / 11.19.0, 다운로드 체크섬 일치 | 기존 전역 런타임 변경 안 함 |
| `npm install --no-audit --no-fund` | 의존성 설치와 lockfile 생성 성공 | 아래 설치 경고 기록 참고 |
| `npm ls --depth=0` | 선언한 최상위 패키지 설치와 버전 확인, 종료 0 | 보안 audit 결과가 아님 |
| `npm run check:env` | 종료 0. demo, HTTP/수집 요청 false, 실제 키/DB 설정 없음 | 설정 존재 여부만 확인. 인증 성공 판정 아님 |
| `npm run lint` | 최종 종료 0, 경고 0 | 첫 실행은 PostCSS 익명 기본 내보내기 경고로 실패. 변수 선언 후 재검사 통과 |
| `npm run typecheck` | 최종 종료 0. Next 라우트 타입 생성과 TypeScript strict 통과 | 기능/보안 테스트 대체 아님 |
| `npm run build` | 최종 종료 0. `/` 동적 페이지와 기본 not-found 빌드 성공 | 비밀값과 DB 없이 실행. 실제 배포 안 함 |
| `npm run dev -- --port 3187` | 127.0.0.1에서 Ready 확인 후 Ctrl-C 종료 | 기동 로그만 확인. HTTP 페이지 요청, 클릭, 시각 QA 안 함 |
| 공식 XLSX/ZIP 읽기, 해시와 DBF 대조 | 121개 고유 코드, 초기 5곳의 정식명/분류와 원본 영역 연결 확인 | 관측 데이터나 GIS 전체 검증 아님 |
| 공식 매뉴얼 12~14쪽과 공개 이용 안내 | 통합 XML과 인구 전용 API 구분, 문서상 메타 필드 확인 | 실제 XML envelope와 값은 미확정 |
| 최종 파일/문서 확인 | 원본 AGENTS와 단계 계획 보존, 환경 예시의 비밀값 공란과 안전 기본값, README/M0 기록의 로컬 링크 존재 확인 | 정적 파일 확인이며 테스트 실행 아님 |

초기 문서 다운로드는 네트워크 샌드박스의 DNS 제한으로 실패했고, 허용된 네트워크 경로로 재시도해 공식 원본을 확보했다. 최초 빌드 이후 PostCSS lint 수정, 개발 서버가 자동 추가한 AGENTS 블록을 막는 설정 변경이 각각 있어 관련 검사와 빌드만 다시 수행했다.

### 실행하지 않은 검사

| 검사 | 실행하지 않은 이유 |
| --- | --- |
| `npm run test`, `npm run test:watch` | 사용자가 명시 실행을 요청할 때만 테스트하라는 최신 지시. 6개 테스트는 작성만 했고 통과로 기록하지 않음 |
| 통합/E2E/브라우저 smoke, 화면/키보드/반응형 QA | 사용자 테스트 실행 보류. 통합/E2E 기반은 아직 해당 단계 이전 |
| 실제 서울시 API 호출, TLS 인증서/호스팅 연결 확인 | 로컬 인증키 없음, 확인된 HTTPS 계약 없음, HTTP 승인 없음. 실제 배포도 금지 |
| 성공/실패 envelope, 기준 시각과 값, XML 크기/시간 | 실제 응답을 받지 않아 확인 불가. fixture와 측정 수치 생성 안 함 |
| 계정별 호출 허용량 | 인증키 발급 계정 정보 없음. 다른 서비스의 1,000건 문구를 전용 한도로 사용하지 않음 |
| GeoJSON 변환, 폴리곤 유효성, 대표점과 지도 렌더링 | M0는 원본 형식/좌표계/코드 연결까지만 확인. M4 범위 |
| DB 권한/연결, migration, 수집기와 Cron | M3 이전이며 원격 작업 금지 |
| `npm audit`, 성능/접근성 자동 측정, 배포 검증 | 이번 최소 구성 범위에서 미실행. 안전/성능 통과 주장 없음 |
| React Doctor 변경 비교 검사 | Git 저장소가 없고 Git 작업은 금지. lint/typecheck를 이 검사 통과로 대체 표기하지 않음 |

### 설치 경고와 남은 제한

- ESLint 9.39.5는 설치 시 지원 종료 경고가 있었다. 현재 Next.js 린트 플러그인의 peer 범위는 ESLint 9까지이므로 10을 강제하지 않았다. 향후 호환 플러그인 업데이트가 필요하다.
- npm은 `unrs-resolver@1.12.2` postinstall이 allowScripts 승인을 받지 않았다는 경고를 냈다. 별도 승인 명령을 실행하지 않았다. 현재 설치 상태에서 lint/typecheck/build는 통과했지만 다른 운영체제의 재설치는 미검증이다.
- TypeScript 최신 7.0.2 대신 `typescript-eslint`의 `<6.1.0` 호환 범위에 맞춘 6.0.3을 사용했다.
- 프로젝트 로컬 Node 바이너리는 이 Mac의 arm64용이며 다른 환경에서는 맞는 LTS 런타임을 설치해야 한다.
- 공개 자료 확인은 API 실호출 성공을 뜻하지 않는다. HTTP는 평문 키 전송 가능성이 있으므로 명시 승인 없이 활성화하지 않는다. 미확인 HTTPS 주소로 키를 보내지 않는다.
- 테스트 미실행 때문에 M0의 전체 통과 조건을 충족했다고 판단하지 않는다. 상태는 **구현 완료 / 외부 검증 대기**, 추가로 **사용자 요청에 따른 테스트 실행 대기**다.

### 다음 행동

현재 단계의 결과만 보고하고 멈춘다. 사용자가 지시하면 준비된 테스트 또는 외부 계약 확인을 이어간다. M1의 첫 작업은 공통 DTO와 명확하게 구분된 합성 fixture이며 이번에는 진행하지 않았다.

## 9. 후속 API 조사와 로컬 1회 조회 (2026-10-14)

### 요청 범위와 승인

사용자가 키 설정 후 데이터 호출 방법을 조사하고 확인하도록 요청했다. 먼저 공개 공식 문서와 비밀이 아닌 `sample` 키로 전송을 조사했다. HTTP의 평문 인증키 전송 위험을 설명한 뒤 사용자가 **로컬 강남역(POI014) 1회 HTTP 조회**를 명시적으로 승인했다. 실제 키 요청은 1회이며 재시도하지 않았다. 이 승인은 공개 운영, 다른 장소의 추가 조회, 예약 수집과 DB 쓰기에 적용하지 않는다.

### 변경과 확인한 응답

- `.env.example`에 사용자가 입력한 키는 Next.js 로더의 대상이 아니었다. 키/원천 origin을 `.env.local`로 이동하고 예시 키를 공란으로 복구했다. 로컬 파일은 기존 `.gitignore`의 제외 대상이며 권한은 0600이다.
- 공개 샘플은 `POI014` 요청에 `POI009` 기본 장소를 반환했다. 초기 진행 설명의 강남역 샘플 성공 표현은 즉시 정정했다. 실제 키의 응답에서는 코드 `POI014`와 이름 `강남역`이 일치했다.
- 실제 응답은 HTTP 200, `application/xml;charset=UTF-8`, root `SeoulRtd.citydata`, 성공 태그 `RESULT/RESULT.CODE=INFO-000`이었다. 인구와 날씨는 각각 같은 이름의 wrapper 두 겹 아래에 있었다.
- 인구는 `2026-10-14 16:40`, 혼잡 `붐빔`, 추정 범위 78,000~80,000명이었다. 날씨는 별도 기준 시각 `2026-10-14 16:50`, `TEMP=18.4`, `HUMIDITY=28`, `PM25=4`였다. 원천 문자열에는 시간대 offset이 없으므로 공식 시간대와 단위 근거를 추가 확인해야 한다.
- 수신 시각 `2026-10-14T08:10:31.201Z`(한국 시간 17:10:31), 크기 182,111 bytes, 본문 수신까지 약 166ms다. 한 번의 로컬 측정이며 운영 성능 수치가 아니다.
- `docs/03_DATA_AND_API.md`, `docs/M0_VERIFICATION.md`, `README.md`의 현재 확인 범위를 갱신했다. [실응답 축약본](docs/sources/citydata-POI014-20261014.excerpt.xml)과 [메타정보](docs/sources/citydata-POI014-20261014.meta.json)는 키/호출 URL 없이 실제 핵심 필드를 추출했다. 예측 배열과 나머지 section을 생략한 축약본이며 전체 응답 fixture가 아니다.
- 파일 조사 중 키가 도구 출력에 포함된 실수가 있었다. 값을 문서에 남기지 않았으며 사용자에게 알리고 재발급을 권고했다. 공개 문서/예시 복구가 이미 발생한 대화 노출을 되돌리는 것은 아니다.

### 실행한 확인

| 확인 | 결과와 범위 |
| --- | --- |
| 공식 도시/인구 API 명세와 데이터셋 FAQ | `citydata`는 통합 XML, `citydata_ppltn`은 인구 전용 JSON도 지원. 과거 자료 미제공 재확인. 이번에는 통합 XML만 실호출 |
| `npm run check:env` | 이동 전 키/URL 미설정, 이동 후 설정됨 확인. DB 설정 없음, 수집/HTTP 운영 허용 false |
| 샌드박스 내부 공개 HTTPS 탐색 | DNS 제한 `ENOTFOUND`. 원천 장애로 해석하지 않음 |
| 허용된 네트워크에서 공개 샘플 전송 탐색 | HTTP 8088 정상, HTTPS 8088 `ERR_SSL_WRONG_VERSION_NUMBER`, HTTPS 443 8초 timeout. HTTPS endpoint 미확정 |
| 승인된 실제 키 1회 요청 | 강남역 성공 및 요청/응답 장소 일치. 8초 timeout, redirect 거부, 8 MiB 스트림 제한. URL/비밀 오류 출력 없음 |
| Python 표준 XML 도구로 실응답 확인 | 금지 선언 검사, 성공 경로, 장소/인구 범위 대조. 인구/날씨 현재 블록 각 1개, 예측 배열 각각 12/24개. 앱 parser 구현/검증은 아님 |
| 로컬 비밀 제외 확인 | 로컬 비밀 파일과 의존성/생성 폴더를 제외한 33개 파일에서 실제 키 문자열 없음. 예시 공란, 권한 0600, ignore 규칙과 수집/HTTP 기본 거부 확인 |
| 문서와 산출물 정적 확인 | 상대 링크 대상, 코드 블록 경계, 금지된 가운데점 부재, XML/JSON 구문, 축약본 SHA-256 일치 확인 |

### 미수행과 다음 작업

단위/통합/E2E와 브라우저 앱 테스트는 실행 지시가 없어 수행하지 않았다. 이번 변경은 설정 이동과 조사 산출물/문서뿐이라 lint/typecheck/build를 다시 실행하지 않았고 최초 M0 결과와 구분한다. 실제 오류 envelope, 다른 장소, 결측 변형, 발급 키의 호출 한도, 공식 시간대/단위 근거와 배포 환경은 미검증이다. `verify:seoul`/XML adapter/수집기를 구현하거나 M1로 진행하지 않았다. Git 작업, 원격 DB 변경, Cron 활성화와 배포도 수행하지 않았다.

다음 개발은 별도 지시 후 M1의 공통 DTO와 합성 fixture다. 이후 M2에서는 여기서 확인한 정확한 경로로 방어적인 adapter를 구현한다. M3 수집은 서버가 정해진 장소를 주기적으로 읽어 저장하고 브라우저는 저장된 자료만 조회하는 기존 구조를 따른다. 5곳/10분은 프로젝트 계획값이며 실제 키 허용량과 전송 운영 조건을 확인한 뒤 활성화해야 한다. 과거 관측은 수집 시작 이후부터 저장하며 원천 예측을 과거 관측으로 바꾸지 않는다.

## 10. M1 데모 UI 구현 (2026-10-14)

### 범위와 구현한 사용자 동작

사용자가 다음 기능 개발을 지시해 M1을 시작했다. 이전의 M0 한정 지시 이후 새로 승인된 단계이며 M2로 자동 진행하지 않았다. 공식 카탈로그의 이름/코드와 명시적인 합성 인구/날씨/이력 값을 분리했다. 앞선 실제 강남역 응답을 데모 fixture로 재사용하지 않았다.

- `/demo`는 dataset=demo와 강남역 선택을 명시한 개요 URL로 이동한다. 로그인, 키와 DB 없이 합성 데이터를 준비한다.
- 전체 시연 5곳의 KPI, 검색/혼잡 단계 필터/정렬, 장소 선택 상세, 독립 상세 링크와 자료 시각 표를 구현했다. 선택 장소가 필터 밖이어도 유지하고 선택 해제 링크를 제공한다.
- KPI는 필터와 무관한 전체 범위로 계산한다. 최신 자료 없는 붐빔/여유, 전체 자료가 없는 지연 값은 0 대신 `—`다. 누락과 지연은 구분한다.
- 인구는 상하한으로 표시하고 기준/수집 시각을 분리한다. 합성 날씨에도 별도 기준 시각과 상태를 표시한다.
- 최근 24시간의 144개 10분 버킷에 추정 범위 밴드를 구현했다. 결측과 최신 원천 시각 이후를 연결하거나 채우지 않고, 같은 기록의 텍스트 요약과 펼칠 수 있는 표를 제공한다.
- 시연 상태 선택기로 기본/첫 로딩/조회 오류/빈 데이터/부분 누락/지연/기록 수집 중을 선택한다. `scenario`를 포함해 데이터 모드, 장소와 필터/정렬이 URL에 남는다. 미등록 장소는 안내하거나 상세 경로에서 404로 처리한다.
- TanStack Query의 dataset/scenario별 key, 서버 초기 자료와 초기 수신 시각, 조회 취소/캐시 제거를 적용했다. 재조회 중에는 직전 자료를 유지하고, 자동 확인 중지와 오프라인 안내를 구현했다. 이 동작들의 실제 브라우저 검증은 아래와 같이 미실행이다.
- live는 연결 준비 화면이다. 공개 live 조회는 `LIVE_UNAVAILABLE`이며 합성 데이터로 대체하지 않는다. API 키나 원천 URL을 클라이언트로 전달하지 않는다.
- `/data-info`에 추정치/시각/최신성/과거 부족/조회 의미와 공식 출처를 작성했다. 390px을 포함하는 모바일 CSS, 2열 KPI, 좁은 화면의 단일 열 탐색과 영역 내 표 스크롤, 키보드 링크/버튼/포커스, 색상 외 상태 문구와 기호, 동작 감소 설정을 구현했다.

### 핵심 변경 파일

| 파일 | 역할 |
| --- | --- |
| `src/lib/contracts/dashboard.ts` | 공통 DTO와 Zod 범위/시각/결측/출처 계약 |
| `src/lib/domain/catalog.ts`, `metrics.ts` | 공식 카탈로그 공유, 최신성/KPI/한국 시간 표시 |
| `src/lib/fixtures/demo.ts`, `src/lib/server/repositories/demo.ts` | clock/seed를 주입하는 고정 합성 값과 서버 전용 DemoRepository |
| `src/lib/url-state/dashboard.ts` | URL 파싱, 허용 enum, 길이/코드/비교 수 제한과 링크 생성 |
| `src/lib/query/dashboard.ts`, `src/app/providers.tsx` | TanStack Query 읽기와 dataset/scenario 캐시 경계 |
| `src/app/api/v1/[dataset]/{overview,history}/route.ts`, `src/lib/server/demo-response.ts` | 합성 자료만 읽는 공개 조회와 안전한 live/오류 응답. 원천 fetch/DB 쓰기 없음 |
| `src/features/dashboard/*` | 서버 초기 자료 준비, 개요/목록/상세와 지연 로딩하는 Recharts 범위 차트 |
| `src/components/*`, `src/app/globals.css` | 앱 탐색, 상태 컴포넌트, SVG 아이콘과 다크 반응형 스타일 |
| `src/app/page.tsx`, `demo/page.tsx`, `areas/[areaCode]/page.tsx`, `data-info/page.tsx`, `error.tsx`, `not-found.tsx`, `layout.tsx` | 경로 연결과 안전한 준비/오류/미등록 화면 |
| `package.json`, `package-lock.json` | TanStack Query 5.104.2, Recharts 3.10.1, react-is 19.3.0 정확한 버전 추가 |
| `vitest.config.ts`, `tests/unit/{url-state,demo,data-status}.test.ts` | 경로 alias와 19개 테스트 작성. 실행하지 않음 |
| `README.md`, `docs/01_PRODUCT_AND_UI.md`, `02_ARCHITECTURE.md`, `03_DATA_AND_API.md` | 실제 M1 범위, URL/초기 캐시와 구현된 DTO 반영 |

기존 환경 경계, 로컬 비밀 설정, 공식 원본 자료와 사용자 AGENTS 지시를 보존했다. Git 메타데이터 없음은 파일시스템으로 확인했고 Git 초기화/브랜치/commit/push/PR을 하지 않았다.

### 실행한 확인과 결과

모든 npm 명령은 프로젝트 로컬 Node 24.21.0 / npm 11.19.0으로 실행했다. 단위/통합/E2E와 앱 HTTP/브라우저 smoke 요청은 실행하지 않았다.

| 확인 | 결과와 한계 |
| --- | --- |
| 공식 npm metadata와 라이브러리 공식 문서 | 필요한 패키지의 버전과 React 19 peer 범위, TanStack 초기 데이터와 Recharts 범위 API 확인 |
| `npm install --save-exact ... --no-audit --no-fund` | 관련 3개 의존성과 lockfile 갱신. fsevents/unrs-resolver install script 승인 경고, 추가 승인 없음 |
| `npm ls --depth=0` | 설치한 최상위 의존성과 버전 확인, 종료 0. 보안 audit 아님 |
| 최종 `npm run lint` | 종료 0, 경고 0. 최초 서버 렌더의 Date.now 규칙 오류는 시각을 서버 데이터 준비 단계에서 한 번 확정하도록 수정 |
| 최종 `npm run typecheck` | Next 라우트 타입과 TypeScript strict 종료 0. 최초 Zod 제네릭 refine의 타입 오류는 구체적인 section 계약 위치에서 검증하도록 수정 |
| 최종 `npm run build` | 종료 0. 환경변수로 API/DB 비밀을 비우고 demo/수집 중지/HTTP 거부 상태로 7개 경로 빌드 확인. 실제 배포 아님 |
| 샌드박스 빌드 실패 확인 | 최초 Turbopack CSS 처리의 내부 포트 생성이 `Operation not permitted`로 실패. 같은 빌드를 허용된 실행 경로에서 다시 확인했으며 코드 오류로 숨기지 않음 |
| React Doctor `--verbose --scope changed` | 종료 1. Git `HEAD`가 없어 변경 비교 시작 불가. 점수/통과 주장 없음, Git 초기화나 다른 기준으로 대체하지 않음 |
| 소스/테스트/클라이언트 빌드 자산의 비밀 문자열 확인 | 검사 시 48개 파일에 실제 로컬 키 문자열 없음. 키 값/URL은 출력하지 않음. 전체 보안 검증을 대체하지 않음 |
| 문서/소스 정적 확인 | 상대 링크 대상, 코드 블록 경계, UI/변경 문서의 가운데점 부재 확인. 작성 테스트 수는 새 19개와 기존 6개, 실행 결과 아님 |

### 미완료, 검증 한계와 다음 단계

단위/통합/E2E, API route 실행, 실제 브라우저, 390px/1440px 화면, 키보드/포커스, 뒤로가기와 URL 공유, 숨김 탭/오프라인/재조회, Recharts 툴팁과 결측 밴드 렌더링은 사용자의 테스트 실행 지시가 없어 **미검증**이다. 테스트 통과나 M1 전체 통과 조건 충족으로 기록하지 않는다. 상태는 **구현 완료 / 검증 대기**다.

지도 자산/렌더링, 비교 UI, 즐겨찾기, 7일 조회와 CSV는 M4 범위로 남겼다. 임의 도형/대표점은 만들지 않았고, 지도 대신 목록을 제공한다. `range=7d` 링크는 준비 안내와 실제로 표시하는 24시간 범위를 명시한다. 원천 추가 호출, XML adapter, DB 변경, Cron 활성화와 배포는 수행하지 않았다. M0의 키 한도/전송 운영/공식 시간대와 단위/배포 환경 검증도 남겨두었다.

M1 결과를 검토하고 사용자 지시가 있을 때 테스트를 실행한다. 다음 개발 요청에서는 M2의 서버 전용 XML client와 성공/실패 envelope 파서부터 시작한다. 현재 작업에서 M2로 진행하지 않았다.

## 11. 첫 화면 대시보드 개선 (2026-10-14)

### 요청과 변경

사용자가 서울 관제 대시보드 참고 이미지를 제시하며 첫 화면을 대시보드처럼 보이게 요청했다. M1 화면의 후속 개선으로 진행했고 API adapter/정기 수집/DB 단계로 넘어가지 않았다. 참고 이미지의 공간 중심 배치를 적용하되 뉴스/CCTV/재난/성과 수치를 임의로 추가하지 않았다.

- 왼쪽 사이드바를 상단 브랜드/탐색바로 바꿔 공간을 확보했다. 중앙 서울 위치 개요, 좌측 2×2 KPI와 자료 최신성, 우측 선택 장소 상세를 3열로 배치했다. 하단에는 인구 범위 차트/탐색 목록과 전체 자료 시각 표를 이어 배치했다.
- 공식 서울 자치구 경계 25개를 배경으로 그리고 초기 5곳의 공식 표시 좌표와 기존 공식 장소 도형을 사용했다. 자치구를 혼잡도로 채색하거나 서울 전역 인구를 합산하지 않았다. 표식/범례/상세의 값은 기존 합성 fixture이며 실시간 관측처럼 표현하지 않는다.
- 지도 표식과 목록은 같은 `area`, 검색/혼잡 필터 URL을 사용한다. 선택 링크에 장소/혼잡/범위/최신성 설명과 키보드 포커스를 제공하고 44px 표식 영역을 사용했다. 지도가 렌더 실패하면 목록과 상세는 남는 오류 경계를 추가했다. 실제 동작 검증은 미실행이다.
- 기본 demo 환경에서 query 없는 첫 `/` 요청만 명시적인 강남역 선택 demo URL로 이동한다. 선택 해제 URL에는 dataset이 남아 다시 강제로 선택하지 않는다. live 기본값을 demo로 바꾸지 않는다.
- 시연 모드/상태 선택은 접을 수 있는 화면 설정으로 옮겼고, 합성 데이터 배너는 계속 표시한다. 첫 로딩 스켈레톤도 새 레이아웃 크기에 맞춰 수정했다. 반응형 스타일, 데이터 안내와 출처도 갱신했다.

### 공식 자산과 실제 확인 범위

| 자료 | 출처와 가공 |
| --- | --- |
| 자치구 경계 | [서울시 공개 격자 지도](https://data.seoul.go.kr/opendata/seoulStay/grid_viewer.html)의 `SIGUNGU` GeoJSON 25개. 페이지의 기준일은 2025-06-30. `docs/sources/seoul-districts-20250630.geojson`에 추출 원본 보관 |
| 5곳 표시 위치 | [서울시 실시간 도시데이터 공식 화면](https://data.seoul.go.kr/SeoulRtd/)의 공개 분류 목록. 페이지 지도 링크와 같은 x=위도/y=경도. 실제 관측값은 프로젝트에 보관하지 않고 장소명/표시 좌표만 `docs/sources/seoul-hotspot-display-points.json`에 저장 |
| 장소 도형 | 기존 공식 `docs/sources/areas.zip`의 SHP/DBF에서 이미 카탈로그로 확인한 5개 코드를 읽음. 원본은 수정하지 않음 |
| 표시 자산 | `scripts/build-overview-map.py`가 로컬 원본에서 구면 Web Mercator와 고정 SVG 좌표로 가공. 앱 자산 `src/lib/geo/seoul-overview.json`은 39,507 bytes. 재생성 시 네트워크/키 접근 없음 |
| 메타정보 | `docs/sources/seoul-overview.meta.json`에 원본/산출물 SHA-256, 출처/기준일/좌표계와 가공 범위 기록. 자치구 자산의 별도 재배포 조건은 공개 배포 전에 확인할 항목으로 남김 |

자치구 라벨 좌표는 표시 도형에서 계산한 라벨 배치용 중심이며 공식 장소 대표점이 아니다. 초기 장소 표식에는 홈페이지가 공개한 표시 좌표를 그대로 사용했다. 구별 인구, 가짜 대표점, 임의 한강 경로/배경 도로/지도 타일은 만들지 않았다. 전체 폴리곤 유효성/위상/대표점 검증을 마친 결과가 아니며, M4의 MapLibre 확대축소/카메라 검증도 남겨두었다.

공식 자료 열람에는 별도 브라우저 조사 세션을 사용하고 종료했다. 공개 홈페이지 읽기 외에 사용자 실제 키로 추가 요청하지 않았다. 로컬 앱을 열거나 클릭/스크린샷 테스트하지 않았다.

### 변경 파일과 확인

핵심 변경은 `src/features/dashboard/{dashboard,dashboard-page,seoul-overview-map}.tsx`, `src/components/{app-shell,data-status}.tsx`, `src/app/{globals.css,data-info/page.tsx}`와 위 지도 자산/가공 스크립트다. `README.md`, 제품/구조 문서와 이 진행 기록을 반영했다. 의존성/lockfile, 서버 비밀 설정, 데이터 조회/수집 경계와 기존 테스트는 변경하지 않았다.

| 확인 | 결과와 한계 |
| --- | --- |
| 지도 자산 가공 | 공식 25개 자치구/5곳 표시 위치를 로컬 벡터로 생성. 재생성은 보관된 원본만 읽어 같은 산출물을 생성. GIS 전체 검증이나 앱 동작 테스트가 아님 |
| 최종 `npm run lint` | 종료 0, 경고 0 |
| 최종 `npm run typecheck` | 라우트 생성과 TypeScript strict 종료 0 |
| 최종 `npm run build` | 키/DB 환경을 비우고 demo/수집 중지/HTTP 거부로 종료 0. 새 지도 포함 7개 경로 빌드. 배포 아님 |
| React Doctor 변경 비교 | 종료 1, `HEAD`가 없어 비교 시작 불가. 점수/통과 주장 없음. Git 초기화로 우회하지 않음 |
| 원본/자산/문서 정적 확인 | JSON 구문과 원본/산출물 SHA-256 일치, 상대 링크/코드 블록/가운데점 부재 확인 |
| 비밀 문자열 확인 | 소스와 클라이언트 빌드 파일 46개에서 실제 로컬 키 문자열 없음. 값/인증 URL은 출력하지 않음. 전체 보안 테스트 대체 아님 |

### 미실행과 다음 작업

사용자의 명시 실행 지시가 없어 기존 테스트 25개, 통합/E2E, 로컬 앱 HTTP/브라우저 smoke, 390px/1440px 화면 확인, 지도 클릭/필터/키보드/오류 대체, URL 초기 선택/뒤로가기와 차트 렌더링은 미검증이다. 코드/정적 검사와 실제 화면 검증을 구분하며 상태는 **구현 완료 / 검증 대기**다.

Git 초기화/브랜치/commit/push/PR, 원격 DB 변경, Cron 활성화, 실제 배포와 사용자 키의 추가 원천 실호출을 수행하지 않았다. 실시간 연결은 계속 미구현이며 현재 화면은 합성 데이터다. 화면 결과를 검토한 뒤 별도 지시에 따라 테스트 또는 다음 M2 개발을 진행한다. M4 전체 단계로 자동 진행하지 않았다.

## 12. M2 실제 API adapter (2026-10-14)

### 요청과 구현 범위

사용자의 다음 기능 개발 요청에 따라 M2만 구현했다. 공개 화면은 계속 합성 데이터이며 adapter를 공개 route/페이지에 연결하지 않았다. M3 DB와 수집, 예약 작업과 배포로 진행하지 않았다.

- 서버 전용 `config/client/xml/adapter/errors`를 추가했다. 확인된 HTTP origin/port와 공식 카탈로그 코드만 허용한다. HTTP 기본 거부, 별도 명시 시간대, 8초 전체 처리 제한, 8 MiB 스트림 제한, redirect 거부, 외부 취소와 자동 재시도 없음 정책을 적용했다.
- XML의 DOCTYPE/ENTITY를 파싱 전에 거부하고 processEntities/자동 숫자 변환을 끈다. 깊이 32, 태그 50,000과 현재 블록 16개 상한을 두었다. HTML/잘못된 XML/다중 envelope/성공 이외 코드/잘못된 장소 식별자를 거부한다. parser 원본 오류와 원천 메시지는 보관/출력하지 않는다.
- 인구는 상하한과 계산 중앙값을 유지하고, 결측과 명시적 0, 천 단위 쉼표와 잘못된 범위를 구분한다. 알 수 없는 혼잡은 unknown이다. 현재 인구/날씨 wrapper를 각각 읽으며 예측을 현재나 과거 값으로 변환하지 않는다. 같은 정규화 값의 반복만 허용하고 충돌은 해당 section invalid다.
- 인구와 날씨를 독립적으로 검증한다. 날씨의 일부 오류는 해당 필드만 null로 두며 기온/습도를 연결했다. section 전체가 무효/미제공이면 value/observedAt/fetchedAt을 null로 두고 lastAttemptAt만 이번 시각으로 기록한다. 직전 정상값 저장/병합은 M3의 범위다.
- `verify:seoul`은 기본적으로 설정만 확인한다. `--execute`가 있으면 지정한 한 장소를 1회 조회하는 구현이다. HTTP 1회 옵션과 시간대 옵션은 실행에만 적용하고 로컬 환경 파일을 수정하지 않는다. DB 쓰기/예약/자동 재시도가 없다. 키/인증 URL/원본 XML/원본 예외 대신 정규화한 값/시각, 제한된 코드와 bytes/durationMs만 출력한다. durationMs는 요청 시작부터 정규화 종료까지다.
- 이전 승인으로 확보한 전체 강남역 XML 182,111 bytes를 정상 fixture로 재사용했다. checksum은 기존 수신 메타정보와 일치한다. 실제 수신 시각은 그대로이며 새로운 호출이나 시각 갱신은 없다. 실패 fixture 2개는 합성 사례임을 표시했다.
- adapter 16개와 client/config 13개, 총 29개 계약 사례를 작성했다. 기존 25개를 포함한 전체 54개 테스트는 실행하지 않았다. 계약/부분 성공/숫자/시각/반복/보안 제한/HTTP 200 실패/timeout/취소/비밀 제거 사례를 준비한 상태다.

### 공식 조사 결과와 미확인 사항

공식 API 상세 화면의 출력 필드와 결과 코드표를 읽었고, 공식 매뉴얼의 checksum을 이전 자료와 대조한 뒤 44쪽을 텍스트/렌더 이미지로 확인했다. ego-browser 공식 자료 조사 세션은 종료했으며 로컬 앱의 브라우저 테스트는 수행하지 않았다.

| 항목 | 이번 확인과 적용 |
| --- | --- |
| 성공 응답 | 앞선 강남역 전체 실응답을 근거로 dotted RESULT.CODE와 CITYDATA/현재 인구/현재 날씨 구조 사용 |
| 오류 코드 | 공식 상세 화면의 INFO-100/INFO-200/ERROR-500/600/601 표기 확인. 오류 XML 형태 자체는 실제 캡처가 없으므로 합성 사례 지원으로만 기록 |
| 기온/습도 | 공식 API 필드 설명과 공개 weather.js의 ℃/% 표시를 대조. `docs/sources/seoul-weather-units-20261014.json`과 필드 설명 기록 추가 |
| PM25 | 같은 공개 코드에 ㎍/㎡와 ㎍/㎥가 혼용되어 DTO 연결 보류. null과 pm25-unit-unconfirmed 반환 |
| 시간대 | 응답에 offset이 없고 이번 공식 자료에서 확정 문구를 찾지 못함. 기본 자동 변환 없음. Asia/Seoul 설정/옵션은 실행자가 명시한 해석 기준이며 공식 검증의 증거가 아님 |
| 전송/한도 | HTTPS/운영 HTTP 승인/실제 키 한도/배포 환경 확인은 그대로 남음. 앞선 로컬 1회 HTTP 승인은 재사용하지 않음 |

### 변경 파일과 실행한 확인

`src/lib/server/seoul/*`, `scripts/verify-seoul-api.ts`, `tests/unit/seoul-*.test.ts`, `tests/helpers/seoul.ts`, `tests/fixtures/seoul/*`를 추가했다. CLI의 native Node TypeScript 실행을 위해 공식 카탈로그 JSON import에 type attribute를 지정했다. 환경 점검에는 시간대 설정 존재 여부와 adapter 구현 상태만 추가했으며 실제 설정값을 출력하지 않는다. `package.json/package-lock.json`, 비밀 없는 `.env.example`, README와 구조/데이터/운영 문서를 반영했다. 로컬 `.env.local`의 값은 변경하지 않았다.

| 확인 | 결과와 한계 |
| --- | --- |
| XML 의존성 | fast-xml-parser 5.11.2 정확한 버전 설치, npm ls 종료 0. 공식 DOCTYPE 제한 우회 보안 공지의 수정 버전 5.10.1 이후와 설치 옵션 소스 확인 |
| install script 경고 | 기존 fsevents/unrs-resolver 승인 경고. 추가 승인/실행하지 않음 |
| 최종 `npm run lint` | 종료 0, 경고 0 |
| 최종 `npm run typecheck` | 종료 0. 최초 empty section의 제네릭 반환 추론과 env spread 타입 오류는 null section 반환 타입/환경 Record 타입을 명시해 해소 |
| 최종 `npm run build` | 종료 0. 서울시/DB 비밀과 시간대 설정을 비우고 demo/수집 중지/HTTP 거부로 7개 경로 빌드. 배포나 adapter 동작 테스트가 아님 |
| `verify:seoul -- --help` | 종료 0, native Node로 사용법 출력. 설정 dry-run과 execute 경로의 기능 실행은 미검증 |
| `npm audit --omit=dev --json` | 조회 시 운영 의존성에 등록된 advisory 0개. 전체 보안 검증이나 향후 안전 보장이 아님 |
| 원본/출처 정적 확인 | 원본 fixture/PDF checksum 일치, JSON 구문, 상대 링크와 Markdown 코드 블록 확인. 작성한 문서/코드의 가운데점 부재 확인 |
| 비밀/의존 경계 정적 확인 | 소스/문서/fixture/클라이언트 빌드 등 77개 파일에서 실제 로컬 키 문자열 0개. 앱 소스의 서울시 client/adapter import 없음. 값/인증 URL은 출력하지 않음 |

### 검증 대기와 다음 단계

사용자의 테스트 실행 지시가 없어 단위/통합/E2E, fixture를 adapter로 실행하는 계약 대조, CLI dry-run/execute 기능 실행, 새 실제 API 호출과 브라우저 테스트는 **미실행**이다. lint/typecheck/build와 작성 사례를 동작 테스트 통과로 표시하지 않는다. M2 상태는 **구현 완료 / 외부 검증 대기**다.

공식 시간대/PM25 단위, 실제 실패 envelope, 다른 장소 변형, 호출 한도와 배포 전송 검증이 남아 있다. 실제 수집 시작 시각/이력은 없고 화면은 합성 데이터다. Git 초기화/브랜치/commit/push/PR, 원격 DB 변경, Cron 활성화와 배포를 수행하지 않았다. 다음 개발 단계는 M3의 로컬 migration/읽기 Repository/수집 코드 준비이며 별도 개발 요청 전 자동 진행하지 않는다.

## 13. MUI 디자인 라이브러리 통일 (2026-10-14)

### 사용자 요청과 변경

사용자가 모든 디자인 작업과 컴포넌트를 MUI로 구현해 일관성을 유지하도록 요청했다. 기존 UI의 전환과 앞으로 적용할 프로젝트 규칙을 함께 반영했다. 데이터/API/DB 단계를 추가로 구현하지 않았다.

- Material UI/Material Icons/Next.js 통합 9.5.0, 무료 MUI X Charts 9.15.0과 Emotion react 11.14.0/styled 11.14.1/cache 11.14.0을 정확한 버전으로 설치했다. 공식 npm의 React 19/Next 16 peer 범위와 각 패키지의 MIT license를 확인했다. Pro/Premium 의존성이나 유료 기능/서비스를 도입하지 않았다.
- src/theme/tokens.ts에 기존 다크 색상, 의미별 혼잡 색상, 숫자 글꼴과 3열/분석 레이아웃을 모았다. theme.ts에서 palette, typography, 8px 간격, breakpoints, radius와 공통 컴포넌트 기본값을 관리한다. 스타일은 MUI sx를 사용한다.
- Next 16 AppRouterCacheProvider와 ThemeProvider/CssBaseline을 연결했다. 기존 TanStack Query provider와 서버 데이터 경계를 유지한다. 기본 모드는 dark이며 폰트 외부 다운로드 없이 기존 한국어 시스템 글꼴을 사용한다.
- 공통 앱 탐색/합성 데이터 배너/본문/푸터, KPI/최신성/장소 상세/검색/정렬/혼잡 필터/목록/표/화면 설정을 MUI 컴포넌트로 바꿨다. 상태는 Chip/Alert, 로딩은 Skeleton/CircularProgress, 접기 UI는 Accordion, 아이콘은 공식 Material Icons를 사용한다. 지도 패널/표식/설명에도 MUI를 적용했고 공식 도형/좌표 자산은 수정하지 않았다.
- 차트를 Recharts에서 MUI X Charts로 전환했다. 투명 하한 series와 상하한 차이 series를 같은 stack에 두어 범위 밴드를 만들고 하한 선을 별도로 표시한다. null/linear/connectNulls=false/skipAnimation을 사용하고 툴팁에는 상하한/원천 시각/혼잡 단계만 표시한다. 범위 폭을 인구 값으로 표시하지 않는다. 동일 기록의 요약/결측 수/MUI 표를 유지했다. 실제 렌더/툴팁/결측 단절 확인은 미실행이다.
- 데이터 안내 표시를 client 컴포넌트로 분리하고 server page의 환경/URL 읽기는 그대로 유지했다. 오류/404 화면도 MUI로 전환하고 h1 의미를 제공한다. NextLink 버튼에는 nativeButton=false를 명시해 anchor 의미를 유지한다. 검색의 URL 복원에서도 라벨이 겹치지 않도록 고정 shrink를 사용한다.
- Tailwind/Recharts 의존성과 postcss.config.mjs를 제거했다. 기존 globals.css의 독립 UI 스타일은 MUI theme/sx로 옮겼으며 스크린리더 전용 문구와 본문 이동 링크의 접근성 CSS만 남겼다. react-is 19.3.0은 MUI가 사용하는 React 버전과 맞춰 유지했다.
- AGENTS.md에 사용자 MUI 기준을 기록하고 README, 제품과 구조 문서를 갱신했다. 새 기능에도 같은 기준이 적용된다.

### 변경 파일

핵심 파일은 src/theme/{tokens,theme}.ts, src/app/{layout,providers,globals,error,not-found}, src/components/{app-shell,data-status,icon,panel-heading}.tsx, src/features/dashboard/{dashboard,history-chart,seoul-overview-map}.tsx와 src/features/data-info/data-info.tsx다. 데이터 안내 server page와 package.json/package-lock.json, 위 디자인 규칙 문서/진행 기록을 반영했다. 기존 로컬 비밀 설정, API adapter, 공식 지도 자산과 테스트는 변경하지 않았다.

### 실행한 확인과 결과

모든 npm 명령은 프로젝트 로컬 Node 24.21.0/npm 11.19.0으로 실행했다. 단위/통합/E2E와 앱 HTTP/브라우저 테스트는 실행하지 않았다.

| 확인 | 결과와 한계 |
| --- | --- |
| 공식 MUI 조사 | Next App Router 스타일 캐시/Next 16 client 경계, MUI 9 system props 제거/nativeButton, 무료 Charts의 stack/area/null API 확인 |
| 설치/제거와 npm ls | 정확한 패키지와 lockfile 반영. 최상위 설치 목록 종료 0. 기존 fsevents/unrs-resolver install script 경고는 추가 승인하지 않음 |
| 최종 npm run lint | 종료 0, 경고 0 |
| 최종 npm run typecheck | 종료 0. 최초 MUI 9의 제거된 system props와 ThemeProvider 비공개 import 오류는 공식 타입/문서에 따라 sx와 공개 styles export로 수정 |
| 최종 npm run build | 종료 0. API/DB 비밀과 원천 시간대를 비우고 demo/수집 중지/HTTP 거부로 7개 경로 빌드. 배포/실제 화면 테스트 아님 |
| React Doctor --verbose --scope changed | 종료 1. Git HEAD가 없어 비교 시작 불가. 점수/통과 주장 없음, Git 초기화로 우회하지 않음 |
| npm audit --omit=dev --json | 조회 시 운영 의존성에 등록된 advisory 0개. 전체 보안 검증의 대체 아님 |
| 정적 UI/문서 검사 | 작성 파일 24개에서 기본 button/input/select/table/details/a 위젯 대신 MUI 사용, 가운데점/코드 블록/상대 링크 확인. 지도 geometry용 SVG 원문은 데이터 자산으로 유지 |
| 비밀/원천 의존 경계 | 소스/문서/fixture/클라이언트 빌드 등 89개 파일에서 실제 로컬 키 문자열 0개. 앱의 원천 client/adapter import 없음. 비밀값이나 인증 URL을 출력하지 않음 |

공식 참고: [MUI Next.js 통합](https://mui.com/material-ui/integrations/nextjs/), [MUI 9 변경사항](https://mui.com/material-ui/migration/upgrade-to-v9/), [MUI X Lines/area/stack/null](https://mui.com/x/react-charts/lines/), [MUI 개별 import](https://mui.com/material-ui/guides/minimizing-bundle-size/). 설치한 Charts 소스의 area stack 하한과 null 단절 분기를 읽은 것은 정적 계약 확인이며 앱 차트 테스트를 실행한 결과가 아니다.

### 미실행과 다음 작업

사용자의 명시 실행 지시가 없어 기존 테스트 54개, 통합/E2E, 실제 브라우저와 390px/1440px 화면, SSR/hydration, 키보드/포커스, MUI 선택 팝업/Accordion, URL/뒤로가기/검색 라벨/모드 전환과 차트 밴드/툴팁/결측 렌더링은 미검증이다. 빌드/타입 검사를 실제 UI 동작 통과로 표시하지 않는다. 상태는 구현 완료 / 검증 대기다.

현재 화면은 계속 시연용 합성 데이터다. 서울시 API 추가 실호출, Git 초기화/브랜치/commit/push/PR, 원격 DB 변경, Cron 활성화, 실제 배포와 유료 서비스 신청은 수행하지 않았다. M2 외부 계약의 미확인 항목도 그대로 남긴다. 다음 기능 개발 요청에서는 MUI 기준을 유지하며 M3 DB/수집 코드 준비로 진행하고, 이번 요청에서 자동 진행하지 않았다.

## 14. M3 DB와 수집 파이프라인 (2026-10-14)

### 요청과 구현 범위

사용자의 다음 기능 개발 요청에 따라 M3만 구현했다. 기존 MUI 테마와 컴포넌트를 유지하면서 실제 DB에 저장된 자료를 읽는 경로와 보호된 수집 코드를 준비했다. 로컬/원격 DB를 생성하거나 접속하지 않았으며 migration 적용, 새 원천 호출, Cron 활성화와 배포도 수행하지 않았다. `.git`이 없음을 확인했고 Git 초기화/브랜치/commit/push/PR은 하지 않았다.

- Supabase 공식 changelog/키/함수/RLS/Cron과 PostgreSQL SHA-256/Next maxDuration 기준을 확인했다. supabase-js 2.117.3을 정확한 버전으로 설치하고 lockfile을 반영했다. Node 22 이상 요구를 프로젝트 Node 24 LTS가 충족한다. 기존 install script 경고는 추가 승인하지 않았다.
- Supabase CLI 2.120.0의 migration new를 사용해 파일만 생성했다. CLI init/start/reset/db push/test는 실행하지 않았다. `supabase/.temp/`를 Git 제외에 추가했다.
- 공개 3개/비공개 4개 테이블, 공식 5곳, 숫자/시각/JSON CHECK, RLS, 명시적인 역할 권한과 인덱스를 작성했다. 모든 장소는 collection_enabled=false이며 최신/이력 관측은 초기화하지 않는다. private는 exposed schemas에 등록하지 않는다.
- 모든 helper/RPC는 SECURITY INVOKER와 빈 search_path를 사용한다. 수집/정리 6개 RPC와 private helper는 service_role만 실행하고 읽기 전용 history RPC만 익명 실행을 허용했다. 실제 DB의 권한 결과는 미검증이다.
- DB 기준 10분 슬롯 UNIQUE, 120초 lease와 토큰 검사를 구현했다. 모든 원천 시도/재시도 전에 KST 일일 예산과 시도 원장을 같은 트랜잭션으로 예약한다. 중복 슬롯/시도/열린 circuit/예산 부족이면 원천을 호출하지 않는 경로다. 예약 직후 중단돼도 예산을 반환하지 않는다.
- 원천 동시성 2, 일시 장애 재시도 1회, 획득 지연 포함 최대 45초 작업/DB 50초 기한, 4초 DB 요청/8초 원천 제한을 작성했다. 인증 실패는 수동 복구까지 circuit을 유지하고 429는 제한된 Retry-After 또는 다음 슬롯까지 차단한다. 종료 기록에는 예약과 원천 시작 수를 구분한다.
- 저장 RPC에서 인구 이력/최신값을 원자적으로 반영한다. 같은 시각/같은 hash는 행과 revision을 늘리지 않고, 수정된 min/max/congestion은 revision을 높인다. 과거 응답은 최신값을 되돌리지 않으며 누락/실패는 직전 정상값과 시각을 유지한다. 날씨는 독립적으로 병합한다.
- publishable key 읽기 client와 secret key 관리 client를 분리했다. `sb_publishable_`/`sb_secret_` 형식을 구분하며 레거시 JWT 키는 받지 않는다. 공개 route/SSR의 읽기 factory에는 관리자/collector/원천 의존성이 없다.
- live/demo 공개 areas/overview/장소 상세/history/status와 SSR 초기 자료를 연결했다. live는 저장 자료만 읽고 설정/DB 오류는 503, 정상 빈 DB는 관측 없음으로 표시한다. 공개 장소의 수집 중지와 최근 section 실패를 MUI 안내로 구분하며 실데이터 오류를 합성 값으로 자동 대체하지 않는다.
- 이력은 한 DB 스냅샷에서 최근 24시간/최대 3곳의 관측/보유 시작을 읽고 실제 마지막 관측으로 10분 버킷을 만든다. null 결측, 원천 시각, 양 끝 부분 구간과 관측 수를 보존한다. 초과 자료를 조용히 잘라 반환하지 않는다. 차트 표에도 버킷과 원천 관측 시각을 별도로 표시했다. 7일/비교/CSV는 M4에 남긴다.
- `POST /api/internal/collect`는 Bearer 인증을 먼저 확인하고 최대 1KiB/2초 안의 빈 JSON 객체만 받는다. query/장소/URL 인자를 거부하며 no-store로 안전한 요약만 반환한다. CLI collect:once는 기본 설정 확인, --execute일 때만 실제 작업을 수행하도록 작성했다.
- 장소 활성화, 예약 생성/해제, 인증 circuit 수동 복구와 보존 정리 템플릿을 준비했다. 관측 30일/완료 실행과 예산 14일/Cron 종료 로그 14일 정책이며 열린 circuit/활성 lease/최신값을 보존한다. 모든 템플릿은 미실행이다.

### 변경한 핵심 파일

| 경로 | 역할 |
| --- | --- |
| supabase/migrations/20261014115659_seoul_pulse_storage_and_collection.sql | 테이블/권한/슬롯/예산/저장/읽기/정리 계약 |
| src/lib/server/database/* | URL/키 경계, 읽기/관리 client, 제한된 fetch와 안전한 오류 |
| src/lib/server/collector/* | 인증/설정/입력/저장 RPC/수집 orchestration |
| src/lib/server/repositories/{read,live,demo}.ts | 공개 읽기 factory와 live 저장 자료 조회 |
| src/lib/server/{http,public-response,page-data}.ts | 안전한 응답, API 분기와 서버 초기 자료 |
| src/app/api/v1/[dataset]/*, src/app/api/internal/collect/route.ts | 공개 조회와 보호된 수집 endpoint |
| scripts/collect-once.ts, package.json/package-lock.json | 명시 실행 CLI와 정확한 Supabase 의존성 |
| supabase/templates/*, supabase/README.md | 미활성 운영 템플릿, 전용 테스트 DB/적용/중지 절차 |
| tests/unit/{collector,collector-boundaries,live-history,public-read-boundary}.test.ts | M3 단위 계약 23개, 미실행 |
| tests/integration/collector-db.test.ts, vitest.integration.config.ts | 실제 로컬 DB 경합/익명 권한 2개, 미실행 |
| supabase/tests/database/storage_and_permissions.test.sql | pgTAP 12개 검사와 저장/rollback 계약, 미실행 |

M2 client/error에 안전한 Retry-After 해석을 추가했다. 공통 계약에는 수집 flag와 실제 이력의 부분 구간/관측 수를 추가했다. 기존 env 테스트의 구현 상태 기대값을 M3에 맞췄고 실행하지 않았다. MUI 대시보드/차트/지도 설명/데이터 안내와 README/구조/데이터/운영 문서를 함께 반영했다. 로컬 실제 비밀 값과 공식 지도 자산은 변경하지 않았다.

### 실행한 검사와 결과

| 검사 | 결과와 한계 |
| --- | --- |
| 최종 npm run lint | 종료 0, 경고 0 |
| 최종 npm run typecheck | 종료 0. Next 라우트 생성과 TypeScript strict 확인 |
| 최종 npm run build | 종료 0. 서울시/DB 비밀과 시간대를 비우고 demo/수집 중지/HTTP 거부로 11개 경로 빌드. DB/원천 접속이나 배포 없음 |
| collect:once -- --help | 종료 0. native Node가 사용법만 출력. dry-run/execute 기능 테스트 아님 |
| SQL/PL/pgSQL 정적 문법 | pglast 7.20/PostgreSQL parser 17.7로 migration/템플릿/SQL 검사 파일 6개 구문 분석 성공. 49개 migration 문장을 포함한 문법 확인이며 DB 실행/타입/권한/경합 검사 아님 |
| npm ls --depth=0 | 종료 0, supabase-js 2.117.3과 선언한 패키지 설치 확인 |
| npm audit --omit=dev --json | 종료 0. 조회 시 운영 의존성의 공개 advisory 0건. 전체 보안 검증 대체 아님 |
| React Doctor --verbose --scope changed | 종료 1. Git HEAD 부재로 비교 시작 불가, 점수/통과 없음. Git 초기화로 우회하지 않음 |
| 비밀/기본값 정적 검사 | 소스/문서/fixture/lockfile/클라이언트 빌드 116개 파일에서 실제 로컬 비밀 문자열 0개. env example 비밀 공란, 로컬 파일 0600과 수집/HTTP false 확인. 값/인증 URL 출력 없음 |
| 작성 파일 확인 | 한국어/가운데점 금지, 로컬 링크와 단위 77개/통합 2개 선언 확인. 테스트 runner를 실행한 결과가 아님 |

초기 npm audit/React Doctor의 registry 접근은 sandbox DNS 제한을 만났다. 공개 registry 읽기 재시도로 audit은 성공했고 Doctor는 HEAD 부재를 확인했다. pglast는 임시 폴더에만 설치했으며 앱 의존성에 추가하지 않았다. SQL 검사 파일도 파서로만 읽고 DB에서 실행하지 않았다.

### 미실행, 외부 설정과 다음 작업

사용자 명시 실행 지시가 없어 **단위 77개, 실제 DB 통합 2개, pgTAP 12개, E2E/브라우저/앱 HTTP/CLI dry-run/execute/새 실제 API 호출은 모두 미실행**이다. 테스트 파일 작성과 lint/typecheck/build를 권한/원자성/실제 동작 통과로 표시하지 않는다.

Supabase 프로젝트/DB는 미설정이고 migration을 적용하지 않았다. 실제 수집 시작 시각/보유 이력은 없으며 기본 화면은 합성 데이터다. COLLECTOR_ENABLED=false와 SEOUL_ALLOW_INSECURE_HTTP=false를 유지한다. 앞선 로컬 HTTP 1회 승인은 새 수집/정기 HTTP/공개 운영 승인으로 사용하지 않았다.

현재 상태는 **구현 완료 / 외부 검증 대기**다. 다음 확인은 별도 실행 지시에 따른 전용 로컬 DB 적용/익명 권한/병렬 예산/중복 관측/lease/장소 저장 rollback 검증이다. 원격 적용/수집 활성화/예약 등록/배포는 각각 승인 범위를 확인한 뒤 수행한다. 원천 공식 시간대/PM25, 실패/다른 장소, 실제 키 한도/HTTPS/배포 함수 한도도 미확인으로 남긴다. 다음 개발은 M4의 지도/분석이며 이번 작업에서 자동 진행하지 않는다.

공식 참고: [Supabase changelog](https://supabase.com/changelog), [API 키](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [함수와 권한](https://supabase.com/docs/guides/database/functions), [Cron](https://supabase.com/docs/guides/cron/quickstart), [PostgreSQL SHA-256](https://www.postgresql.org/docs/current/functions-binarystring.html), [Next.js maxDuration](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config).

## 15. 메인 대시보드 한 화면 배치와 차트 가독성 개선 (2026-10-15)

### 요청과 변경

사용자의 대시보드 재배치와 읽기 쉬운 그래프 요청을 반영했다. 기능 단계의 자동 진행이나 데이터 수집 범위 확장은 하지 않았다.

- KPI 4개를 상단 한 줄에 모았다. 하단 작업 영역은 장소 목록, 공식 서울 위치 개요, 선택 장소 요약과 최근 24시간 차트의 3열이다. 데스크톱 1200px 이상/높이 700px 이상에서 뷰포트 높이에 맞추며 1280×720 기본 화면에서 핵심 내용이 모두 보인다.
- 목록의 혼잡 단계, 추정 범위, 인구 기준 시각과 최신성을 두 줄로 정리했다. 검색은 바로 사용하고 필터/정렬은 MUI Dialog로 연다. 지도와 목록은 기존 URL 선택과 필터 상태를 유지한다.
- 화면 설정, 전체 자료 시각/최신성 표, 날씨와 장소 상세, 인구 기록 표를 각각 MUI Dialog로 옮겼다. 기본 페이지를 아래로 늘리지 않으며 긴 기록과 경고는 필요한 영역에서 읽을 수 있다.
- 이미 설치된 무료 MUI X Charts 9.15.0을 사용했다. 추가 패키지 설치와 lockfile 변경은 없다. 옅은 범위 음영, 얇은 상한, 점선 하한과 밝은 범위 중앙선을 표시한다. 중앙선은 (최소 + 최대) / 2로 계산한 값이며 확정 인원으로 표현하지 않는다.
- 한국 시간 눈금, 0부터 시작하는 인구 축, 단위와 범례를 정리했다. 장소명, 버킷 시작/원천 기준 시각, 인구 범위, 혼잡 단계와 집계 방식이 분리된 MUI 툴팁을 작성했다. null 기록은 연결하지 않고 보유 시작 안내와 같은 기록의 표를 유지한다.
- 실제 렌더링에서 예전 MUI 클래스 선택자가 적용되지 않아 음영이 진하게 나타나는 원인을 확인했다. 공식 lineClasses를 사용하도록 바꾸고 fillOpacity 0.22, 중앙선 2.5px 적용을 브라우저에서 확인했다.
- 모바일은 KPI 2열과 목록/지도/분석의 단일 열이며 낮은 창이나 확대 화면의 내용도 스크롤로 접근할 수 있게 했다. 스켈레톤을 새 배치에 맞췄으며 데모 표시, 추정치 해석, 누락/지연과 원천/수집 시각 구분을 보존했다.

주요 파일: src/features/dashboard/{dashboard,dashboard-panels,places-panel,dashboard-dialog,history-chart,seoul-overview-map}.tsx, src/components/{app-shell,data-status,panel-heading}.tsx, src/theme/tokens.ts. 화면 기준과 차트 구조를 docs/01_PRODUCT_AND_UI.md와 docs/02_ARCHITECTURE.md에 반영했다.

### 실행한 확인

| 확인 | 결과와 범위 |
| --- | --- |
| 최종 npm run lint | 종료 0, 경고 0 |
| 최종 npm run typecheck | 종료 0, Next 라우트 타입 생성과 TypeScript strict 확인 |
| 브라우저 기본 화면 시각 확인 | 합성 데모만 조회. 1788×975와 1280×720에서 페이지 높이가 뷰포트 높이와 일치했다. 마지막 1280×720 확인에서 전체 문서 1280×720, 목록 내부 278px/내용 278px, 주요 패널 내부 넘침 없음 |
| 모바일 시각 확인 | 390×844에서 문서 폭 390px, 가로 넘침 없음. 세로 배치와 스크롤을 유지했다 |
| React Doctor --verbose --scope changed | 종료 1. Git HEAD가 없어 변경 비교를 시작하지 못했다. 점수나 통과로 기록하지 않으며 Git 초기화로 우회하지 않았다 |

브라우저 확인은 기본 화면의 배치, 크기와 차트 스타일 확인이다. **단위, 통합, 자동 E2E, 키보드/URL/필터/대화상자/툴팁/시연 상태 전환 기능 테스트는 사용자 명시 실행 지시가 없어 실행하지 않았다.** 빌드도 이번 화면 수정에서 실행하지 않았다. 정적 검사와 시각 확인을 전체 기능 검증 통과로 표시하지 않는다.

로컬 브라우저는 기존 개발 서버의 합성 데모 SSR/조회 API만 읽었다. 서울시 원천 호출, Supabase 접속/DB 변경, 수집 활성화, Cron과 실제 배포를 수행하지 않았다. Git 저장소가 없음을 확인했으며 초기화/브랜치/commit/push/PR을 수행하지 않았다. 테스트 파일과 원천 데이터/공식 지도 자산/서버 조회 및 수집 코드는 변경하지 않았다.

이번 화면 변경은 구현과 정적/시각 확인을 마쳤다. 미완료 검증은 별도 실행 지시 이후의 상호작용, 접근성, 각 오류/누락 상태와 실제 브라우저 회귀 테스트다. M3의 외부 설정/실행 대기 사항과 M4의 지도 확대축소/비교/7일/CSV는 그대로 남긴다.

차트 참고: [MUI X Lines 공식 문서](https://mui.com/x/react-charts/lines/).

## 16. 교통 항목과 CCTV 영상 API 조사 (2026-10-15)

사용자의 제공 여부 조사 요청으로 공식 공개 문서만 확인했다. 앱 기능 코드는 변경하지 않았으며 키 발급 신청, 원천 실호출, 영상 재생, 테스트와 수집/배포 활성화는 수행하지 않았다.

- 현재 원천 citydata의 공식 출력 명세에는 ROAD_TRAFFIC_STTS(평균속도/소통지표/기준 시각, 도로 링크/좌표/구간 속도), ACDNT_CNTRL_STTS(사고/통제와 좌표/시각), PRK_STTS, SUB_STTS, LIVE_SUB_PPLTN, BUS_STN_STTS, LIVE_BUS_PPLTN, SBIKE_STTS와 CHARGER_STTS가 있다. 전체 공개 필드 명세에서 CCTV 영상 항목은 확인되지 않았다. 기존 앱 adapter는 인구와 날씨를 연결하며 교통 항목의 실제 응답/저장은 검증 전이다.
- 국토교통부 국가교통정보센터 CCTV 화상자료는 별도 인증키와 경위도 영역 등으로 조회한다. 공개 명세의 cctvType은 HLS, MP4, 정지 영상과 HTTPS HLS/MP4를 구분하며 cctvurl, 설치 장소명, 좌표, 생성 시각, 형식과 해상도를 반환한다. JSON/XML은 조회 응답 형식이고 영상 형식과 구분해야 한다. 공공데이터포털의 현행 상세 화면은 무료/출처표시 제1유형/개발 및 운영 자동승인을 안내한다. 검색 요약의 오래된 이용허락 표기보다 직접 열람한 상세 화면을 기준으로 기록했다.
- 경찰청 UTIC는 실제 스트리밍 CCTV 영상을 포함하는 URL을 키/IP 인증으로 제공한다. 신청 목적 준수와 경찰청 출처표시가 필요하다. 목록은 UTIC 사업 연계 카메라 중심으로 홈페이지 지도와 제공 범위가 다를 수 있으며, 영상 변경/중단과 적어도 일 1회 확인을 안내한다. 공개 레퍼런스는 과도한 전체 목록 크롤링 차단 및 고속도로/국도 CCTV를 국가교통정보센터로 분리하는 안내도 포함한다.
- 이름이 비슷한 국토교통부 교통CCTV API는 위치/설치 정보만 제공한다고 명시한다. 서울시설공단의 서울도시고속도로 CCTV 파일도 ID/위치/대수 정보이며 영상 확인은 smartway 사이트로 안내한다. 이들 자료를 영상 URL API로 해석하지 않는다.
- 제품 적용 의견: 기존 citydata의 도로 소통과 사고/통제 정보를 먼저 연결하고, CCTV는 장소 주변 카메라가 실제 제공되는지 확인한 뒤 선택한 1개 영상을 필요할 때 여는 방식이 현재 한 화면 대시보드에 맞는다. 카메라 보유 여부, 웹 HTTPS 재생/CORS, 인증/IP와 예정 배포 환경의 호환성은 후속 검증 대상이다. 이 의견은 기능 구현/신청/배포 승인이나 검증 완료를 뜻하지 않는다.

확인한 공식 출처:

- [서울시 citydata 출력 명세](https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do)
- [국가교통정보센터 CCTV 명세](https://its.go.kr/opendata/opendataList?service=cctv)
- [국토교통부 CCTV 화상자료 상세/이용조건](https://www.data.go.kr/data/15040466/openapi.do)
- [UTIC CCTV 레퍼런스](https://www.utic.go.kr/guide/utisRefCctv.do)
- [UTIC 신청과 준수사항](https://www.utic.go.kr/guide/newUtisDataWrite.do)
- [국토교통부 교통CCTV의 위치정보 한정 안내](https://www.data.go.kr/data/3068943/openapi.do)
- [서울시설공단 CCTV 위치 자료](https://www.data.go.kr/data/15144351/fileData.do)

서울시 명세와 TOPIS 안내는 브라우저로 읽었고 다른 기관 자료는 공개 문서 조회로 확인했다. ITS 사이트 진입 중 위치 권한 팝업으로 브라우저가 사용자 제어로 바뀌어 브라우저 작업을 중단했다. 위치 권한을 허용하거나 사용자 제어를 회수하지 않았으며 이후 공개 문서 명세만 읽었다. API 실호출과 브라우저 영상 재생 결과로 기록하지 않는다.

## 17. 인구 그래프 범위 음영 제거 (2026-10-15)

사용자의 그래프 채움 제거 요청에 따라 history-chart.tsx의 범위 면적과 투명한 누적 기준 시리즈를 제거했다. 최소/최대 추정값을 각각 하한 점선과 얇은 상한선으로 직접 표시하며 밝은 범위 중앙선을 유지한다. 범례의 채워진 사각형도 상한/하한 선 모양으로 바꿨다. 툴팁, 실제 최소/최대 값, 중앙값 계산, 시간축, null 결측과 기록 표는 유지한다. MUI X Charts를 계속 사용하고 의존성은 변경하지 않았다. README와 제품/UI 및 아키텍처 문서의 차트 표현도 맞췄다.

검증: 최종 npm run lint 종료 0/경고 0, npm run typecheck 종료 0. React Doctor --verbose --scope changed는 Git HEAD 부재로 종료 1이며 점수/통과 없음. 사용자 지시에 따라 단위/통합/E2E 테스트는 실행하지 않았고 이번 변경의 브라우저 시각 확인과 build도 실행하지 않았다. 후속 확인은 선 전용 그래프의 실제 화면과 상호작용 검증이다. 앱의 다른 기능, API 수집, DB, Cron, 배포와 Git 작업은 수행하지 않았다.

## 18. 중앙선만 표시하고 차트 색상 강조 (2026-10-15)

사용자 요청으로 상한/하한 시리즈와 해당 범례를 제거하고 계산한 추정 범위 중앙선 하나만 남겼다. src/theme/tokens.ts의 차트 색상은 chartLine=#38CFFF로 정리하고 MUI X Charts 실선 및 범례에 같은 색과 3.5px 굵기를 적용했다. 선의 모서리도 둥글게 처리했다. 원래의 최소/최대 값은 선택 장소 수치, 툴팁과 기록 표에 유지하며 null 결측을 연결하지 않는다. 데이터 안내와 README, 제품/UI 및 아키텍처 문서도 중앙선만 표시하는 현재 기준에 맞췄다.

검증: npm run lint 종료 0/경고 0, npm run typecheck 종료 0. React Doctor --verbose --scope changed는 Git HEAD 부재로 종료 1, 점수/통과 없음. 사용자 지시에 따라 단위/통합/E2E 테스트는 실행하지 않았다. 브라우저 시각 확인과 build도 미실행이다. 다음 확인은 중앙선 색상과 굵기의 실제 화면 및 툴팁/기록 표 동작 검증이다. 의존성, API/DB/수집/Cron/배포와 Git 작업은 변경하거나 실행하지 않았다.

## 19. 실제 API 수집본의 개발 화면 연결 준비 (2026-10-15)

사용자가 합성 값 대신 API를 요청해 필요한 실제 자료를 표시하도록 지시했다. 기존 로컬 서울시 키의 설정 여부만 확인했으며 비밀 값은 출력하지 않았다. Supabase URL/읽기 키/관리 키는 미설정이다. 원격 DB 없이 이번 로컬 화면을 확인할 수 있도록 개발 전용 수동 수집본 경로를 준비했다. 운영 저장소는 계속 Supabase이며 production에서 파일 backend는 거부한다.

- scripts/capture-seoul.ts와 capture:seoul 명령을 추가했다. 명시적인 --execute에서 공식 5개 장소를 각 1회 순차 조회하며 자동 재시도는 없다. 인증/요청 제한이면 이후 요청을 중지한다. 원본 XML/인증 URL/키를 저장하거나 출력하지 않고 기존 서버 adapter의 인구 범위/혼잡도/기온/습도/시각만 사용한다. PM25 단위 미확인 정책은 유지한다.
- .local/data/seoul-snapshot.json의 서버 전용 검증/읽기/원자적 저장을 분리했다. 등록 장소 대조, 8MiB 제한, 0600 파일/0700 폴더, 단일 수집 잠금과 같은 10분 슬롯 중복 방지를 준비했다. 실패/누락과 과거 응답은 기존 유효 값의 원천 시각을 보존한다. 실제 관측만 같은 시각으로 병합하고 최대 30일/21,600개 보존한다.
- LIVE_DATA_BACKEND=local-snapshot을 명시한 개발 live 읽기는 파일만 읽는다. 파일이 없거나 잘못되면 live 오류이며 합성 값/원천 호출로 대체하지 않는다. 공개 조회 의존성에 원천/수집 client를 추가하지 않았다. DB backend 기본값과 기존 운영 수집기는 유지한다.
- 화면에 수동으로 저장한 실제 자료라는 설명과 수집 완료 시각을 추가했다. 기본 접속은 현재 데이터셋과 강남역을 선택한다. 최초 실제 이력 1개는 점과 기록 수집 안내로 표시하고 과거 24시간을 만들어 채우지 않는다. 중앙선 색상과 기존 MUI 배치를 유지한다.
- README, 데이터/구조/운영 문서와 .env.example에 개발 경로, 전송 게이트와 운영 경계를 기록했다. 라이브러리 설치와 원격/로컬 DB 변경은 없다.

준비 단계 확인: npm run check:env 종료 0(키 존재 여부/DB 미설정/수집 및 HTTP false), capture:seoul --help 종료 0, 실행 없는 capture:seoul 설정 확인 종료 0/원천 요청 0회, 최종 npm run lint 종료 0/경고 0, npm run typecheck 종료 0. React Doctor 변경 비교는 HEAD 부재로 종료 1이며 점수/통과 없음. 단위/통합/E2E 테스트와 build는 실행하지 않았다.

인증키 없는 HTTPS 연결 확인은 일반 sandbox에서 DNS가 제한되어 승인된 외부 연결로 재시도했다. Node 24에서 HTTPS 8088은 ERR_SSL_WRONG_VERSION_NUMBER, HTTPS 443은 6초 timeout이었다. 이는 이번 환경에서 HTTPS 경로를 확인하지 못했다는 의미이며 모든 HTTPS 경로의 미지원을 단정하지 않는다. 인증키는 이 확인에 사용하지 않았다.

실제 원천 요청은 아직 0회이고 로컬 수집본도 아직 없다. docs/04_DELIVERY_AND_QUALITY.md의 로컬 별도 HTTP 승인 규칙에 따라, 인증키가 평문으로 전송되는 5곳 각 1회(최대 5회) 단일 배치 승인 후 수집/표시로 마무리한다. 이전 강남역 1회 승인은 재사용하지 않는다. DATA_MODE=demo, 전역 HTTP false와 수집 false는 아직 그대로다. 다음 작업은 승인된 배치 실행, 실제 수집본의 live 화면 전환과 표시 확인이다. Git 작업, DB 변경, Cron 활성화와 배포는 수행하지 않았다.

## 20. 승인된 5곳 실제 조회와 live 화면 전환 (2026-10-15)

사용자가 “이번 5곳 단일 조회 허용”으로 인증키 평문 HTTP 전송을 포함한 5곳 각 1회 배치를 명시 승인했다. 해당 승인으로만 capture:seoul --execute --source-time-zone=Asia/Seoul --allow-insecure-http-once를 실행했다. sandbox DNS 제약이 이미 확인되어 승인된 외부 실행으로 수행했으며 **서울시 원천 요청은 정확히 5회, 각 장소 1회이고 재시도는 없다.** 이 전송 승인은 모두 사용했으며 새 배치/정기 수집에 재사용하지 않는다.

### 실제 응답과 보관

수집 완료: 2026-10-15 08:20:26 한국 시간(2026-10-14T23:20:26.053Z). 5곳 모두 인구와 날씨 section이 valid로 정규화됐다. 모든 인구의 원천 기준은 2026-10-15 07:50, 날씨는 08:20이었다. 원천 시각은 이번 명령에 명시한 Asia/Seoul로 해석했으며 원천 시간대의 공식 확인 완료를 뜻하지 않는다.

| 장소 | 인구 추정 범위 | 원천 혼잡 단계 | 기온 | 습도 |
| --- | --- | --- | --- | --- |
| 강남역 | 36,000~38,000명 | 여유 | 12°C | 87% |
| 홍대 관광특구 | 36,000~38,000명 | 여유 | 15.3°C | 77% |
| 명동 관광특구 | 30,000~32,000명 | 여유 | 12.3°C | 78% |
| 여의도 | 80,000~82,000명 | 여유 | 15.3°C | 77% |
| 성수카페거리 | 14,000~16,000명 | 여유 | 13.8°C | 70% |

인구 원천 시각이 수집 당시 이미 30분 이상 전이므로 5곳 모두 stale로 표시한다. 수집이 성공했다는 이유로 fresh로 바꾸지 않는다. fresh 0곳이어서 현재 붐빔/여유 KPI는 —이며, 지연 5곳/누락 0곳이다. PM25는 5곳 모두 pm25-unit-unconfirmed로 null을 유지했다. 이 값들은 해당 시각의 실제 응답이며 이후 현재값으로 재사용해 설명하지 않는다.

.local/data/seoul-snapshot.json에 정규화한 표시 항목과 장소별 관측 1개씩, 총 5개를 저장했다. 원본 XML/인증 URL/키는 저장하지 않았다. 과거 합성 기록을 live에 옮기거나 빈 시간을 채우지 않았다.

### 표시 설정과 확인

기존 .env.local의 비밀을 유지하면서 DATA_MODE=live와 LIVE_DATA_BACKEND=local-snapshot만 변경했다. 전역 SEOUL_ALLOW_INSECURE_HTTP=false, COLLECTOR_ENABLED=false와 미설정 DB/수집 토큰을 유지한다. 원격/로컬 DB 변경, 예약 활성화와 배포는 없다.

| 확인 | 결과와 범위 |
| --- | --- |
| 실제 수집 명령 | 종료 0, 원천 5회, 인구/날씨 valid 각 5곳 |
| 로컬 공개 overview 조회 | HTTP 200, dataset=live/source=seoul-citydata/storage=local-snapshot, 5곳 실제 값과 기준 시각, coverage fresh 0/stale 5/missing 0 |
| 로컬 공개 history 조회 | HTTP 200, 강남역 145개 버킷 중 실제 관측 1개, availableSince=07:50. 나머지는 null |
| 기본 접속과 시각 확인 | /에서 /?dataset=live&area=POI014로 이동. 1800×987에서 페이지 크기 1800×987, 실제 범위/지연 배지/수동 수집 안내와 관측점 1개 표시. 결과 탭 유지 |
| npm run check:env | 종료 0, live/local-snapshot, 전역 HTTP/수집 false. 비밀은 존재 여부만 출력 |
| 최종 npm run lint | 종료 0, 경고 0 |
| 최종 npm run typecheck | 종료 0, strict 및 라우트 타입 생성 확인 |
| 비밀 노출 정적 확인 | 소스/문서/수집본/클라이언트 정적 파일 272개에서 실제 로컬 비밀 문자열 일치 0건. 비밀 값 출력 없음 |
| 파일 권한 | .env.local 0600, 수집본 0600, 수집본 폴더 0700 |

공개 조회와 브라우저 확인은 저장 파일만 읽었으며 서울시 원천 요청을 추가하지 않았다. 준비 단계의 React Doctor는 HEAD 부재로 비교 시작 실패이고 점수/통과 없음이다. 단위/통합/자동 E2E 테스트와 build는 실행하지 않았다. 실제 5곳 응답/화면 확인을 미실행 테스트나 오류/누락 계약 전체 통과로 표시하지 않는다.

이번 요청의 실제 데이터 표시를 마쳤다. 추가 이력/새 원천 값은 별도로 승인한 수집에서만 쌓인다. 운영용 Supabase 설정/적용/수집 및 정기 실행, PM25 공식 단위와 원천 시간대, 오류/결측 응답 및 전체 상호작용 검증은 미완료다. Git 초기화/브랜치/commit/push/PR과 배포는 수행하지 않았다.


## 21. 공식 전체 121곳 확장과 단일 조회 승인 대기 (2026-10-15)

사용자가 기존 5곳을 넘어 전체 장소를 한 번 불러오도록 요청했다. 범위는 기존 citydata가 공식 지원하는 전체 장소로 해석하며 다른 서울시 데이터셋 전체나 정기 수집을 포함하지 않는다.

### 구현과 근거

- 공식 홈페이지의 공개 HTTPS 목록 `/SeoulRtd/api/hotspot-category`에서 전체보기 121곳을 확인했다. 키 없이 받은 목록에서 이름/분류/표시 좌표만 추출했고 공개 목록의 혼잡 값을 실데이터 관측으로 저장하지 않았다. 기존 공식 XLSX의 실제 코드 121개와 이름/분류가 전부 일치하며 SHP/DBF 121개도 일치한다. 번호가 빠진 코드를 추정하거나 연속 코드를 생성하지 않았다.
- docs/area-catalog.json과 재생성 스크립트 build-area-catalog.py를 추가했다. 공식 표시 좌표 JSON과 지도 가공 스크립트를 전체 121곳으로 확장해 실제 영역 도형을 유지했다. SVG 자산 194,559바이트, 자치구 25개/장소 121개다. 원본 XLSX/영역 ZIP/초기 카탈로그는 보존했다.
- 전체 areaCatalog와 초기 initialAreaCatalog를 분리했다. 개발용 local-snapshot/원천 adapter/공개 코드 검증은 전체를 지원한다. 데모 합성 fixture와 기존 미활성 운영 DB/수집기 범위는 초기 5곳을 유지하고 DB 변경은 없다.
- 기존 5곳 수집본을 그대로 읽을 수 있도록 알려진 장소 부분집합을 허용하고 중복/이름/분류 대조는 유지한다. 수집하지 않은 116곳은 null/자료 없음이다. 이전 5곳의 값과 원천 시각/이력을 보존한다.
- capture:seoul은 기본 5곳을 유지하고 --all에서만 전체 121곳을 대상으로 한다. 순차 각 1회, 요청 간 250ms, 전체 최대 10분, 재시도 없음, 인증/요청 제한 후 중지, 실패 시 직전 유효 값 보존을 적용했다. 기존 10분 슬롯 잠금/원자적 저장/8MiB 제한/30일과 전체 합계 21,600개 이력 제한은 유지한다. 이 상한이 121곳의 30일 완전 이력을 보장하지 않음을 문서화했다.
- 목록은 5곳을 넘으면 3곳씩 MUI Pagination으로 나누며 검색/필터는 전체를 대상으로 한다. 페이지는 URL 상태로 관리하고 지도에서 선택하면 해당 장소가 포함된 페이지를 연다. 지도는 121개 표식을 표시하고 선택 장소의 이름/범위만 펼치며 나머지는 MUI 툴팁/목록으로 읽는다. 중앙선 차트 스타일을 유지했다.
- README와 제품/UI, 데이터, 구조, 운영 문서에 개발 단일 조회와 초기 운영 수집의 범위를 구분했다.

### 확인 결과와 차단 사항

| 확인 | 결과 |
| --- | --- |
| 전체 카탈로그/지도 자산 생성 | 종료 0, XLSX/공개 목록/DBF 121곳 일치, 임의 좌표 없음 |
| 전체 CLI 설정 확인 | 종료 0, --all 대상 121곳, 원천 요청 0회 |
| 최종 npm run lint | 종료 0, 경고 0 |
| 최종 npm run typecheck | 종료 0 |
| React Doctor 변경 비교 | 종료 1, Git HEAD 부재로 비교 시작 불가. 점수/통과 없음 |
| 기본 live 화면 시각 확인 | 1800×987 및 1280×720에서 문서 크기가 뷰포트와 일치. 지도 표식 121개, 최종 목록 3개/페이지. 1280×720 목록 높이/scrollHeight 모두 222px |
| 저장 파일 보존 | 기존 5곳/관측 5개, capturedAt=2026-10-14T23:20:26.053Z 그대로. 파일 0600/폴더 0700 |
| 설정/비밀 확인 | live/local-snapshot, 수집 false/전역 HTTP false. 소스/문서/클라이언트 JS/수집본 110개 파일에서 실제 로컬 비밀 일치 0건, 비밀 출력 없음 |

121곳 실제 단일 수집 명령은 자동 승인 검토가 프로세스 시작 전에 거부했다. 사유는 **121회 HTTP 요청마다 인증키를 평문 전송하며, 기존 5회 승인과 사용자의 전체 조회 요청만으로는 이 구체적인 121회 전송의 명시 승인이 충분하지 않음**이다. 차단을 우회하거나 실행을 재시도하지 않았고 이번 원천 citydata 요청은 0회다. 공개 홈페이지 목록 조회는 인증키를 사용하지 않는 HTTPS 조회이며 실제 원천 관측 수집과 구분한다.

전체 표시와 실행 명령은 준비됐으나 실제 121곳 관측은 아직 미완료다. 사용자에게 이번 121곳 각 1회, 최대 121회 평문 HTTP 키 전송만의 명시 승인을 요청한다. 승인 후 배치를 실행하고 실제 성공/부분 실패 수, 원천/수집 시각과 로컬 표시를 기록한다. 자동수집/전역 HTTP/DB/Cron/배포 설정은 바꾸지 않는다. 새 승인이 없으면 기존 5곳만의 실제 자료와 신규 116곳의 자료 없음 상태를 유지한다.

사용자 지시에 따라 단위/통합/자동 E2E 테스트와 build는 실행하지 않았다. 브라우저 확인은 저장된 화면의 배치/크기 확인이며 전체 상호작용이나 오류 상태 테스트 통과를 뜻하지 않는다. Git 초기화/브랜치/commit/push/PR, DB 변경, 예약 활성화와 배포는 수행하지 않았다. 다음 작업은 범위를 명시한 HTTP 승인 이후 단일 수집과 실제 표시 확인이며, 운영 설정/공식 시간대/PM25와 미실행 테스트는 별도로 남는다.


## 22. 승인된 전체 121곳 실제 조회 완료 (2026-10-15)

사용자가 “이번 121곳 단일 조회 허용”으로 인증키의 평문 HTTP 전송을 포함한 전체 배치를 명시 승인했다. 앞선 자동 승인 검토의 범위별 승인 부족을 해소한 뒤 준비된 `capture:seoul --all --execute --source-time-zone=Asia/Seoul --allow-insecure-http-once`를 실행했다. **명령 종료 0, 원천 요청 정확히 121회, 각 장소 1회, 재시도 없음**이다. 해당 전송 승인은 모두 사용했으며 새 배치/정기 수집 승인이 아니다.

### 실제 응답과 저장

- 수집 완료: 2026-10-15 08:58:31.287 한국 시간(2026-10-14T23:58:31.287Z).
- 인구/혼잡도: 공식 121곳 모두 valid. 인구 원천 기준은 같은 날 08:25~08:30이다.
- 날씨: 119곳 valid. 원천 기준은 같은 날 08:50이다. 가산디지털단지역(POI013)과 서울대공원(POI100)은 원천에서 날씨가 제공되지 않아 not-provided/null로 보존했다. PM25는 기존 공식 단위 미확인 정책에 따라 null이며 pm25-unit-unconfirmed 진단을 유지한다.
- 시간대는 명령에서 명시한 Asia/Seoul 해석 기준이며 원천 시간대의 공식 근거 확인 완료를 뜻하지 않는다. 수집 완료 시각으로 원천 관측 시각을 바꾸지 않았다.
- 개발용 수집본에 장소 121개와 실제 관측 126개를 저장했다. 기존 5곳의 07:50 관측을 보존해 해당 장소는 각 2개, 새 116곳은 각 1개다. 빈 과거를 합성하거나 결측 사이를 연결하지 않았다.
- 예: 강남역은 원천 기준 08:25, 44,000~46,000명/여유이며 해당 값의 수집 시각은 08:57:51.628이다. 기온 14.4°C, 습도 73%의 날씨 기준은 08:50이다. 이 값은 이번 응답 당시 자료이며 이후 최신 현황을 보증하지 않는다.

### 표시와 확인

| 확인 | 결과와 범위 |
| --- | --- |
| 로컬 공개 overview | HTTP 200, live/seoul-citydata/local-snapshot, 장소 121개, 인구 누락 0, 날씨 누락 2. capturedAt이 이번 수집본과 일치 |
| 08:59 기준 최신성 | fresh 70/stale 51/expired 0/missing 0. 30분 기준으로 매번 계산되므로 시간이 지나면 지연으로 바뀜. 수집 성공을 fresh로 일괄 처리하지 않음 |
| 로컬 공개 history | HTTP 200, 신규 강남 MICE 관광특구는 145개 버킷 중 실제 1개, 강남역은 실제 2개. 나머지는 null |
| 브라우저 표시 | 기존 TaskSpace 11에서 수집본만 읽어 확인. 1280×720에서 문서 크기 1280×720, 지도 표식 121개. 선택한 강남역은 목록 13페이지에 표시되며 새 범위와 원천 기준 시각, 지연 배지와 실제 관측점 표시를 확인 |
| 저장/권한 | 98,923바이트. 수집본 0600/폴더 0700/.env.local 0600, 실행 잠금 해제 확인 |
| 설정 | check:env 종료 0. live/local-snapshot, COLLECTOR_ENABLED=false, SEOUL_ALLOW_INSECURE_HTTP=false, DB/수집 토큰 미설정 유지 |
| 비밀 노출 확인 | 소스/문서/수집본/클라이언트 JS 110개 파일에서 실제 로컬 비밀 문자열 일치 0건. 비밀 값/원본 XML/인증 URL 출력이나 저장 없음 |

README와 데이터/운영 문서의 승인 대기 상태를 실제 수집 결과로 갱신했다. 이번 이어받기는 실제 수집본과 결과 문서만 변경했고 앱 코드는 추가로 변경하지 않았다. lint/typecheck는 21절의 최종 종료 0 이후 코드 변경이 없어 반복하지 않았다. React Doctor의 HEAD 부재와 단위/통합/자동 E2E 테스트 및 build 미실행 상태는 그대로이며, 이번 실제 배치/읽기 확인을 해당 테스트 통과로 표시하지 않는다.

사용자가 요청한 전체 공식 장소의 단일 조회와 화면 반영을 완료했다. 공개 조회/새로고침/자동 확인은 저장 파일만 읽으며 서울시 요청을 추가하지 않는다. 운영용 Supabase 설정/적용/정기 수집, 공식 시간대/PM25 근거와 오류/결측/전체 상호작용 검증은 미완료로 남긴다. 후속 원천 조회는 새 실행 범위와 전송 승인을 받은 배치에서만 수행한다. Git 초기화/브랜치/commit/push/PR, DB 변경, Cron 활성화와 실제 배포는 수행하지 않았다.


## 23. 5곳만 보인다는 화면 문의 확인 (2026-10-15)

사용자가 121곳 수집 후에도 5곳만 보인다고 문의해 저장 수와 로컬 공개 응답, 기본 접속과 URL/모드 선택 코드를 확인했다. systematic-debugging의 원인 확인 순서로 조회 경계를 확인했으며 추가 원천 수집은 하지 않았다.

- 기존 수집본은 여전히 장소 121개/capturedAt=2026-10-14T23:58:31.287Z다.
- 현재 `GET /api/v1/live/overview`는 HTTP 200, dataset=live/storage=local-snapshot, items 121/monitored 121을 반환한다.
- `GET /api/v1/demo/overview`는 HTTP 200, dataset=demo, items 5/monitored 5를 반환한다. 초기 합성 데모를 별도로 유지하는 의도된 범위다.
- 기본 `/`는 `/?dataset=live&area=POI014`로 이동하고 SSR에 실데이터 모드와 121곳이 표시된다. URL에 명시한 dataset=demo는 환경 기본 live보다 우선하며 화면의 메뉴 이동도 해당 모드를 유지한다.
- 실데이터 목록은 전체 검색/필터를 적용한 뒤 3곳씩 페이지로 나눈다. 전체 수집이 5곳으로 잘리는 경로는 현재 live/local-snapshot 응답에서 재현되지 않았다.

사용자 화면의 실제 URL은 아직 확인하지 못했으므로 사용자 화면을 데모라고 단정하지 않는다. URL을 요청했고 검색/필터 없는 실데이터 링크를 안내한다. 사용자 소유로 반환한 브라우저 작업 공간은 제어권을 회수하거나 조작하지 않았다. 앱 코드/수집본/환경 설정은 변경하지 않았고 테스트/추가 수집/DB/Cron/Git/배포 작업은 수행하지 않았다. 현재 서버의 121곳 응답 확인과 사용자가 보고 있는 화면의 원인 확정은 구분한다. 동일 실데이터 주소에서도 5곳이 표시되면 해당 URL의 데이터 모드/조건과 브라우저 표시를 이어서 확인한다.


### 23절 후속: 사용자 URL로 원인 확정

사용자가 현재 주소 `http://127.0.0.1:3000/?dataset=demo&area=POI007`을 제공했다. 명시적인 dataset=demo가 환경 기본 live보다 우선하므로 초기 5곳 합성 데모가 열린 것이 원인이다. 121곳 실제 자료의 수집/저장/공개 조회가 5곳으로 잘린 현상은 아니다. 홍대 관광특구(POI007) 선택을 보존한 `http://127.0.0.1:3000/?dataset=live&area=POI007` 링크를 안내했다. 앱 코드/환경/수집본 변경이나 추가 원천 호출 없이 URL의 데이터 모드 차이로 원인을 확정했으며, 사용자 브라우저를 임의 조작하지 않았다.


## 24. 30초/1분 원천 수집 주기 검토 (2026-10-15)

사용자가 서울시 API를 1분 또는 30초마다 요청하는 방식의 적절성을 물었다. 설정 변경 요청으로 해석하지 않고 공식 공개 문서와 호출량을 확인했다. ego-browser TaskSpace 12에서 공식 API 상세 화면과 공식 매뉴얼을 키 없이 HTTPS로 읽었고 PDF 전용 조회 도구로 관련 페이지의 본문/스크린샷을 확인했다.

- 공식 매뉴얼 V8.5(2026년 4월), 12쪽은 도시데이터가 항목별로 상이한 최소 5분 주기로 갱신된다고 설명한다. 16쪽은 통신 인구의 추정/가공과 사용자 제공 사이 약 15분 지연을 설명한다. 이는 30초 폴링으로 원천 생성/가공을 앞당길 수 있다는 뜻이 아니다. 최신 응답의 발견 지연과 원천 갱신 주기는 구분한다.
- 현재처럼 장소당 1회 요청하고 121곳을 24시간 수집할 때 재시도 제외 호출량은 30초 간격 348,480회/일, 1분 174,240회/일, 5분 34,848회/일, 10분 17,424회/일이다. 계산은 121 × 86,400 / 간격(초)로 확인했다.
- 공식 API 상세의 ERROR-336/최대 1,000건 문구는 한 요청의 위치 범위 제한이며 이 인증키의 일일 호출 허용량으로 해석하지 않는다. 키별 실제 허용량은 아직 확인하지 않았다. 기존 앱 내부 예산 1,000회와 초기 5곳 운영 수집 한도도 공식 원천 한도와 다르다.
- 적용 의견은 키 허용량 확인 후 서버의 공유 수집을 5~10분 간격으로 설계하고, 브라우저는 저장된 자료를 30~60초마다 확인하도록 분리하는 것이다. 방문자 수만큼 서울시 API 요청을 늘리지 않으며 중복 원천 시각은 새 이력으로 저장하지 않는다. 전체 121곳의 정기 수집에는 기존 초기 운영 범위/예산/저장 설정을 재검토해야 하며 이번 설명으로 활성화하지 않는다.

출처: https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do 와 https://data.seoul.go.kr/SeoulRtd/downloads/%EC%8B%A4%EC%8B%9C%EA%B0%84_%EB%8F%84%EC%8B%9C%EB%8D%B0%EC%9D%B4%ED%84%B0_%EB%A7%A4%EB%89%B4%EC%96%BC.pdf (12/16쪽).

추가 citydata 인증 호출/키 전송, 수집본/코드/환경/DB/예약 변경은 없다. 테스트/Git/배포도 실행하지 않았다. 남은 확인은 실제 키 사용량/한도와 정기 수집 운영 범위/보관 용량이다. 이 항목은 자문 기록이며 정기 수집 구현/활성화 완료가 아니다.


## 25. 일반 인증키 호출 횟수 정책 확인 (2026-10-15)

사용자가 허용량 확인을 요청해 공식 공개 이용 안내, FAQ 전체 3페이지, 인증키 안내의 공개 화면과 서울시 공식 영상의 문자 지원 본문을 확인했다. ego-browser TaskSpace 14에서 공개 페이지를 읽고 공식 검색/문서 조회로 근거를 교차 확인했다.

핵심 근거는 서울시 공식 「서울 열린데이터광장 OpenAPI 사용법」(라이브서울, 2023-08-30 게시)의 일반 인증키 설명이다. **일반 인증키는 호출 횟수/서비스별 제한이 없다고 명시**하며 일반 키 호스트를 openapi.seoul.go.kr, 실시간 지하철 키 호스트를 swopenapi.seoul.go.kr로 구분한다. 현재 프로젝트의 원천 호스트 openapi.seoul.go.kr:8088과 기존 citydata 성공 호출은 일반 키 계열과 일치한다. 따라서 공개 일반 정책 기준 도시데이터의 일일 호출 횟수 숫자 한도가 따로 있는 것으로 보고하지 않는다.

현재 공식 이용 안내와 FAQ의 하루 1,000회는 **실시간 지하철 전용 인증키**의 정책이고, 한 번에 1,000건은 **데이터 행 수** 제한이다. citydata는 한 번에 한 장소를 조회한다. 프로젝트 내부 SEOUL_DAILY_CALL_BUDGET 기본 1,000회와 초기 5곳 운영 한도는 자체 설계값으로 유지하며 원천의 할당량과 구분한다.

확인 한계: 브라우저는 로그인 링크를 표시하며 인증된 발급 계정의 키 관리 화면은 조회하지 않았다. 개별 키 상태/별도 예외까지 확인했다고 보고하지 않는다. 확인한 공개 안내에 초당/동시 요청 수치가 없으므로 호출 횟수 제한 없음이 무제한 동시 처리/무중단 응답 보장을 뜻한다고 해석하지 않는다. 공개 일반 정책과 인증키 개별 계정 검증을 구분해 사용자에게 안내한다. 호출을 늘려 제한을 시험하지 않았다.

근거/범위는 docs/sources/seoul-api-limits-20261015.json에 기록하고 데이터/API 문서와 운영 문서의 공개 정책 확인 상태를 갱신했다. 앱 코드/환경/수집본/내부 예산은 변경하지 않았다. 인증키를 브라우저/검색/출력에 넣지 않았으며 추가 원천 인증 요청 0회다. 새 키 신청, 갤러리/문의 등록, 자동수집/DB/Cron/Git/배포와 테스트 실행은 없다. 후속 정기 수집 요청이 있으면 실제 갱신 간격에 맞춰 수집 주기/내부 한도/운영 저장과 전송 승인을 별도로 설정한다.


## 26. 1분 수집 운영 가능 여부 검토 (2026-10-16)

사용자가 호출 정책 확인 후 1분마다 최신화해도 되는지 문의했다. 공식 이용 안내와 서울시 일반 인증키 안내를 다시 읽었고, 일반 키의 공개 횟수 정책과 원천 갱신 간격/우리 수집기 설정을 구분했다. 일반 공개 정책 기준 1분 확인 방식으로 설계할 수 있지만, 원천 시각이 그대로인 응답은 새 관측으로 중복 저장하지 않고 앞선 작업이 끝나기 전에는 수집을 중복 실행하지 않는 공유 서버 작업이 필요하다. 방문자의 화면 조회는 계속 저장 자료만 읽는 경계를 유지한다.

현재 collector/config.ts는 10분/최대 5곳/일일 예산 최대 1,000회로 검증하며 capture-seoul.ts의 개발 단일 배치도 10분 슬롯 중복 방지를 적용한다. 따라서 환경변수만 1분으로 바꾸거나 현재 수동 CLI를 그대로 분마다 반복하는 방식이 아니라 1분/121곳의 수집 범위와 예산/실행 시간/저장 설정을 수정해야 한다. 121곳 24시간 1분 요청은 재시도 제외 174,240회/일이다. 수집 빈도가 원천 데이터 생성/제공을 앞당기지는 않는다.

질문을 자동수집 활성화나 정기 HTTP 키 전송 승인으로 해석하지 않았다. 이번에는 문서 자문만 기록하며 앱 코드/환경/수집본/DB/예약을 변경하지 않았고 추가 원천 인증 요청 0회다. 테스트/Git/배포도 실행하지 않았다. 실제 구현/활성화는 별도 요청과 정기 전송 범위 확정 이후 진행한다. 출처는 25절의 공식 안내 URL을 2026-10-16 다시 확인했다.


## 27. 3분/121곳 개발용 정기 수집 구현과 반복 전송 승인 대기 (2026-10-16)

사용자가 “3분마다 121곳에 맞게 수집하자”라고 요청했다. 현재 DB 설정이 없고 live 화면이 local-snapshot을 읽는 점에 맞춰 개발용 단일 컴퓨터 정기 수집을 구현했다. 기존 Supabase 운영 수집기/스키마/원격 Cron/배포는 변경하지 않았다.

### 변경

- collector:local의 start/status/stop/resume 명령과 detached Node 작업을 추가했다. --execute 없는 start는 설정만 읽으며 원천 요청 0회다. 실제 실행은 즉시 수집을 시도한 뒤 시작 기준 3분마다 전체 공식 121곳을 각 1회 순차 요청한다. 요청 간 250ms, 작업 기한 150초, 재시도 없음, 중복 프로세스/동일 슬롯 방지를 적용한다. 지연 작업을 한꺼번에 따라잡지 않는다.
- 단일 capture:seoul과 정기 작업이 local-snapshot/capture.ts 코어, 수집본 잠금과 일일 요청 원장을 공유한다. 단일 명령의 기본 초기 5곳/--all/10분 슬롯과 한 번 전송 옵션은 유지한다. 정기 명령에는 별도의 --allow-insecure-http-recurring을 사용한다.
- KST 일일 예산 58,080회를 요청 시작 전에 비공개 파일에 예약한다. 실패/프로세스 중단에서도 차감을 유지하며 날짜 변경 때 예산을 다시 계산한다. 인증 오류는 수동 해제까지, 요청 제한은 Retry-After(없으면 15분, 최소 3분)까지 이후 요청을 멈춘다. 키 변경 시 stop/start가 필요하다. 공개 일반 인증키 정책과 내부 예산은 구분한다.
- 같은 장소/원천 시각의 관측을 Map으로 병합하고 실패/누락/과거 응답은 직전 유효 값과 기준 시각을 보존한다. 기존 관측을 유지하면서 전역 이력 상한을 21,600개에서 100,000개로, 파일 상한을 8MiB에서 32MiB로 늘렸다. 최대 30일 또는 개수 제한을 먼저 적용하며 121곳의 24시간 기록에는 여유를 두되 30일 완전 이력은 보장하지 않는다. 카탈로그 검증은 Map/Set 조회로 확장했다.
- 개인 상태/예산/중지 요청/로그를 .local/data의 0600 파일과 0700 폴더에 보관한다. PID 기반 파일 잠금은 활성 소유자를 덮어쓰지 않으며 종료된 PID 잠금만 회수용 잠금 아래 다시 확인해 정리한다. 로그는 약 5MiB에서 이전 파일 한 개를 남겨 순환한다. 재부팅 자동 시작은 하지 않는다.
- 공개 meta.collection에 3분 주기와 collecting/waiting/paused/stopped/unknown 상태 및 최근 완료/다음 예정 시각을 추가했다. heartbeat는 5초/유효 판단 30초다. 공개 읽기에는 상태 읽기 전용 모듈만 연결하고 원천/수집/쓰기 모듈은 가져오지 않는다. 실제 실행 상태에만 3분 안내와 collectionEnabled를 적용한다. check:env도 로컬 상태를 별도로 표시한다.
- README, .env.example, 제품/UI와 데이터/구조/운영 문서에 기존 미활성 DB 10분/5곳과 개발 정기 3분/121곳의 범위를 구분했다. 원천 시각과 완료/예정 시각, 수동 조회와 정기 전송 승인은 분리한다.

### 확인

| 확인 | 결과 |
| --- | --- |
| 최종 대상 런타임 | 프로젝트 .local/node의 Node 24.21.0/npm 11.19.0. 전역 Node 26.4.0 환경의 초기 검사 후 프로젝트 런타임으로 최종 검사 재확인 |
| 최종 npm run lint | Node 24에서 종료 0, 경고 0 |
| 최종 npm run typecheck | Node 24에서 종료 0 |
| collector:local --help / start 설정 확인 / status | 종료 0. 주기 3분/121곳/예산 58,080회, transportAllowed=false, 상태 stopped/예약 0 |
| React Doctor 변경 비교 | 종료 1. Git HEAD 부재로 비교 시작 불가. 점수/통과 없음 |
| 기존 수집본 형식/권한 | 확대된 스키마로 121곳/관측 126개 읽기 성공, 98,923바이트, capturedAt=2026-10-14T23:58:31.287Z 유지. 수집본 0600/폴더 0700 |
| 비밀 노출 확인 | 변경 소스/문서/수집본/클라이언트 JS 114개 파일에서 실제 로컬 비밀 문자열 일치 0건, 비밀 출력 없음 |
| 로컬 서버 확인 | 처음 3000번 조회는 다른 앱의 404 HTML이어서 JSON 해석에 실패했다. 해당 서버를 변경하지 않고 Node 24로 이 프로젝트의 개발 서버를 3001번에서 실행했다 |
| 3001 공개 overview/SSR | HTTP 200, live/121곳, 기존 capturedAt 유지, collection 미생성/활성 장소 0. 홍대 선택 화면의 SEOUL PULSE 제목/수동 저장 안내/121곳 SSR 확인 |
| 환경/원천 요청 | live/local-snapshot, 전역 HTTP/기존 DB 수집 false, DB 미설정 유지. 이번 원천 인증 요청 0회 |

단위/통합/자동 E2E 테스트와 build는 사용자 실행 지시가 없어 실행하지 않았다. CLI의 도움말/오프라인 설정 확인/저장 자료 읽기와 정적 검사를 실제 정기 수집/일시 중지/중지/장애 경로 전체 검증으로 표시하지 않는다. 정기 활성 상태의 실제 브라우저 표시와 두 수집 주기 확인도 아직 미완료다.

### 실행 차단과 다음 단계

준비된 start --execute 명령은 자동 승인 검토가 프로세스 시작 전에 거부했다. 사유는 **3분마다 121회씩 인증키를 평문 HTTP로 반복 전송하는 지속적 외부 전송이며, 3분 수집 요청과 별도로 반복 평문 키 전송까지 명시 승인되지 않았음**이다. 차단을 우회하거나 명령을 재시도하지 않았다. 기존 단일 121회 승인은 소진됐고 재사용하지 않는다. 상태/예산/로그 등의 seoul-collector 파일도 아직 생성되지 않았다.

구현과 정적 확인은 마쳤으나 실제 정기 수집 시작은 미완료다. 사용자에게 중지할 때까지 3분마다 최대 121회/일일 예산 58,080회의 인증키 평문 HTTP 전송을 허용하는지 요청한다. 승인 후 프로젝트 Node 24 PATH에서 start를 실행하고 최초 배치/다음 3분 주기/공개 상태 및 화면을 확인한다. 실제 활성화 결과와 수집 시각/성공 수를 별도 기록한다. 컴퓨터/프로세스 종료 시 수집이 중단되는 개발용 실행이며 OS 부팅 예약, DB/Cron 변경, Git 작업과 배포는 수행하지 않았다.


## 28. 포트폴리오 수집 주기 10분/30분 선택 준비 (2026-10-16)

사용자가 반복 HTTP 전송 확인 질문에 승인 대신 “10분마다로 할까? 어차피 포폴이니까 아니면 30분?”이라고 답했다. 이를 주기 재검토로 반영했으며 반복 전송 승인으로 해석하지 않았다. 시간당 6번의 수집 시도로 흐름을 남길 수 있는 10분을 권장하고 30분도 선택할 수 있도록 준비했다.

### 변경

- collector:local의 기본 주기는 10분이며 start에 --interval-minutes=10 또는 --interval-minutes=30을 지정할 수 있다. 상충하거나 지원하지 않는 주기는 거부한다. 최초 실행/150초 작업 기한/순차 요청/중복 방지/자동 재시도 없음/명시 중지 방식은 유지한다.
- 선택한 주기에 맞춰 KST 일일 예산을 10분 17,424회, 30분 5,808회로 계산하고 실제 요청 예약에도 적용한다. 같은 날 주기를 바꿔도 누적 요청량을 초기화하지 않는다. 더 큰 예산으로 재시작했을 때 이전 예산 소진 표식만으로 계속 중지하지 않으며, 인증 오류와 Retry-After는 유지한다.
- 작업 상태 파일에 실제 intervalMinutes를 저장하고 공개 메타데이터/화면 안내/자료 상태/CLI에 반영한다. 이전 3분 상태 형식은 읽을 수 있으나 신규 CLI 주기는 10분과 30분만 허용한다. 공개 조회는 계속 읽기 전용이며 원천 수집을 유발하지 않는다.
- README, .env.example, 제품/UI, 구조, 데이터/API와 운영 문서의 현재 계약을 기본 10분/선택 30분으로 수정했다. 27절의 3분 구현/차단 기록은 당시의 이력으로 보존한다. 전역 HTTP/기존 DB 수집 활성화 설정은 변경하지 않는다.

### 확인

| 확인 | 결과 |
| --- | --- |
| 런타임 | 프로젝트 Node 24.21.0/npm 11.19.0 |
| npm run lint | 종료 0, 경고 0 |
| npm run typecheck | 종료 0 |
| 기본 start 설정 확인 | 종료 0, 10분/121곳/일일 예산 17,424회, sourceRequests=0, transportAllowed=false |
| 30분 start 설정 확인 | 종료 0, 30분/121곳/일일 예산 5,808회, sourceRequests=0, transportAllowed=false |
| help/status | 종료 0, 선택 주기 안내/기본 10분, 상태 stopped, 당일 예약 0 |
| 실제 수집본 | 121곳/126개 관측/98,923바이트/0600, capturedAt=2026-10-14T23:58:31.287Z 유지 |
| 원천 호출/작업 활성화 | 추가 인증 요청 0회. seoul-collector 상태/로그 파일 없음, 실제 작업 미시작 |

React Doctor 변경 비교 결과는 아래 후속 확인에 기록한다. 단위/통합/E2E 테스트와 build는 실행하지 않았다. 실제 10분/30분 반복 주기, 수집 활성 화면과 장애 경로는 실행 전이므로 검증 완료로 표시하지 않는다.

### 남은 작업

자동 승인 검토가 앞선 3분 시작을 반복 평문 인증키 전송 명시 승인 부족으로 거부한 상태다. 이번 주기 질문을 승인으로 사용하거나 차단을 우회하지 않았다. 121곳을 선택한 주기로 중지할 때까지 반복 조회하며 인증키를 평문 HTTP로 전송한다는 범위(10분 일일 최대 17,424회 또는 30분 5,808회)에 대해 주기 선택과 명시 승인을 함께 요청한다. 승인 이후에만 실제 작업 시작/최초 수집/다음 예정과 공개 상태를 확인한다. 원격 DB/Cron/부팅 예약/Git/배포 변경은 없다.

후속 정적 진단: 프로젝트 Node 24에서 npx react-doctor@latest --verbose --scope changed는 npm 레지스트리 DNS 조회 ENOTFOUND로 종료 1이었다. 오프라인 재시도는 ENOTCACHED로 종료 1이라 진단 점수/회귀 비교 결과가 없다. 이전 27절의 Git HEAD 부재 결과를 이번 실행 결과로 재사용하지 않는다. 기존 lint/typecheck와 원천 요청 없는 CLI 확인 결과만 통과로 기록한다.


## 29. 배치당 121회 요청의 의미 재확인 (2026-10-16)

사용자가 한 번의 API 요청으로 121개 장소를 가져올 수 있는지 질문했다. 공식 citydata 명세(https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do)의 현재 요청 인자를 ego-browser TaskSpace 15에서 다시 확인했다. AREA_NM은 필수 문자열이며 장소명 또는 장소코드를 지정한다. START_INDEX/END_INDEX는 데이터 행 페이징 인자로 안내하며 여러 장소를 선택하는 인자가 아니다. 현재 통합 citydata 명세에 전체 장소/복수 장소를 한 요청으로 선택하는 방식은 안내되지 않는다. 따라서 현재 인구/날씨 통합 API로 전체 121곳을 읽는 한 배치는 장소별 최대 121회의 순차 요청이다. 한 장소 응답에서 인구와 날씨를 함께 받으므로 항목마다 별도 호출하는 구조는 아니다. 다른 서울시 API 전체에 일괄 조회가 없다고 일반화하지 않는다.

로컬 fetchSeoulArea가 검증된 장소 코드 하나로 URL을 만들고 captureLocalSnapshot이 카탈로그를 순차 순회하는 코드도 확인했다. 공개 명세만 읽었으며 실제 인증키 전송/서울시 원천 API 추가 호출은 0회다. 조사용 브라우저 공간은 keep=[]로 정리했다. 질문은 반복 전송 승인이 아니므로 수집 작업은 아직 시작하지 않았다. 앱 코드/환경/수집본/DB/Cron/Git/배포 변경과 테스트 실행은 없다. 10분 또는 30분 주기 선택/명시 승인과 실제 최초 수집 확인이 남아 있다.


## 30. 대시보드 브라우저 요청과 원천 수집 요청 구분 (2026-10-16)

사용자가 메인 대시보드에서 121곳을 표시하면 브라우저 Network에도 121개 요청이 생기는지 질문했다. 현재 query/dashboard.ts, dashboard.tsx와 LocalSnapshotRepository를 읽어 확인했다. overview는 저장된 121곳 현황을 하나의 응답에 담고 브라우저는 /api/v1/live/overview로 조회한다. 선택 장소의 그래프 기록은 /api/v1/live/history의 별도 요청으로 읽는다. 서버의 초기 자료 전달/캐시 여부에 따라 최초 브라우저 재조회 여부는 달라지므로 전체 페이지 네트워크 요청 총수가 항상 2개라고 표현하지 않는다. 현재 자동 확인은 현황 60초/선택 장소 기록 10분이며 모두 저장 자료 읽기다.

앞선 121회는 수집 작업에서 서울시로 보내는 장소별 원천 요청 수이고, 방문자마다 실행하는 브라우저 요청 수가 아니다. 공개 조회는 수집 코어를 호출하지 않아 방문자 수/새로고침만큼 원천 요청이 늘지 않는다. 이번 확인은 코드 읽기이며 추가 원천 호출, 수집 활성화, 앱/환경/DB/Git/배포 변경과 테스트 실행은 없다. 반복 수집의 주기 선택과 명시 승인은 계속 대기다.


## 31. WebSocket 제공 여부 확인과 10분 시작 차단 (2026-10-16)

사용자가 서버가 서울시를 주기적으로 수집/저장하고 대시보드가 공유하는 구성에 동의한 뒤 WebSocket 등으로 제공되는지 질문했다. 공식 citydata 명세(https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do)와 도시데이터 가이드(https://data.seoul.go.kr/dataVisual/seoul/guide.do)를 ego-browser TaskSpace 18에서 읽었다. 현재 공개 명세는 HTTP 요청/장소 필수 인자/XML 응답을 안내하며 해당 공개 문서에서 WebSocket, SSE, 스트리밍이나 푸시 구독 주소/절차를 확인하지 못했다. 공식 도메인 대상 WebSocket/SSE 검색도 결과가 없었다. 공개 안내에서 확인되지 않는다는 결론이며 비공개/모든 서울시 서비스의 푸시 기능 부재로 일반화하지 않는다. 조사용 브라우저 공간은 keep=[]로 정리했다. Ego Lite 업데이트 알림은 받았지만 설치/업그레이드는 실행하지 않았다.

우리 서버에서 브라우저로 WebSocket/SSE를 제공하는 것은 별도 구현 선택이고 원천에서 자료를 얻는 주기적 요청을 없애지는 않는다. 현재 브라우저 현황 60초/선택 장소 이력 10분 확인과 별도 서버 수집 경계를 유지한다. 현재 범위에서는 자체 소켓을 추가하지 않았다.

사용자의 구성 동의에 따라 프로젝트 Node 24에서 collector:local start --interval-minutes=10 --execute --source-time-zone=Asia/Seoul --allow-insecure-http-recurring 실행을 시도했다. 자동 승인 검토가 프로세스 생성 전에 거부했다. 사유는 **서울시 인증키를 평문 HTTP로 중지할 때까지 반복 전송하며 하루 최대 17,424회 외부 요청을 수행하는 범위에 대해 사용자의 명시 승인이 없다는 것**이다. 차단 후 우회/재시도하지 않았다. 상태 재조회 종료 0, stopped/당일 예약 0/일일 예산 17,424회를 확인했고 seoul-collector 상태/로그 파일은 없다. 이번 추가 인증키 전송/원천 호출은 0회다.

구현은 기본 10분/전체 121곳 선택 상태이나 실제 정기 작업 시작/최초 수집과 다음 주기 검증은 미완료다. 반복 평문 HTTP 전송의 위험과 정확한 범위를 설명하고 해당 10분 실행의 명시 승인을 요청한다. 이번에는 앱 코드/환경/수집본/DB/Cron/Git/배포를 변경하지 않았으며 테스트/build도 실행하지 않았다. 앞선 lint/typecheck 결과를 새로운 실행 결과로 표시하지 않는다.


## 32. 승인된 10분/121곳 정기 수집 시작 (2026-10-16)

사용자가 확인 질문에 **“10분마다 반복 평문 HTTP 전송 허용”**이라고 답해 서울시 인증키의 반복 HTTP 전송을 명시 승인했다. 범위는 중지할 때까지 10분마다 공식 121곳/배치당 최대 121회/KST 하루 최대 17,424회이며 기존 단일 실행 승인을 재사용하지 않는다. 전역 HTTP 허용과 기존 DB 수집 활성화 설정은 false로 유지한다.

### 실행과 첫 수집

- 프로젝트 Node 24.21.0/npm 11.19.0에서 collector:local start --interval-minutes=10 --execute --source-time-zone=Asia/Seoul --allow-insecure-http-recurring을 실행했다. 자동 승인 검토를 통과해 종료 0, 첫 상태 collecting을 확인했다. 같은 명령/별도 배치의 중복 실행 없이 로컬 detached 작업 하나를 시작했다.
- 첫 실행 시작은 2026-10-16 17:33:26 한국 시간이다. 첫 수집 완료는 17:34:11.458이며 원천 요청은 121회, 장소별 1회이고 재시도는 없다. 인구와 혼잡도는 121곳이 유효하다. 날씨는 119곳 유효, 가산디지털단지역(POI013)과 서울대공원(POI100)은 not-provided다. 결과 partial은 두 장소의 날씨 미제공 때문이며 인증/요청 제한/예산 중지 사유는 없다. PM25는 단위 근거 미확인 정책으로 여전히 표시하지 않는다.
- 이번 인구 원천 기준은 모든 장소 17:05, 유효 날씨 원천 기준은 17:30이다. 새 수집 시각으로 원천 시각을 덮지 않는다. 17:35 이후 인구가 30분 기준을 넘어 화면의 갱신 지연/최신 0곳 표시가 나오는 것은 보존한 원천 시각에 따른 결과다. 수집 성공을 원천 자료의 방금 생성으로 표현하지 않는다.
- 실제 새 인구 관측 121개를 추가해 기존 126개에서 총 247개가 됐다. 기존 기록과 긴 결측 구간은 보존하며 빈 과거를 만들지 않았다. 수집본은 115,032바이트다.
- 첫 배치 이후 상태 waiting/lastCompletedAt=2026-10-16T08:34:11.458Z/nextRunAt=2026-10-16T08:43:26.607Z를 반복 조회했다. 다음 수집 시작 예정은 한국 시간 17:43:26이다. 당일 예약 요청은 121회, 예산 17,424회, pauseReason/pauseUntil은 null이다. heartbeat와 상태 파일이 유지되는 것을 확인했다.

### 화면과 저장 확인

| 확인 | 결과 |
| --- | --- |
| check:env | 종료 0, live/local-snapshot. 전역 HTTP/기존 DB 수집 false, 로컬 collecting 확인. 비밀은 존재 여부만 출력 |
| 공개 overview | 기존 3001 서버에서 HTTP 200, live/121곳, 새 capturedAt, 실제 10분 waiting/완료/다음 예정, collectionEnabled 121곳 |
| 브라우저 | ego-browser TaskSpace 0에서 live/POI007 화면 확인. 10분마다 121곳 수집 안내, 전체 121곳과 홍대 관광특구 실제 값, 원천 기준 17:05/갱신 지연 확인 |
| 기록 그래프 | 실제 기록 1개 안내 확인. 이전 기록은 현재 24시간 범위 밖이고 빈 구간을 채우지 않음 |
| 자료 상태 창 | 최근 완료 17:34/설정 주기 10분/다음 예정 17:43 확인. 원천 기준/수집 시각/최신성 설명을 구분함 |
| 공개 읽기의 요청 격리 | 공개 API/화면 조회 후에도 당일 원천 예약 121회 유지. 추가 수집 작업을 유발하지 않음 |
| 비공개 저장 권한 | .local/data 0700, 수집본/작업 상태/잠금/로그 각각 0600 |
| 비밀 노출 확인 | 클라이언트 JS/수집본/작업 로그 26개 파일에서 실제 로컬 비밀 문자열 일치 0건. 비밀값/인증 URL/원본 XML 출력 없음 |

초기 sandbox의 localhost 읽기가 실패해 개발 서버 시작을 시도했으나 3001이 이미 사용 중이라 EADDRINUSE로 종료 1이었다. 기존 서버를 종료/변경하지 않고 허용된 localhost 읽기로 HTTP 200을 확인했다. 브라우저 자료 상태 버튼은 자동 갱신에 따른 오래된 ref와 역할 선택자 시도가 각각 실패한 뒤 새 snapshot의 ref로 열어 확인했다. 이는 확인 도구의 중간 실패이며 앱 코드 수정으로 표시하지 않는다. 결과 대시보드 p1은 사용자가 볼 수 있도록 keep=[p1]로 한 번 정리해 남겼다.

README에 실제 시작과 첫 수집 기록을 추가했다. 이번에는 앱 코드/환경변수/의존성/DB/Cron/Git/배포를 변경하지 않았다. 단위/통합/자동 E2E 테스트와 build는 사용자 실행 지시가 없어 실행하지 않았다. 앞선 lint/typecheck를 이번 실행의 신규 검사 결과로 재표시하지 않는다.

### 운영 범위와 다음 확인

승인된 로컬 10분 정기 작업은 실행 중으로 남긴다. 컴퓨터가 꺼지거나 작업이 종료되면 수집은 멈추며 재부팅 자동 시작은 없다. 중지는 npm run collector:local -- stop, 상태는 npm run collector:local -- status다. 이번 완료 근거는 첫 실제 배치, 실행 상태와 다음 예정, 저장 자료 및 화면 확인이다. 2회차 17:43 실행과 장시간 연속 실행/장애 복구/프로세스 중지 경로는 아직 관찰하지 않았고 통과로 기록하지 않는다. 운영 DB/원격 예약 적용은 이 로컬 실행 범위에 포함하지 않는다.

## 33. 현황과 그래프 중심 대시보드 재구성 (2026-11-08)

사용자의 “한눈에 알아보는 현황판” 요청에 따라 기존 화면을 재배치했다.

### 변경

- 큰 숫자의 KPI 4개, 넓은 선택 장소 인구 흐름과 혼잡 분포 2열, 하단 지도와 장소 목록 순서로 구성했다. 고정 뷰포트 높이와 좁은 3열 구조를 제거하고 자연스러운 세로 스크롤을 적용했다.
- MUI X Charts 가로 막대로 저장 자료의 혼잡 단계별 장소 수를 표시했다. 인구 자료 보유 수, 지연/만료 포함 수, 동일 수치의 텍스트 요약과 최신 자료 비율을 함께 제공한다. 최신 자료만 집계하는 상단 KPI와 저장 자료 분포의 기준을 명시적으로 구분한다.
- 인구 그래프는 추정 중앙값 실선과 하한/상한 점선을 표시하며 0 기준 축, 원천 기준 시각, 결측 구간, 정확한 범위 툴팁과 기록 표를 유지한다. 실제 기록이나 누락된 과거를 생성하지 않는다.
- KPI는 모바일 2열, 분석은 1200px 미만 단일 열, 지도/목록은 768px 미만 단일 열이다. 로딩 골격도 새 배치에 맞췄다. 제품 UI 문서와 데이터 해석 문구를 동기화했다.
- 서버 조회/수집 경계, 환경변수, 의존성, 실제 수집 작업, 원격 DB, Cron, 배포를 변경하지 않았다. 현재 경로는 Git 저장소가 아니며 Git을 초기화하지 않았다.

### 검증

- 프로젝트 Node 24.21.0에서 최종 `npm run lint` 종료 0, 경고 0. 최종 `npm run typecheck` 종료 0.
- 최초 타입 검사에서 BarChart 최상위 barLabel 속성 오류를 확인했다. 설치된 MUI X 9 타입에 따라 series의 barLabel/barLabelPlacement로 이동한 뒤 통과했다.
- ego-browser TaskSpace 5에서 기존 개발 서버 127.0.0.1:3000의 시연/실제 자료 화면을 시각 확인했다. 데스크톱 1440×1080과 모바일 390×844에서 카드, 그래프, 혼잡 분포를 확인했고 각각 documentWidth 1440/390으로 가로 넘침이 없었다. 실제 자료의 갱신 지연과 기록 결측도 화면에 유지됐다. 이는 브라우저 시각 확인이며 자동 E2E/상호작용 회귀 테스트 통과를 의미하지 않는다.
- React Doctor는 오프라인 캐시에 패키지가 없어 ENOTCACHED 종료 1. 진단 점수와 회귀 비교 결과가 없다.
- 단위/통합/E2E/실호출 테스트와 build는 실행하지 않았다. 사용자 테스트 실행 지시 없음.
- 로컬 3001 서버 시작은 최초 sandbox EPERM, 이후 Next.js 보안 업데이트 안내 종료, 재시도 시 기존 3000 서버 감지로 종료했다. 기존 서버를 재사용했고 종료하거나 업데이트하지 않았다. 브라우저의 최초 3001 연결 실패도 서버 종료에 따른 것으로 최종 시각 확인은 3000에서 수행했다.

### 남은 작업

- 자동 테스트 및 상호작용 회귀 검증은 사용자 실행 요청 이후 수행한다. React Doctor 진단은 패키지를 사용할 수 있는 환경에서 재시도할 수 있다.
- 개발 서버가 설치된 Next.js의 보안 업데이트를 권고했다. 이번 디자인 범위에서 의존성 업데이트를 실행하지 않았으므로 별도 검토가 남는다. Ego Lite도 업데이트 알림이 있었으며 업데이트하지 않았다.

## 34. 시간대별 인구 그래프 재설계 (2026-11-08)

사용자가 선택 장소 인구 흐름 그래프의 가독성과 디자인을 다시 지적해 해당 패널을 수정했다.

### 변경

- 제목을 “시간대별 추정 인구”로 바꾸고 세 개의 선을 MUI X Charts 세로 막대그래프로 교체했다. 0 기준 인구 축, 4시간 간격 눈금, 조회 시작/끝 날짜와 한국 시간, 마지막 추정 인구를 명시한다.
- 서버의 10분 기록은 보존한다. 화면에서 정시 기준 1시간별 마지막 유효 관측을 선택해 범위 중앙값을 막대 높이로 표시한다. 시간 평균/누적 방문자 수로 표현하지 않는다. 관측이 없는 시간은 null이며 첫/끝 부분 시간도 유지한다.
- 표시된 시간별 대표값 중 최대 막대를 밝은 파란색으로 강조하고 해당 시간대와 원천 추정 범위를 텍스트로 제공한다. 비교할 시간대가 하나뿐이면 최대 시간 강조와 요약을 생략한다.
- 툴팁은 해당 시간의 마지막 관측 범위, 원천 기준, 혼잡도, 10분 기록 보유 수와 부분 시간 여부를 설명한다. 기록 표는 원본 10분 자료 전체를 제공한다. 원본 누락 구간 수를 계속 표시해 시간별 요약으로 결측 사실을 숨기지 않는다.
- 차트 색상은 src/theme 토큰에서 관리하고 제품 UI 문서/데이터 안내 문구를 동기화했다. API, 수집, DB, 환경변수, 의존성 및 Git은 변경하지 않았다.

### 확인과 한계

- 프로젝트 Node 24.21.0의 최종 npm run lint 종료 0, 경고 0. npm run typecheck 종료 0.
- ego-browser TaskSpace 6에서 실제 저장 자료로 1440×1100 데스크톱과 390×844 모바일을 시각 확인했다. 모바일 문서 폭 390px/뷰포트 390px로 가로 넘침이 없고 시간축, 인구축, 막대와 범위 요약을 확인했다.
- React Doctor 오프라인 진단은 패키지 캐시 없음 ENOTCACHED로 종료 1. 진단 결과/회귀 점수 없음.
- 단위/통합/E2E/실호출 테스트와 build는 사용자 지시가 없어 실행하지 않았다. 시간별 집계의 자동 회귀 검증은 미실행이다.
- 기존 3000 서버가 종료되어 최초 브라우저 연결은 거부됐다. 로컬 서버를 시작한 첫 시도는 Next.js 보안 권고로 종료됐고 재시도 후 시각 확인을 수행했다. 보안/브라우저 업데이트를 이번 그래프 수정에 포함하지 않았다.

다음 확인: 사용자 테스트 실행 지시가 있으면 시간 경계, 완전 결측, 부분 시간, 단일 관측과 동률 최대값을 포함해 시간별 표시 집계의 자동 회귀 검증을 수행한다.

후속 시각 확인: 실제 11월 7일 15시 막대의 툴팁에서 62,000~64,000명 범위, 원천 기준 15:20, 범위 중앙값 63,000명, 10분 구간 5개 중 1개 기록 및 부분 시간 안내를 확인했다. 기존 저장값을 그대로 표시한 결과이며 신규 원천 API 호출을 실행한 것이 아니다.

## 35. Next.js 16.4.5 보안 업데이트 (2026-11-08)

사용자가 next upgrade --agent=security 실행 후 지원 에이전트를 찾지 못했다는 안내를 공유하고 업그레이드를 요청했다. 에이전트 자동 탐색 대신 npm으로 명시적인 패치 버전을 설치했다.

### 변경

- next, @next/env, eslint-config-next를 16.4.0에서 16.4.5로 정확한 버전 고정 업데이트했다.
- package-lock.json의 @next/eslint-plugin-next와 플랫폼별 @next/swc도 16.4.5로 동기화됐다. 설치 전 잠금 파일과 비교해 Next 관련 항목 외 변경이 없음을 확인했다.
- 공식 릴리스 https://github.com/vercel/next.js/releases/tag/v16.4.5 에서 보안 수정 릴리스임을 확인했다. 모든 의존성의 취약점이 해소됐다는 의미는 아니다.
- 앱 코드, 설정, 환경변수, 수집/DB/Cron, 배포는 변경하지 않았다. 현재 디렉터리는 Git 저장소가 아니며 초기화하지 않았다.

### 검증

- Node 24.21.0 / npm 11.19.0.
- npm install --save-exact next@16.4.5 @next/env@16.4.5 eslint-config-next@16.4.5: 최초 sandbox DNS ENOTFOUND 후 승인된 외부 네트워크 실행으로 종료 0, 설치 패키지 5개 변경.
- npm ls: next/@next/env/eslint-config-next/@next/eslint-plugin-next/@next/swc-darwin-arm64 모두 16.4.5, 의존성 오류 없음.
- next --version: Next.js v16.4.5.
- npm run lint: 종료 0, 경고 0.
- npm run typecheck: 종료 0.
- npm run build: Next.js 16.4.5에서 종료 0, 프로덕션 컴파일/타입 검사/정적 페이지 생성 완료.
- 단위/통합/E2E/원천 실호출 테스트는 기존 사용자 지시에 따라 미실행. npm audit는 별도로 실행하지 않았다.

설치 시 기존 fsevents/unrs-resolver의 install script 승인 미등록 경고가 있었으며 추가 스크립트를 승인하지 않았다. 이후 lint/typecheck/build는 정상 통과했다. 3000 포트의 실행 중인 개발 서버가 없어서 기존 프로세스 중지/재시작은 하지 않았다. 다음 개발 서버 실행부터 설치된 16.4.5를 사용한다.

## 36. 최대 3곳 장소 비교 구현 (2026-11-08)

사용자가 다음 기능으로 제안한 장소 비교를 진행하도록 요청해 M4 중 비교 범위를 구현했다.

### 구현

- `/compare` 경로와 상단 장소 비교 메뉴를 추가했다. 도시 현황 목록에서 개별 현황 링크와 분리된 “비교에 추가” 버튼을 제공한다. 선택 표시줄의 칩 해제/전체 해제/비교하기와 검색 가능한 MUI 다중 선택으로 2~3곳을 지정한다. 네 번째 선택을 비활성화하고 해제 안내를 제공한다.
- 선택은 기존 places URL 상태가 소유한다. SSR은 기존 읽기 Repository에 비교 코드를 전달하고 브라우저는 정렬/중복 제거된 코드 조합으로 단일 history 요청과 캐시를 사용한다. 0~1곳일 때 비교 이력은 요청하지 않는다. 실제/시연 모드는 query key로 격리하고 전환 시 이전 조회를 취소/제거한다.
- 상태 카드는 혼잡도, 추정 범위, 원천 기준 시각, 수집 시각과 최신성을 표시한다. 비교 인구의 합산/안전 순위는 만들지 않는다. 오류, 로딩, 데이터 없음과 재조회 실패를 구분한다.
- 장소별 막대그래프에 동일한 from/to, 시간별 구간과 0 기준 공통 인구축을 적용했다. URL 선택 순서의 색상을 카드/그래프/표에서 일치시킨다. 시간별 마지막 관측 범위 중앙값만 표시하고 누락은 null로 보존한다. 없어진 시리즈를 다른 장소 기록으로 대체하지 않도록 getHourlyHistory에 명시적 null을 지원했다.
- 시간별 범위 비교 표와 툴팁에서 실제 상하한과 관측 기준을 확인한다. 공유 대화상자는 선택/모드가 담긴 URL, 복사 버튼과 직접 복사 대안을 제공한다. 7일은 준비 중 안내와 24시간 자료를 표시한다.
- 모바일 선택 표시줄의 칩이 좁아져 이름이 잘리는 모습을 시각 확인한 뒤, 칩을 별도 전체 폭 행으로 배치했다.
- README, 제품 UI와 구조 문서를 동기화했다. 기존 앱/API 계약, 수집과 DB, 환경변수, 의존성, 배포를 변경하지 않았다. Git 저장소가 아니며 초기화하지 않았다.

### 검증

- 최종 npm run lint 종료 0, 경고 0.
- 최종 npm run typecheck 종료 0.
- 최종 npm run build 종료 0, Next.js 16.4.5에서 `/compare`를 포함한 라우트 생성 확인.
- ego-browser TaskSpace 7에서 합성 시연 3곳 비교 화면을 1440×1080으로 시각 확인했다. 공통 시간/인구축과 장소별 카드가 표시됐다. 390×844의 선택창/메뉴/카드와 목록의 비교 선택 표시줄을 확인했고 문서 폭 390px로 가로 넘침이 없었다. 공유 대화상자에 dataset=demo와 선택한 3개 코드가 담긴 링크가 표시됨을 확인했다. 실제 클립보드 복사는 실행하지 않았다.
- 실데이터 비교 화면의 브라우저 캡처는 실행 전 자동 승인 검토에서 거부됐다. 사유는 실제 로컬 자료와 스크린샷을 브라우저 자동화 환경에 노출하는 전송 범위가 구체적으로 승인되지 않았다는 것이다. 해당 작업은 재시도/우회하지 않았고, 실제 자료의 비교 화면을 확인 완료로 기록하지 않는다. 기존 합성 시연 결과만 유지했다.
- 비교 캐시 정규화/활성 조건/URL 복원/공통 시간축/누락 시리즈 격리/0명과 null 구분의 단위 사례 5개를 작성했다. 사용자 테스트 실행 지시가 없어 실행하지 않았다. 기존 단위/통합/자동 E2E와 실호출 테스트도 미실행이다. 브라우저의 일부 시각 확인을 전체 사용자 흐름/키보드/뒤로가기 회귀 검증으로 표시하지 않는다.
- React Doctor는 오프라인 패키지 캐시 없음 ENOTCACHED로 종료 1. 점수와 회귀 진단 없음. Ego Lite 업데이트 알림은 있었으며 업데이트하지 않았다.

### 남은 범위

- 이번 구현은 최대 3곳의 24시간 비교다. 즐겨찾기, 7일, CSV, 지도 확대축소와 M3 운영 DB 검증은 남아 있다.
- 자동 테스트와 전체 상호작용 회귀 검증은 명시적 실행 지시 이후 수행한다. 실데이터 화면 시각 확인은 별도 노출 범위 승인이 필요하다.

## 37. 프로젝트 실행 작업 종료 (2026-11-08)

사용자의 “진행 중인 프로세스 모두 종료” 요청에 따라 seoul-pulse 실행 작업을 중지했다.

- 공식 collector:local stop 명령으로 10분/121곳 로컬 수집기를 정상 종료했다. 반환 상태 stopped, nextRunAt=null을 확인했다.
- 작업 디렉터리가 seoul-pulse임을 확인한 개발 서버와 npm/Node 부모 프로세스에 SIGTERM을 보냈다.
- 기존 수집기 PID 15857 및 개발 서버 PID 73512/73527/73528이 모두 사라졌고 3000/3001 포트에 리스너가 없음을 재확인했다.
- 기존 수집 자료와 환경 설정은 보존했다. VS Code, ChatGPT 도구 런타임, 사용자 셸 및 다른 앱은 종료하지 않았다.
- 앱 코드 변경, 테스트 실행, 배포, Git 작업은 없다. 수집과 개발 서버는 명시적으로 다시 시작하기 전까지 중지 상태다.

## 38. 사이드바 중심 워크스페이스 재구성 (2026-11-09)

사용자가 현재 서울시 데이터만 사용하는 범위에서 왼쪽 햄버거/사이드바, 넓은 중앙 현황판과 메뉴별 상세 탐색을 요청했다. 행사 운영 등 신규 상품 기능은 구현하지 않았다.

### 변경

- 공통 AppShell을 MUI Drawer 기반으로 교체했다. 데스크톱 232px 사이드바와 76px 아이콘 레일, 모바일 임시 서랍 메뉴, 활성 메뉴, 현재 위치, 선택 장소 바로가기를 제공한다. 접힌 상태는 화면 전용 Context로 메뉴 이동 동안 유지한다. 새로고침 후에는 기본 펼침 상태다.
- 임시 서랍은 작은 화면에서만 열려 있도록 viewport 조건을 적용했다. MUI의 포커스 관리/닫기 동작, 접근성 이름과 아이콘 레일 툴팁, 기존 본문 이동 링크를 유지했다.
- `/places`, `/map`, `/data-status`를 추가했다. 종합 현황은 주요 지표/시간별 인구/혼잡 분포/지도와 목록, 장소 탐색은 검색/필터/정렬/비교 선택이 가능한 카드 목록, 지도는 지도와 동등한 장소 목록을 제공한다.
- `/areas/[areaCode]`는 전체 대시보드를 반복하지 않고 해당 장소의 인구 흐름, 원천/수집 시각과 날씨를 표시한다. 지도/목록/비교/자료 상태에서 이 상세로 연결한다. 상세 선택창으로 다른 장소의 경로를 열 수 있다.
- 자료 상태는 최신, 갱신 지연, 자료 만료, 자료 없음의 4개 지표와 기존 시각 표를 표시한다. 기존 인구 최신성 계산을 재사용했다.
- 비교 화면의 카드 높이를 줄여 그래프를 위로 배치했다. 같은 축, 원래의 인구 추정 범위와 결측 표시를 유지한다.
- 메뉴 링크는 데이터 모드/검색/필터/비교 상태를 유지하고, 화면 내 조건 변경은 현재 경로를 유지한다. 장소 탐색/지도/자료 상태는 SSR과 브라우저에서 사용하지 않는 인구 이력 요청을 생략한다.
- 레이아웃과 색상 토큰은 src/theme에서 관리한다. 기존 MUI/Charts와 읽기 Repository를 재사용했으며 의존성, 공개 API, 원천 수집, DB, 환경 설정은 변경하지 않았다.
- README, 제품 UI 명세와 기술 구조 문서를 갱신했다. Git 저장소가 없어 Git 초기화/브랜치/커밋 작업은 수행하지 않았다.

### 검증

- 최종 npm run lint: 종료 0, 경고 0.
- 최종 npm run typecheck: 종료 0. 최초 ListItemText 글꼴 속성 타입 오류는 설치된 MUI 9 타입을 확인해 sx로 수정했다.
- 최종 npm run build: 종료 0. 새 `/places`, `/map`, `/data-status`를 포함한 라우트 생성 확인.
- ego-browser TaskSpace 8에서 합성 데이터만 시각 확인했다. 종합 현황/상세는 1800px, 지도/비교/자료 상태는 1440px, 모바일 상세/탐색/서랍 메뉴는 390px에서 확인했다. 확인한 모바일 상세/탐색과 데스크톱 비교에서 문서 폭이 뷰포트 폭과 일치했다. 메뉴 이동 후 사이드바 접힘 상태 유지도 확인했다.
- 모바일 서랍은 열림 애니메이션이 끝난 위치를 기다린 뒤 캡처했다. 비교 차트는 로딩 완료 후 3개 막대그래프를 확인했다. 일부 시각 확인을 전체 키보드/상호작용/뒤로가기 회귀 검증으로 표시하지 않는다.
- 단위/통합/자동 E2E/원천 API 실호출 테스트는 사용자 실행 지시가 없어 미실행이다. 이번 실데이터 화면 확인도 수행하지 않았다.
- React Doctor 변경 진단은 offline 캐시 없음 ENOTCACHED로 종료 1. 점수와 회귀 진단은 확인하지 못했다.
- Ego Lite 업데이트 알림을 확인했으나 도구 업데이트는 하지 않았다. 작업 공간은 finish({ keep: [] })로 종료했다.
- UI 확인을 위한 임시 개발 서버만 실행했다가 정상 종료했다. 3000 포트 리스너가 없음을 확인했다. 수집기는 다시 실행하지 않았다.

### 남은 범위와 다음 작업

- 사용자 피드백에 따라 화면 밀도와 메뉴 동선을 조정한다.
- 자동 테스트와 전체 사용자 흐름 검증은 명시적 실행 지시 이후 수행한다.
- 즐겨찾기, 7일 이력, CSV, 지도 확대축소, 운영 DB 검증과 배포는 이번 작업 범위가 아니다.

## 39. Unslop 감사 후 디자인 정리 (2026-11-09)

사용자가 Unslop 감사 결과에 동의하고 코드 수정을 요청했다. 전면 재설계 대신 기존 메뉴, 섹션 순서와 데이터 의미를 유지하는 polish 범위를 적용했다. 기준은 Damir Sokolovsky의 Unslop(CC BY 4.0)이며 제품 UI 문서 13절에 방향과 출처를 기록했다.

### 패스별 변경

1. 간격: 지표 카드 패딩 16px, 숫자 32px로 압축. 데스크톱 메뉴 행 36px/간격 4px, 모바일 메뉴 44px 이상 유지. 헤더 기준 64px.
2. 색상: 기존 팔레트를 유지하고 선택 메뉴 배경 강조를 낮췄다. 의미가 있는 혼잡 단계와 비교 장소 색은 유지했다.
3. 아이콘: 메뉴 아이콘 18px, 상단 자료 상태/설정 아이콘 16px로 정리. 기존 MUI 아이콘 세트 유지.
4. 문구: 느낌표와 장식 기호를 혼잡도 배지에서 제거했다. 검색을 장소명 검색으로 통일하고 합성 데이터 안내의 중복을 줄였다. 상단에 합성 데이터와 실제 현황이 아니라는 안내를 유지했다.
5. 글자: 기존 한국어 시스템 글꼴과 숫자 글꼴 유지. 본문 14px/보조 12px, 굵기 400/500/600으로 정리. 인구 범위의 과한 음수 자간 제거. 로고 보조 설명 10px에서 12px로 확대.
6. 배치: 모바일 제목/설정과 장소 선택/탐색을 각각 같은 줄로 묶었다. 종합 현황의 지표와 차트 순서, 상세/비교의 데이터 흐름은 유지했다.
7. 세부: 지표 카드의 색점 후광과 비교 선택창의 강조 테두리/그림자를 제거했다. 비교 개수는 조용한 숫자로 표시한다. 원천 기준 시각과 최신성 표시는 유지한다.
8. 시각 자료: 생성 이미지나 장식을 추가하지 않았다. 기존 공식 지도, 시간별 막대, 범위/결측 표시를 유지한다.
9. 움직임: 신규 애니메이션 없음. 기존 포커스 표시, MUI 메뉴 동작과 reduced-motion 대응 유지.

### 검증

- 최종 npm run lint: 종료 0, 경고 0.
- 최종 npm run typecheck: 종료 0.
- 최종 npm run build: 종료 0, 기존과 같은 라우트 생성 확인.
- ego-browser TaskSpace 9에서 합성 데이터로 총 3회 화면 캡처: 1440px 종합 현황 2회, 390px 모바일 상세 1회. 최종 지표 카드 4개 모두 높이 118px, 데스크톱 메뉴 행 36px. 확인 화면에서 문서 폭이 각각 1440/390px로 뷰포트와 일치했다.
- 모바일 상세의 차트 패널 시작 위치는 약 303px로 직전 저장 캡처의 약 392px보다 위로 이동했다. 전체 사용자 흐름이나 모든 화면의 반응형 회귀 검증을 의미하지 않는다.
- 브라우저의 초기 차트 대기 선택자가 실제 DOM과 달라 시간 초과가 났고, 상태 관찰로 차트 렌더를 확인한 후 선택자를 수정했다. 앱 데이터 오류로 기록하지 않는다.
- React Doctor는 offline 캐시 없음 ENOTCACHED로 종료 1. 점수/회귀 진단 없음.
- 사용자 지시에 따라 단위/통합/자동 E2E/원천 실호출 테스트는 미실행. 실제 자료는 이번 시각 확인에 사용하지 않았다.
- 브라우저 작업 공간은 finish({ keep: [] })로 종료. 업데이트 알림만 확인하고 업데이트하지 않았다. 임시 개발 서버를 종료했고 3000 포트 리스너가 없음을 확인했다. 수집기는 다시 실행하지 않았다.
- 공개 API/수집/DB/환경/의존성 변경 없음. Git 저장소가 없어 초기화/브랜치/커밋 없음.

### 남은 항목

사용자 피드백에 따른 화면 조정, 명시적 실행 지시 이후의 전체 상호작용/자동 테스트 검증. 즐겨찾기, 7일, CSV, 지도 확대축소와 운영 DB는 별도 범위로 남긴다.

## 40. 로컬 서버 호스트 이름 변경 (2026-11-09)

- 사용자 요청으로 package.json의 dev/start 명령을 각각 next dev --hostname localhost, next start --hostname localhost로 변경했다.
- 수정 후 Node로 package.json을 읽어 두 명령과 JSON 파싱 성공을 확인했다.
- 서버 기동, 테스트, 수집기 재시작은 수행하지 않았다. 의존성 변경이 없어 잠금 파일은 변경하지 않았다.
- 다음 서버 실행부터 localhost 설정이 적용된다. 실제 기동 확인은 미수행이다.

## 41. Unslop 전면 디자인 개선 (2026-11-09)

사용자의 전면 개선 요청에 따라 현황판, 상세, 장소 목록, 지도와 비교 화면의 시각 체계를 수정했다. 방향과 세부 기준은 제품 UI 문서 14절에 기록했다. Damir Sokolovsky의 Unslop(CC BY 4.0)을 기준으로 적용했다.

### 변경

- 간격/배치: 지표 4개를 공통 요약 영역으로 통합하고 모바일 2열 구분선을 적용했다. 주 그래프 비율을 2.5:1로 확대하고 장소 식별/인구 범위를 데스크톱 가로, 모바일 세로로 배치했다.
- 색상: 남색 위주 배경을 흑연 계열 중성색으로 변경했다. 주요 데이터 파랑과 혼잡 상태 색은 역할을 구분한다.
- 아이콘/문구: 기존 MUI 아이콘을 유지하고 혼잡 분포 제목을 간결하게 정리했다. 장소 코드와 원천 시각을 공통 관측 정보로 드러냈다.
- 글자: 페이지 제목 32px, 요약 숫자 32px, 목록 범위 20px, 환경 값 24px. 숫자는 기존 고정폭/탭형 숫자와 추정 범위를 유지한다.
- 세부: 입력 배경, 표 hover, 공통 패널 헤더, 로딩 스켈레톤을 새 톤에 맞췄다. 비교 카드의 굵은 색 테두리를 제거했다.
- 시각 자료: 주 그래프 높이 300/260px, 보조 분포 막대 두께 축소와 격자 제거. 비교 그래프 280px와 개별 바탕 적용. 공식 지도 최대 폭 680px, 자치구 이름 표시 범위 확대와 상단 정렬 적용.
- 움직임: 장식 모션 추가 없음. 기존 MUI 동작과 reduced-motion 유지.
- 추정 범위, 결측, 지연, 원천/수집 시각, 합성/실자료 구분과 기존 동작 계약을 유지했다. API/수집/DB/의존성 변경 없음.

### 검증과 제한

- 최종 npm run lint / npm run typecheck / npm run build: 모두 종료 0.
- ego-browser TaskSpace 10에서 합성 데이터만 사용했다. 캡처 3회: 현황판 초안, 수정 현황판, 모바일 상세. 1440px 현황판과 390px 상세 모두 문서 폭이 뷰포트와 일치했다. 수정 현황판의 주 그래프 영역은 767px 폭, 300px 높이로 렌더됐다.
- 1440px 비교 화면은 DOM으로 3개 차트 렌더, 동일 0~40,000명 축, 가로 넘침 없음을 확인했다. 비교 화면의 별도 스크린샷 및 전체 동작 회귀 검증은 수행하지 않았다.
- 마지막 지도 상단 정렬과 긴 장소명을 위한 줄바꿈 보강은 타입/린트/빌드로 확인했으며 추가 캡처하지 않았다.
- React Doctor offline 실행은 ENOTCACHED로 진단하지 못했다. 진단 점수 없음.
- 사용자 지시에 따라 단위/통합/자동 E2E/실호출 테스트는 미실행했다. 실제 자료는 시각 확인에 사용하지 않았다.
- 기존 localhost:3000 개발 서버가 발견되어 해당 서버를 사용했다. 새로 시도한 3001 서버는 Next.js 중복 서버 감지로 종료됐다. 기존 서버는 유지했고 수집기는 실행하지 않았다.
- 브라우저 작업 공간은 finish({ keep: [] })로 종료했다. Ego Lite 업데이트 알림은 확인했으나 업데이트하지 않았다.
- Git 저장소가 없어 Git 초기화, 브랜치, 커밋은 수행하지 않았다.

### 다음 작업

실제 사용 피드백을 반영한 화면 밀도 조정과 명시적 실행 요청 이후의 전체 상호작용/회귀 테스트. 즐겨찾기, 7일 이력, 내보내기와 지도 확대축소는 별도 범위로 남긴다.

## 42. 햄버거 버튼을 왼쪽 네비게이션으로 이동 (2026-11-09)

- 사용자 요청에 따라 데스크톱 접기/펼치기 버튼을 AppShell 본문 툴바에서 Sidebar 헤더로 이동했다. 두 상태에서 왼쪽 16px, 버튼 최소 44px로 같은 위치를 유지한다.
- 펼친 네비게이션은 버튼 오른쪽에 로고 링크를 표시한다. 접힌 상태에서도 버튼을 바로 사용할 수 있고 기존 메뉴 이동 중 접힘 상태 유지 동작은 재사용한다.
- 모바일 닫기 버튼도 Sidebar 헤더에 통합했다. 숨겨진 메뉴를 여는 상단 왼쪽 버튼은 유지한다. 툴팁과 접근성 이름/열림 상태를 제공한다.
- npm run lint, npm run typecheck: 종료 0. React Doctor는 offline 캐시 없음(ENOTCACHED)으로 진단 미실행.
- 사용자 지시에 따라 테스트 미실행. 이번 작은 배치 변경에서는 빌드와 브라우저 확인을 수행하지 않았다.
- 다음 작업: 실제 사용 피드백에 따른 네비게이션 배치 조정. 서버/수집기/Git 작업 없음.

## 43. 메뉴를 접은 뒤 아이콘 누락 제보 확인 (2026-11-09)

- 사용자가 메뉴를 닫으면 아이콘이 사라진다고 제보했다. systematic-debugging 순서에 따라 코드와 합성 데이터 브라우저 화면을 먼저 확인했다.
- 1440px에서 접기 버튼을 누른 후 펼치기 버튼은 x=16, y=9.5, 44x44px, 내부 SVG는 24x24px로 표시됐다. 스크린샷에서도 햄버거와 메뉴 아이콘이 보였다.
- 390px에서 모바일 메뉴를 열고 닫은 뒤 상단 메뉴 열기 버튼과 SVG가 유지됐다.
- 로고 영역은 compact 조건에서 제거되는 코드임을 확인했다. 사용자에게 로고/햄버거/메뉴 항목 중 어떤 아이콘인지 확인을 요청했다. 증상 대상이 확정되지 않아 코드 변경 없이 대기한다.
- 자동 테스트, 빌드와 타입/린트는 변경이 없어 미실행. 진단용 TaskSpace 11은 종료했고 기존 서버는 유지했다. Ego Lite 업데이트는 실행하지 않았다.
- 다음 작업: 사용자 답변으로 누락 대상과 화면 조건을 확정한 뒤 해당 원인을 수정한다.

## 44. 접힌 사이드바의 로고 아이콘 복원 (2026-11-09)

- 사용자가 누락 대상을 SEOUL PULSE 로고 아이콘으로 확인했다. 앞선 버튼 이동에서 로고 SVG가 제거되고 로고 링크 전체가 compact 조건 안에 있던 것이 원인이었다.
- 로고 링크와 pulse 아이콘을 항상 렌더하고 이름/설명만 펼친 상태에 표시한다. 로고는 상단, 햄버거는 바로 아래 별도 행에 배치해 76px 레일에서도 두 동작을 함께 제공한다.
- 합성 데이터 1440px 브라우저에서 접기/펼치기를 직접 확인했다. 양쪽 상태에서 로고는 x=22/y=16.5, 30x30px, 버튼은 x=16/y=72, 44x44px로 유지됐다. 접힌 화면 캡처에서 두 아이콘 표시를 확인했고 펼친 화면은 가로 넘침이 없었다.
- npm run lint / npm run typecheck: 종료 0. React Doctor는 ENOTCACHED로 진단 미실행. 사용자 지시에 따라 자동 테스트는 실행하지 않았다. 빌드 미실행.
- TaskSpace 12를 종료했다. 기존 개발 서버는 유지했고 Ego Lite 업데이트는 실행하지 않았다.
- 다음 작업: 사용자 피드백 반영. 앞 절의 누락 대상 확인 대기는 해소됐다.

## 45. 사이드바 접기/펼치기 아이콘 변경 (2026-11-09)

- 사용자 요청으로 로고 아래 햄버거를 방향 화살표로 교체했다. 펼친 상태는 ChevronLeftRounded, 접힌 상태는 ChevronRightRounded다.
- 로고와 버튼 위치, 접근성 이름, 툴팁과 기존 상태 전환을 유지한다. 모바일의 숨겨진 메뉴를 여는 상단 햄버거는 유지한다.
- npm run lint / npm run typecheck: 종료 0. React Doctor는 ENOTCACHED로 진단하지 못했다.
- 아이콘 교체만 수행해 추가 브라우저 확인/빌드는 미실행. 사용자 지시에 따라 테스트 미실행. 서버와 Git 작업 없음.
- 다음 작업: 사용자 피드백에 따른 네비게이션 조정.

## 46. 레퍼런스를 반영한 사이드바 토글 (2026-11-09)

- 사용자 요청으로 shadcn/ui Sidebar 공식 문서와 Atlassian 네비게이션 팀의 full-height sidebar 안내를 조회했다. shadcn의 PanelLeftIcon 패턴, Atlassian의 토글 발견 가능성과 툴팁 개선을 참고했다. 출처 링크는 제품 UI 문서에 기록했다.
- 단독 방향 화살표를 MUI ViewSidebarOutlined로 교체하고 왼쪽 패널 방향으로 표시했다. 펼친 상태에서는 사이드바 접기 문구, 접힌 상태에서는 패널 아이콘과 펼치기 툴팁을 제공한다. 얇은 테두리와 44px 높이로 메뉴 이동과 별도 동작임을 표현한다.
- 로고는 상단에 유지한다. 모바일의 숨겨진 메뉴 진입 버튼도 유지한다. 외부 디자인 라이브러리/의존성 추가 없음.
- 합성 데이터 1440px에서 펼친/접힌 화면 각각 캡처하고 확인했다. 접힌 버튼 44x44px, 로고 30x30px 유지 및 가로 넘침 없음. Enter로 다시 펼치는 동작을 직접 확인했다.
- npm run lint / npm run typecheck: 종료 0. React Doctor는 ENOTCACHED로 진단 미실행. 자동 테스트와 빌드는 미실행.
- TaskSpace 13 종료, 기존 서버 유지. Ego Lite 업데이트 알림은 확인했고 업데이트하지 않았다.
- 다음 작업: 변경된 표현에 대한 사용자 피드백 반영.

## 47. 사이드바 토글을 하단으로 이동 (2026-11-09)

- 사용자 요청으로 접기/펼치기 버튼을 데이터 안내 아래 네비게이션 맨 하단으로 이동했다. 메뉴 영역은 minHeight: 0과 overflowY: auto로 스크롤되며 버튼 영역은 축소되지 않는다.
- 기존 패널 아이콘, 문구와 툴팁, 로고 상단 표시를 유지한다. 모바일 닫기 버튼도 동일한 하단 배치를 사용한다.
- 합성 데이터 1440x900 브라우저에서 펼친/접힌 버튼 모두 y=840, 높이 44px, 하단 여백 16px을 확인했다. TaskSpace 14 종료, 기존 서버 유지. Ego Lite 업데이트 알림만 확인하고 업데이트하지 않았다.
- npm run lint / npm run typecheck: 종료 0. React Doctor는 ENOTCACHED로 진단 미실행. 자동 테스트와 빌드 미실행.
- 다음 작업: 사용자 피드백 반영. Git 작업 없음.

## 48. 시연용 최근 24시간 이력 보존 (2026-11-09)

- 사용자 결정에 따라 현재 현황과 최근 24시간 인구 흐름을 제품 범위로 확정했다. 기존 7일 이력 계획은 현재 시연 범위에서 제외하고 기준 문서와 README를 갱신했다.
- 조회는 이미 최근 24시간을 제공하므로 API/차트 계약은 유지했다. 결측을 합성 값으로 채우지 않는다.
- Supabase CLI의 migration new로 `20261109141147_retain_population_history_24_hours.sql`을 생성했다. 기존 migration을 수정하지 않고 정리 함수만 교체한다. 잠금 획득 후 기준 시각을 고정해 원천 시각 기준 24시간 초과 이력만 정리하고 최신 현황은 유지한다. 기존 SECURITY INVOKER/관리 역할 권한과 운영 로그 14일 보존을 유지한다.
- cron-enable 템플릿의 정리를 매일에서 매시 23분으로 변경했다. 정상 실행 사이 약 1시간의 삭제 대기 관측이 남을 수 있음을 문서에 명시했다. 기존 예약이 있다면 별도 변경해야 하며 신규 등록 템플릿의 중복 방지는 유지한다.
- 로컬 수집본은 다음 저장 완료 시점 기준 최근 24시간 이력만 보관하도록 변경했다. 기존 파일 읽기 호환성을 위해 100,000개/32MiB 안전 상한은 유지한다. 최신값과 기존 수집본은 조회만으로 삭제하지 않는다.
- 권한 3개와 이력/최신값/반복 정리 계약을 확인하는 pgTAP 검사 4개를 작성했다. 사용자 지시에 따라 테스트는 실행하지 않았다.

### 확인과 미실행

- npm run lint / npm run typecheck / npm run build: 모두 종료 0. 빌드 라우트 유지 확인.
- SQL은 작성/코드 검토만 수행했다. 실제 PostgreSQL 파싱, 권한, 삭제 결과와 경계 검증은 미실행이며 앱 빌드 통과를 DB 검증으로 해석하지 않는다.
- Supabase 공식 changelog와 Cron quickstart를 확인했다. CLI v3의 로컬/원격 대상 변경을 확인하고 migration new만 사용했다. CLI는 프로젝트 의존성에 추가하지 않고 임시 npm 캐시에서 사용했다.
- 원격 DB 접속/적용, 기존 자료 삭제, Cron 활성화, 원천 API 호출과 수집기 재시작은 수행하지 않았다. 기존 서버는 유지했다. Git 저장소가 없어 Git 작업 없음.

### 다음 작업

명시적 테스트 실행 지시 후 전용 로컬 DB에서 두 migration과 보존 계약을 확인한다. 운영 DB 적용과 매시간 정리 활성화는 배포 단계에 남아 있다. 121곳 운영 수집 분할과 실제 배포는 별도 후속 범위다.

## 49. 기본 모니터링을 20곳으로 확장 (2026-11-10 KST)

- 최초 시연과 운영 DB 범위가 5곳에 머물러 있던 상태에서 사용자 요청에 따라 20곳으로 확장했다. 기존 5곳을 유지하고 동대문 관광특구, 잠실 관광특구, 경복궁, 광화문·덕수궁, 건대입구역, 서울역, 용산역, 합정역, 혜화역, 광장(전통)시장, 연남동, DDP(동대문디자인플라자), 남산공원, 서울숲공원, 여의도한강공원을 추가했다.
- `monitoredAreaCatalog`가 기존 공식 카탈로그의 코드, 이름과 분류를 참조한다. 데모, 현황, 검색, 상세, 비교, 데이터 안내, 로컬/DB 조회와 기본 수집에 같은 목록을 사용한다. 공식 전체 121곳 목록, 지도 도형, 기존 수집본 읽기와 명시적 `capture:seoul --all`은 유지한다. 비교 동시 선택은 기존 최대 3곳이다.
- 추가 15곳에도 명시적인 합성 최신값과 24시간 이력을 제공한다. 실데이터가 없을 때 시연 데이터로 대체하거나 과거 이력을 만들어 채우지 않는다. 실수집기는 중지 상태를 유지한다.
- Supabase CLI `migration new`로 `20261109150723_expand_monitored_areas_to_twenty.sql`을 생성했다. 신규 장소는 수집 비활성으로 삽입하며 기존 장소 설정은 덮어쓰지 않는다. DB/앱 수집 최대 20곳, 실행당 예약 최대 40회, 내부 일일 예산 기본/상한 6,000회를 맞췄다. 실제 키의 허용량을 보장하는 값이 아니다.
- DB 수집은 동시 2개와 기존 기한을 유지하며 마지막 시도가 오래된 장소부터 처리한다. 기한 때문에 누락된 장소가 다음 실행에도 뒤로 밀리는 것을 줄이지만 매번 20곳 완료를 보장하지 않는다. 실제 API 완료 시간은 측정하지 않았다.
- 로컬 기본 수집도 20곳이며 10분 예산 2,880회, 30분 예산 960회다. 이전 원장과 수집본의 읽기 상한은 호환성을 위해 유지한다. 기본 단일 수집 기한은 150초로 맞췄다. 환경 예시, 활성화 템플릿과 기준 문서를 갱신했다.

### 확인과 미실행

- `npm run lint`, `npm run typecheck`, `npm run build`: 모두 종료 0.
- 합성 데이터 브라우저 확인: 현황 20곳과 서울숲공원 그래프, 잠실 검색 결과 1/20, 신규 3곳 비교 선택, 모바일 390px에서 지도 표식 20개와 가로 넘침 없음. 스크린샷을 육안 확인하고 TaskSpace 15를 종료했다. 기존 개발 서버는 유지했다.
- 20곳의 최신값/이력 일치, 동시 요청 2개 유지, DB의 20곳 획득/시도 순서/40회 예약 검사 코드를 준비했다. 사용자 지시에 따라 단위, 통합, E2E와 SQL 테스트는 실행하지 않았다. PostgreSQL에서 새 마이그레이션의 파싱과 권한 동작은 미검증이다.
- React Doctor는 오프라인 캐시가 없어 ENOTCACHED로 진단하지 못했다. Ego Lite 업데이트 알림을 확인했으며 업데이트는 수행하지 않았다.
- 원격 DB 적용, 수집 재시작, 원천 API 호출, Cron 활성화와 배포는 수행하지 않았다. 로컬 비밀 환경 파일은 변경하지 않았다. Git 저장소가 없어 Git 작업 없음.

### 다음 작업

테스트 실행 요청을 받으면 준비한 단위/DB 계약을 검증한다. 배포 시 새 마이그레이션, 최대 장소/예산 환경 변수, 선택 20곳 활성화 템플릿을 함께 반영해야 한다. 실데이터 갱신은 별도 수집 재시작 이후부터 쌓인다.

## 50. 공개 화면을 실데이터 전용으로 정리 (2026-11-10 KST)

- 사용자 요청에 따라 대시보드의 화면 설정 버튼과 대화상자, 시연 상태 선택을 제거했다. 비교 화면의 데이터 모드 선택, 조회 오류 화면과 데이터 안내의 데모 진입 버튼도 제거했다.
- 공개 URL 상태는 live/normal로 고정한다. 기존 dataset=demo와 scenario 링크도 실데이터 화면으로 해석하며 새 링크에는 두 옵션을 넣지 않는다. 장소 선택, 검색, 정렬, 비교와 페이지 조건은 유지한다. 기존 /demo는 선택 조건을 보존해 실데이터 현황으로 이동한다.
- 공개 저장소 factory에서 DemoRepository 의존성을 제거하고 실데이터 이외의 요청을 거부한다. /api/v1/demo/*는 404, live API의 시연 상태 옵션은 400이다. 합성 fixture와 직접 사용하는 내부 검사 코드는 유지한다.
- 환경 기본값은 live이며 이전 DATA_MODE=demo도 공개 서비스에서는 live로 해석한다. 비밀 환경 파일은 변경하지 않았다. 저장소 설정 누락, 오류와 빈 기록은 실제 상태로 표시한다. 자료 상태, 자동 확인과 다시 조회는 유지했다.
- 데이터 안내를 실제 서울시 자료 20곳과 최근 24시간 기준으로 수정하고 제품/API/운영 문서와 환경 예시를 갱신했다.
- 최초 타입 검사에서 합성 저장소 제거 후 남은 scenario 인수 4곳을 확인해 실데이터 저장소 호출에 맞게 수정했다. 최종 npm run lint, npm run typecheck, npm run build 모두 종료 0.
- URL 호환, 환경 기본값과 공개 API의 합성 요청 차단 검사 코드를 갱신했다. 사용자 지시에 따라 단위/통합/E2E/실호출 테스트는 실행하지 않았다. 이번 변경의 브라우저 육안 확인은 미실행이다. React Doctor는 오프라인 캐시가 없어 ENOTCACHED로 진단 미실행이다.
- 원격 DB 변경, 원천 수집, 수집기 재시작과 배포는 수행하지 않았다. 기존 개발 서버 유지, Git 작업 없음.
- 다음 작업: 실데이터 수집을 다시 시작하기로 결정하면 별도 실행 범위에 맞춰 재개한다. 운영 DB 적용과 배포 준비는 이전 절의 미완료 항목을 따른다.

## 51. 비교 기록 없음 원인 확인 (2026-11-10 KST)

- 사용자 문의에 따라 비교 차트의 빈 상태 조건, 최근 24시간 이력 조회와 로컬 수집 상태를 읽기 전용으로 확인했다.
- 2026-11-10 00:24 KST 확인 당시 수집기는 stopped, 다음 실행 없음, 당일 예약 요청 0회였다. 마지막 수집 완료는 2026-11-08 23:05:29 KST, 저장된 인구 관측의 최신 원천 시각은 2026-11-08 22:35 KST다.
- 로컬 파일에는 기존 관측 100,000개가 있지만 현재 시각 기준 최근 24시간에 속하는 관측은 0개다. buildLiveHistory는 조회 기간 밖의 값을 제외하며 비교 차트는 유효한 시간대가 없을 때 기록 없음 상태를 표시한다.
- 실데이터 전용 전환 후 합성 이력으로 채우지 않으므로 수집이 멈춘 상태가 그대로 보인다. 20곳 확장이나 비교 선택 수 때문에 발생한 현상이 아니다.
- 코드와 데이터 파일 변경, 테스트 실행, 원천 API 호출, 수집 재시작은 수행하지 않았다. 다음 조치는 사용자가 정기 수집 재개를 요청하면 승인된 범위에 맞춰 실행하는 것이다.

## 52. 20곳 정기 수집 재개 시도와 승인 차단 (2026-11-10 KST)

- 사용자의 수집 미재개 지적을 재개 요청으로 받아, 기존 로컬 수집기의 20곳/10분 설정으로 start --execute를 시도했다.
- 자동 승인 검토가 실행 전에 명령을 거부했다. 이유: 수집 재개 요청은 있지만 인증키를 비암호화 HTTP로 반복 전송하는 방식과 반복 범위에 대한 명시적 승인이 부족함. 우회하거나 다른 실행 경로로 재시도하지 않았다.
- 읽기 전용 status에서 stopped, nextRunAt=null, 당일 요청 예약 0회를 재확인했다. 이번 시도로 원천 요청이나 수집기 시작은 발생하지 않았다.
- 실행 준비 범위는 20곳 각 1회, 시작 즉시 이후 10분마다 반복, 일일 내부 상한 2,880회, 사용자가 중지하거나 프로세스가 종료될 때까지다. 공식 서울시 API로 인증키가 평문 HTTP 전송됨을 사용자에게 명시하고 승인 답변을 기다린다.
- 다음 작업: 해당 전송 방식/범위에 대한 명시적 승인을 받으면 같은 명령을 실행하고 첫 배치 결과와 최근 24시간 이력 갱신을 확인한다.

## 53. 5분 수집과 1분 화면 확인 준비 (2026-11-10 KST)

- 사용자 요청에 따라 기본 수집을 20곳/5분으로 변경했다. 로컬 CLI는 5/10/30분을 선택하며 기본 5분의 일일 예산은 5,760회다. 이전 3/10/30분 상태 파일 읽기 호환성은 유지한다. 단일 수집의 중복 방지 슬롯도 5분으로 맞췄다.
- 현황, 장소 상세와 비교의 이력 재확인을 10분에서 1분으로 변경했다. 최신 현황은 기존 1분을 유지한다. 공개 조회는 여전히 저장소만 읽고 서울시 API를 호출하지 않는다.
- 실데이터 history 조회를 5분 버킷으로 변경해 인접한 5분 관측이 같은 10분 버킷에 묶이지 않게 했다. 24시간 경계에 걸치면 최대 289개 버킷이며 결측과 부분 구간을 유지한다. DTO는 내부 합성 fixture/이전 응답의 10분도 읽는다. 차트의 시간별 마지막 관측 표현은 유지하고 표/툴팁/누락 문구는 응답 해상도를 따른다.
- 원천 시각이 같은 관측의 중복 저장 방지와 최근 24시간 보존은 기존 구현을 유지한다. DB 내부 일일 상한 6,000회는 유지한다. 기본 5,760회 외 재시도 여유는 240회이며 예산 초과 시 중단한다.
- Supabase CLI migration new로 `20261109153947_collect_every_five_minutes.sql`을 생성했다. DB 획득 슬롯을 5분으로 바꾸고 기존 권한을 유지한다. COLLECTOR 설정은 5분만 허용하며 Cron 템플릿도 */5로 변경했다. 원격 DB 적용/예약 활성화는 수행하지 않았다.
- npm run collector:local -- start --interval-minutes=5 설정 확인 결과: sourceRequests=0, targetCount=20, intervalMinutes=5, dailyBudget=5760. 실제 시작 전 준비 상태만 확인했다.
- 이후 사용자 동의를 근거로 5분 start --execute를 시도했으나 자동 승인 검토에서 실행 전에 거부됐다. 사유는 주기 변경 승인은 인정되지만, 인증키의 비암호화 HTTP 반복 전송과 중지 전까지의 지속 실행을 명시적으로 승인한 것으로 보기 어렵다는 것이다. 우회 실행하지 않았다.
- 재확인한 수집기 상태는 stopped, nextRunAt=null, 당일 요청 0회다. 상태에 남은 intervalMinutes=10은 마지막 중지 프로세스의 설정이며 신규 5분 프로세스는 시작되지 않았다. 현재 실제 API 요청/새 관측 생성은 없다.
- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. 인접 5분 관측 보존, 기본 예산/이전 상태 호환과 DB 5분 슬롯 검사를 작성했지만 사용자 지시에 따라 자동 테스트 및 SQL 검사는 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다. 기존 서버 유지, Git 작업 없음.
- 다음 작업: 인증키를 비암호화 HTTP로 서울시 공식 API에 전송하며 20곳을 즉시/이후 5분마다, 하루 최대 5,760회, 중지할 때까지 수집하는 범위에 대해 명시적 승인을 받은 뒤 같은 준비된 명령을 실행한다. 첫 배치와 비교 이력 갱신 확인은 수집 재개 후 진행한다.

## 54. 20곳 5분 정기 수집 재개 완료 (2026-11-10 KST)

- 직전 명시적 승인 질문(인증키 비암호화 HTTP 전송, 20곳/5분, 하루 최대 5,760회, 중지할 때까지)에 대해 사용자가 앞서 합의한 실행 의사를 재확인했다. 해당 맥락으로 같은 준비된 start 명령을 실행했으며 자동 승인 검토를 통과했다. 이전 거부를 우회하지 않았다.
- 로컬 수집은 2026-11-10 01:01:49 KST에 시작했고 첫 배치는 01:01:57 KST에 성공했다. 원천 요청 20회, 인구 유효 20곳, 날씨 유효 20곳, 일시 중지 사유 없음이다.
- 상태 조회에서 intervalMinutes=5, targetCount=20, waiting, 다음 실행 01:06:49 KST, 일일 예산 5,760회와 예약 요청 20회를 확인했다. 상태의 waiting은 다음 주기 대기이며 프로세스는 실행 중이다.
- 로컬 수집본의 최근 24시간 실제 인구 관측은 20개이고 모든 20곳에 1개씩 존재한다. 기존 기간 밖 이력은 수집 완료 시점의 24시간 보존 정책에 따라 정리됐으며 최신값은 별도 유지된다.
- 화면이 읽는 localhost 공개 history API에서 여의도/강남역/서울숲공원 요청이 HTTP 200, dataset=live, resolutionMinutes=5로 반환됐다. 각 장소의 유효 기록 1개와 원천 시각 2026-11-10 00:30 KST를 확인했다. 수집 완료 시각으로 원천 시각을 바꾸지 않았다.
- 코드 변경과 자동 테스트 실행은 없었다. 이번 확인은 실제 재개한 수집 결과와 저장된 자료의 읽기 응답 확인이다. 키, 인증 URL, 원본 XML은 출력하지 않았다. 원격 DB/Cron/배포는 변경하지 않았고 기존 개발 서버를 유지했다.
- 다음 작업: 컴퓨터와 프로세스가 실행되는 동안 5분마다 기록을 추가한다. 화면은 1분마다 저장 자료를 확인한다. 재부팅 자동 시작/상시 배포 수집은 별도 후속 범위다.

## 55. 큰 화면용 한 화면 상황판 (2026-11-10 KST)

- 사용자 요청에 따라 메인 종합 현황을 상단 지표, 중앙 서울 지도와 선택 장소 인구 흐름, 하단 20곳 전체 목록으로 재구성했다. 기존 색상과 숫자 서체, MUI 컴포넌트와 차트를 유지했다.
- CSS 뷰포트 1280×800 이상에서는 화면 높이에 맞춰 지도와 그래프가 남은 공간을 나눠 쓴다. 전체 장소는 페이지 이동 없이 4열 5행으로 표시한다. 그보다 작은 화면에서는 글자 크기를 유지한 세로 배치이며 화면을 잘라 숨기지 않는다.
- 지도, 선택창과 목록이 같은 URL 장소 선택을 공유하며 다른 페이지로 이동하지 않고 그래프를 갱신한다. 검색/정렬/필터/비교 선택은 장소 탐색, 날씨와 상세는 선택 장소 메뉴에서 제공한다. 5분 기록 표와 자료 상태 대화상자는 유지했다.
- 상단 전체화면 버튼을 추가했다. 전체화면에서는 사이드바를 숨겨 화면을 넓히며 종료 시 기존 접힘 설정을 복원한다. 브라우저 fullscreenchange로 Esc 종료를 반영하고 실행 실패 안내도 제공한다.
- 전체 장소의 추정 인구 범위, 원천 시각, 최신성, 최근 수집 시각을 유지했다. 차트는 시간별 마지막 관측의 범위 중앙값이며 빈 시간을 채우지 않는다. 지도 범례의 저장 자료 집계와 최신 자료만 사용하는 상단 지표를 구분한다. 자동 확인을 멈추거나 오프라인이면 상단 확인 안내도 해당 상태를 표시한다.
- 제품/UI 명세, 기술 구조와 README의 현재 상황판 안내를 갱신했다. 수집 주기, API/저장소와 데이터 계약은 변경하지 않았다.

### 확인과 미실행

- `npm run lint`, `npm run typecheck`, `npm run build`: 최종 모두 종료 0.
- Ego 브라우저 수동 확인: 기존 1920×1080 화면의 문서 높이 1550px에서, 새 상황판은 1920×1080/1440×900/1280×800에서 문서 크기가 뷰포트와 같았다. 20곳이 모두 화면 안에 있었으며 1280×800의 패널과 장소 행에 내용 넘침이 없었다.
- 전체화면 진입/종료와 데스크톱 메뉴 복원, 서울숲공원 선택에 따른 URL/차트 변경, 장소 상세의 인구 흐름과 날씨 연결을 확인했다. 390×844에서는 문서 너비 390px, 세로 배치와 20곳 목록 및 모바일 메뉴 조작을 확인했다. 시각 확인용 이미지 3장을 검토하고 작업용 TaskSpace 16을 종료했다.
- 사용자 지시에 따라 단위/통합/E2E/SQL/원천 실호출 테스트는 실행하지 않았다. 로딩/오류/누락 상태는 코드 경로를 검토했으며 각각의 브라우저 상태 재현은 수행하지 않았다. React Doctor는 오프라인 캐시가 없어 ENOTCACHED로 진단 미실행이다. Ego Lite 업데이트는 수행하지 않았다.
- 기존 개발 서버와 승인된 20곳/5분 로컬 수집기를 유지했다. 비밀 환경 파일, 원격 DB, Cron과 배포를 변경하지 않았다. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 실제 사용할 모니터의 해상도/브라우저 확대 배율에서 사용 피드백을 반영한다. 상시 수집과 배포 준비는 앞 절의 미완료 범위를 따른다.

## 56. 메뉴 하단 라이트/다크 전환 (2026-11-10 KST)

- 사용자 요청에 따라 사이드바 하단의 접기/펼치기 버튼 위에 MUI ToggleButtonGroup 기반 라이트/다크 선택을 추가했다. 펼친 메뉴에서는 해/달 아이콘과 문구, 접힌 메뉴에서는 세로 아이콘 버튼을 표시한다. 모바일 서랍에도 같은 버튼을 제공한다.
- 기본 다크 색상은 유지하고 밝은 회색 배경, 흰 패널과 진한 텍스트/의미 색의 라이트 팔레트를 추가했다. 지도, 혼잡 배지, 기록/비교 차트, 표와 대화상자가 공통 MUI CSS 변수로 함께 전환된다. 색상 값은 src/theme/tokens.ts에서 관리한다.
- MUI colorSchemes/useColorScheme과 기본 localStorage 저장 기능으로 개인 선택을 유지한다. 저장 키는 seoul-pulse-theme-v1이며 별도 전역 저장소를 추가하지 않았다. InitColorSchemeScript를 루트에 두어 최초 표시 전에 저장된 모드를 적용하고 hydration 전 전환 버튼은 비활성화한다.
- 지도와 배지의 투명색 계산은 CSS 변수와 함께 사용할 수 있는 color-mix로 변경했다. 데이터, URL 선택, 수집과 저장소 계약은 변경하지 않았다. 관련 제품/구조 문서와 README를 갱신했다.

### 확인과 미실행

- npm run lint / npm run typecheck / npm run build: 모두 종료 0. 사용자 지시에 따라 단위/통합/E2E 테스트는 실행하지 않았다.
- 브라우저 수동 확인: 라이트 전환 시 body 배경 rgb(243, 245, 247)과 텍스트 rgb(32, 43, 56), 다크 복귀 시 기존 배경 rgb(17, 19, 21)을 확인했다. 라이트 선택 후 새로고침과 비교 화면 이동에서도 선택이 유지됐다. Enter 키로도 전환했다.
- 1440×900 라이트 메인, 1280×800 다크/접힌 메뉴, 390×844 모바일 서랍을 이미지로 확인했다. 큰 화면은 문서 크기와 뷰포트가 같아 기존 스크롤 없는 배치를 유지했고, 모바일 문서 너비는 390px이었다. 접힌 메뉴의 테마 버튼은 각각 44px 너비로 유지됐다.
- 모바일 서랍의 테마 전환과 선택 상태를 확인했다. 기본 다크로 복귀한 뒤 작업용 TaskSpace 17을 종료했다. 기존 개발 서버와 승인된 수집기는 유지했다.
- React Doctor는 오프라인 캐시가 없어 ENOTCACHED로 진단 미실행이다. Ego Lite 업데이트 알림은 확인했지만 업데이트하지 않았다. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 라이트 모드 사용 피드백에 따른 대비/밀도 조정. 수집과 배포의 미완료 범위는 이전 기록을 따른다.

## 57. 테마 단일 토글과 20곳 현황 가독성 개선 (2026-11-10 KST)

- 사용자 요청에 따라 라이트/다크 두 버튼을 단일 MUI Switch로 변경했다. 켜짐은 다크, 꺼짐은 라이트이며 펼친 메뉴에 현재 모드 문구와 아이콘을 표시한다. 접힌 메뉴에도 스위치가 남고 툴팁은 전환할 모드를 안내한다. 기존 개인 테마 저장과 초기 적용을 유지했다.
- ‘전체 장소’를 ‘장소별 현황’으로 바꾸고 BoardPlaces로 분리했다. 장소명을 16px, 인구 범위를 화면 폭에 따라 16~20px로 표시하며 혼잡도는 배지로 구분한다. 네 열 사이 16px 여백, 열별 행 구분선과 선택 강조로 장소 단위를 분명히 했다. 20곳의 4열 5행과 URL 선택을 유지한다.
- 매 행 반복하던 원천 시각과 최신성은 모든 장소가 같을 때만 헤더에서 한 번 안내한다. 최신성이 서로 다르면 행별 상태를 유지한다. 각 장소의 정확한 원천 시각/상태는 툴팁과 접근성 이름에 포함하고 헤더에서 기존 자료 상태 표를 열 수 있다. 누락을 여유나 0명으로 처리하지 않는다.
- 목록의 가독성을 높이며 필요한 높이를 확보하기 위해 상황판 바깥 여백과 낮은 화면의 섹션 간격을 조정했다. 인구 그래프의 중복 여백, 기록 표 버튼 높이와 축 눈금 수를 줄여 하단 설명이 잘리지 않게 했다. 800~899px 높이에서만 차트 최소 높이를 조정하며 일반 상세 페이지 표현은 유지했다.
- 제품/UI, 구조 문서와 README를 현재 동작에 맞춰 갱신했다. API, 원천 호출, 수집 주기와 저장소는 변경하지 않았다.

### 확인과 미실행

- 초기 lint에서 목록 추출 후 미사용 import 2개를 찾아 제거했다. 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0.
- 브라우저 수동 확인 중 1280×800에서 그래프 하단 설명이 넘치는 것을 발견해 수정했다. 최종 문서 크기는 뷰포트와 같고 지도/그래프/목록의 clientHeight와 scrollHeight가 모두 같았다. 20개 행에 가로/세로 내용 넘침이 없었다.
- 1920×1080에서도 문서 크기와 뷰포트가 같고 20곳이 모두 화면 안에 있었다. 서울숲공원 선택 시 URL과 차트가 함께 변경됐다. 라이트/다크 전환, 새로고침 유지, 접힌 메뉴의 Space 키 전환을 확인했다.
- 390×844 모바일에서 문서 너비 390px, 목록 20곳과 행의 가로 넘침 없음, 서랍의 토글 전환을 확인했다. 이미지 3장을 육안 확인했으며 작업용 TaskSpace 18을 종료했다. Ego Lite 업데이트는 수행하지 않았다.
- 사용자 지시에 따라 단위/통합/E2E 테스트는 실행하지 않았다. 서로 다른 최신성/누락 분기는 코드 검토만 했으며 합성 상태로 브라우저를 재현하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- 기존 개발 서버와 승인된 수집기를 유지했다. 비밀 환경 파일, 원격 DB, Cron과 배포를 변경하지 않았다. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 실제 모니터에서 장소별 현황의 글자 크기와 정보 밀도에 대한 사용 피드백 반영.

## 58. 제목/수치/설명 글자색 구분과 보조색 적용 수정 (2026-11-10 KST)

- 사용자 피드백에 따라 text/heading/muted 세 글자색 역할을 정의했다. 제목, KPI 항목명, 장소명과 표 머리글은 푸른 회색 heading, 인구와 핵심 수치는 text, 시각/단위/설명은 muted를 사용한다. 다크와 라이트 팔레트를 함께 조정하고 선택 장소는 기존 accent를 유지했다. 없는 값의 대시는 보조색으로 구분한다.
- 브라우저의 계산된 색을 확인하다 기존 Typography의 color="text.secondary"가 흰색을 상속하는 문제를 발견했다. 설치된 MUI 9 Typography 구현은 textSecondary 등의 이름만 해당 스타일로 처리함을 확인했다. 한 개 단위를 textSecondary로 바꿔 계산 색이 흰색에서 회색으로 변하는 것을 확인한 후, 같은 원인의 색 속성만 전체 UI에서 수정했다.
- TypeScript AST로 Typography의 color prop 내부 문자열만 찾아 textSecondary/textPrimary/warning/error 등의 지원 이름으로 바꿨다. sx의 정상적인 팔레트 경로 표기는 유지했다. 대시보드, 상세, 비교, 지도, 자료 안내와 공통 UI의 설명/경고가 의도한 색을 사용한다. 자료와 배치/크기는 변경하지 않았다.
- 제품/UI와 기술 문서에 색 역할과 Typography color/sx 표기 차이를 기록했다.

### 확인과 미실행

- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. 사용자 지시에 따라 자동 테스트는 실행하지 않았다.
- 브라우저 계산 색 확인: 다크 제목/장소명 rgb(176,196,221), 인구 값 rgb(239,241,243), 단위/원천 시각/하단 설명 rgb(143,155,168). 라이트 제목 rgb(72,97,125), 값 rgb(32,43,56), 보조 글자 rgb(91,103,117)을 확인했다.
- 세 역할의 토큰 색을 배경/패널/선택 배경과 계산한 최소 대비는 다크 4.77:1, 라이트 4.84:1이다. 이 계산은 해당 글자 역할에 대한 확인이며 화면 전체의 접근성 감사 완료를 의미하지 않는다.
- 다크/라이트 화면을 이미지로 확인했다. 1440×900과 1280×800에서 문서 크기가 뷰포트와 같고 1280×800의 패널 내용 넘침은 없었다. 모바일 390px에서 가로 넘침 없이 20곳을 유지했다. 다크로 복귀하고 TaskSpace 19를 종료했다.
- React Doctor는 ENOTCACHED로 진단 미실행이다. Ego Lite 업데이트는 수행하지 않았다. 기존 개발 서버와 승인된 수집기 유지, 비밀 환경 파일/원격 DB/Cron/배포 변경 없음. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 실제 화면에서 제목/수치/보조 정보의 대비에 대한 사용자 피드백 반영.


## 59. 지도 확대/축소와 이동 (2026-11-10 KST)

- 사용자 요청에 따라 종합 현황과 지도 보기의 헤더에 현재 배율, 축소/확대와 서울 전체 보기 버튼을 추가했다. 100~400% 범위에서 50%p씩 변경하고 최소/최대 배율에서 해당 버튼을 비활성화한다. MUI IconButton/Tooltip과 기존 테마를 사용했다.
- useMapCamera가 지도별 배율과 중심 위치를 관리한다. ResizeObserver로 패널 비율을 반영해 상황판의 전체 지도 폭을 활용하며 SVG 경계와 HTML 표식을 같은 카메라 좌표로 이동한다. 표식과 설명의 화면 크기는 유지한다. 데이터 변경과 URL 장소 선택으로 배율을 초기화하지 않는다.
- 확대 후 마우스 또는 한 손가락 드래그와 방향키 이동을 제공한다. +/− 키로 배율을 바꾸고 Home/0 또는 전체 보기 버튼으로 초기화한다. 이동 범위를 제한하고 포인터 캡처/취소와 클릭 억제로 드래그 직후 장소가 선택되지 않게 했다. Tab으로 화면 밖 표식에 접근하면 해당 위치를 보여준다.
- 수동 확인에서 가까운 장소의 투명 클릭 영역이 실제 표식을 가리는 것을 발견했다. 실제 점을 클릭 영역 위에 두고 표식 부모의 불필요한 stacking context를 제거해 홍대 관광특구와 명동 관광특구 선택을 확인했다. 낮은 상황판에서 선택 말풍선이 잘리지 않도록 위/아래 배치 기준을 조정하고 중복 인구 행을 숨겼다. 범위는 그래프, 목록과 접근성 이름에 유지한다.
- 제품/UI와 기술 문서를 갱신했다. 추가 지도 의존성, 외부 타일/API 요청, 데이터/수집 계약 변경은 없다.

### 확인과 미실행

- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. 초기 lint의 ref 객체 반환 관련 진단은 viewport ref를 컴포넌트에서 소유하고 훅에 전달하도록 수정한 뒤 해소했다.
- Ego 브라우저 수동 확인: 100% 복원, 400% 확대 제한, 방향키 이동과 화면 밖 링크 포커스 시 위치 복원을 확인했다. 표식에서 드래그해도 URL이 바뀌지 않았고 일반 선택 시 URL/그래프가 변경되면서 200% 배율이 유지됐다. 지도 메뉴의 확대 상태에서 명동 관광특구 상세로 이동했다.
- 1280×800과 1440×900에서 문서 크기가 뷰포트와 같았다. 1280×800에서 지도/그래프/목록의 clientHeight와 scrollHeight가 각각 253/253/297px로 같고 장소 20곳을 유지했다. 최종 낮은 화면의 선택 말풍선은 지도 영역 안에 있었다.
- 390×844 모바일 에뮬레이션의 라이트 지도에서 터치 이동과 초기화를 확인했다. 문서 너비와 뷰포트 너비가 모두 390px이었다. 다크/라이트 전환 후에도 조작과 배치를 유지했고, 기본 다크로 복귀한 뒤 TaskSpace 20을 종료했다. 실제 모바일 기기 확인은 수행하지 않았다.
- 시각 확인용 이미지 3장을 검토했다. 사용자 지시에 따라 단위/통합/E2E/SQL/원천 실호출 테스트는 실행하지 않았다. React Doctor는 오프라인 캐시가 없어 ENOTCACHED로 진단 미실행이다. Ego Lite 업데이트는 수행하지 않았다.
- 기존 개발 서버와 승인된 20곳/5분 수집기를 유지했다. 비밀 환경 파일, 원격 DB, Cron과 배포를 변경하지 않았다. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 실제 사용할 모니터와 모바일 기기에서 배율 범위와 지도 이동감에 대한 사용 피드백 반영.

## 60. 포트폴리오 첫 화면과 비교 진입 개선 (2026-11-10 KST)

- 사용자 요청에 따라 앞선 디자인 검토의 개선 항목을 순서대로 반영했다. 메인의 기존 최신 자료 중심 KPI를 마지막 관측의 여유/보통/약간 붐빔/붐빔 분포로 교체했다. 원천 시각 또는 시각 범위, 자료 보유 수와 확인 불가 수를 표시하고 최신/지연/만료/누락은 별도 상태 행과 기존 대화상자로 연결한다.
- getObservationSummary는 유효 인구 값/시각이 있는 마지막 관측을 집계하며 기존 30분/60분 최신성 정책은 유지한다. 지연/만료 시각을 바꾸지 않고, unknown을 네 단계에 넣지 않는다. 분류 가능한 자료가 하나도 없으면 네 지표를 대시로 표시한다. API/저장소 계약과 기존 최신성 계산은 변경하지 않았다.
- 비교 첫 진입의 큰 빈 안내를 실제 카탈로그에 있는 상권/도심 관광지/공원 조합으로 바꿨다. 한 번 선택하면 기존 places URL과 최근 24시간 조회로 연결된다. 한 장소가 선택되어 있으면 이를 유지하는 추가 선택 버튼을 제공한다. 새 합성 데이터나 별도 조회 경로를 추가하지 않았다.
- 1440px 이상 상황판은 20곳을 5열 4행, 1280~1439px는 4열 5행으로 표시한다. 장소명과 인구 글자 크기를 유지하며 목록의 행 간격을 조정해 지도/그래프 높이를 확보했다. 1440×900에서 지도와 그래프 패널 높이는 357px이었다. 작은 화면에서는 세로 배치를 유지한다.
- 메인 차트 하단에 기록된 시간별 마지막 관측 중앙값이 가장 큰 구간과 해당 추정 범위를 표시했다. 동률 수, 기록 부족 안내와 키보드 접근 가능한 계산 기준 툴팁을 제공한다. 기록되지 않은 시각을 채우거나 실제 하루 최대 인구라고 표현하지 않는다.
- README를 문제, 기능, 설계 결정, 기술 구조, 실행 방법과 검증/운영 범위 중심으로 정리하고 실제 화면 이미지 2장을 연결했다. 이전 README는 docs/archive/README_2026-11-10.md에 보존했다. 제품/UI, 기술 구조와 앱의 자료 안내도 현재 집계 정책 및 지도 기능에 맞췄다.

### 확인과 미실행

- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. README와 수정한 제품/구조 문서의 로컬 링크 대상이 존재함을 확인했다.
- Ego 브라우저 수동 확인: 실제 20곳의 마지막 혼잡 분포 17/2/1/0과 원천 시각, 별도의 지연 20곳 표시 및 자료 상태 대화상자를 확인했다. 값은 당시 관측이며 현재 현황으로 보장하지 않는다.
- 1280×800, 1440×900, 1920×1080에서 문서 크기가 뷰포트와 같았다. 1280×800의 지표/지도/그래프/목록 내용 넘침이 없었고, 1440px의 5열 목록과 1920px의 20곳 전체 표시/행 넘침 없음을 확인했다.
- 상권 조합이 강남역/홍대 관광특구/성수카페거리 URL로 연결되고 같은 축의 그래프 3개가 렌더링됨을 확인했다. 관광지와 공원 조합의 URL도 확인했다. 한 장소 선택 상태에서 Enter 키로 추가해 기존 강남역과 홍대 관광특구의 두 장소 선택이 유지됐다.
- 390×844 라이트 화면에서 메인 문서 너비 390px, 장소 20곳과 행 가로 넘침 없음, 비교 시작 카드의 가로 넘침 없음을 확인했다. 기본 다크로 복귀하고 TaskSpace 22를 종료했다. 이미지 3회 촬영/검토 중 최종 메인/비교 이미지를 문서 자산으로 남겼다. 실제 모바일 기기 확인은 하지 않았다.
- 누락/unknown/유효하지 않은 시각/서로 다른 원천 시각/동률/기록 부족 분기는 코드 검토만 했으며 합성 상태를 브라우저에 주입하지 않았다. 사용자 지시에 따라 단위/통합/E2E/SQL/원천 실호출 테스트는 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다. Ego Lite 업데이트는 수행하지 않았다.
- 기존 개발 서버와 승인된 20곳/5분 로컬 수집기를 유지했다. 비밀 환경 파일, 원격 DB, Cron과 배포 변경 없음. Git 저장소가 없어 Git 작업 없음.
- 남은 범위: 실제 모바일 기기 확인, 별도 승인이 필요한 운영 DB 적용/상시 수집/배포. 다음 작업은 실제 사용 피드백에 따른 화면 조정과 공개 운영 준비다.

## 61. 메인 전체 현황과 장소별 순위 (2026-11-10 KST)

- 사용자 요청에 따라 첫 진입에서 강남역을 자동 선택하던 리다이렉트를 제거했다. 기본 메인은 전체 혼잡 분포, 서울 지도, 장소별 순위와 20곳 목록을 표시한다. 레거시 /demo도 장소를 지정하지 않으면 전체 현황으로 연결한다.
- 선택하지 않은 오른쪽 패널에 혼잡 단계 높은 순과 추정 인구 적은 순을 추가했다. 공식 혼잡 단계가 같으면 공동 순위로 처리하고, 인구는 추정 범위 중앙값의 오름차순으로 정렬하며 실제 범위를 유지한다. 동률은 장소명순이며 표시 한도 밖 동률도 순위 계산에 포함한다. 각 최대 4곳, 높이 800~899px의 상황판에서는 3곳을 보여준다.
- 유효 값/시각이 없는 장소는 제외 수를 안내한다. unknown 단계는 혼잡 순위에서만 제외하고 유효한 0명 관측은 보존한다. 마지막 관측 기준임을 표시하며 지연/만료의 원천 시각을 바꾸지 않는다. 인구가 적다는 것과 덜 혼잡하다는 것을 구분하는 설명을 제공한다.
- 순위/지도/목록을 선택하면 해당 장소의 최근 24시간 인구 흐름으로 전환한다. 전체 현황 버튼, 장소 선택창의 전체 현황 항목, 로고와 종합 현황 메뉴에서 선택을 해제할 수 있다. 명시적인 area 링크와 새로고침은 해당 선택을 유지한다. 선택 없는 SSR/브라우저에서는 개별 기록을 조회하거나 주기 확인하지 않는다.
- MUI와 기존 overview 자료만 사용하고 API/수집 계약을 변경하지 않았다. README, 제품/UI, 기술 구조 문서와 기본 메인 화면 이미지를 갱신했다.

### 확인과 미실행

- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. 순위 동률, 0과 누락, unknown, 잘못된 시각과 만료 보존에 대한 단위 테스트 3개를 작성했으나 사용자 지시에 따라 실행하지 않았다. 단위/통합/E2E/SQL/원천 실호출 테스트 미실행이다.
- Ego 브라우저 수동 확인: 첫 / 진입이 장소 선택 없이 전체 현황을 표시했다. 실제 관측의 공동 순위와 인구 범위, 장소 선택 후 24시간 흐름, Enter 키 선택, 새로고침 선택 유지, 전체 현황 버튼과 로고 복귀를 확인했다. /demo는 전체로, /demo?area=POI008은 해당 장소로 연결됐다.
- 1440×900 다크와 1280×800 라이트에서 문서 크기가 뷰포트와 같았다. 1440px의 순위 패널 clientHeight/scrollHeight는 모두 357px이며 낮은 모니터에서는 순위 링크가 각 3개씩 표시됐다. 두 화면을 이미지로 확인하고 기본 메인 이미지를 문서 자산으로 저장했다.
- 390×844 모바일 에뮬레이션에서 두 순위가 세로로 배치되고 문서 너비가 390px이며 8개 순위 행에 가로 넘침이 없었다. 실제 모바일 기기 확인과 합성 누락/오류 상태의 브라우저 재현은 하지 않았다. 기본 다크로 복귀하고 TaskSpace 23을 종료했다.
- React Doctor는 오프라인 캐시가 없어 ENOTCACHED로 진단 미실행이다. Ego Lite 업데이트는 수행하지 않았다. 기존 개발 서버와 승인된 20곳/5분 로컬 수집기를 유지했다. 비밀 환경 파일, 원격 DB, Cron과 배포 변경 없음. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 전체 현황의 순위/목록 정보 밀도에 대한 사용 피드백 반영. 공개 운영 준비와 실제 모바일 기기 검증의 남은 범위는 이전 기록을 따른다.

## 62. 혼잡 단계와 인구 순위의 색상 강화 (2026-11-11 KST)

- 사용자 요청에 따라 기존 중성 배경과 정보 배치를 유지하며 혼잡 의미 색의 구분을 강화했다. 여유/보통/약간 붐빔/붐빔은 초록/노랑/주황/빨강, 확인 불가는 회색을 사용한다. 두 테마의 공통 토큰을 바꿔 지도와 기존 배지도 같은 의미 색을 사용한다.
- 상단 혼잡 분포에 단계별 상단 선과 유효 수치의 색을 적용했다. 실제 해당 장소가 있는 단계만 옅은 배경을 채우고, 0과 자료 없음은 보조 글자색으로 유지한다.
- 혼잡 순위는 실제 단계에 따라 왼쪽 선, 순위 숫자와 배경 농도를 바꾼다. 제목은 가장 높은 관측 단계를 따른다. 추정 인구 적은 순은 제목/선/순위/범위를 파랑으로 구분하고 각 장소의 혼잡 배지는 실제 단계를 유지한다. 공동 순위나 인구 수를 위험도로 해석하지 않는다.
- 20곳 목록에는 단계별 왼쪽 선을 적용하고 약간 붐빔/붐빔에 옅은 배경을 추가했다. 기존 파랑 선택 상태와 원천/최신성 표시를 유지한다. 혼잡 배지는 패널 배경을 기준으로 혼합해 색이 있는 행 위에서도 배경 농도가 중복되지 않게 했다.
- 순위와 목록의 키보드 포커스를 행 안쪽 2px 테두리로 표시한다. 낮은 상황판의 행 패딩/간격을 조정했고, 제외 장소 수는 순위 제목 옆으로 옮겼다. 계산, URL, 수집/API 계약과 원천 자료는 변경하지 않았다. 제품/UI 문서, README와 메인 화면 이미지를 갱신했다.

### 확인과 미실행

- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. 사용자 지시에 따라 자동 테스트를 작성하거나 실행하지 않았다. 기존 단위/통합/E2E/SQL/원천 실호출 테스트도 미실행이다.
- 브라우저에서 1440×900 다크와 1280×800 라이트를 확인했다. 순위, 지표, 지도와 목록에 같은 상태 색이 적용되고 인구 순위는 파랑으로 구분됐다. 확인 당시 원천 11. 11. 00:05의 20곳은 모두 여유였다. 보통/약간 붐빔/붐빔/누락 분기에 합성 데이터를 주입하지 않았으며 해당 색상 매핑은 코드와 대비 계산으로 검토했다.
- 낮은 화면 이미지에서 마지막 순위 행이 하단 설명과 겹치는 것을 발견했다. 원인은 순위 열의 최소 내용 높이 200px이 실제 배정 187px을 넘는 것이었다. 낮은 화면의 패딩/간격을 줄인 뒤 최종 순위 그리드 clientHeight/scrollHeight가 모두 187px이고, 모든 표시 행이 설명 시작 위치보다 4px 이상 위에서 끝남을 확인했다. 최종 문서 크기는 1280×800과 동일했다.
- 키보드 Tab 포커스의 2px 테두리, Enter로 건대입구역 선택 후 인구 흐름 표시, 전체 현황 복귀를 확인했다. 390×844 모바일 에뮬레이션에서 순위 두 열은 세로 배치되고 8개 행의 clientWidth/scrollWidth가 344px로 같으며 문서 너비는 390px, 장소 목록은 20곳이었다. 실제 모바일 기기는 확인하지 않았다.
- 일반/호버 행의 제목, 수치, 보조 글자와 상태 색을 배경 혼합값과 계산한 최소 대비는 다크 4.91:1, 라이트 4.58:1이었다. 배지 글자의 최소 대비는 각각 5.17:1, 4.62:1이었다. 이는 수정한 색 조합의 계산이며 전체 앱 접근성 감사 완료를 의미하지 않는다.
- 이미지 3회로 변경 전/다크/라이트 화면을 확인하고 낮은 화면의 최종 간격 수정은 요소 위치로 확인했다. 다크 모드로 복원하고 작업용 TaskSpace 24를 종료했다. React Doctor는 ENOTCACHED로 진단 미실행이며 Ego Lite 업데이트는 수행하지 않았다.
- 기존 개발 서버와 승인된 20곳/5분 로컬 수집기를 유지했다. 비밀 환경 파일, 원격 DB, Cron과 배포 변경 없음. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 실제 혼잡 관측이 있는 시간대에 색상 강조 강도의 사용 피드백 반영. 운영/배포와 실제 모바일 기기 확인의 미완료 범위는 이전 기록을 따른다.

## 63. 장소별 현황 인구 숫자 크기 조정 (2026-11-11 KST)

- 사용자 요청에 따라 장소별 현황의 인구 범위 숫자만 화면 구간별로 2px 줄였다. 기본 18→16px, 1200px 이상 16→14px, 1600px 이상 20→18px이다. 장소명, 단위, 혼잡 배지와 기존 행 높이/간격은 유지했다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 작은 스타일 변경으로 빌드와 브라우저 확인은 수행하지 않았고, 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- Git 저장소가 없어 Git 작업 없음. 데이터/수집/API와 환경 설정은 변경하지 않았다. 다음 작업은 실제 화면의 글자 크기에 대한 사용자 피드백 반영이다.

## 64. 라이트/다크 전환을 단일 버튼으로 변경 (2026-11-11 KST)

- 사용자 요청에 따라 테마 문구 옆 MUI Switch와 FormControlLabel을 제거하고 MUI Button 하나로 교체했다. 현재 모드의 해/달 아이콘과 문구를 표시하며, 라이트 모드를 누르면 다크로, 다크 모드를 누르면 라이트로 전환한다.
- 접힌 사이드바에는 44×44px 아이콘 버튼을 유지하고 펼친 사이드바와 모바일 메뉴에는 문구도 표시한다. 접근성 이름은 현재 모드와 전환 동작을 함께 설명하고 툴팁은 전환할 모드를 안내한다. 기본 버튼의 Enter/Space 키 조작과 기존 개인 모드 저장을 유지한다. 모드 확인 전에는 버튼을 비활성화한다.
- 제품/UI와 구조 문서를 현재 동작으로 갱신했다. 데이터, 수집과 URL 상태는 변경하지 않았다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 브라우저에서 클릭으로 라이트 전환, 새로고침 후 라이트 유지, Enter로 다크 복귀, 접힌 44×44px 버튼에서 Space 전환을 확인했다. 기존 switch 입력이 0개인 것도 확인했다.
- 390×844 모바일 메뉴에서 226×44px 문구 버튼으로 다크 전환을 확인했고 문서 너비는 390px이었다. 다크 데스크톱 화면을 이미지로 확인했다. 원래 다크 모드로 복귀하고 TaskSpace 25를 종료했다. 실제 모바일 기기 확인은 하지 않았다.
- 작은 컴포넌트 변경으로 빌드는 실행하지 않았고 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이며 Ego Lite 업데이트는 수행하지 않았다. Git 저장소가 없어 Git 작업 없음.
- 다음 작업: 단일 버튼의 문구/배치 사용 피드백 반영. 운영/배포의 미완료 범위는 이전 기록을 따른다.

## 65. 일반 페이지 하단의 중복 안내 줄 제거 (2026-11-11 KST)

- 사용자 요청에 따라 AppShell의 일반 페이지 하단에서 추정 인구 안내 문구와 ‘출처와 데이터 해석’ 링크가 있는 공통 footer를 제거했다. 같은 내용은 기존 왼쪽 ‘데이터 안내’ 메뉴에서 확인할 수 있다. 메인 상황판의 원천/수집 시각 표시와 별도 footer는 이번 요청 대상이 아니므로 유지했다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 코드에서 해당 하단 문구 제거와 데이터 안내 메뉴 유지를 확인했다. 단순 요소 제거로 빌드/브라우저 확인은 수행하지 않았으며 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- Git 저장소가 없어 Git 작업 없음. 데이터/수집/API와 환경 설정 변경 없음. 다음 작업은 공통 화면의 중복 안내에 대한 사용 피드백 반영이다.

## 66. 장소 상세를 큰 화면 한 장에 배치 (2026-11-11 KST)

- 사용자 요청에 따라 상세 페이지의 스크롤 원인을 확인했다. 기존 300px 고정 플롯, 상단의 별도 장소 선택 행, 오른쪽 중복 장소명/인구 범위와 여백 때문에 1280×800/1440×900 모두 문서 높이가 976px이었다.
- AppShell에 detail 레이아웃을 추가했다. 기존 상황판과 같은 1280px/800px 조건에서 화면 높이를 나눠 쓰며, 제목 옆으로 장소 선택과 관련 동작을 모으고 차트/환경 패널이 남은 높이를 사용한다. 다른 메뉴의 헤더 구조와 메인 상황판은 유지했다.
- HistoryChart의 detail presentation은 플롯 높이를 유연하게 조절하고 최소 180px을 유지한다. 캡션, 조회 범위, 최대 구간, 누락 안내와 기록 표를 보존했다. 설명은 축소하지 않고 그리드에 min-content 하한을 두어 추가 안내가 많으면 자연스럽게 문서가 늘어난다. 본문 스크롤을 강제로 숨기지 않는다.
- 오른쪽의 중복 장소명/인구 수치를 정리하고 자료 해석, 원천/수집 시각과 날씨를 배치했다. 현재 인구 범위와 혼잡 단계는 왼쪽 차트 요약에 유지한다. 좁은 날씨 열에서 °C가 분리되는 현상은 수치 크기와 단위 줄바꿈 규칙을 조정했다. 로딩은 상세에 맞는 두 패널 스켈레톤으로 표시한다.
- 제품/UI 및 구조 문서를 갱신했다. 데이터 값, 집계/조회/수집 경로, URL 계약과 예약 작업은 변경하지 않았다.

### 확인과 미실행

- 최종 npm run lint / npm run typecheck / npm run build 모두 종료 0. 사용자 지시에 따라 단위/통합/E2E/SQL/원천 실호출 테스트는 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- Ego 브라우저에서 1280×800 강남역 상세의 문서 크기가 뷰포트와 같고 양쪽 패널/차트 설명의 clientHeight와 scrollHeight가 같음을 확인했다. 플롯 높이는 약 286px이었다. 장소 선택창에서 DDP(동대문디자인플라자)로 이동해 경로/제목/차트 변경을 확인했다.
- 긴 장소명과 비교 3곳을 함께 표시한 1280×800에서도 문서 크기가 뷰포트와 같았다. 차트 패널과 설명은 잘리지 않았고 플롯은 약 208px, 비교 표시줄은 화면 안에 남았다. 같은 조건의 1440×900과 1920×1080에서도 문서 크기가 뷰포트와 같고 플롯은 약 308px/488px이었다.
- 5분 기록 표를 열어 당시 289개 행과 대화상자 내부 조회가 유지됨을 확인하고 Escape로 닫았다. 390×844 모바일은 문서 너비 390px, 플롯 높이 260px이며 상세 패널의 가로 넘침 없이 인구/날씨와 비교 표시줄을 세로로 읽을 수 있었다. 실제 모바일 기기 확인은 하지 않았다.
- 변경 전과 수정 후 다크/라이트 화면 이미지 3장을 검토했다. 최종 메인 1280×800도 스크롤 없이 20곳을 유지함을 확인했다. 원래 다크 모드로 복귀하고 TaskSpace 26을 종료했다. Ego Lite 업데이트는 수행하지 않았다.
- 누락/오류/오프라인/로딩 분기는 코드 검토만 했고 합성 상태를 주입하지 않았다. 해당 상태의 화면 전체 검증 완료로 기록하지 않는다. 기존 개발 서버와 승인된 20곳/5분 수집기를 유지했다. Git 저장소가 없어 Git 작업 없음. 비밀 환경 파일/원격 DB/Cron/배포 변경 없음.
- 다음 작업: 실제 사용하는 모니터 크기/브라우저 확대 배율에서의 상세 화면 사용 피드백 반영.

## 67. 실데이터 상단의 상시 수집 설명 배너 제거 (2026-11-11 KST)

- 사용자 요청에 따라 모든 실데이터 일반 페이지에서 상단의 ‘5분마다 20곳의 서울시 자료를 수집합니다’ 또는 저장 자료 조회 설명 배너를 제거했다. AppShell의 dataNotice prop과 호출부 전달도 정리했다.
- 수집 주기와 상태 설명은 기존 자료 상태 화면/대화상자 및 데이터 안내에서 확인한다. 합성 데이터 식별 안내와 자료 시각/지연/실패 등 실제 상태 표시는 유지했다. 제품/UI 및 구조 문서를 갱신했다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 코드에서 실데이터 배너 및 dataNotice 참조 제거와 자료 상태 설명 유지를 확인했다. 단순 배너 제거로 빌드/브라우저 확인은 수행하지 않았고 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- 데이터/수집/API, 환경 설정과 예약 작업 변경 없음. Git 저장소가 없어 Git 작업 없음. 다음 작업은 실제 화면에서 필요한 상태 안내와 중복 설명에 대한 사용 피드백 반영이다.

## 68. 장소 탐색의 화면 높이 활용과 가변 페이지 크기 (2026-11-11 KST)

- 장소 탐색이 지도 옆 목록과 같은 3곳 페이지 규칙을 사용해 아래가 비던 문제를 수정했다. AppShell의 places 레이아웃은 1280×800 CSS 픽셀 이상에서 남은 높이를 장소 패널에 배정한다. 검색창, 페이지 이동, 자료 최신성과 비교 표시줄은 필요한 높이를 유지한다.
- usePlaceGrid가 목록에 배정된 너비/높이를 ResizeObserver로 측정해 최대 4열과 화면에 들어가는 행 수를 계산한다. 최소 열 너비 300px, 행 높이 156px과 간격은 theme 토큰으로 관리한다. 작거나 확대된 화면은 최대 3행씩 자연스럽게 세로로 읽는다. 원천 기준 시각/최신성을 카드 위쪽으로 옮겨 인구 수치와 겹치지 않게 했다.
- getPlacePage에 화면별 표시 수를 전달한다. 페이지 번호는 기존 URL 상태를 사용하며 검색/필터/정렬 초기화와 비교 선택 유지를 보존한다. 마지막 페이지와 적은 검색 결과도 카드 높이를 유지한다. 한 페이지 결과에도 하단 페이지 영역의 높이를 유지해 표시 수가 반복 변경되지 않게 했다. 지도 옆 목록은 기존 3곳 페이지 규칙을 유지한다.
- 제품/UI 및 구조 문서를 갱신했다. 자료, API/수집 경로, 환경 설정과 예약 작업은 변경하지 않았다.

### 확인과 미실행

- 최종 npm run lint, npm run typecheck, npm run build 모두 종료 0. 초기 React ref 반환 객체 관련 린트 오류는 ref를 호출 컴포넌트에서 소유하고 hook에 전달하도록 수정했다. React Doctor는 오프라인 캐시 부재 ENOTCACHED로 진단 미실행이다. 사용자 지시에 따라 자동 단위/통합/E2E/SQL/원천 실호출 테스트는 실행하지 않았다.
- 브라우저에서 1440×900은 3열 3행 9곳, 1920×1080은 4열 4행 16곳을 확인했다. 문서 크기가 뷰포트와 같고 목록 clientHeight/scrollHeight도 같았다. 1280×800에서 비교 3곳을 선택한 라이트 화면은 3열 2행 6곳과 비교 표시줄이 한 화면에 들어갔으며 카드의 내용 넘침이 없었다.
- 다음 페이지의 URL 변경, 마지막 페이지의 19–20/20곳 및 동일 카드 높이, 검색 변경의 페이지 초기화, 검색 결과 없음과 초기화, 비교 선택 유지, 혼잡 필터 적용을 확인했다. 당시 여유 필터는 4곳을 한 페이지로 표시했다. 지도 화면은 기존 3곳 목록과 7페이지를 유지했다.
- 390×844 모바일 에뮬레이션은 1열 3행, 문서 너비 390px, 세로 문서 높이 937px으로 자연스럽게 흐르고 카드의 가로 넘침이 없었다. 키보드 Enter로 다음 페이지를 열어 4–6/20곳과 page=2를 확인했다. 실제 모바일 기기는 확인하지 않았다.
- 다크 대형 화면과 라이트 낮은 화면 이미지를 검토했다. 개발 중 토큰 수정이 기존 ResizeObserver 클로저에 남아 행 수가 덜 표시되는 현상은 새로고침 후 최종 값으로 재확인했다. 다크 모드로 복귀하고 작업용 TaskSpace 27을 종료했다. Ego Lite 업데이트는 수행하지 않았다.
- Git 저장소가 없어 Git 작업 없음. 기존 개발 서버와 승인된 수집기는 유지했다. 다음 작업은 실제 사용하는 모니터 크기와 확대 배율에서 카드 밀도에 대한 사용자 피드백 반영이다.

## 69. 데이터 안내 메뉴 숨김 (2026-11-11 KST)

- 사용자 요청에 따라 공통 Sidebar의 메뉴 렌더링에서 데이터 안내 항목을 제외했다. 펼친/접힌 데스크톱 사이드바와 모바일 메뉴에 함께 적용된다. 기존 `/data-info` 페이지와 직접 접속 시 상단 제목은 유지한다. 제품/UI 문서의 메뉴 구성을 갱신했다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 단순 메뉴 항목 숨김으로 빌드/브라우저 확인은 수행하지 않았고 사용자 지시에 따라 자동 테스트는 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- Git 저장소가 없어 Git 작업 없음. 데이터/수집/API와 환경 설정 변경 없음. 다음 작업은 메뉴 노출 구성에 대한 사용자 피드백 반영이다.

## 70. 장소 탐색 카드의 경계와 정보 묶음 개선 (2026-11-11 KST)

- 사용자 요청에 따라 실제 장소 탐색 화면과 MUI Card, Carbon Tile 공식 레퍼런스를 확인했다. 기존 위쪽 선만 있는 목록은 장소 정보와 하단 비교 버튼의 범위가 모호했다. 기존 unslop 방향을 유지하며 장소 탐색 카드에만 개선을 적용했다.
- 각 장소를 중립색 1px 테두리, 8px 모서리, 별도 카드 배경으로 묶고 가로/세로 간격을 12px로 통일했다. 장소명은 15px로 조정하고 인구 범위와 혼잡 배지를 본문에 유지했다. 원천 시각/최신성과 비교 버튼은 가는 선과 별도 배경으로 분리한 카드 하단에 배치했다.
- 비교/선택한 카드의 파랑 테두리, 호버 경계와 내부 2px 키보드 포커스를 제공한다. 의미 있는 혼잡 색은 기존 배지에 유지한다. 새 카드 구조에 맞춰 최소 행 높이를 152px, 페이지 이동 영역을 60px로 조정하고 마지막 카드와 페이지 영역 사이에 8px 여백을 추가했다. 스타일은 theme 토큰과 MUI sx로 관리한다.
- 제품/UI 문서에 레퍼런스와 카드 구성을 기록하고 구조 문서의 페이지 크기 토큰을 갱신했다. 지도 옆 목록, 데이터/수집/API, URL 계약과 환경 설정은 변경하지 않았다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 스타일 중심 변경으로 빌드는 실행하지 않았으며 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- 1440×900 다크는 9곳, 1280×800 라이트와 비교 3곳 선택 상태는 6곳을 스크롤 없이 표시했다. 두 화면 모두 문서 크기가 뷰포트와 같고 카드 내용이 넘치지 않았다. 선택 3곳의 파랑 테두리와 비교 문구를 확인했다. Shift+Tab으로 상세 링크에 이동했을 때 2px 포커스 테두리가 카드 안에 표시됐다.
- 390×844 모바일 에뮬레이션은 3곳씩 표시하고 문서 너비 390px, 높이 937px으로 자연스럽게 흐르며 카드 가로/세로 내용 넘침이 없었다. 실제 모바일 기기는 확인하지 않았다. 변경 전/다크/라이트 이미지 총 3장을 검토하고 다크 모드로 복귀한 뒤 TaskSpace 28을 종료했다. Ego Lite 업데이트는 수행하지 않았다.
- Git 저장소가 없어 Git 작업 없음. 기존 개발 서버와 승인된 수집기는 유지했다. 다음 작업은 실제 사용 화면에서 카드 경계와 밀도에 대한 사용자 피드백 반영이다.

## 71. 원천 최신성 원인 확인과 지도/탐색 카드 입체감 (2026-11-11 KST)

- 사용자가 자료 상태의 일괄 갱신 지연, 지도 옆 장소의 구분과 장소 카드 입체감을 요청했다. 수집 상태 CLI, 저장된 공개 overview, 시각 파서 및 최신성 함수를 확인했다. 원천 API를 추가 호출하거나 수집기를 재시작하지 않았다.
- 수집기는 20곳/5분으로 실행 중이고 인증/요청 제한 일시 중지는 없었다. 13:58:22 완료 배치의 인구 기준은 모두 13:30, 14:03:22 완료 배치는 모두 13:35이며 lastResult=valid였다. 13:59 조회에는 최신 20곳이었고, 14:05:12에는 14:03 수신 성공과 13:35 원천의 갱신 지연이 함께 표시됐다. 수신 당시 약 28분의 원천 시차와 앱의 30분 경계가 다음 수집 전 일괄 지연 전환의 원인이었다. 원천 제공 시각의 내부 지연 원인이나 고정 보장까지 확인한 것은 아니다.
- 자료 상태 화면과 대화상자에 수집 결과와 원천 최신성이 별개임을 설명하고, 기존 시각 표에 최근 수집 결과/시도 시각 열을 추가했다. 원천 최신성 열 이름을 분명하게 했다. 30분/60분 기준과 저장값은 변경하지 않았다. 수집 전/미제공/형식 오류/요청 실패의 문구도 별도로 매핑한다.
- 지도 옆 장소 목록에도 탐색 화면과 같은 닫힌 카드, 12px 간격, 분리된 하단 시각/비교 버튼을 적용했다. 지도 목록의 3곳 페이징은 유지하고 최소 카드 높이 144px을 사용한다. 두 화면의 카드에 라이트/다크별 두 겹 그림자와 얕은 상단 하이라이트를 적용했다. 호버는 그림자/경계만 바뀌고 카드가 움직이지 않으며 기존 reduced-motion 규칙을 따른다. 스타일은 theme의 cardDepth CSS 변수로 관리한다.
- 제품/UI, 구조와 데이터 문서를 갱신했다. DB, 환경 설정, API 계약, 원천 시각, 예약 작업과 배포는 변경하지 않았다. Git 저장소가 없어 Git 작업 없음.

### 확인과 미실행

- npm run lint / npm run typecheck / npm run build 모두 종료 0. 사용자 지시에 따라 자동 단위/통합/E2E/SQL/원천 실호출 테스트는 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- 1440×900 지도 다크 화면에서 144px 카드 3곳, 12px 간격과 실제 계산된 그림자를 확인했다. 문서 크기는 뷰포트와 같고 카드 가로/세로 내용 넘침이 없었다. 비교 1곳을 추가한 뒤 다음 페이지에서 선택과 page=2 URL이 유지됐다.
- 1440×900 장소 탐색 라이트 화면은 9곳과 자동 페이지 크기를 유지했고 문서 크기가 뷰포트와 같았다. 라이트용 그림자/호버 그림자가 적용되고 카드 내용 넘침이 없었다. reduced-motion 에뮬레이션에서는 transition-duration=0s였다.
- 390×844 모바일 지도는 3곳씩 세로로 배치되고 문서 너비 390px, 높이 1388px이며 카드 내용 넘침이 없었다. 자료 상태는 문서 너비 390px을 유지하고 826px 표를 324px 내부 스크롤 영역에서 읽을 수 있었다. 실제 모바일 기기는 확인하지 않았다. 수신 성공과 갱신 지연의 실제 조합을 확인했으며 실패/미제공 분기는 코드로 검토했다.
- 변경 전 지도, 변경 후 지도 다크, 장소 탐색 라이트 이미지 총 3장을 검토했다. 다크 모드로 복귀하고 TaskSpace 29를 종료했다. Ego Lite 업데이트는 수행하지 않았다. 기존 개발 서버와 승인된 수집기를 유지했다. 다음 작업은 원천 시각 차이의 시간대별 운영 관찰과 카드 깊이에 대한 사용자 피드백 반영이다.

## 72. 헤더의 저장 자료 배지 제거 (2026-11-11 KST)

- 사용자 요청에 따라 공통 AppShell의 실데이터 헤더에서 ‘저장 자료’ 배지를 제거했다. 내부 합성 데이터 식별 배지는 유지한다. 제품/UI와 구조 문서를 갱신했다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 단순 배지 제거로 빌드/브라우저 확인은 수행하지 않았고 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- 데이터/수집/API, 환경 설정과 예약 작업 변경 없음. Git 저장소가 없어 Git 작업 없음. 다음 작업은 헤더 구성에 대한 사용자 피드백 반영이다.

## 73. 종합 현황 전용 하단 안내 줄 제거 (2026-11-11 KST)

- 기존 일반 페이지 footer 제거 후에도 별도로 남아 있던 SituationBoard의 footer를 사용자 요청에 따라 제거했다. 추정치 설명, 최근 수집 시각과 ‘출처와 해석’ 링크가 있는 하단 줄 전체가 대상이다. 사용하지 않는 NextLink/dashboardHref import도 정리했다.
- wallboardLayout의 마지막 footer 행을 제거해 빈 행과 간격이 남지 않도록 했으며 남은 높이는 분석 영역이 사용한다. 제품/UI 문서의 화면 구성도와 설명을 갱신했다. 기존 자료 상태와 원천 시각 표시는 유지한다.
- 변경 파일 ESLint와 npm run typecheck 모두 종료 0. 코드에서 전용 footer/링크 제거와 4행 레이아웃을 확인했다. 작은 제거 변경으로 빌드/브라우저 확인은 수행하지 않았고 사용자 지시에 따라 자동 테스트도 실행하지 않았다. React Doctor는 ENOTCACHED로 진단 미실행이다.
- 데이터/수집/API와 환경 설정 변경 없음. Git 저장소가 없어 Git 작업 없음. 다음 작업은 종합 현황 배치에 대한 사용자 피드백 반영이다.

## 74. 공개 배포 준비 상태 종합 검토 (2026-11-11 KST)

### 범위와 판단

- 사용자 요청에 따라 코드, 데이터 운영, API 경계, 기획, 컴포넌트 구성, 디자인과 접근성을 검토했다. 이번 턴에 사용자가 로컬 자동 테스트 실행을 명시 승인했다. 추가 서울시 실호출, 원격 DB 변경, 예약 활성화와 배포는 범위에서 제외했다.
- 판단은 **현재 상태 그대로의 공개 배포 보류**다. 화면의 기본 구성은 유지할 수 있지만 운영 저장소 준비와 Supabase 20곳 조회 결함을 먼저 해결해야 한다. 제품 소스, 의존성, 환경 파일과 SQL은 수정하지 않았으며 이 절에 점검 결과만 기록한다.

### 배포 전 해결할 발견 사항

1. **P1 / 운영 데이터 연결 미준비.** `check:env`에서 현재 backend는 `local-snapshot`, Supabase 읽기/관리 설정 및 수집 토큰은 미설정, 운영 수집 설정은 false다. `src/lib/server/local-snapshot/contracts.ts:46`은 production에서 이 backend를 의도적으로 거부한다. 별도 localhost:3001 프로덕션 서버에서 overview/history GET 모두 503 `LIVE_UNAVAILABLE`와 실제 오류 화면을 확인했다. 개발용 파일 저장소의 운영 차단을 없애는 대신 운영 Supabase와 지속 수집 경로를 준비해야 한다. 현재 원격 프로젝트의 실상은 조회하지 않았으며 로컬 설정과 재현 결과에 대한 판단이다.
2. **P1 / 20곳 중 15곳이 자료 없음으로 바뀌는 Supabase 조회 결함.** `src/lib/server/repositories/live.ts:86`에 `.limit(5)`가 남아 있다. 외부 연결 없는 mock DB에 유효한 20개 최신 행을 준비해 실제 `LiveRepository.getOverview()`를 실행한 결과 장소 목록은 20개지만 인구 자료는 5개, missing은 15개였다. 기존 단위 테스트는 이 조회 계약을 검사하지 않는다. 제한 수정과 20곳 회귀 검증이 필요하다.
3. **P2 / 지도 표식 겹침.** `src/features/dashboard/seoul-overview-map.tsx:70` 및 `:76`의 고정 크기 클릭 영역이 도심에서 겹친다. 1440×900 지도에서 동대문 관광특구 표식 중심의 실제 hit target이 DDP 링크인 것을 확인했다. axe는 지도 라이트 및 1920×1080 종합 현황에서 각각 11개 표식의 크기/겹침 경고를 보고했다. 동일 정보를 제공하는 목록이 있으므로 자동 경고만으로 전체 WCAG 부적합을 단정하지는 않는다. 겹친 장소 선택 목록이나 확대 유도 등으로 오선택을 줄여야 한다.
4. **P2 / 수집 상태와 초기 오류 안내의 부정확성.** Supabase `LiveRepository`는 `meta.collection`을 반환하지 않는데 `src/features/dashboard/dashboard.tsx:100`은 이를 ‘수동으로 조회해 저장한’ 자료라고 단정한다. 운영 Cron 상태와 무관하게 이 문구로 떨어진다. 또한 `src/features/dashboard/situation-board.tsx:45`는 최초 조회 실패로 보유 데이터가 없어도 ‘마지막 정상 자료를 표시합니다’를 출력한다. 후자는 실제 프로덕션 오류 화면에서 재현했다. 상태 미확인, 최초 실패와 재조회 실패를 구분해야 한다.
5. **P2 / 운영 문서와 현재 계약 불일치.** `docs/04_DELIVERY_AND_QUALITY.md:91`의 실행 예시는 아직 10분 Cron이며 실제 템플릿은 5분이다. 같은 문서의 Preview 기본 demo 설명, `supabase/README.md`의 5곳/10분/77개 테스트 설명도 현재 20곳/5분/live/90개와 어긋난다. 과거 경과 기록과 현재 실행 절차를 분리해야 잘못된 운영 설정을 피할 수 있다.
6. **P2 / 공개 설명의 잔여 데모 문구.** `src/app/layout.tsx:10`의 검색 설명에 ‘별도 합성 데이터 데모를 제공합니다’가 남아 있지만 공개 demo API는 404이고 `/demo`는 실데이터로 연결된다. 숨겨진 `/data-info`에도 데모 설명 2곳이 남아 있다. 현재 실데이터 전용 범위에 맞게 정리해야 한다.

### 기획, 컴포넌트와 디자인 평가

- ‘20곳 현황 → 장소 탐색/지도 → 상세 또는 최대 3곳 비교’ 흐름은 포트폴리오 목적에 맞는다. 추정 범위, 원천 시각, 수신 시각, 결측을 분리하고 장소별 값을 서울 전체 인구로 합산하지 않는 방식도 유지할 가치가 있다. 최근 사용자 결정인 24시간 보관을 기준으로 검토했으며 예전 7일/CSV/즐겨찾기 목표의 미구현을 배포 장애로 취급하지 않았다.
- MUI 테마/색상 토큰, URL 화면 상태, TanStack Query, 서버 읽기와 수집 경계가 분리되어 있다. 다만 `Dashboard`가 여러 페이지의 조회, 정렬, 온라인 상태, 시간 갱신, 화면별 분기를 함께 맡는다. ComparePage에도 온라인/주기 갱신 로직이 반복된다. 공통 조회/갱신 hook과 페이지별 view를 분리하는 리팩터링이 다음 유지보수 우선순위다. 실제 성능 저하를 측정한 것은 아니므로 복잡도 경고를 성능 결함으로 보고하지 않는다.
- 다크/라이트 색상과 제목/본문 위계, 장소 카드의 경계와 깊이는 일관된다. 1280×800 및 1440×900 종합 현황, 1920×1080 종합 현황, 1280×800 DDP 상세, 1440×900 장소 탐색은 문서 크기가 뷰포트와 같았다. 장소 탐색은 9개 카드와 페이지 영역을 유지했다. 720×450의 작은 창과 390×844 모바일은 가로 넘침 없이 자연스러운 세로 배치로 전환됐다.
- 비교 화면은 1440×900에서 문서 높이가 1247px이고 선택 영역과 큰 현재값 카드 뒤로 차트가 밀려 첫 화면에서 잘린다. 기능 결함은 아니지만 ‘비교’ 작업의 핵심을 빨리 보여주려면 상단 선택/현재값 영역을 줄이고 차트를 위로 당기는 것이 좋다. 지도는 표식 겹침 해결이 장식 추가보다 먼저다. 현황판의 12px 보조 설명은 멀리서 보는 모니터에 작으므로 제목/주요 값 중심으로 우선순위를 유지하는 편이 좋다.
- 자료 상태에서 수신 성공과 원천 최신성을 구분한 현재 구조는 적절하다. 원천 지연을 없애기 위해 기준 시각을 수집 시각으로 바꾸거나 만료 자료를 최신으로 표시해서는 안 된다.

### 실제 검증 결과

- 지정 런타임 **Node 24.21.0 / npm 11.19.0**에서 `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` 모두 종료 0. 단위 테스트 **13개 파일 / 90개 통과**. 초기 시스템 Node 26.4.0에서도 통과했으나 지정 런타임과 달라 다시 검증했다. npm의 플랫폼 패키지는 ETARGET이어서 Node 공식 배포본을 임시 폴더에 받고 공식 SHA-256을 대조한 뒤 사용했다. 프로젝트 런타임 설정이나 전역 설치는 변경하지 않았다.
- React Doctor **0.9.22 / schemaVersion 3 / full / 111개 파일 / complete=true / skippedChecks 없음 / 오류 0, 경고 19**. 외부 점수/telemetry 및 Socket 공급망 검사는 비활성화했으며 점수는 산출하지 않았다. 복잡도 경고는 10개다. `useSearchParams`의 Suspense 경고는 해당 서버 페이지가 `connection()`을 호출하고 production HTML에도 비교 제목/장소가 렌더링되는 것을 확인해 이 앱의 배포 결함으로 채택하지 않았다. 최대 20개/3개 배열의 includes 경고와 context 객체 경고는 성능 문제의 증거가 없어 낮은 우선순위 관찰로 분류했다.
- `npm audit --json`: high/critical 0, moderate 7, low 1. moderate 항목들은 개발 도구인 typescript-eslint/minimatch 의존성 경로이며 7개의 독립 취약점을 뜻하지 않는다. low는 런타임 `fast-xml-parser@5.11.2`다. [패키지 공식 보안 공지](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-474x-hrwr-fgx4)는 비기본 stopNodes 옵션이 조건이며 이 프로젝트 파서는 해당 옵션을 사용하지 않는다. 5.12.0으로의 패치 갱신은 후속 작업으로 남기되 현재 코드의 원격 실행 취약점이라고 과장하지 않는다. 자동 수정은 실행하지 않았다.
- `.next/static` 34개 파일에서 현재 설정된 서버 비밀값이 포함되는지 값 자체를 출력하지 않고 확인했다. 설정된 서울시 키의 노출은 발견되지 않았다. 미설정 Supabase secret/수집 토큰이나 배포 플랫폼의 로그/환경까지 검증한 것은 아니다.
- 프로덕션 GET에서 지원하지 않는 7일 이력 400, demo API 404, 미등록 장소 404와 오류의 no-store를 확인했다. 내부 수집 인증/입력/비활성화, 공개 경로의 수집 의존성 부재, 타임아웃/재시도/예산 등은 실행된 단위 테스트와 코드로 검토했다. SQL의 RLS, SELECT/관리 권한 분리, security invoker, 고정 search_path, 24시간 보존과 5분 예약 템플릿은 정적 검토만 했다.
- Ego TaskSpace 30에서 종합 현황, 장소 탐색, 지도, 비교, 긴 이름의 DDP 상세, 자료 상태, 숨겨진 데이터 안내와 production 오류 화면을 확인했다. 비교 2곳 선택 및 3곳 차트, 검색 결과 없음/초기화, 모바일 메뉴/테마 전환, 지도 확대/키보드 이동, 오프라인 시 기존 20곳 유지와 재연결을 확인했다. 원래 다크 모드로 돌리고 TaskSpace를 종료했다. 실제 iOS/Android 기기나 Safari 검증은 하지 않았다.
- axe-core **4.14.0**을 브라우저 내부에서 실행했다. 모바일 장소 탐색/종합 현황/비교/상세 및 데스크톱 자료 상태에서 확정 위반은 보고되지 않았다. 지도 겹침 경고는 위 발견 사항에 포함했다. 초기 로딩 중 테마 버튼의 대비 경고 1개는 활성화 완료 후 동일 규칙 재검사에서 재현되지 않았다. SVG/차트 등 색상 대비와 일부 ARIA 항목은 incomplete가 있어 전체 접근성 통과로 기록하지 않는다. 검사 원본과 화면 이미지는 `/private/tmp/seoul-audit-*`, `/private/tmp/seoul-axe-*`, `/private/tmp/seoul-react-doctor-20261111*`에 남겼다.

### 미검증과 후속 작업

- 전용 로컬 DB의 테스트 URL/키/활성화 설정과 Supabase/Docker/psql 실행 도구가 없어 DB 통합/pgTAP 검사는 미실행이다. 실제 운영 DB의 migration 적용, RLS/RPC 실행 권한, Cron 호출/24시간 삭제, 호스팅 timeout/로그/캐시와 지속 수집은 검증되지 않았다. 부하 시험과 실제 배포 E2E도 미실행이다.
- 내부 수집 endpoint에 실제 unauthenticated POST를 보내는 검사는 자동 승인 검토가 거부했다. 사유는 인증 결함 시 원천 요청/DB 쓰기가 발생할 가능성이 이번 제외 범위를 벗어난다는 것이다. 우회 실행하지 않았으며 실제 collector를 mock한 `public-read-boundary.test.ts`의 401/미호출 검증으로 대체했다.
- 점검용 localhost:3001 서버만 종료했다. 기존 localhost:3000 개발 서버와 승인된 20곳/5분 수집기는 유지했다. Ego Lite 업데이트 안내가 있었지만 업데이트하지 않았다. Git 저장소가 없으므로 Git 작업도 수행하지 않았다.
- 다음 순서: 20곳 조회 결함 및 회귀 검사 → 상태/문서/메타데이터 정리 → 지도 겹침과 비교 배치 개선 → 전용 DB 통합 검사 → 운영 저장소와 예약 수집 준비 및 배포 환경 검증. 원격 변경과 실제 배포는 별도 승인 범위로 유지한다.


## 75. 배포 준비 1~5 구현과 로컬 검증 (2026-11-11 KST)

### 작업 계획과 적용 상태

사용자가 앞서 제안한 배포 준비 1~5의 계획/구현을 요청했고, 로컬 자동 테스트 실행 승인을 유지했다. 코드와 설정 준비를 진행했다. 현재 환경에는 Supabase URL/읽기 키/관리 키/수집 토큰이 없고 연결된 Supabase 도구도 없다. 프로젝트와 호스팅 정보를 질문했고 사용자는 기존 연동 여부를 확인했다. 현재 실제 데이터 경로가 로컬 파일 수집본임을 설명했다. 운영 프로젝트/호스팅을 임의로 만들거나 선택하지 않았다.

1. **20곳 조회 결함 수정 완료.** `LiveRepository`의 limit(5)를 공개 카탈로그 길이로 변경하고 storage=supabase를 명시했다. 제한이 실제 반환 행 수에 적용되는 mock DB로 20곳 전체/실제 누락 1곳 회귀 검사를 작성했다. 수정 전 두 검사가 5개만 반환하여 실패하는 것을 확인한 후 수정해 통과했다. 로컬 history는 기존대로 storage=local-snapshot으로 덮어쓴다.
2. **운영 DB 연결 준비 완료, 실제 적용 대기.** 기존 4개 migration의 순서와 RLS/공개 읽기/관리 쓰기 분리를 `supabase/README.md`에서 현행화했다. DB 연결 자체는 미설정이다. 전용 로컬 DB/CLI/Docker/psql이 없어 DB 통합/pgTAP/실제 권한 검증과 원격 적용은 수행하지 못했다. 기존 migration을 수정하거나 새 스키마를 추가하지 않았다.
3. **지속 수집 운영 절차와 사전 점검 준비 완료, 활성화 대기.** 20곳/5분/24시간 보존과 기존 Cron 템플릿을 기준으로 환경 설정 → 공개 읽기 → 첫 배치 → Vault/Cron → 두 주기/보존 확인 순서를 정리했다. `npm run check:deployment`는 네트워크 없이 production 환경 형식을 검사하며 `--collector`는 수집 설정, `--read`는 공개 키의 20곳/이력 RPC 읽기를 추가한다. 키/원본 오류를 출력하지 않고 DB 쓰기/원천 호출을 하지 않는다. `supabase/templates/operational-status.sql`은 관리자가 읽기 전용으로 migration/권한/Cron/배치 결과/시각/25시간 초과 정리 지연을 확인하는 절차다. SQL 실행은 미검증이다. 현재 환경에서 `check:deployment -- --collector`가 운영 저장소/HTTPS origin/DB/수집 설정 누락으로 종료 1인 것을 확인했다. 실패를 성공으로 처리하지 않는다.
4. **상태/공개 설명 수정 완료.** 공통 getReadNotice/getCollectionNotice로 첫 조회 실패, 기존 자료 재조회 실패, 오프라인, 중지/미확인을 구분한다. 수집 메타가 없다고 수동 수집이나 중지라고 단정하지 않는다. 공개 조회에 관리자 클라이언트를 추가하지 않았다. Supabase의 실제 Cron 상태는 공개 UI가 확인하지 못하므로 미확인으로 남고 원천/수신 시각은 별도로 읽는다. Dashboard/Compare의 온라인/시계/자동 확인 로직을 useLiveRefresh로 공유하고 오프라인에서는 주기 재조회를 끈다. 검색 metadata와 데이터 안내의 잔여 공개 데모 설명, 10분 운영 예시와 오래된 테스트 안내를 정정했다. 숨긴 데이터 안내 메뉴와 삭제한 footer/배지는 복원하지 않았다.
5. **지도와 비교/큰 화면 가독성 보완 완료.** 지도 좌표는 그대로 두고 화면 픽셀에서 가까운 클릭 영역을 숫자 표식으로 묶었다. 숫자는 장소 수다. MUI Menu에서 장소명/혼잡/범위를 읽고 직접 선택하며 확대하면 분리된다. 36px 표식과 44px 분리 기준을 적용하고 원본 좌표/장소 보존과 분리 결과를 검사했다. MapMarkers로 선택 UI를 분리했다. 비교 상단 선택/현재값 카드를 압축하고 장소별 색상을 카드/그래프와 연결했다. 큰 화면 순위의 장소명은 18px, 인구 범위는 16px로 키웠다. 낮은 데스크톱에서도 비교 그래프가 보이도록 공통 shell과 차트 높이 토큰을 조정했다.

### 실제 검증

- 지정 **Node 24.21.0 / npm 11.19.0**으로 lint, typecheck, test, build 종료 0. 단위 테스트 **17개 파일 / 101개 통과**(기존 90개 + 조회/지도/상태/배포 설정 11개). 최종 UI 변경 후 lint/test/build를 다시 실행했고 build의 TypeScript 검사도 통과했다. 서울시 추가 검증 호출, DB 쓰기와 예약 활성화는 이 검사에서 수행하지 않았다.
- React Doctor 0.9.22 full, schemaVersion 3, 121개 파일 complete=true, skippedChecks 없음. 최종 **오류 0 / 경고 19, 기존 대비 새 진단 없음**. 외부 점수/공급망 검사는 비활성화했다. 새 지도 배열 반복 조회 경고는 Set으로 정리했다. 기존 복잡도 등 경고는 이번 범위에서 모두 해소했다고 주장하지 않는다. 최종 JSON: `/private/tmp/seoul-prep-doctor-final.json`.
- Ego TaskSpace 31에서 실제 로컬 수집 자료로 검증했다. 1440×900 지도에서 표식 중심의 hit target이 각 해당 버튼/링크인 것을 확인했다. 동대문 관광특구를 클릭해 해당 상세로 이동했고, Enter/End/Enter로 묶인 목록의 DDP 상세 이동도 확인했다. 지도 확대 시 표식 분리, 390px 모바일 메뉴의 화면 내 표시/내부 스크롤을 확인했다.
- 비교 화면 1440×900 및 1280×800에서 문서 크기가 각각 뷰포트와 같고 세 그래프 모두 첫 화면에 들어왔다. 390px 모바일에서 가로 넘침 없이 세 그래프가 세로로 배치된다. 1920×1080 종합 현황도 문서가 뷰포트와 같고 순위 장소명 18px를 확인했다. 다크/라이트 이미지를 검토했다. 오프라인 안내 중에도 현황 20곳을 유지하고 온라인으로 복귀하는 것을 확인했다.
- axe-core 4.14.0의 WCAG 2/2.1/2.2 A/AA 검사에서 비교 화면과 1920 종합 현황의 확정 위반은 없었다. 지도 target-size 경고도 해소됐고 모든 표식 중심이 올바른 클릭 대상이었다. 지도 최초 로딩 중 대비 경고 1개는 안정화 후 color-contrast/target-size 재검사에서 미재현이었다. SVG/차트 색 대비 및 일부 ARIA incomplete는 남아 있어 전체 접근성 통과라고 표시하지 않는다.
- localhost:3001 production에서 DB 미연결로 최초 실패한 실제 화면이 ‘현황 조회 실패’와 ‘수집 상태 미확인’을 표시하고 ‘마지막 정상 자료를 표시합니다’라고 주장하지 않는 것을 확인했다. 현재 production의 503 자체를 해결했다고 주장하지 않는다. 이는 운영 DB 설정 대기 상태다.
- 스크린샷은 `/private/tmp/seoul-prep-*`에 저장했다. 브라우저 대기 조건 일부가 테마 data 속성/resize 후 바뀐 묶음 수와 맞지 않아 실패했지만 실제 상태를 다시 확인해 조건을 수정하고 검증했다. 잘못된 대기를 앱 통과로 기록하지 않았다. 테마를 다크, 네트워크를 온라인으로 복귀하고 TaskSpace 31을 종료했다. Ego Lite 업데이트는 안내만 받았고 실행하지 않았다.

### 남은 작업과 실행 상태

- **운영 Supabase 프로젝트/호스팅 지정 → 전용 DB 통합/pgTAP 검증 → 운영 migration/환경 연결 → 첫 실제 배치와 인증 확인 → 5분 Cron/보존 작업 활성화 → 두 주기 및 24시간 정리 관찰**이 남았다. 값 자체를 대화에 요청하지 않는다. 실제 배포, 운영 수집 성공과 보존 완료는 아직 검증하지 않았다. 현재 로컬 승인과 운영 전송 범위는 연결 시 확인한다.
- 기존 개발 서버가 종료돼 localhost:3000을 Node 24로 다시 실행했다. 검증용 3001 서버(PID 5906)는 종료했다. 기존 20곳/5분 로컬 수집기는 계속 waiting 상태이며 중지/재시작하지 않았다. 환경 비밀 파일, 원격 DB, 예약 작업과 계정 설정을 변경하지 않았다.
- Git 저장소가 없으므로 Git 초기화/브랜치/commit/push/PR은 수행하지 않았다. 로컬 수정이 운영 배포 완료를 뜻하지 않는다.


## 76. Supabase MCP 연결, sp_ 스키마 적용과 수집 전환 (2026-11-12 KST)

### 요청 범위와 연결

- 사용자가 `.env.local`의 변수를 사용한 DB 연결과 `sp_` 접두사 테이블 생성을 요청했고, MCP 인증도 직접 시도하라고 승인했다. 키 값은 대화/문서/명령행에 출력하지 않았다.
- 기존 전역 `supabase` MCP는 다른 프로젝트였다. 지정 URL을 인자로 한 Codex MCP OAuth로 먼저 인증한 뒤, 기존 연결을 유지하면서 `seoul-pulse-supabase`라는 별도 전역 MCP를 등록하고 인증했다. 최종 MCP `get_project_url`이 `.env.local`의 대상과 일치하는 것을 확인했다. 임시 프로젝트 `.codex/config.toml`은 CLI에서 의도대로 선택되지 않아 제거했으며, 프로젝트 신뢰/승인 정책은 변경하지 않았다.
- 현재 대화에 Supabase 도구가 직접 노출되지 않아 설치된 Codex app-server의 공식 프로토콜 `mcpServer/tool/call`로 호출했다. 도구 연결용 ephemeral context만 만들었고 모델 turn이나 하위 에이전트는 실행하지 않았다. OAuth 자격 증명 파일을 추출하거나 API 키를 MCP 인증으로 대체하지 않았다.
- 간단한 REST HEAD 응답으로 기존 테이블이 있다고 안내한 것은 잘못이었다. 실제 GET 및 pg_catalog에서 앱 테이블이 없음을 확인해 정정했다. 공유 프로젝트의 다른 앱 테이블/함수/권한/기존 migration 기록은 변경하지 않았다.

### 스키마와 코드

- MCP `apply_migration`으로 `20261111160340_sp_seoul_pulse_schema.sql`을 적용했다. 원격이 부여한 버전에 로컬 파일명을 맞췄다. 공개 테이블은 `sp_areas`, `sp_area_latest`, `sp_population_observations`, 내부 `sp_private` 테이블은 `sp_collection_runs`, `sp_collection_leases`, `sp_provider_budgets`, `sp_provider_attempts`다. 모든 관련 함수도 `sp_`로 시작한다.
- 20곳/5분/24시간 계약을 통합한 최초 설치다. 이전 네 migration은 원격에 미적용인 초안임을 확인하고 `supabase/archive/unapplied-drafts/`로 이동했다. 현재 migration 디렉터리에는 실제 적용한 파일만 있다. 새 설치가 접두사 없는 테이블을 함께 만들지 않게 했다.
- 7개 테이블 모두 RLS, 공개 3개는 공개 장소 SELECT만 허용한다. 내부 스키마/테이블과 수집 RPC는 service_role 전용이며 함수는 SECURITY INVOKER와 빈 search_path를 사용한다. 공개 이력 함수만 anon/authenticated 실행을 허용한다. 429의 Retry-After 누락 시 대기는 5분 경계로 맞췄다.
- `.env.local`의 기존 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 서버 설정의 호환 이름으로 지원한다. 공개 값은 sb_publishable_만, 관리자 값은 sb_secret_ 또는 대상/역할/만료가 맞는 기존 service_role JWT를 허용한다. JWT 서명/실제 권한은 Supabase 서버가 검증한다. 두 설정 이름의 값이 다르면 임의로 하나를 선택하지 않는다.
- 읽기 저장소, 수집 RPC, 통합 테스트, SQL 테스트와 운영 템플릿의 이름을 `sp_`로 변경했다. 환경 예시와 데이터/운영 문서도 현행화했다. 공유 프로젝트의 Cron 로그 정리 템플릿은 우리 job 두 개에만 적용하도록 범위를 좁혔다. 템플릿 자체는 실행하지 않았다.

### 수집 전환과 실제 자료

- 최초 원격 수집 활성화/예산 이전 요청은 자동 승인 검토가 거절했다. 이유는 테이블/연결 승인만으로 반복 수집 전환 승인을 확정할 수 없다는 것이었다. 해당 변경을 실행하지 않고 기존 파일 수집을 복구한 후 구체적인 전환 범위를 질문했다. 사용자가 **“승인하고 Supabase 수집으로 전환”**이라고 답한 뒤 진행했다.
- 기존 파일 수집기를 정지하고 당일 이미 사용한 280회와 기존 일일 상한 5,760회를 DB 예산으로 이어받았다. 공개 20곳을 수집 활성화하고 `.env.local`의 `LIVE_DATA_BACKEND`만 `supabase`로 바꿨다. 전역 `COLLECTOR_ENABLED=false`, HTTP/시간대 설정과 비밀값은 유지했다.
- `collector:local`이 선택한 저장소에 맞게 기존 DB 수집 서비스를 실행하도록 연결했다. 5분 간격, 최대 20곳, 동시성 2, DB 슬롯/lease/예산을 사용한다. 활성화와 HTTP 허용은 승인된 로컬 프로세스의 실행 설정에만 적용한다. DB 일시 연결 오류는 안전한 코드로 기록하고 다음 주기에 다시 시도한다. 배치 뒤 정리 RPC로 24시간 지난 관측을 삭제하며 최신값은 보존한다. 원격 Cron은 생성하지 않았다.
- 실제 Node 24에서 `performance.now`를 분리 호출하던 기존 DB 수집기의 `ERR_INVALID_THIS`를 발견했다. 첫 시도는 DB acquire/원천 요청 전에 종료됐다. 가짜 시계 없는 회귀 검사를 추가해 실패를 재현한 후 `() => performance.now()`로 수정하여 통과했다.
- **01:15:04 KST 첫 DB 배치 20곳 모두 성공**: 인구/날씨 최신값 각각 20, 실제 관측 20, 실패/부분/건너뜀 0, 원천 요청/예약 각각 20. DB 조회에서 당일 요청 합계 300회(이전 280 + 첫 DB 20)와 만료 이력 0건을 확인했다. 다음 실행 예약은 01:19:59 KST였다.
- **01:20:03 KST 두 번째 자동 배치도 20곳 모두 성공**했다. 5분 뒤 별도 수동 실행 없이 저장됐으며 두 배치 모두 원천 요청/예약 20회, 실패 0이다. 작업 종료 시 PC 수집기는 다음 01:24:59 KST 실행을 기다리는 상태다.
- 과거 로컬 관측에는 개별 수신 시각이 없어 임의의 값을 만들어 DB로 이전하지 않았다. 기존 수집본 파일은 보존했다. DB 이력은 이번 실제 수집부터 쌓이며 같은 원천 시각은 중복 저장하지 않는다. 강남역 상세에서 원천 00:45 / 수신 01:15, 기록 1개와 갱신 지연을 그대로 표시하는 것을 확인했다. 성공적으로 수신했다고 원천 자료를 최신으로 바꾸지 않는다.

### 검증과 남은 작업

- Node 24.21.0 / npm 11.19.0에서 lint, typecheck, test, build 종료 0. 최종 단위 검사 **18개 파일 / 107개 통과**. 새 환경 호환 5개와 실제 Node 시계 회귀 1개를 포함한다. 마지막 시계 수정 후 전체 test/lint/build를 다시 실행했고 build의 타입 검사도 통과했다.
- 실제 공개 키와 `LiveRepository`로 20곳/24시간/3곳 비교 이력 RPC 조회 성공. pg_catalog에서 7개 RLS, 익명 쓰기 거부, 관리자 쓰기와 11개 함수 실행 권한을 확인했다. Supabase security advisor의 sp_ 대상 ERROR/WARN은 없고, 내부 4개 테이블의 정책 없음 INFO는 기본 거부/service_role 전용 설계에 따른 것이다. 다른 앱 진단은 변경하지 않았다.
- Ego TaskSpace 32에서 localhost:3001 배포 빌드의 overview/history가 HTTP 200, storage=supabase, 최신 인구 20곳을 반환하는 것을 확인했다. 실제 사용 중인 localhost:3000도 같은 DB 자료를 읽으며 강남역 상세에 실제 추정 범위/원천 시각/수신 시각/관측 1개를 표시했다. TaskSpace는 종료했고 점검용 3001 서버만 종료했다. 개발 서버와 승인된 Supabase 수집기는 유지한다.
- 최종 클라이언트 정적 산출물 35개에서 실제 서울시 키/관리자 키/수집 토큰 포함 파일 0개를 확인했다. 비밀값과 원본 오류는 출력하지 않았다. Ego Lite 업데이트 안내만 확인하고 업데이트하지 않았다.
- 전용 로컬 Postgres/CLI 테스트 환경이 없어 pgTAP와 DB 통합 테스트는 미실행이다. 원격 DB에 합성 테스트 관측을 넣지 않았다. 24시간이 실제 경과한 삭제와 장시간 운영, 호스팅의 네트워크/timeout은 아직 검증 전이다. 이번 수집은 PC 프로세스이므로 PC 종료 시 멈춘다. 다음 단계는 호스팅 결정과 서버 환경변수/수집 인증 설정, 배포 후 원격 Cron 연결이다. 실제 배포와 원격 예약은 이번 승인 범위에 포함하지 않았다. Git 저장소가 없어 Git 작업은 하지 않았다.


## 77. Supabase 인구 이력 48시간 보존과 독립 자동 정리 (2026-11-12 KST)

### 적용한 변경

- 사용자가 Supabase에서 48시간 지난 수집 이력을 자동 삭제하도록 요청했다. 기존 공유 프로젝트의 우리 앱 이력 정리만 대상으로 했으며, 원격 API 수집 예약과 웹 배포는 추가하지 않았다.
- `20261111170335_sp_retain_population_history_48_hours.sql`을 MCP로 적용했다. `sp_cleanup_seoul_pulse()`의 인구 관측 보존을 24시간에서 48시간으로 변경했다. 원격 migration 버전과 로컬 파일명을 맞췄으며 기존 설치 migration은 수정하지 않았다.
- 삭제 기준은 수신 시각이 아닌 `observed_at < 실행 시각 - 48시간`이다. 공개 화면의 조회 범위는 최근 24시간을 유지한다. `sp_area_latest`의 마지막 인구/날씨는 삭제하지 않으며 완료 실행/예산의 기존 14일 보존, 활성 lease와 열린 circuit 예외도 유지했다. 함수는 SECURITY INVOKER, 빈 search_path와 기존 관리자 전용 권한을 유지한다.
- `pg_cron` 1.6.4를 설치하고 `seoul-pulse-cleanup-v1`을 **매시 23분(`23 * * * *`)**에 활성화했다. 작업은 DB 정리 함수와 우리 앱의 종료된 Cron 로그 14일 정리만 실행한다. 다른 앱의 자료/예약/실행 로그는 건드리지 않는다. 잠금 대기 5초, 문장 실행 30초 제한을 설정했다. PC나 웹 서버가 꺼져도 실행 중인 Supabase 프로젝트에서 동작한다.
- 최초 검증용 매분 예약과 Cron 스키마의 넓은 권한 부여는 자동 승인 검토가 거절했다. 이 요청은 실행되지 않았다. 두 항목을 제거하고 요청 범위에 맞는 매시간 예약만 다시 실행해 승인/적용됐다. Cron 추가 권한 부여 없이 기존 postgres 권한으로 실행 가능함을 확인했다.
- `cleanup-cron-enable.sql` / `cleanup-cron-disable.sql`로 정리 예약을 분리했다. 동명 작업을 자동 덮어쓰지 않으며 48시간 migration 적용 여부를 먼저 확인한다. 기존 `cron-enable.sql` / `cron-disable.sql`은 원격 API 수집 예약만 관리하므로 수집 중지 시 이력 정리는 유지한다. 운영 점검의 정리 지연 기준은 매시간 실행 사이 대기를 고려해 49시간으로 변경했다.
- PC의 20곳/5분 수집기를 재시작하거나 환경 변수를 변경하지 않았다. 기존 배치 후 호출하는 정리 RPC도 변경된 48시간 기준을 사용한다. SQL 템플릿, Supabase 운영 문서와 데이터/품질 문서를 같은 계약으로 맞췄다.

### 검증 결과와 한계

- 전용 임시 폴더의 PGlite 0.5.16과 `@electric-sql/pglite-pgtap` 0.0.17 확장 패키지로 실제 SQL을 인메모리 Postgres에서 실행했다. 프로젝트 의존성이나 lockfile은 변경하지 않았다. 기존 24시간 함수에서는 강화한 보존 검사가 실패하는 것을 확인한 뒤 48시간 migration을 적용했고, SQL 테스트 **4개 파일 / 22개 검증 모두 통과**했다. 48시간 경계 전후, 30시간 자료 보존, 오래된 최신값 유지, 반복 정리와 실행 권한을 확인했다. 테스트 fixture는 로컬 트랜잭션에서 rollback했으며 원격에 합성 자료를 쓰지 않았다.
- Node 24.21.0에서 관련 단위 테스트 `live-repository`, `live-history`, `public-read-boundary` **3개 파일 / 10개 통과**, typecheck 종료 0. 최초 테스트 명령에 존재하지 않는 `history.test.ts`를 함께 지정했을 때 실제 실행은 live-repository 2개뿐이었으며, 올바른 live-history와 공개 경계 8개를 별도로 실행했다. 이번 SQL/문서 변경에서는 전체 단위 검사, build와 브라우저 E2E를 재실행하지 않았다.
- 원격 DB에서 예약에 등록한 정리 SQL 전체를 한 번 직접 실행해 오류 없이 완료했다. 삭제 결과는 관측/완료 실행/예산 모두 0건이며 현재 48시간 지난 실제 관측이 없어 정상이다. 정리 후 최신값 20곳과 공개 24시간 이력 RPC 조회를 확인했다.
- 실제 DB 카탈로그에서 48시간 함수, migration 기록, 활성 정리 예약 1개, 예약 역할의 함수/로그 정리 권한, anon/authenticated 정리 실행 차단을 확인했다. 우리 앱의 원격 API 수집 예약은 없다. Supabase 보안 advisor의 관련 ERROR/WARN은 없고 내부 4개 테이블의 RLS 정책 없음 INFO는 기존 기본 거부 설계와 같다.
- **첫 예약 시각에 의한 자동 실행은 아직 관찰 전이다.** 최종 확인 시 정리 job 실행 이력은 0건이다. 수동 SQL 실행 성공과 예약 활성 확인을 자동 실행 관찰로 기록하지 않는다. 자연스럽게 48시간 지난 자료의 삭제와 장시간 운영도 후속 관찰 대상이다. 매시간 정리 사이에는 최대 약 1시간의 삭제 대기분이 남을 수 있다.
- 다음 작업은 첫 정리 예약의 실제 실행 로그 확인, 호스팅 결정과 배포 환경 설정이다. 신규 자료 수집은 여전히 PC 프로세스에 의존한다. Git 저장소가 없어 Git 작업은 하지 않았다.


## 78. 배포까지 남은 작업 재확인 (2026-11-12 KST)

- 사용자가 배포 전 남은 작업을 질문해 현행 운영 문서, 설정 점검 코드와 실제 예약 상태를 확인했다. 코드 구현, 원격 변경, 수집 실행이나 배포는 수행하지 않았다.
- Node 24에서 `npm run check:deployment -- --collector` 실행 결과 운영 Supabase 저장소, 실데이터 모드, DB 읽기 설정과 20곳/5분 설정은 통과했다. 고정 HTTPS 주소, 서버 수집 설정과 수집 인증은 준비되지 않아 전체 결과는 종료 1이다. 이는 로컬 설정의 운영 형식 점검이며 아직 없는 호스팅 환경을 검사한 결과가 아니다. 원천 요청과 DB 쓰기는 모두 0이다.
- 이번에는 연결된 `seoul-pulse-supabase` MCP를 직접 사용했으며 프로젝트 URL이 기존 지정 프로젝트와 일치했다. 읽기 전용 Cron 조회에서 `seoul-pulse-cleanup-v1`의 실제 예약 실행 **2026-11-12 20:23:00 KST 성공**을 확인했다. 77절 당시 미관찰 상태였던 자동 실행을 이번에 관찰했다. 실제 48시간 지난 자료의 삭제 여부까지 검사한 것은 아니다.
- 원격 API 수집 예약은 여전히 없다. 남은 순서는 호스팅/HTTPS 주소 확정 → 서버 환경 변수와 수집 인증 설정 → 첫 배포/실제 단일 배치 검증 → Supabase 5분 수집 예약 연결과 PC 수집 중지 → 두 주기 이상 저장 및 배포 URL의 화면/보안/오류 상태 검증이다. Git 연동 배포를 선택하면 저장소 초기화/원격 연결도 별도 요청 범위에서 진행해야 한다.
- 이전 lint/typecheck/단위 검사/build와 로컬 브라우저 검증 기록은 유지하되 이번 질문에서 재실행하지 않았다. 배포 후보의 최종 검사와 실제 호스팅의 실행 시간/서울시 원천 연결 확인은 남아 있다.


## 79. Vercel 배포 대상으로 확정하고 업로드 범위 준비 (2026-11-12 KST)

- 사용자가 Vercel 배포 의사를 명시했다. Vercel 공식 문서에서 Node.js 24 지원, App Router의 함수 실행 시간 설정, 환경 변수 적용과 Cron 제한을 확인했다. 기존 수집 route의 Node.js runtime/60초 제한과 Supabase의 5분 HTTP 예약 구조를 유지한다. Vercel 내장 Cron은 추가하지 않는다.
- `.vercelignore`에 로컬 환경 파일, 수집본, 개발 도구 설정과 빌드/검사 산출물 제외 규칙을 추가했다. `.gitignore`에는 `.vercel/`을 추가했다. 앱 코드, 비밀값과 로컬 수집 설정은 변경하지 않았다.
- README의 미연결 DB/24시간 보관 설명을 실제 Supabase 연결과 48시간 보관/24시간 표시 상태로 정정하고 배포 대상을 Vercel로 기록했다. `supabase/README.md`에 Preview/Production 환경 변수 구분, 프로젝트 연결, 배포 검증과 Supabase 예약 전환 순서를 추가했다.
- Node 24에서 ignore 패턴을 직접 검사해 비밀/로컬 산출물 예시 8개 제외와 빌드 필수 경로 예시 7개 포함을 확인했다. 비밀값을 읽거나 업로드하지 않았다. 앱 코드/의존성/빌드 명령을 변경하지 않아 전체 테스트/build/E2E는 재실행하지 않았다. 실제 Vercel 업로드 산출물 검증은 배포 시 수행해야 한다.
- 프로젝트에 `.git`과 `.vercel/project.json`은 없다. PC의 Vercel CLI 설정 디렉터리는 있지만 인증 내용은 열지 않았고 원격 계정/프로젝트 목록은 조회하지 않았다. 실제 배포 URL과 호스팅 환경 변수가 없으므로 배포 성공을 주장하지 않는다. 프로젝트 연결 → Vercel 서버 변수 설정 → 실제 배포/원천 연결 검증 → 원격 수집 전환이 남았다. 원격 DB/예약/유료 설정/Git은 변경하지 않았다.


## 80. README를 서비스 소개 중심으로 개편 (2026-11-12 KST)

- 사용자가 README에서 기술 스택과 실행 방법을 빼 달라고 요청했다. 루트 README를 서비스 한 줄 소개, 장소 탐색 목적, 화면별 기능, 현황판 사용 경험과 데이터 표시 기준으로 재구성했다.
- 기존 종합 현황/비교 화면 이미지 2개와 데이터 출처, 디자인 참고 표기를 유지했다. 기술 스택 표, 코드 구조, 실행 명령, 환경 변수, 배포 절차, 내부 검증/운영 설명과 문서 목록은 소개에서 제거했다. 기존 기술/운영 문서 자체는 변경하지 않았다.
- README 전체를 읽고 로컬 이미지 경로 2개의 존재, 제외 대상 기술/실행 문구와 가운데점 부재를 확인했다. 문서만 변경해 앱 테스트/build/E2E는 실행하지 않았다. 기능과 배포 상태 변경은 없다. 이 README 요청의 미완료 사항은 없으며 Vercel 연결과 실제 배포는 기존 후속 작업으로 남아 있다.


## 81. 배포 전 필수 작업 확인 (2026-11-13 KST)

- 배포 전 잔여 작업 질문에 따라 로컬 연결 상태와 운영 설정 형식을 다시 확인했다. Vercel 프로젝트 연결 정보와 Git 저장소는 여전히 없다. Git 연동은 배포 경로 선택 사항이며 필수 준비로 단정하지 않는다.
- Node 24의 `check:deployment -- --collector`에서 Supabase 저장소/실데이터/DB 읽기 설정/20곳과 5분 설정은 통과했다. 운영 HTTPS 주소, 운영 수집 설정, 수집 인증은 미준비여서 전체 종료 1이다. 서울시 요청과 DB 쓰기는 0이다.
- 배포 전 필수 작업은 Vercel 프로젝트 연결, 운영 환경 변수와 인증 준비, 배포 후보 최종 검수다. 실제 배포 후에는 호스팅에서 원천 연결/수집 성공을 확인하고 Supabase 5분 예약 연결, 두 주기 저장 및 PC 수집 전환을 검증해야 한다. 앱 테스트/build/브라우저 검사는 이번 상태 확인에서 재실행하지 않았다. 앱 코드, 원격 서비스와 예약 설정은 변경하지 않았다.


## 82. GitHub 최초 업로드 준비와 검증 (2026-11-13 KST)

- 사용자가 `https://github.com/ddoniddoni/seoul-dashboard.git`를 지정하고 진행을 요청했다. 직전 안내의 Git 초기화/첫 커밋/원격 업로드를 승인한 것으로 해석했다. GitHub에서 지정 저장소가 비어 있는 공개 저장소이며 계정에 ADMIN 권한이 있음을 확인했다. 가시성이나 다른 저장소 설정은 변경하지 않는다.
- `chore/initial-import`로 로컬 Git을 초기화하고 지정 원격을 origin으로 연결했다. 첫 커밋은 이 작업 브랜치에서 만들며 빈 원격의 main/develop을 같은 커밋으로 시작하도록 게시한다. 기존 원격 이력은 없으며 강제 push, PR/merge, Vercel 배포와 원격 수집 활성화는 이번 작업에 포함하지 않는다. develop 게시 후 로컬도 develop으로 맞춘다.
- `.gitignore`에 로컬 `.codex/`, `.agents/`, `.aws/`를 추가했다. 기존 환경 파일, 로컬 수집본, 의존성/빌드/검사 산출물 제외를 유지했다. `git add .` 대신 소스/문서/설정의 대상 경로를 명시해 최초 업로드 182개 파일을 스테이징했다. `.env.example`만 예시 설정으로 포함한다.
- 지정 Node 24.21.0에서 lint/typecheck/build 모두 종료 0, 단위 테스트 **18개 파일 / 107개 통과**. PGlite에서 실제 migration SQL과 pgTAP **4개 파일 / 22개 검증 통과**, 이전 24시간 기준의 예상 실패도 다시 확인했다. 원천 요청이나 원격 DB 쓰기는 실행하지 않았다.
- React Doctor 0.9.22의 full 검사에서 오류 0, 경고 19를 확인했다. 외부 점수/telemetry/공급망 조회는 비활성화했다. 원본은 `/private/tmp/seoul-github-import-doctor.json`에 보관하며 Git에 포함하지 않는다. 기존 경고를 모두 해소한 것으로 표시하지 않는다.
- 업로드 후보 182개 파일과 ZIP/XLSX 내부 17개 항목에서 현재 설정된 비밀값 3개와 대표적인 토큰/개인키 형식을 검사해 일치 0건을 확인했다. 값 자체는 출력하거나 임시 파일에 저장하지 않았다. 환경 파일/수집본 등 제외 대상도 목록에 없었다. 커밋 직전에 실제 Git 인덱스 내용을 같은 방식으로 다시 검사한다.
- 기본 `git diff --cached --check`는 기존 Markdown의 의도된 두 칸 줄바꿈과 소스 한 파일의 끝 빈 줄을 보고했다. 이번 업로드에서 관련 없는 문서/코드 서식 변경은 하지 않았다. 앱 동작 변경은 없으며 브라우저 E2E와 실제 Vercel 실행 검증은 이번 Git 업로드에서 재실행하지 않았다.
- 다음 작업은 GitHub 업로드 결과를 원격 커밋과 대조하고 Vercel에서 저장소를 Import한 뒤 환경 변수와 실제 수집 연결을 검증하는 것이다. GitHub 게시 자체는 웹 배포 완료를 뜻하지 않는다.
