import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Suppress workspace root detection warning by forcing current directory
    turbopack: {
      root: '.'
    },
    // Next.js 16.1.6: Enable 'proxy' mode for authentication and routing
    proxy: true
  }
};

export default nextConfig;
