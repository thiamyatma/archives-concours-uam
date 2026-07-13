import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { computeYearCompleteness, type YearCompleteness } from "@/lib/completeness";
import { CACHE_TAGS } from "@/lib/data/cache-tags";
import type { Filiere } from "@/types/database";

export interface FiliereWithCount extends Filiere {
  documentCount: number;
}

async function fetchFilieresWithStats(): Promise<FiliereWithCount[]> {
  const supabase = createPublicClient();

  // Le compte par filière vient d'un group by exécuté en base
  // (get_filiere_document_counts) plutôt que d'un fetch de toutes les
  // lignes `documents.filiere_id` compté ensuite en JS : le volume
  // transféré et le travail applicatif restent constants (une ligne par
  // filière) quel que soit le nombre de documents dans la table.
  const [{ data: filieres, error: filieresError }, { data: counts, error: countsError }] =
    await Promise.all([
      supabase.from("filieres").select("*").order("nom", { ascending: true }),
      supabase.rpc("get_filiere_document_counts"),
    ]);

  if (filieresError) throw filieresError;
  if (countsError) throw countsError;

  const countByFiliere = new Map(
    (counts ?? []).map((row) => [row.filiere_id, row.document_count])
  );

  return (filieres ?? []).map((filiere) => ({
    ...filiere,
    documentCount: countByFiliere.get(filiere.id) ?? 0,
  }));
}

/**
 * Filières + nombre de documents approuvés (accueil, index filières).
 * Donnée publique, identique pour tout le monde : mise en cache longue
 * durée (`unstable_cache`) et invalidée à la demande (`revalidateTag`) par
 * les actions admin plutôt que recalculée à chaque visite. `cache()`
 * (React) déduplique en plus les appels multiples au sein d'un même rendu.
 */
export const getFilieresWithStats = cache(
  unstable_cache(fetchFilieresWithStats, ["filieres-with-stats"], {
    tags: [CACHE_TAGS.filieres],
    revalidate: 3600,
  })
);

async function fetchFiliereByCode(code: string): Promise<Filiere | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("filieres")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 5 filières seulement : cardinalité bornée, candidate idéale au cache
 * longue durée. Sans `cache()`, `generateMetadata` et le composant de page
 * appelleraient chacun cette fonction pour la même page — requête en
 * double à chaque chargement.
 */
export const getFiliereByCode = cache(
  unstable_cache(fetchFiliereByCode, ["filiere-by-code"], {
    tags: [CACHE_TAGS.filieres],
    revalidate: 3600,
  })
);

export interface FiliereArchive {
  years: YearCompleteness[];
  totalDocuments: number;
  totalDownloads: number;
}

async function fetchFiliereArchive(filiereId: string): Promise<FiliereArchive> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("documents")
    .select("annee, matiere, type, downloads")
    .eq("filiere_id", filiereId)
    .eq("status", "approved");

  if (error) throw error;
  const docs = data ?? [];

  return {
    years: computeYearCompleteness(docs),
    totalDocuments: docs.length,
    totalDownloads: docs.reduce((sum, doc) => sum + doc.downloads, 0),
  };
}

export const getFiliereArchive = cache(
  unstable_cache(fetchFiliereArchive, ["filiere-archive"], {
    tags: [CACHE_TAGS.filieres],
    revalidate: 3600,
  })
);

async function fetchAllFilieres(): Promise<Filiere[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("filieres")
    .select("*")
    .order("nom", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export const getAllFilieres = cache(
  unstable_cache(fetchAllFilieres, ["all-filieres"], {
    tags: [CACHE_TAGS.filieres],
    revalidate: 3600,
  })
);
