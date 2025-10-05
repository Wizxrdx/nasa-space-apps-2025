import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const config: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  output: "export",
  images: { unoptimized: true },
  // Set when deploying to a project page (https://<user>.github.io/<repo>)
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
};

export default config;
