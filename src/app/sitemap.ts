import type { MetadataRoute } from "next";
import { listCharacters } from "@/lib/db";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Include the most popular public characters (bounded).
  let characters: MetadataRoute.Sitemap = [];
  try {
    const rows = await listCharacters({ limit: 200 });
    characters = rows.map((c) => ({
      url: `${base}/character/${c.id}`,
      lastModified: new Date(c.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    /* DB unavailable at build/probe time — static routes still returned. */
  }

  return [...staticRoutes, ...characters];
}
