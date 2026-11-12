-- 운영자가 예약 해제를 요청한 경우에만 실행한다. 이번 개발에서는 실행하지 않았다.
begin;
select cron.unschedule(jobid) from cron.job where jobname='seoul-pulse-collect-v1';
-- 이력 자동 정리는 계속 유지한다. 정리 중지는 cleanup-cron-disable.sql로 분리한다.
-- 앱의 COLLECTOR_ENABLED=false도 별도로 적용한다. 관측 이력은 삭제하지 않는다.
commit;
