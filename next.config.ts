import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

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

// Chain the plugins: withPWA(withNextIntl(config))
export default withPWA(withNextIntl(nextConfig));
