import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Fix for @hashgraph/hedera-wallet-connect module resolution
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle dynamic imports for wallet connect
    config.externals = [...(config.externals || []), 'encoding'];
    
    return config;
  },
};

export default nextConfig;
