import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Prisma from client-side bundles (works for both webpack and Turbopack)
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Ensure middleware doesn't try to bundle Prisma
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
};

export default nextConfig;
