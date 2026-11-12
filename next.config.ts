import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 개발 서버가 프로젝트의 사용자 지시문을 자동 수정하지 않게 한다.
  agentRules: false,
};

export default nextConfig;
