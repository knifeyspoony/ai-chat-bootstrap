import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure workspace packages are watched/transpiled for HMR
  transpilePackages: ["ai-chat-bootstrap"],
};

export default nextConfig;
