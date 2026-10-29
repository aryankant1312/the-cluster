import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // The root redirects here; desktop content requires sign-in.
  return [{ url: "https://dotm.in/enter" }];
}
