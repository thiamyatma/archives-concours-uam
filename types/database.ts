export type DocumentMatiere = "mathematiques" | "physique_chimie" | "anglais" | "logique";

export type DocumentType = "sujet" | "corrige";

export type DocumentStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      filieres: {
        Row: {
          id: string;
          code: string;
          nom: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          nom: string;
          description?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["filieres"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          filiere_id: string;
          annee: number;
          matiere: DocumentMatiere;
          type: DocumentType;
          description: string;
          file_url: string;
          file_name: string;
          file_size: number;
          downloads: number;
          status: DocumentStatus;
          uploaded_by: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          filiere_id: string;
          annee: number;
          matiere: DocumentMatiere;
          type: DocumentType;
          description?: string;
          file_url: string;
          file_name: string;
          file_size?: number;
          downloads?: number;
          status?: DocumentStatus;
          uploaded_by?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "documents_filiere_id_fkey";
            columns: ["filiere_id"];
            isOneToOne: false;
            referencedRelation: "filieres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "contributors";
            referencedColumns: ["id"];
          },
        ];
      };
      contributors: {
        Row: {
          id: string;
          nom: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contributors"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          document_id: string;
          reason: string;
          reporter_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          reason: string;
          reporter_email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reports_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      polytech_pages: {
        Row: {
          id: string;
          url: string;
          title: string;
          section: string;
          content_hash: string;
          fetched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          title?: string;
          section?: string;
          content_hash: string;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["polytech_pages"]["Insert"]>;
        Relationships: [];
      };
      polytech_chunks: {
        Row: {
          id: string;
          page_id: string;
          chunk_index: number;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          chunk_index: number;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["polytech_chunks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "polytech_chunks_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "polytech_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      rag_query_log: {
        Row: {
          id: string;
          ip_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_hash: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rag_query_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_document_downloads: {
        Args: { doc_id: string };
        Returns: number;
      };
      get_global_stats: {
        Args: Record<string, never>;
        Returns: {
          total_documents: number;
          total_downloads: number;
          total_contributors: number;
        }[];
      };
      get_filiere_document_counts: {
        Args: Record<string, never>;
        Returns: {
          filiere_id: string;
          document_count: number;
        }[];
      };
      search_polytech_chunks: {
        Args: { search_query: string; match_count?: number };
        Returns: {
          chunk_id: string;
          page_url: string;
          page_title: string;
          section: string;
          content: string;
          rank: number;
        }[];
      };
    };
    Enums: {
      document_matiere: DocumentMatiere;
      document_type: DocumentType;
      document_status: DocumentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Filiere = Database["public"]["Tables"]["filieres"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type Contributor = Database["public"]["Tables"]["contributors"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];

export type DocumentWithFiliere = DocumentRow & {
  filieres: Pick<Filiere, "id" | "code" | "nom"> | null;
};

/**
 * Forme réduite retournée aux pages publiques (bibliothèque, page année) :
 * seules les colonnes réellement affichées, pour ne pas laisser croire
 * (via `DocumentWithFiliere`) que `file_url`/`uploaded_by`/... sont
 * disponibles alors qu'elles ne sont pas sélectionnées côté serveur.
 */
export type PublicDocument = Pick<
  DocumentRow,
  | "id"
  | "filiere_id"
  | "annee"
  | "matiere"
  | "type"
  | "description"
  | "file_size"
  | "downloads"
  | "status"
  | "created_at"
> & {
  filieres: Pick<Filiere, "id" | "code" | "nom"> | null;
};
