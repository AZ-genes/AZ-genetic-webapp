import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hashgraph/hedera-wallet-connect", "@reown/appkit"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@reown/appkit");
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
