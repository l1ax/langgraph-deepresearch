import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/langgraph/:path*',
        destination: 'http://45.152.64.84:2024/:path*', 
      },
    ];
  },
};

export default nextConfig;
