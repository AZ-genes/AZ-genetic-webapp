import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hashgraph/hedera-wallet-connect"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@reown/appkit");
    }
    return config;
  },
  /* config options here */
};

export default nextConfig;
