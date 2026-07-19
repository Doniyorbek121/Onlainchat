import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/authenticated and API surfaces out of the index.
      disallow: ["/api/", "/settings", "/mine", "/library", "/admin"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
