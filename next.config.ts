import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@tensorflow/tfjs",
    "@tensorflow-models/universal-sentence-encoder",
    "@tensorflow/tfjs-backend-webgl",
    "@tensorflow/tfjs-backend-cpu",
    "@tensorflow/tfjs-core",
    "@tensorflow/tfjs-converter",
    "@tensorflow/tfjs-layers",
    "@tensorflow/tfjs-data",
  ],
};

export default nextConfig;
