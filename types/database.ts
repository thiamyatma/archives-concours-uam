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
