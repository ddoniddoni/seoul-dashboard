-- 인증키 교체/권한 복구와 별도 승인을 마친 운영자만 실행한다. 이번 작업에서는 미실행이다.
-- 장소 활성화만으로 인증 장애 circuit을 자동 해제하지 않는다.
begin;
update sp_private.sp_provider_budgets set circuit_open_until=null,last_error_code=null
  where provider='seoul-citydata' and last_error_code='SOURCE_AUTHENTICATION';
commit;
