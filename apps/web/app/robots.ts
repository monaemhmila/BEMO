import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/api/",
          "/debug-auth",
          "/login",
          "/my/",
          "/printer",
          "/profile",
          "/sign-up",
          "/stats",
          "/storybook/dashboard",
          "/test-api",
          "/welcome",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
