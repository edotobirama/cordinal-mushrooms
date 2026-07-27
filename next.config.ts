import type { NextConfig } from "next";

const nextConfig = {
  basePath: '/operations',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
