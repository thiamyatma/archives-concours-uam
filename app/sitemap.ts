import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getContentManifest } from "@/lib/data/departements";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const manifest = getContentManifest();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/departements`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/assistant`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const departementRoutes: MetadataRoute.Sitemap = manifest.departements.map((d) => ({
    url: `${base}/departements/${d.code}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const anneeRoutes: MetadataRoute.Sitemap = manifest.departements.flatMap((d) =>
    d.annees.map((annee) => ({
      url: `${base}/departements/${d.code}/${annee}`,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    }))
  );

  return [...staticRoutes, ...departementRoutes, ...anneeRoutes];
}
