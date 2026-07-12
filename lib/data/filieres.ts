import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeYearCompleteness, type YearCompleteness } from "@/lib/completeness";
import type { Filiere } from "@/types/database";

export interface FiliereWithCount extends Filiere {
  documentCount: number;
}

export async function getFilieresWithStats(): Promise<FiliereWithCount[]> {
  const supabase = await createClient();

  const [
    { data: filieres, error: filieresError },
    { data: documents, error: docsError },
  ] = await Promise.all([
    supabase.from("filieres").select("*").order("nom", { ascending: true }),
    supabase.from("documents").select("filiere_id").eq("status", "approved"),
  ]);

  if (filieresError) throw filieresError;
  if (docsError) throw docsError;

  const counts = new Map<string, number>();
  for (const doc of documents ?? []) {
    counts.set(doc.filiere_id, (counts.get(doc.filiere_id) ?? 0) + 1);
  }

  return (filieres ?? []).map((filiere) => ({
    ...filiere,
    documentCount: counts.get(filiere.id) ?? 0,
  }));
}

export async function getFiliereByCode(code: string): Promise<Filiere | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("filieres")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getFiliereYears(filiereId: string): Promise<YearCompleteness[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("annee, matiere, type")
    .eq("filiere_id", filiereId)
    .eq("status", "approved");

  if (error) throw error;
  return computeYearCompleteness(data ?? []);
}

export interface FiliereArchive {
  years: YearCompleteness[];
  totalDocuments: number;
  totalDownloads: number;
}

export async function getFiliereArchive(filiereId: string): Promise<FiliereArchive> {
  const supabase = await createClient();
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

export async function getAllFilieres(): Promise<Filiere[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("filieres")
    .select("*")
    .order("nom", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
