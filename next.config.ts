import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "**.trycloudflare.com",
    "*.vercel.app",
    "**.vercel.app",
    "127.0.0.1",
  ],
};

export default nextConfig;
