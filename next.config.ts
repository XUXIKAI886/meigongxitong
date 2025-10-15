import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // 配置sharp的外部依赖处理
  serverExternalPackages: ['sharp'],
};

export default nextConfig;
