import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
