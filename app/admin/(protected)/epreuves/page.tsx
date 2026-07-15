import type { Metadata } from "next";
import { UploadDropzone } from "@/components/admin/upload-dropzone";
import { DocumentsTable } from "@/components/admin/documents-table";
import { getExamDocuments } from "@/lib/data/exam-documents";

export const metadata: Metadata = { title: "Admin — Gestion des épreuves" };
export const dynamic = "force-dynamic";

export default async function EpreuvesAdminPage() {
  const documents = await getExamDocuments();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Gestion des épreuves</h1>
        <p className="text-muted-foreground text-sm">
          Importez, publiez et gérez les PDF téléchargeables des épreuves.
        </p>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Importer un PDF</h2>
        <UploadDropzone />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Documents</h2>
        <DocumentsTable documents={documents} />
      </div>
    </div>
  );
}
