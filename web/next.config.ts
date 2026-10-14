import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve("."),
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
