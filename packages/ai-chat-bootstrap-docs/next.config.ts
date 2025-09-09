import type { NextConfig } from "next";
import nextra from "nextra";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(isProd && {
    basePath: '/ai-chat-bootstrap',
    assetPrefix: '/ai-chat-bootstrap/',
  }),
};

const withNextra = nextra({});

export default withNextra(nextConfig);
