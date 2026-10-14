import type { NextConfig } from "next";

// GitHub Pages serves the site from /<repo>/ — set PAGES_BASE_PATH=/lick-my-app when building for it.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: "export", // plain static files: everything talks to Supabase from the browser
  trailingSlash: true, // /e/join/ → /e/join/index.html
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
