import type { NextConfig } from "next";
import dotenv from 'dotenv';
dotenv.config();

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/langgraph/:path*',
        destination: `${process.env.NEXT_PUBLIC_LANGGRAPH_API_URL}/:path*`, 
      },
    ];
  },
};

export default nextConfig;
