import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Prisma from client-side bundles and middleware (works for both webpack and Turbopack)
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
