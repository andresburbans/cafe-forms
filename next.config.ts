import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: 'export',
  // NOTE: 'output: export' was re-enabled for static deployment on Firebase Spark.
  // The PWA still works offline via service worker.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default withSerwist(nextConfig);
