/**
 * Backfill ponctuel : migre les 3 PDF existants (déposés manuellement
 * avant la page d'admin) vers le nouveau système exam_documents +
 * exam_document_departments, sans dupliquer les octets (copie server-side
 * via l'API Storage, `.copy()`). À exécuter UNE SEULE FOIS après avoir
 * appliqué la migration 20260720000000_exam_documents.sql.
 *
 * Usage : npm run backfill:exam-documents
 * Requiert NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (chargés
 * depuis .env.local en local).
 *
 * Ne supprime PAS les anciens objets (contentGroup/année.pdf) : un échec
 * partiel laisse un objet orphelin inoffensif plutôt qu'une perte de
 * données. Nettoyage manuel séparé une fois la nouvelle page vérifiée.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { buildDocumentStoragePath } from "../lib/pdf/slugify";
import { PDF_BUCKET } from "../lib/pdf/constants";

interface LegacyEntry {
  oldPath: string;
  departementCodes: string[];
  annee: number;
  fileName: string;
}

const LEGACY_ENTRIES: LegacyEntry[] = [
  {
    oldPath: "dsti-dgae-dstaan/2025.pdf",
    departementCodes: ["dsti", "dgae", "dstaan"],
    annee: 2025,
    fileName: "Concours-UAM_DSTI-DGAE-DSTAAN_2025.pdf",
  },
  {
    oldPath: "dsti-dgae-dstaan/2024.pdf",
    departementCodes: ["dsti", "dgae", "dstaan"],
    annee: 2024,
    fileName: "Concours-UAM_DSTI-DGAE-DSTAAN_2024.pdf",
  },
  {
    oldPath: "dgo-du2adt/2024.pdf",
    departementCodes: ["dgo", "du2adt"],
    annee: 2024,
    fileName: "Concours-UAM_DGO-DU2ADT_2024.pdf",
  },
];

function log(message: string) {
  console.log(`[backfill-exam-documents] ${message}`);
}

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour lancer le backfill."
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const supabase = getSupabaseServiceClient();

  for (const entry of LEGACY_ENTRIES) {
    log(`Traitement de ${entry.oldPath}...`);

    const { data: info, error: infoError } = await supabase.storage
      .from(PDF_BUCKET)
      .info(entry.oldPath);
    if (infoError || !info || typeof info.size !== "number") {
      log(
        `  Ignoré : impossible de lire les métadonnées (${infoError?.message ?? "introuvable"}).`
      );
      continue;
    }

    const newPath = buildDocumentStoragePath(
      entry.departementCodes,
      entry.annee,
      entry.fileName
    );

    const { error: copyError } = await supabase.storage
      .from(PDF_BUCKET)
      .copy(entry.oldPath, newPath);
    if (copyError) {
      log(`  Ignoré : échec de la copie vers ${newPath} (${copyError.message}).`);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("exam_documents")
      .insert({
        annee: entry.annee,
        file_name: entry.fileName,
        storage_path: newPath,
        file_size: info.size,
        statut: "publie",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      log(
        `  Échec de l'insertion exam_documents (${insertError?.message}). Objet copié mais non lié — à nettoyer manuellement.`
      );
      continue;
    }

    const { error: linkError } = await supabase.from("exam_document_departments").insert(
      entry.departementCodes.map((code) => ({
        document_id: inserted.id,
        departement_code: code,
        annee: entry.annee,
      }))
    );

    if (linkError) {
      log(`  Échec de la liaison départements (${linkError.message}).`);
      continue;
    }

    log(`  OK -> ${newPath} lié à ${entry.departementCodes.join(", ")}.`);
  }

  log(
    "Terminé. Les anciens objets (contentGroup/année.pdf) n'ont pas été supprimés — à nettoyer manuellement une fois vérifié."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
