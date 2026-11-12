-- 별도 승인 후 운영자가 사용할 템플릿이다. 이번 작업에서 실행하지 않았다.
-- 실제 키 한도/원천 시간대/HTTP 위험 수용/DB 테스트/서버 비밀 설정 확인을 먼저 완료한다.
begin;
update public.sp_areas set collection_enabled=true
  where code in ('POI014','POI007','POI003','POI072','POI068','POI002','POI005','POI008','POI009','POI015','POI033','POI046','POI053','POI054','POI060','POI073','POI083','POI091','POI101','POI105') and is_public;
commit;
