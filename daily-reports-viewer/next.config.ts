import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Node.js native require for `debug` so webpack doesn't pick up its
  // browser.js build (which calls localStorage.getItem during SSR).
  serverExternalPackages: ["debug"],
};

export default nextConfig;
