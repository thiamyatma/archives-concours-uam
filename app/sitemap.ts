import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getAllFilieres, getFiliereArchive } from "@/lib/data/filieres";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/bibliotheque`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/filieres`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/contribuer`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const filieres = await getAllFilieres();

    const filiereRoutes: MetadataRoute.Sitemap = filieres.map((f) => ({
      url: `${base}/filieres/${f.code}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const yearRoutes: MetadataRoute.Sitemap = (
      await Promise.all(
        filieres.map(async (f) => {
          const archive = await getFiliereArchive(f.id);
          return archive.years.map((y) => ({
            url: `${base}/filieres/${f.code}/${y.annee}`,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          }));
        })
      )
    ).flat();

    return [...staticRoutes, ...filiereRoutes, ...yearRoutes];
  } catch {
    // Supabase indisponible au build : on retombe sur les routes statiques uniquement.
    return staticRoutes;
  }
}
