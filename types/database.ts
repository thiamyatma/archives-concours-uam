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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
