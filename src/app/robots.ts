import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/choose-face", "/dev", "/dotm", "/team", "/shows", "/countdown"],
    },
    sitemap: "https://dotm.in/sitemap.xml",
  };
}
