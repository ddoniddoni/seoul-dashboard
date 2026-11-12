-- 이력 자동 정리를 중지해 달라는 명시적 요청이 있을 때만 실행한다.
-- 정리가 중지되는 동안 인구 이력과 실행 로그가 계속 쌓일 수 있다.
select cron.unschedule(jobid) from cron.job where jobname='seoul-pulse-cleanup-v1';
