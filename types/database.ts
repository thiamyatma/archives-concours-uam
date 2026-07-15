export interface Database {
  public: {
    Tables: {
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
      pdf_downloads: {
        Row: {
          id: string;
          departement_code: string;
          annee: number;
          file_name: string;
          downloaded_at: string;
        };
        Insert: {
          id?: string;
          departement_code: string;
          annee: number;
          file_name: string;
          downloaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pdf_downloads"]["Insert"]>;
        Relationships: [];
      };
      action_rate_limits: {
        Row: {
          id: string;
          key_hash: string;
          action: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key_hash: string;
          action: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["action_rate_limits"]["Insert"]>;
        Relationships: [];
      };
      admin_session_state: {
        Row: {
          id: boolean;
          revoked_at: string;
        };
        Insert: {
          id?: boolean;
          revoked_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_session_state"]["Insert"]>;
        Relationships: [];
      };
      exam_documents: {
        Row: {
          id: string;
          annee: number;
          file_name: string;
          storage_path: string;
          file_size: number;
          description: string | null;
          statut: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          annee: number;
          file_name: string;
          storage_path: string;
          file_size: number;
          description?: string | null;
          statut?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_documents"]["Insert"]>;
        Relationships: [];
      };
      exam_document_departments: {
        Row: {
          document_id: string;
          departement_code: string;
          annee: number;
        };
        Insert: {
          document_id: string;
          departement_code: string;
          annee: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["exam_document_departments"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "exam_document_departments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "exam_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_document_views: {
        Row: {
          id: string;
          departement_code: string;
          annee: number;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          departement_code: string;
          annee: number;
          viewed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_document_views"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
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
      get_pdf_download_stats: {
        Args: Record<string, never>;
        Returns: { total_downloads: number; total_files_downloaded: number }[];
      };
      get_pdf_downloads_by_departement: {
        Args: Record<string, never>;
        Returns: { departement_code: string; downloads: number }[];
      };
      get_pdf_downloads_by_annee: {
        Args: Record<string, never>;
        Returns: { annee: number; downloads: number }[];
      };
      get_top_downloaded_pdfs: {
        Args: { limit_count?: number };
        Returns: {
          departement_code: string;
          annee: number;
          file_name: string;
          downloads: number;
        }[];
      };
      check_and_record_rag_rate_limit: {
        Args: { p_ip_hash: string; p_limit: number };
        Returns: { allowed: boolean; remaining: number }[];
      };
      check_action_rate_limit: {
        Args: {
          p_key_hash: string;
          p_action: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      get_exam_documents_with_stats: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          annee: number;
          file_name: string;
          storage_path: string;
          file_size: number;
          description: string | null;
          statut: string;
          created_at: string;
          updated_at: string;
          departement_codes: string[];
          downloads: number;
          views: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
