import type { NextConfig } from "next";

/**
 * Illustrations d'épreuves (`public/archives/**`). Par défaut, Vercel sert les
 * fichiers de `public/` avec `Cache-Control: public, max-age=0,
 * must-revalidate` : chaque affichage d'une page épreuve ou d'un QCM
 * re-demande les images (une page épreuve en compte jusqu'à 6, ~30 Ko
 * chacune). Ce sont des scans d'archives : le contenu d'un chemin donné ne
 * change jamais.
 *
 * Conséquence à connaître avant de toucher à ces fichiers : `immutable` +
 * 1 an signifie qu'un navigateur ayant déjà l'image ne la redemandera pas.
 * Corriger une illustration impose donc un **nouveau nom de fichier** (même
 * règle que les PDF dans Storage, où un remplacement crée un nouveau
 * `storage_path` — voir lib/pdf/constants.ts).
 */
const ARCHIVE_IMAGES_CACHE_CONTROL = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/archives/:path*",
        headers: [{ key: "Cache-Control", value: ARCHIVE_IMAGES_CACHE_CONTROL }],
      },
    ];
  },
};

export default nextConfig;
