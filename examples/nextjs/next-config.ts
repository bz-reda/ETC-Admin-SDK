// next.config.ts — required: allow S3 presigned URL images
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.ghayma.tech",
      },
      {
        protocol: "https",
        hostname: "*.s3.ghayma.tech",
      },
    ],
  },
};

export default nextConfig;
