import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "thumbnail.image.rakuten.co.jp" },
      { protocol: "https", hostname: "navi-shop.jp" },
      { protocol: "https", hostname: "**.yahooapis.jp" },
      { protocol: "https", hostname: "**.yimg.jp" },
      { protocol: "https", hostname: "shopping.c.yimg.jp" },
    ],
  },
  logging: { fetches: { fullUrl: false } },
};

export default nextConfig;
