import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Keep host, canonical metadata and sitemap signals on dotm.in.
      {
        source: "/",
        has: [{ type: "host" as const, value: "www.dotm.in" }],
        destination: "https://dotm.in/enter",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "www.dotm.in" }],
        destination: "https://dotm.in/:path*",
        permanent: true,
      },
      { source: "/", destination: "/enter", permanent: true },
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Permissions-Policy", value: "picture-in-picture=()" }],
    }];
  },
  images: {
    remotePatterns: [
      // Spotify serves album artwork from this CDN. Artwork is hotlinked
      // rather than copied, which is both what the Developer Terms expect
      // and what keeps the images current when a release is updated.
      { protocol: "https", hostname: "i.scdn.co", pathname: "/image/**" },
    ],
  },
};

export default withNextIntl(nextConfig);
