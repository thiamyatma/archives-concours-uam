"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { PdfPreviewDialog } from "@/components/admin/pdf-preview-dialog";
import { RejectDialog } from "@/components/admin/reject-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { usePagination } from "@/lib/hooks/use-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import {
  approveDocument,
  deleteDocument,
  fetchAdminDocuments,
  rejectDocument,
} from "@/lib/actions/admin";
import { formatDate, formatFileSize } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, MATIERE_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/types/database";

const TABS: { value: DocumentStatus | "all"; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvés" },
  { value: "rejected", label: "Refusés" },
  { value: "all", label: "Tous" },
];

const SKELETON_ROWS = 6;
const TABLE_COLUMN_COUNT = 8;

export function AdminDashboard({ initialPendingCount }: { initialPendingCount: number }) {
  const [status, setStatus] = useState<DocumentStatus | "all">("pending");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const queryClient = useQueryClient();
  const queryKeyBase = ["admin-documents", status, q] as const;

  // Le total exact n'est redemandé qu'à la page 1 d'une combinaison
  // statut/recherche donnée (voir AdminDocumentQuery.withCount ci-dessous).
  // Pour les pages suivantes, on lit directement le total déjà mis en
  // cache par React Query pour la page 1 de ce même filtre — pas besoin
  // d'un state/ref séparé rien que pour "se souvenir" d'une valeur que le
  // cache de la query contient déjà.
  const page1Data = queryClient.getQueryData<
    Awaited<ReturnType<typeof fetchAdminDocuments>>
  >([...queryKeyBase, 1]);
  const knownTotal = page1Data?.total ?? 0;

  const pagination = usePagination({ total: knownTotal, pageSize: DEFAULT_PAGE_SIZE });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKeyBase, pagination.page] as const,
    queryFn: () =>
      fetchAdminDocuments({
        status: status === "all" ? undefined : status,
        q: q || undefined,
        page: pagination.page,
        withCount: pagination.page === 1,
      }),
    placeholderData: keepPreviousData,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
  }

  function handleStatusChange(value: string) {
    setStatus(value as DocumentStatus | "all");
    pagination.resetPage();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQ(searchInput);
    pagination.resetPage();
  }

  const approveMutation = useMutation({
    mutationFn: approveDocument,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Document approuvé et publié.");
        invalidate();
      } else {
        toast.error(result.error ?? "Échec de l'approbation.");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectDocument(id, reason),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Document refusé.");
        invalidate();
      } else {
        toast.error(result.error ?? "Échec du refus.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Document supprimé.");
        invalidate();
      } else {
        toast.error(result.error ?? "Échec de la suppression.");
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm">
            {initialPendingCount} document{initialPendingCount !== 1 ? "s" : ""} en
            attente de validation.
          </p>
        </div>
        <form className="flex gap-2" onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher dans les descriptions..."
              className="w-64 pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Rechercher
          </Button>
        </form>
      </div>

      <Tabs value={status} onValueChange={handleStatusChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Filière</TableHead>
                <TableHead>Année</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <AdminTableSkeleton />
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COLUMN_COUNT}
                    className="text-muted-foreground h-32 text-center"
                  >
                    Aucun document dans cette catégorie.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                      {doc.status === "rejected" && doc.rejection_reason && (
                        <p
                          className="text-muted-foreground mt-1 max-w-[16rem] truncate text-xs"
                          title={doc.rejection_reason}
                        >
                          {doc.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{doc.filieres?.nom ?? "—"}</TableCell>
                    <TableCell>{doc.annee}</TableCell>
                    <TableCell>{MATIERE_LABELS[doc.matiere]}</TableCell>
                    <TableCell>{DOCUMENT_TYPE_LABELS[doc.type]}</TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <PdfPreviewDialog
                          documentId={doc.id}
                          title={`${doc.filieres?.nom ?? ""} ${doc.annee} — ${MATIERE_LABELS[doc.matiere]} (${DOCUMENT_TYPE_LABELS[doc.type]})`}
                        />
                        {doc.status !== "approved" && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(doc.id)}
                          >
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            Valider
                          </Button>
                        )}
                        {doc.status !== "rejected" && (
                          <RejectDialog
                            isPending={rejectMutation.isPending}
                            onConfirm={(reason) =>
                              rejectMutation.mutate({ id: doc.id, reason })
                            }
                          />
                        )}
                        <DeleteDialog
                          isPending={deleteMutation.isPending}
                          onConfirm={() => deleteMutation.mutate(doc.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {isFetching && !isLoading ? "Actualisation..." : " "}
        </p>
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={pagination.setPage}
        />
      </div>
    </div>
  );
}

function AdminTableSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <TableRow key={i}>
          {Array.from({ length: TABLE_COLUMN_COUNT }, (_, col) => (
            <TableCell key={col}>
              <Skeleton className="h-4 w-full max-w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
