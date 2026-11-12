# 03. 데이터, API와 저장 명세

> 2026-11-12 Supabase 연결: 사용자 지정 공유 프로젝트에 `sp_` 테이블 7개와 관련 함수를 생성하고, 기존 PC의 20곳/5분 수집을 DB 저장으로 전환했다. 이후 같은 날 DB 보존을 48시간으로 늘리고 매시 23분 정리 Cron을 활성화했다. 화면은 최근 24시간을 조회하며 원격 수집 Cron과 배포는 아직 설정하지 않았다. 아래 이전 일자의 메모는 당시 상태이고 현재 운영 기준은 [Supabase 운영 문서](../supabase/README.md)와 PROGRESS.md 76~77절을 따른다.
> 2026-11-10 수집 주기 변경: 서울시 [공식 안내](https://data.seoul.go.kr/dataVisual/seoul/guide.do)의 인구 5분 갱신 주기에 맞춰 기본 수집을 5분으로 변경했다. 현황/비교 이력의 화면 재확인은 1분이며, 공개 조회는 저장소만 읽는다. 같은 원천 시각의 관측은 중복 저장하지 않는다. 사용자의 실행 의사 재확인 후 2026-11-10 01:01:49 KST에 로컬 5분 수집을 재개했다. 첫 배치는 20곳 모두 성공했으며 운영 DB와 Cron은 여전히 미활성이다.

> 모니터링 범위 변경 (2026-11-10): 기본 화면, 데모, DB 조회와 수집 대상을 `src/lib/domain/catalog.ts`의 `monitoredAreaCatalog` 20곳으로 통일했다. 기존 5곳에 동대문 관광특구, 잠실 관광특구, 경복궁, 광화문·덕수궁, 건대입구역, 서울역, 용산역, 합정역, 혜화역, 광장(전통)시장, 연남동, DDP(동대문디자인플라자), 남산공원, 서울숲공원, 여의도한강공원을 추가했다. 공식 이름, 코드와 분류는 기존 전체 카탈로그에서 가져왔다. 아래 5곳/121곳 수집 기록은 당시의 범위이며 현재 기본값과 구분한다. 장소 영역은 겹칠 수 있으므로 인구를 합산하지 않는다.
>
> 신규 DB 마이그레이션은 20곳 카탈로그와 최대 40회 요청/6,000회 일일 예산 계약을 준비하며 추가 장소는 수집 비활성으로 삽입한다. 수집 RPC는 마지막 시도가 오래된 장소부터 처리해 작업 기한 때문에 같은 장소가 계속 누락되는 것을 줄인다. 원격 적용과 수집 재시작은 이번 변경에 포함되지 않았다.


기준: v1.0.0 / 2026-10-14  
**외부 데이터 사실, 프로젝트 설계값, 아직 검증하지 않은 항목을 구분한다.** 이 문서의 타입과 DB는 SEOUL PULSE의 내부 계약이며 서울시 응답을 그대로 복제한 것이 아니다.

> M0 확인 업데이트 (2026-10-14): 공식 121장소 목록과 영역 원본을 확보하고 초기 5곳을 확정했다. 사용자 승인으로 강남역을 실제 키로 1회 HTTP 조회해 성공 envelope와 인구/날씨 핵심 필드를 확인했다. [M0 확인 기록](M0_VERIFICATION.md)과 [카탈로그](initial-area-catalog.json)를 참고한다. 실패 응답, 다른 장소의 응답 변형, 키 허용량, HTTPS와 배포 환경 연결은 미검증이다. 이번 로컬 1회 HTTP 승인은 공개 운영이나 예약 수집 승인이 아니다.

> 후속 실데이터 연결 (2026-10-15): 사용자 승인으로 초기 5개 장소를 각 1회 HTTP 조회했다. 인구와 기온/습도 정규화 및 로컬 화면 연결은 성공했고 원천 기준/수집 시각을 구분한다. 인구 이력은 장소별 실제 1개만 보유한다. 이번 승인은 이 5회로 소진했으며 정기 수집/운영 HTTP 승인이 아니다. DB와 오류/누락 응답의 외부 검증은 여전히 대기다. 세부 결과는 PROGRESS.md 20절을 따른다.

> 전체 장소 확장 (2026-10-15): 공식 XLSX와 서울시 홈페이지의 전체 목록 121곳을 이름/분류로 대조하고 코드, 공개 표시 좌표와 영역을 연결했다. [전체 카탈로그](area-catalog.json)는 정기 수집 활성 목록과 구분한다. 자동 승인 검토 차단 후 사용자가 이번 121곳 단일 평문 HTTP 전송을 명시 승인해 정확히 121회 조회했다. 인구/혼잡도 121곳과 날씨 119곳이 유효하고 가산디지털단지역/서울대공원은 날씨 미제공이다. 수집 완료 08:58:31, 인구 원천 기준 08:25~08:30, 날씨 08:50 한국 시간 해석이며 기존 5곳의 기록을 보존해 실제 관측은 총 126개다. 전송 승인은 소진했고 자동수집/전역 HTTP는 false, 데모/미활성 운영 DB 범위는 초기 5곳을 유지한다. 시간대의 공식 근거와 PM25 단위/오류 계약 검증은 별도로 남는다.

> 정기 수집 준비 (2026-10-16): 개발용 local-snapshot에 공식 전체 121곳을 기본 10분 또는 선택 30분마다 수집하는 별도 명시 실행 명령을 추가했다. 초기 3분 요청 이후 사용자의 포트폴리오 용도/주기 검토에 맞춰 변경했다. 일일 요청 예산은 10분 17,424회, 30분 5,808회이며 배치 기한 150초, 자동 재시도 없음, 동일 원천 시각 중복 방지와 인증/요청 제한 일시 중지를 적용한다. 기존 DB 수집은 미활성 10분/5곳 범위로 유지한다. 실제 시작과 반복 HTTP 전송 승인 상태는 PROGRESS.md의 최신 기록을 따른다.

## 1. 확인된 외부 조건

| 항목 | 공개 자료에서 확인한 내용 | 출처 |
| --- | --- | --- |
| 비용 | 데이터 이용 비용은 무료로 표기 | S02 |
| 이용허락 | 출처를 표시하는 공공누리 제1유형으로 표기 | S01 |
| 제공 범위 | 서울시 데이터셋은 주요 121개 장소를 안내 | S01 |
| 호출 단위 | 한 번에 1개 장소, 장소명 또는 코드로 조회 | S01 |
| 통합 데이터 | 통합 API는 XML 형식으로 안내 | S01 |
| 인구 전용 | 인구 전용 API는 JSON 반환도 가능 | S03, 14쪽 |
| 갱신 | 항목별로 다르며 매뉴얼은 최소 5분부터 안내 | S03, 12쪽 |
| 원천 지연 | 매뉴얼은 인구 가공과 제공 사이 지연도 설명 | S03, 16쪽 |
| 과거 데이터 | 데이터셋 FAQ에서 과거 자료 별도 제공 불가 안내 | S01 |
| 인구 해석 | 통신 신호 기반 추정치로 현장 인원과 다를 수 있음 | S04 |

공공데이터포털의 연결 설명에는 과거 장소 수가 남아 있다. 초기 카탈로그는 더 최신인 서울시 데이터셋의 첨부 목록을 기준으로 하되, 코드/명칭은 파일을 실제로 확인한 뒤 확정한다. 화면에 제공 장소 수를 상수로 박아 두지 않는다.

위 표의 기존 정보는 2026-10-14 공개 페이지 기준이다. 2026-10-15 후속 확인에서 [서울시 공식 OpenAPI 안내 영상의 문자 지원](https://tv.seoul.go.kr/v/df1e47ef629d4ae09966817924f58f3d)(2023-08-30 게시)은 일반 인증키의 호출 횟수/서비스별 제한이 없다고 설명함을 확인했다. citydata의 openapi.seoul.go.kr 호스트는 일반 인증키 계열과 일치한다. 현재 [이용 안내](https://data.seoul.go.kr/together/guide/useGuide.do)와 FAQ가 명시하는 일일 1,000회 제한은 실시간 지하철 전용 키이며, 한 번에 1,000건은 데이터 행 수 제한이다. 프로젝트의 일일 예산 1,000회는 이와 별개의 자체 안전 상한이다. [확인 기록](sources/seoul-api-limits-20261015.json)을 참고한다. 개별 계정의 키 관리 화면과 초당/동시 요청 수치, 운영 승인 조건과 HTTPS 지원은 미확인이다. 공개 일반 정책의 횟수 제한 없음과 특정 키 상태/무제한 동시 처리 보장을 구분한다.

## 2. M0 검증 게이트

| ID | 검증 | 통과 조건 |
| --- | --- | --- |
| API-01 | 인증키와 서비스 접근 | 로컬 비밀 설정으로 1곳 조회 성공, 비밀 로그 없음 |
| API-02 | 실제 응답 구조 | 성공/실패 envelope, 반복 태그와 필드 경로 기록 |
| API-03 | 장소 카탈로그 | 후보 5곳의 공식 코드, 이름, 분류 확정 |
| API-04 | 지도 자료 | 공식 영역 파일의 형식, 좌표계, 코드 연결 확인 |
| API-05 | 실제 값과 시각 | 범위, 혼잡 enum, 인구와 날씨 시각 확인 |
| API-06 | 사용량 | 키의 허용량과 제한 단위 확인, 수집 예산 결정 |
| API-07 | 전송 | 실제 서버의 host/port 접근, TLS 지원 여부 확인 |
| API-08 | 실행 한계 | XML 크기, 응답 시간, 파싱 시간 측정 |

M0에서 확인하지 못한 항목은 `PROGRESS.md`에 미확인으로 남긴다. 검증되지 않은 장소 코드를 `POI001` 등의 임의 값으로 채우지 않는다. 외부 API 실패가 데모 UI 개발을 모두 막지는 않지만, 실데이터 단계 통과로 처리할 수는 없다.

## 3. 원천 호출과 파싱

### 요청 형식

다음은 구현 시작 시 최신 API 상세 명세와 대조할 호출 형식이다. 인증키를 실제 문자열로 문서에 넣지 않는다.

```text
GET http://openapi.seoul.go.kr:8088/{SEOUL_API_KEY}/xml/citydata/1/5/{AREA_NAME_OR_CODE}
```

`1/5`는 요청 위치 인자이며 5개 장소를 한 번에 받는 뜻이 아니다. URL 마지막 요소는 검증된 코드 사용을 우선한다. 이름으로 요청할 때는 정확한 공식 문자열에 `encodeURIComponent`를 적용한다.

통합 XML과 인구 전용 JSON을 같은 서비스명/파서로 혼용하지 않는다. 현재 기본은 통합 XML이다. M0 측정에서 응답이 지나치게 크고 인구만 필요한 경우, 범위를 줄여 인구 전용 adapter로 전환할 수 있으나 먼저 내부 계약과 변경 이유를 기록한다.

HTTP 예시는 TLS 지원을 확인했다는 뜻이 아니다. 서버 경유는 브라우저에 키를 숨기는 방법이지 원천까지의 통신을 암호화하는 방법이 아니다. 운영 승인 절차는 04 문서를 따른다.

2026-10-14 로컬 조사에서는 HTTP 8088의 공개 `sample` 요청이 성공했으나, 요청한 `POI014` 대신 기본 장소 `POI009`를 반환했다. 샘플 성공만으로 장소 코드 지원이나 사용자 인증키 동작을 판정하지 않는다. 이어 승인된 실제 키 1회 요청에서는 `AREA_CD=POI014`, `AREA_NM=강남역`과 `INFO-000`을 확인했다. HTTPS 8088은 `ERR_SSL_WRONG_VERSION_NUMBER`, HTTPS 443은 8초 timeout이었다. 이 결과는 해당 로컬 환경에서 HTTPS를 확인하지 못했다는 의미이며 모든 HTTPS 경로의 미지원을 단정하지 않는다.

### 실응답에서 확인한 구조

아래 경로는 강남역 성공 응답 1개에서 확인했다. 전체 장소나 실패 envelope로 일반화하지 않는다. 키와 호출 URL을 제외한 [실응답 축약본](sources/citydata-POI014-20261014.excerpt.xml)과 [수신 메타정보](sources/citydata-POI014-20261014.meta.json)를 보관한다. 축약본에는 예측 배열과 인구/날씨 외 section이 없으며, 파서의 전체 응답 fixture를 대체하지 않는다.

| 의미 | 확인한 XML 경로 |
| --- | --- |
| root | `SeoulRtd.citydata` |
| 성공 코드 | `SeoulRtd.citydata/RESULT/RESULT.CODE` |
| 결과 설명 | `SeoulRtd.citydata/RESULT/RESULT.MESSAGE` |
| 장소 식별 | `SeoulRtd.citydata/CITYDATA/AREA_CD`, `AREA_NM` |
| 인구 값 | `SeoulRtd.citydata/CITYDATA/LIVE_PPLTN_STTS/LIVE_PPLTN_STTS/` 아래 혼잡도, 상하한과 `PPLTN_TIME` |
| 현재 날씨 값 | `SeoulRtd.citydata/CITYDATA/WEATHER_STTS/WEATHER_STTS/` 아래 `TEMP`, `HUMIDITY`, `PM25`, `WEATHER_TIME` |
| 인구 예측 | 인구 블록의 `FCST_PPLTN/FCST_PPLTN` 반복 12개 |
| 날씨 예측 | 날씨 블록의 `FCST24HOURS/FCST24HOURS` 반복 24개 |

`RESULT.CODE`와 `RESULT.MESSAGE`는 점을 포함한 실제 태그 이름이다. 매뉴얼의 `resultCode`/`resultMsg` 표기와 달랐으므로 이 성공 응답에서는 실제 태그를 기준으로 한다. 같은 이름의 인구/날씨 wrapper를 한 겹만 읽거나 예측 배열의 `TEMP`를 현재 기온으로 선택하면 잘못된 매핑이 된다.

수신 시각은 `2026-10-14T08:10:31.201Z`이고, 인구 기준 문자열은 `2026-10-14 16:40`, 날씨는 `2026-10-14 16:50`이었다. 원천 문자열에는 offset이 없으므로 시간대의 공식 근거와 변환은 adapter 단계에서 확인한다. 이번 한 응답의 전송 크기는 182,111 bytes, 본문 수신까지 약 166ms였다. 향후 Node XML parser나 호스팅 성능을 측정한 값은 아니다.

### 최소 매핑

아래 대표 필드는 강남역 성공 응답에서 확인했으나, **다른 장소의 필수 여부, 결측과 오류 응답의 반복 구조는 adapter 단계에서 추가 검증한다.** 데이터가 없는 항목을 지원한다고 가정하지 않는다. 근거: S01, S03과 위 실응답 축약본.

| 원천 필드 | 내부 의미 | 처리 |
| --- | --- | --- |
| `AREA_NM` | 공식 장소명 | 카탈로그와 대조 |
| `AREA_CD` | 공식 장소 코드 | 요청한 코드와 일치 검사 |
| `AREA_CONGEST_LVL` | 인구 혼잡 단계 | 내부 enum에 매핑 |
| `AREA_CONGEST_MSG` | 원천 설명 | 텍스트로만 렌더링 |
| `AREA_PPLTN_MIN` | 추정 인구 하한 | 유효한 비음수 숫자 |
| `AREA_PPLTN_MAX` | 추정 인구 상한 | 하한 이상 |
| `PPLTN_TIME` | 인구 기준 시각 | 시간대 명시 후 ISO 변환 |
| `TEMP` | 기온 후보 | 음수도 유효할 수 있음 |
| `HUMIDITY` | 습도 후보 | 의미와 단위 확인 후 매핑 |
| `PM25` | 초미세먼지 후보 | 농도와 단위 확인 후 매핑 |
| `WEATHER_TIME` | 기상 기준 시각 후보 | 없으면 임의로 인구 시각 사용 금지 |

`LIVE_PPLTN_STTS`, `WEATHER_STTS` 등의 블록은 없거나 단일 객체/반복 목록으로 파싱될 수 있다. 성공 코드도 HTTP 상태만 보지 않고 XML 안에서 확인한다. 공식 예시의 `INFO-000`을 성공 기준으로 대조한다. `RESULT.CODE`처럼 점이 있는 태그는 파서가 만든 실제 문자열 키로 접근해야 하며 객체 경로로 임의 해석하지 않는다.

### 파싱 순서

```text
HTTP 상태 검사
→ 응답 본문 바이트 제한
→ HTML 오류 페이지, DOCTYPE와 ENTITY 선언 거부
→ XML 구문 검사와 파싱
→ 허용한 envelope와 결과 코드 검사
→ 공식 장소 식별자 대조
→ 반복 블록을 배열로 정규화
→ 문자열/숫자/시각을 항목별 변환
→ Zod 도메인 검증
→ 유효한 영역만 저장 가능한 모델로 반환
```

초기 XML 제한은 응답당 8 MiB로 설정하고 실측으로 조정한다. Content-Length가 없더라도 스트림의 누적 바이트로 제한한다. HTML 문서가 200 상태로 반환되어도 정상 처리하지 않는다.

파서의 자동 숫자 변환은 끄고, 필드별로 변환한다. 빈 문자열, 공백, 알려진 결측 기호를 먼저 `null`로 바꾼다. `Number('')`가 `0`이 되는 동작을 데이터 정제에 사용하지 않는다. 쉼표가 포함된 수치는 정상 숫자 형식을 검증한 후 변환한다.

XML 엔티티 확장은 비활성화하고 구조 깊이/반복 개수에 상한을 둔다. 파서의 안전 옵션은 설치한 버전의 공식 문서와 보안 공지를 확인한다. 근거: S17.

알 수 없는 혼잡 문자열은 `unknown`으로 보존하고 제한된 issue 코드만 기록한다. 원본 진단 문자열에는 비밀/URL이 섞일 수 있으므로 출력하지 않는다. API 설명은 HTML로 삽입하지 않는다. 반대로 `unknown`을 `relaxed`로 대체하지 않는다.

### M2 구현과 확인 한계 (2026-10-14)

현재 adapter는 이전 강남역 전체 응답을 [실제 정상 fixture](../tests/fixtures/seoul/citydata-POI014-20261014.real.xml)로 재사용한다. 원본 checksum과 수신 시각은 [fixture 메타정보](../tests/fixtures/seoul/citydata-POI014-20261014.real.meta.json)에 있다. 새 원천 요청은 수행하지 않았다. [오류 fixture](../tests/fixtures/seoul/auth-error.synthetic.xml)는 합성 입력이며 실제 실패 envelope 검증 근거가 아니다.

| 항목 | 구현한 정책과 근거 |
| --- | --- |
| 성공 | `SeoulRtd.citydata/RESULT/RESULT.CODE=INFO-000`과 단일 CITYDATA 필수. 코드/공식 이름과 인구 내부 식별자를 대조 |
| 오류 | 공식 API 화면의 INFO-100/INFO-200/ERROR-500/600/601 코드표로 분류. root RESULT/CODE와 성공 envelope 내 오류를 방어적으로 지원하지만 실응답 형태는 미검증 |
| 숫자 | 자동 변환 중지. 빈 문자열/공백/`-`/`N/A`는 결측, 명시적 0은 유지. 정수 범위/음수 인구/천 단위 쉼표/유한 소수 검증 |
| 현재 블록 | 같은 이름의 wrapper와 단일/반복 블록을 처리. 현재 블록 16개 상한. 같은 정규화 값의 중복만 허용하고 충돌은 해당 section invalid |
| 예측 | FCST_PPLTN/FCST24HOURS는 읽지 않으며 현재 값이나 과거 이력으로 변환하지 않음 |
| 시각 | 명시적 `Asia/Seoul` 기준으로만 ISO 변환. 달력/자정/초/수신 시각보다 5분 넘는 미래 검사. 누락 시각은 invalid, 공식 시간대 근거 미확인 |
| 날씨 | 공식 API 화면의 TEMP/HUMIDITY 설명과 공식 weather.js의 ℃/% 표시를 대조해 연결. 단위 확인 근거는 아래 링크 |
| PM25 | 공식 weather.js에 ㎍/㎡와 ㎍/㎥가 혼용되어 농도 DTO 연결 보류. 값은 null, `pm25-unit-unconfirmed`를 반환 |
| 부분 성공 | 인구와 날씨 독립 검증. 날씨의 잘못된 필드만 null, 유효 필드와 날씨 기준 시각은 유지. 전체 section 무효/미제공은 값/관측/유효 수신 시각 null |
| 보안 | 8초, 8 MiB, XML 깊이 32, 태그 50,000, redirect 거부. DOCTYPE/ENTITY 선언 선차단, processEntities=false, 자동 숫자 변환 중지. 원본 오류/URL/cause 미보관 |

공식 필드/결과 코드 출처는 [서울시 API 상세 화면](https://data.seoul.go.kr/dataList/OA-21285/A/1/datasetView.do)이며 [읽은 필드 행](sources/seoul-api-field-descriptions-20261014.json)을 보관했다. 기온/습도와 PM25 충돌은 [공식 weather.js](https://data.seoul.go.kr/SeoulRtd/js/domain/weather.js), [관련 줄과 단위 확인 기록](sources/seoul-weather-units-20261014.json)을 따른다. 공식 매뉴얼 44쪽은 날씨 원본 출처를 설명하지만 이번 열람에서 시간대/각 필드 단위를 확정하는 문구는 찾지 못했다.

fast-xml-parser는 5.11.2로 고정했다. [공식 보안 공지 GHSA-8r6m-32jq-jx6q](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-8r6m-32jq-jx6q)의 DOCTYPE 제한 우회 수정 버전 5.10.1 이후이며, 선언 선차단과 엔티티 처리 중지를 함께 적용했다. 설치한 타입/옵션 소스에서 maxNestedTags와 processEntities를 확인했다. 이를 parser 동작 테스트 통과로 보고하지 않는다.

CLI와 설정 계약은 [README의 M2 안내](../README.md#m2-api-adapter)를 따른다. 공개 route/화면은 이 adapter를 호출하지 않는다. M3의 기본 live 읽기는 저장된 DB 자료만 사용하며 2026-11-12 Supabase DB 연결을 확인했다. 2026-10-15 개발용 local-snapshot backend를 추가해 명시적인 단일 API 수집본도 읽도록 준비했다. 실제 호출과 전송 승인/검증 상태는 PROGRESS.md의 최신 기록을 따른다. 동작 계약 테스트, 실제 실패/다른 장소, 공식 시간대/PM25, 호출 한도와 배포 환경은 검증 대기로 남긴다.

## 4. 내부 데이터 계약

### 공통 타입

```ts
type Dataset = 'live' | 'demo';
type Congestion = 'relaxed' | 'normal' | 'slightly-busy' | 'busy' | 'unknown';
type Freshness = 'fresh' | 'stale' | 'expired' | 'missing';
type SectionResult = 'valid' | 'not-provided' | 'invalid' | 'fetch-failed';

type PopulationValue = {
  min: number;
  max: number;
  midpoint: number; // 내부 계산값, 공식 확정 인원 아님
  congestion: Congestion;
  message: string | null;
};

type MetricSection<T> = {
  value: T | null;
  observedAt: string | null; // 원천 기준 시각, timezone을 가진 ISO 8601
  fetchedAt: string | null;  // 이 유효 자료를 마지막으로 수신한 시각
  freshness: Freshness;     // 조회 시 계산하는 값
  lastResult: SectionResult;
};

type WeatherValue = {
  temperatureC: number | null;
  humidityPct: number | null;
  pm25MicrogramsPerM3: number | null;
};

type AreaLatest = {
  areaCode: string;
  areaName: string;
  category: string; // 공식 카탈로그 분류, 관측값 아님
  population: MetricSection<PopulationValue>;
  weather: MetricSection<WeatherValue>;
  lastAttemptAt: string | null;
};
```

M1의 계약은 `src/lib/contracts/dashboard.ts`에서 Zod로 구현했다. 유효한 인구 자료는 비음수 정수의 상하한과 일치하는 범위 중앙값을 요구하고, 자료가 없거나 범위가 유효하지 않으면 section의 `value=null`로 표현한다. 최소/최대 중 하나만 유효한 경우 중앙값을 계산하지 않는다. 날씨의 개별 결측은 각 필드의 null로 보존한다. 유효 자료에는 기준 시각과 수집 시각이 모두 필요하며 dataset/source 조합도 검증한다. M2 adapter와 M3 SQL CHECK/RPC에도 이 계약을 적용했다. 실제 DB 통합 검사는 미실행이다.

### 혼잡 단계

프로젝트 표시는 `relaxed=여유`, `normal=보통`, `slightly-busy=약간 붐빔`, `busy=붐빔`, `unknown=확인 불가`다. 원천에서 실제로 쓰는 문자열은 M0에 대조한다.

단계는 순서를 가진 범주다. 숫자로 치환해서 평균 2.6 같은 "평균 혼잡도"를 만들지 않는다. 다른 장소의 같은 단계가 동일한 인구 수나 동일한 안전 상태라는 뜻도 아니다.

### 시각과 최신성

원천 문자열에 시간대가 없으면 M0에서 서울 데이터의 시간 기준을 확인한 후 Asia/Seoul로 명시해서 변환한다. 브라우저나 서버의 기본 지역 설정으로 날짜를 파싱하지 않는다. 저장은 `timestamptz`, API는 UTC ISO, 화면과 CSV 설명은 한국 시간 기준이다.

| 자료 | fresh | stale | expired |
| --- | --- | --- | --- |
| 인구 | 원천 기준 30분 이내 | 30분 초과~60분 | 60분 초과 |
| 날씨 | 원천 기준 120분 이내 | 120분 초과~240분 | 240분 초과 |

이는 원천 제공 SLA가 아니라 **프로젝트의 초기 상태 분류 정책**이다. M0 관측 후 조정하고 정책 버전을 남긴다. 기준 시각이 없거나 유효 자료가 없으면 `missing`이다. 미래로 5분 이상 벗어난 관측 시각은 검증 오류로 처리한다.

`freshness`를 DB에 고정 저장하지 않는다. 응답 시점과 원천 시각으로 계산하고 클라이언트도 시간이 지나면 표시를 다시 계산한다. 수집에 성공했더라도 원천 시각이 같으면 자료 나이를 초기화하지 않는다.

수집 오류와 자료 최신성은 독립적이다. 새 호출에 실패해도 직전 자료가 fresh일 수 있고, 호출이 성공해도 오래된 원천 자료라 stale일 수 있다.

2026-11-11 로컬 운영 확인에서는 13:58 수신한 20곳 인구의 기준 시각이 13:30, 다음 14:03 수신분의 기준 시각이 13:35였다. 두 배치 모두 수신 당시 약 28분의 차이가 있었으며, 다음 5분 수집 전에는 원천 기준 30분을 넘어 함께 stale로 전환됐다. 이는 확인한 응답의 시각 차이이며 서울시의 고정 지연 보장으로 일반화하지 않는다. 자료 상태 표는 마지막 유효 인구 수신 시각, 최근 시도 시각과 결과, 원천 최신성을 각각 표시한다. 기존 30분/60분 판정과 원천 시각은 변경하지 않는다.

## 5. 공개 API 계약

`dataset`은 공개 API에서 `live`만 허용한다. 이전 `/api/v1/demo/*`는 404이며 시연 상태 옵션은 지원하지 않는다. 합성 DTO 예시는 내부 fixture 계약 기록이다. 원천 API를 직접 호출하는 공개 endpoint는 만들지 않는다.

| 메서드와 경로 | 용도와 제한 |
| --- | --- |
| `GET /api/v1/{dataset}/areas` | 공개 카탈로그, 수집 여부와 지도 가능 여부 |
| `GET /api/v1/{dataset}/overview` | 공개 대상 장소 최신 요약, KPI용 coverage |
| `GET /api/v1/{dataset}/areas/{areaCode}` | 해당 장소 최신 상태, 미등록 코드는 404 |
| `GET /api/v1/{dataset}/history` | `places`, `range`를 받음. 최대 3곳, 24h/7d |
| `GET /api/v1/{dataset}/status` | 안전하게 축약한 수집 현황, 비공개 로그 제외 |
| `GET /api/v1/{dataset}/export` | 같은 조건의 인구 원시 관측 CSV, 최대 7일 |
| `POST /api/internal/collect` | 서버 비밀 토큰 필요, 사용자가 장소/URL 지정 불가 |

기간은 서버가 한 번 확정한 `from`과 `to`를 모든 장소에 동일하게 적용한다. 조회 구간은 `[from, to)`다. 응답에 실제 구간과 해상도를 반환한다. 공개 history의 해상도는 최근 24시간에 5분이다. 7일 조회는 제공하지 않는다. 내부 합성 fixture와 이전 응답의 10분 해상도도 DTO에서 읽을 수 있다.

M3 구현 범위는 areas/overview/장소 상세/history/status와 보호된 collect다. history는 현재 24h만 허용하고 7d/export는 M4에 남겼다. live의 coverage.monitored는 공개 대상 수이며 화면에 "공개 대상 장소"로 표시한다. `collectionEnabled`는 별도 상태다. status는 최신 자료의 시각/최신성/마지막 결과만 공개하고 실행 로그/예산/lease/비밀을 반환하지 않는다.

### 응답 envelope 예시

아래 숫자와 코드는 구조 설명을 위한 **합성 예시**다. 실제 관측값이 아니다.

```json
{
  "meta": {
    "schemaVersion": 1,
    "dataset": "demo",
    "generatedAt": "2026-10-14T05:50:00Z",
    "displayTimeZone": "Asia/Seoul",
    "source": "synthetic-demo",
    "coverage": {
      "monitored": 1,
      "fresh": 1,
      "stale": 0,
      "expired": 0,
      "missing": 0
    }
  },
  "data": {
    "items": [
      {
        "areaCode": "DEMO_GANGNAM",
        "areaName": "강남권 시연 장소",
        "category": "시연용 분류",
        "population": {
          "value": {
            "min": 12000,
            "max": 14000,
            "midpoint": 13000,
            "congestion": "normal",
            "message": "시연용으로 생성한 설명입니다."
          },
          "observedAt": "2026-10-14T05:40:00Z",
          "fetchedAt": "2026-10-14T05:43:00Z",
          "freshness": "fresh",
          "lastResult": "valid"
        },
        "weather": {
          "value": null,
          "observedAt": null,
          "fetchedAt": null,
          "freshness": "missing",
          "lastResult": "not-provided"
        },
        "lastAttemptAt": "2026-10-14T05:43:00Z"
      }
    ]
  }
}
```

실데이터에는 `source=seoul-citydata`를 쓰고 공개해도 되는 최근 수집 시도 시각과 가용 기간을 필요한 응답에 추가한다. `generatedAt`은 우리 서버의 응답 생성 시각이지 원천의 갱신 시각이 아니다.

공개 `/status`는 읽기 전용 Repository가 공개 최신값의 시각과 coverage에서 도출한다. 장소별 최근 시도와 데이터 상태만 제공하며, private 실행 로그를 읽기 위해 관리자 클라이언트를 사용하지 않는다. 배치 실행 성공 여부와 상세 오류는 운영자용 로그에서만 확인한다.

### 오류와 부분 성공

오류 구조는 `error.code`, `error.message`, `error.retryable`, `requestId`로 고정한다. 원천 XML, 인증키와 DB 오류 전문을 공개 응답에 포함하지 않는다.

| HTTP | 내부 코드 | 의미 |
| --- | --- | --- |
| 400 | `INVALID_QUERY` | 잘못된 기간, 데이터셋, 너무 많은 비교 장소 |
| 404 | `AREA_NOT_FOUND` | 등록되지 않은 장소 |
| 401 | `UNAUTHORIZED_COLLECTOR` | 내부 수집 인증 실패 |
| 429 | `RATE_LIMITED` | 자체 조회/내보내기 제한 |
| 503 | `LIVE_UNAVAILABLE` | 실제 데이터 모드 미설정 또는 DB 조회 불가 |
| 500 | `INTERNAL_ERROR` | 안전하게 축약한 내부 오류 |

장소 일부만 지연되어도 overview 요청 전체를 500으로 만들지 않는다. 읽을 수 있는 장소를 반환하고 coverage와 항목별 상태로 설명한다. live DB가 비어 있으면 정상적인 빈 상태이며, DB 접속 자체가 실패한 경우와 구분한다.

## 6. DB 모델

2026-11-12부터 모든 앱 테이블과 함수에 `sp_`를 사용한다. 내부 스키마는 `sp_private`다. 현재 실행 대상과 적용 내역은 [DB 운영 문서](../supabase/README.md)를 따른다.

### 공개 읽기 테이블

| 테이블 | 주요 필드 | 제약과 인덱스 |
| --- | --- | --- |
| `public.sp_areas` | `code text`, `official_name text`, `display_name text`, `category text`, `collection_enabled bool`, `geometry_available bool`, `is_public bool`, `catalog_version text` | code PK, 공식 카탈로그 기반. 초기 collection_enabled=false |
| `public.sp_area_latest` | `area_code text`, `population jsonb`, `weather jsonb`, `last_attempt_at timestamptz`, `updated_at timestamptz` | area_code PK/FK, JSON은 내부 정규화 형식만 |
| `public.sp_population_observations` | `area_code text`, `observed_at timestamptz`, `ppl_min bigint`, `ppl_max bigint`, `congestion text`, `first_fetched_at timestamptz`, `last_fetched_at timestamptz`, `payload_hash text`, `revision int` | `(area_code, observed_at)` PK, 숫자와 enum CHECK |

`sp_area_latest`의 JSON에는 원천 XML이나 거대한 원천 배열을 넣지 않는다. section의 `freshness`는 저장하지 않고 읽을 때 만든다. 해석 가능한 `observedAt`, `fetchedAt`, `lastResult`와 정규화 값만 보관한다.

이력에는 유효한 인구 범위와 원천 기준 시각이 있는 자료만 넣는다. 인구 외 항목의 과거 기록은 MVP에서 저장하지 않는다. 원시 XML의 무기한 축적도 하지 않는다.

`sp_population_observations`의 CHECK는 `ppl_min >= 0`, `ppl_max >= ppl_min`, `revision >= 1`, 허용 congestion 값이다. 기간 정리를 위한 `observed_at` 인덱스도 추가한다. 중앙값은 읽을 때 계산하여 중복 컬럼 간 불일치를 방지한다.

### 비공개 운영 테이블

| 테이블 | 주요 필드 | 목적 |
| --- | --- | --- |
| `sp_private.sp_collection_runs` | `id uuid`, `job_name`, `bucket_start`, `status`, 시작/종료 시각, 성공/실패 수, 요청 수, 요약 오류 코드 | `(job_name, bucket_start)` UNIQUE로 중복 슬롯 실행 차단 |
| `sp_private.sp_collection_leases` | `job_name PK`, `lease_token uuid`, `run_id uuid`, `expires_at timestamptz` | 인스턴스 간 동시 실행 방지 |
| `sp_private.sp_provider_budgets` | `provider`, `budget_window_start`, `daily_limit`, `attempt_count`, `circuit_open_until`, `last_error_code` | 일일 요청 예산과 원천 장애 보호 |
| `sp_private.sp_provider_attempts` | `run_id`, `area_code`, `attempt_no`, `reserved_at` | PK(run_id,area_code,attempt_no). 재시도도 1회 예약 |

`sp_private` 스키마는 Data API 공개 스키마에 등록하지 않는다. 운영 테이블의 조회/변경은 권한이 제한된 RPC에서만 수행한다.

M3 migration에 `sp_acquire_collection_run`, `sp_reserve_provider_attempt`, `sp_commit_area_update`, `sp_record_provider_failure`, `sp_finish_collection_run`, `sp_cleanup_seoul_pulse`를 작성했다. 모두 `SECURITY INVOKER`와 빈 `search_path`를 사용하고 객체를 스키마로 한정한다. PUBLIC, anon, authenticated의 실행 권한을 회수하고 service_role에만 부여한다. 키 이름이 바뀌어도 실제 Postgres 역할과 권한을 기준으로 검사한다. 근거: S15, S16. 2026-11-12 사용자 지정 프로젝트에 sp_ 최초 설치 migration을 적용했다. 수집 활성화와 예약 실행 상태는 PROGRESS.md 최신 기록을 따른다.

익명용 `sp_read_population_history`는 읽기 전용 INVOKER RPC다. 한 DB 스냅샷에서 공개 RLS를 적용한 이력/가용 시작을 scalar JSON으로 반환한다. 최근 24시간과 최대 3곳을 허용하고 20,000개 관측을 초과하면 오류로 중단한다. Data API의 기본 행 상한에 의해 자료가 잘린 성공 응답을 만들지 않는다.

### 읽기 권한

공개 테이블에는 RLS를 켜고 anon/authenticated는 공개 대상으로 지정된 행의 SELECT만 허용한다. INSERT/UPDATE/DELETE는 거부한다. 수집 설정 변경은 관리자 경로에서만 가능하다.

publishable key를 비밀 보안 수단으로 취급하지 않는다. 공개 테이블에는 노출되어도 되는 공공 데이터만 넣는다. RLS는 읽기 권한을 제어하는 장치이지 트래픽 제한 기능이 아니다. 공개 조회량이 커지면 별도의 사용량 제어를 검토한다.

## 7. 수집 알고리즘

기본 스케줄은 `*/5 * * * *`이다. 일괄 수집의 한 슬롯은 서버 기준 5분 구간이다. 같은 슬롯의 중복 요청은 이전 실행의 상태만 반환하고 다시 원천을 호출하지 않는다.

```text
1. 요청 메서드, 인증 토큰, 수집 활성화 여부 확인
2. 고정 job 이름과 현재 슬롯으로 실행 row와 120초 lease를 원자적으로 획득
3. 중복 슬롯 또는 유효 lease 존재 시 원천 호출 없이 종료
4. DB의 활성 장소 목록 조회. 초기 운영 한도 5개 적용
5. 원천 circuit과 호출 예산 확인
6. 동시성 2로 각 장소 처리
   a. 매 시도 직전 DB에서 요청 예산 1회를 원자적으로 예약
   b. 최대 8초 동안 원천 응답 수신
   c. 파싱과 section별 검증
   d. 현재 lease 토큰을 확인하며 장소 최신값/이력을 트랜잭션으로 반영
   e. 일시 장애일 때만 최대 1회 재시도, 재시도도 예산 소비
7. 획득 지연 포함 최대 45초 또는 DB 50초 기한보다 5초 이른 시점에 요청 중단
8. success/partial/error/skipped 상태, 수집 결과 수와 안전한 오류 코드 기록
9. 자신의 lease 토큰이 일치할 때만 잠금 해제
```

서버 프로세스의 boolean 잠금이나 요청 종료 전 해제되는 DB transaction advisory lock만으로 긴 외부 호출 전체를 보호하지 않는다. lease 획득과 슬롯 기록은 같은 DB 트랜잭션에서 처리한다. 만료된 실행은 다음 실행에서 실패로 정리할 수 있지만 이전 슬롯의 원천 요청을 자동으로 다시 수행하지 않는다.

잠금 토큰은 매 저장 RPC에서 검사한다. 실행 기한을 넘긴 이전 worker가 새 worker의 결과를 덮어쓰지 못하게 한다.

lease와 실행 row를 일정한 순서로 잠근 짧은 트랜잭션 안에서 슬롯/예산/시도 원장을 갱신한다. 외부 HTTP는 DB 트랜잭션 밖에서 수행한다. 날짜 예산은 KST 기준이고 예약 뒤 호출을 못 시작해도 환불하지 않는다. 실행의 `request_count`는 예약 수, `source_requests_started`는 마무리 시 앱이 보고한 실제 시작 수다. 프로세스 중단 때 예약 수가 안전 상한으로 남는다.

### 원천 오류 정책

네트워크 일시 오류, 일부 5xx와 타임아웃은 남은 시간/예산 안에서 지연 후 1회만 재시도한다. 429나 원천 제한 오류는 Retry-After를 우선하고, 없으면 다음 수집 슬롯까지 circuit을 연다. 무한 재시도하지 않는다.

인증/권한 오류나 잘못된 서비스명은 같은 요청을 재시도하지 않는다. 배치의 후속 원천 호출을 멈추고 운영 점검 대상으로 기록한다. 이미 진행 중이던 요청의 결과는 안전하게 마무리한다.

인증 장애 circuit은 키/권한 복구 후 수동 해제까지 유지하며 날짜가 넘어가도 확인한다. 429 Retry-After는 최대 24시간으로 제한한다. 복구 템플릿과 실행 조건은 [Supabase 운영 안내](../supabase/README.md)에 있다.

최대 실행 시간 직전에는 새 요청을 시작하지 않는다. 아직 처리하지 못한 장소는 실패와 구분해 `skipped_budget` 또는 `skipped_deadline`으로 기록한다.

## 8. 최신값과 이력의 일관성

하나의 유효한 인구 section을 반영할 때 이력과 최신값을 같은 트랜잭션에서 갱신한다. 인구와 날씨는 원천 시각이 다르므로 각각 비교한다.

| 상황 | 처리 |
| --- | --- |
| 더 새로운 원천 시각 | 최신값 갱신, 인구 이력 insert |
| 같은 원천 시각과 같은 hash | 이력 중복 추가 금지, 마지막 수신 시각만 갱신 |
| 같은 원천 시각과 수정된 값 | 기존 관측 row 수정, revision 증가, 최신값도 일치시킴 |
| 더 오래된 응답 | 최신값을 되돌리지 않음. 검증된 미보유 이력만 보관 가능 |
| section 누락 또는 검증 실패 | 기존 정상값 유지, 실패 상태만 갱신 |
| 전체 수집 실패 | 기존 값과 관측 시각 유지, 시도 결과만 갱신 |

인구 이력 hash는 정규화된 `min|max|congestion`의 SHA-256이다. 수신 시각, 상하한에서 계산하는 범위 중앙값과 안내 메시지는 제외한다. 안내 메시지는 최신 JSON에 보관하며 이력 revision의 대상은 아니다. lease 안에서 같은 장소에 요청을 중복 발사하지 않는다.

## 9. 시계열 처리와 내보내기

시간 버킷은 한국 시간의 정시 경계에 맞추고 `[시작, 종료)`로 묶는다. 버킷마다 마지막 유효 관측값 하나를 대표로 고른다. 최소/최대 값은 그 관측의 범위 그대로 사용한다. 집계 방식은 `last-observation`으로 반환한다.

조회 한 번의 기준 시각을 서버에서 고정하고 `to=기준 시각`, `from=기준 시각-24시간`으로 계산한다. 모든 비교 장소는 같은 `[from, to)`를 사용한다. 한국 시간 기준 5분 격자와 조회 경계가 일치하지 않으면 양 끝의 부분 버킷에 `partial=true`를 붙이고 실제 포함 구간을 반환한다. 최근 24시간은 최대 289개 버킷이 될 수 있다. 기준 시각 이후의 미래 관측은 포함하지 않는다. 7일 조회는 현재 시연 범위에서 제외한다.

응답에는 버킷 시각, 실제 관측 시각, 대표 범위, 혼잡 단계와 버킷 내 관측 수를 포함한다. 없는 버킷은 `null`로 만든다. 일정한 시간축을 위한 빈 버킷 생성은 허용하지만 가짜 관측값 생성은 금지다.

가장 최근 값만 고르는 downsampling은 구간 내 최고 인구를 보장하지 않는다. 최대값이나 최대 혼잡 시각을 표시하려면 별도 원본 관측 집계로 계산한다. MVP는 근거가 없는 증감률, 상관관계나 AI 인사이트를 만들지 않는다.

CSV는 미구현 후속 범위다. 구현할 경우 최대 3곳, 최근 24시간의 **원본 수집 관측**만 내보낸다. 기본 열은 dataset, source, areaCode, areaName, observedAtUTC, observedAtKST, populationMin, populationMax, congestion, lastFetchedAtUTC다. 날짜 범위와 생성 시각도 파일명 또는 메타 열로 설명한다.

UTF-8과 CSV quoting을 적용한다. 외부 문자열 셀의 첫 유효 문자가 `=`, `+`, `-`, `@`이면 수식으로 실행되지 않게 이스케이프한다. 원천 이름과 메시지에 HTML/개행/수식이 포함된 경우를 테스트한다. live와 demo는 같은 CSV로 섞지 않는다.

## 10. 보존과 용량

2026-11-12 사용자 결정에 따라 Supabase 인구 이력은 원천 관측 시각 기준 최근 48시간을 보관한다. 달력 날짜 기준 하루가 아닌 이동 구간이다. 매시 23분 정리 시점에 48시간보다 오래된 관측만 삭제하고 경계 시각과 같은 관측은 유지한다. 정상 예약 실행 사이에는 삭제 대기 관측이 약 1시간 더 남을 수 있으나 공개 조회 범위는 항상 최근 24시간이다.

장소별 최신 인구와 날씨는 `sp_area_latest`에 별도로 유지하며 이력 정리로 삭제하지 않는다. 오래된 최신값은 원천 시각과 지연/만료 상태를 표시한다. 장애 확인용 수집 실행/예산/Cron 로그는 기존 14일 보존을 유지하며 활성 lease와 열린 circuit은 정리에서 제외한다.

수집 관측의 상한 계산은 `장소 수 × 하루 수집 횟수 × 보존 일수`다. 5분마다 각 장소를 1회 수집하면 24시간에 기본 20곳은 최대 5,760개 관측 row이고, 48시간 보존 기준 최대 11,520개다. 매시간 정리의 삭제 대기분, 최신값과 운영 로그는 별도다. 원천 시각이 중복되면 실제 row는 더 적다. 바이트 용량은 실제 인덱스와 행 크기를 측정해야 한다.

로컬 개발 수집본도 저장 완료 시각 기준 최근 24시간 이력만 남기고 장소별 마지막 값은 별도로 유지한다. 기존 수집본은 다음 수집 저장에서 정리되며 조회만으로 파일을 수정하거나 원천 API를 호출하지 않는다. 현재 서비스는 Supabase를 사용하며 DB 보존 migration과 정리 Cron을 적용했다. 파일 backend의 24시간 보존과 DB의 48시간 보존을 구분한다. 기존 7일 조회와 7일 CSV 계획은 현재 시연 범위에서 제외한다.

Supabase Cron 자체 실행 로그도 별도로 정리한다. Cron 로그는 자동으로 영구 정리된다고 가정하지 않는다. 근거: S06.

## 11. 지도 자산 처리

공식 장소 목록과 영역 파일을 받아 파일명, 확인일, 원본 버전과 이용조건을 기록한다. 압축 파일 확장자만 보고 GeoJSON이라고 가정하지 않는다.

좌표계를 확인하고 필요할 때만 WGS84 경위도로 변환한다. GeoJSON 좌표 순서는 경도, 위도다. 임의로 숫자를 나누거나 좌표계를 추정해 변환하지 않는다.

장소 코드로 geometry를 연결하고, 변환 후 서울 부근 위치인지 점검한다. 다중 폴리곤, 폴리곤 내부 고리와 누락 geometry를 처리한다. 표식용 대표점은 영역 안에 놓이는지 확인한다. 확정하지 못한 연결은 `geometry_available=false`로 둔다.

웹 배포용 파일은 필요한 속성만 남겨 가공하고 출처를 기록한다. 원본 데이터와 별도 라이선스의 지도 타일을 동일 출처로 묶어 표시하지 않는다.

## 12. 출처와 서비스 문구

화면 하단 또는 데이터 안내에서 제공 기관, 데이터셋명, 공식 데이터셋 연결과 재가공 사실을 표시한다. 권장 문구는 다음과 같다.

> 데이터 제공: 서울특별시 서울 열린데이터광장. SEOUL PULSE에서 수집 및 재가공했습니다. 원천의 추정 방식, 제공 범위와 기준 시각에 따라 실제 현장과 차이가 있을 수 있습니다.

공공누리 표시, 데이터 한계와 출처는 공개 전 다시 확인한다. 이 문서는 특정 서비스의 법률 자문이나 영구 이용조건 보증이 아니다.

## 13. 공식 출처와 확인 범위

모두 2026-10-14 확인. URL은 구현자가 공식 문서를 다시 열 수 있도록 보관한다. 매뉴얼은 관련 페이지를 확인했으며 모든 페이지와 전체 필드 계약을 실호출 검증했다는 뜻은 아니다.

| ID | 공식 자료 | 이 문서에서 사용한 범위 |
| --- | --- | --- |
| S01 | 서울시 실시간 도시데이터 | 현재 메타정보, 첨부 목록, 호출 단위, 형식, 과거 제공과 이용허락 |
| S02 | 공공데이터포털 연결 데이터 | 비용 표기. 장소 수 설명은 최신 서울시 자료와 대조 |
| S03 | 실시간 도시데이터 매뉴얼 | 12~14쪽 API 구분, 16쪽 추정/가공 설명 |
| S04 | 서울 실시간 도시데이터 안내 | 인구가 추정치라는 설명 |
| S05 | Supabase Cron | 예약 작업 개념 |
| S06 | Supabase Cron Quickstart | HTTP 작업, pg_net, 스케줄과 실행 로그 정리 |
| S07 | Vercel Cron Usage and Pricing | Hobby의 일 단위 예약 제약 |
| S08 | Supabase Pricing | 무료 DB/전송량, 비활성 프로젝트 조건 |
| S09 | Vercel Functions Limits | 배포 환경의 함수 실행 제약 확인 |
| S10 | MapLibre GL JS | 지도 렌더러와 GeoJSON 지원 |
| S11 | OpenStreetMap Tile Usage Policy | 공용 타일의 정책, 출처와 사용 제한 |
| S12 | TanStack Query Important Defaults | 재조회와 stale 정책의 명시 필요 |
| S13 | Next.js Environment Variables | 서버 비밀값과 브라우저 공개 접두사 |
| S14 | Next.js Route Handlers | 서버 endpoint 구현과 캐시 정책 확인 |
| S15 | Supabase Row Level Security | 공개 읽기와 관리자 쓰기 권한 |
| S16 | Supabase API Keys | publishable/secret 키와 Postgres 역할 |
| S17 | fast-xml-parser 공식 저장소 | XML 파싱과 설치 버전별 옵션 확인 |
| S18 | Vercel Hobby Plan | 개인 비상업 사용 조건 |

```text
S01 https://data.seoul.go.kr/dataList/OA-21285/F/1/datasetView.do
S02 https://www.data.go.kr/data/15146211/openapi.do
S03 https://data.seoul.go.kr/SeoulRtd/downloads/%EC%8B%A4%EC%8B%9C%EA%B0%84_%EB%8F%84%EC%8B%9C%EB%8D%B0%EC%9D%B4%ED%84%B0_%EB%A7%A4%EB%89%B4%EC%96%BC.pdf
S04 https://data.seoul.go.kr/dataVisual/seoul/guide.do
S05 https://supabase.com/docs/guides/cron
S06 https://supabase.com/docs/guides/cron/quickstart
S07 https://vercel.com/docs/cron-jobs/usage-and-pricing
S08 https://supabase.com/pricing
S09 https://vercel.com/docs/functions/limitations
S10 https://maplibre.org/maplibre-gl-js/docs/
S11 https://operations.osmfoundation.org/policies/tiles/
S12 https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
S13 https://nextjs.org/docs/app/guides/environment-variables
S14 https://nextjs.org/docs/app/api-reference/file-conventions/route
S15 https://supabase.com/docs/guides/database/postgres/row-level-security
S16 https://supabase.com/docs/guides/getting-started/api-keys
S17 https://github.com/NaturalIntelligence/fast-xml-parser
S18 https://vercel.com/docs/plans/hobby
```
