export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      client_notes: {
        Row: {
          category: string
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          category: string
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          category?: string
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_email: string | null
          company_website: string | null
          contact_email: string | null
          created_at: string
          hourly_rate: number | null
          hours_allocated: number | null
          hours_used: number | null
          id: string
          invoicing_email: string | null
          logo_url: string | null
          max_concurrent_projects: number | null
          name: string
          payment_schedule: string | null
          poc_name: string | null
          retainer_type: Database["public"]["Enums"]["retainer_type"]
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          company_website?: string | null
          contact_email?: string | null
          created_at?: string
          hourly_rate?: number | null
          hours_allocated?: number | null
          hours_used?: number | null
          id?: string
          invoicing_email?: string | null
          logo_url?: string | null
          max_concurrent_projects?: number | null
          name: string
          payment_schedule?: string | null
          poc_name?: string | null
          retainer_type?: Database["public"]["Enums"]["retainer_type"]
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          company_website?: string | null
          contact_email?: string | null
          created_at?: string
          hourly_rate?: number | null
          hours_allocated?: number | null
          hours_used?: number | null
          id?: string
          invoicing_email?: string | null
          logo_url?: string | null
          max_concurrent_projects?: number | null
          name?: string
          payment_schedule?: string | null
          poc_name?: string | null
          retainer_type?: Database["public"]["Enums"]["retainer_type"]
          updated_at?: string
        }
        Relationships: []
      }
      file_flags: {
        Row: {
          created_at: string
          file_id: string
          flag_message: string
          flagged_by: string
          flagged_by_role: string
          flagged_for: string
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_message: string | null
        }
        Insert: {
          created_at?: string
          file_id: string
          flag_message: string
          flagged_by: string
          flagged_by_role: string
          flagged_for: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_message?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string
          flag_message?: string
          flagged_by?: string
          flagged_by_role?: string
          flagged_for?: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_flags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          category: Database["public"]["Enums"]["file_category"]
          company_id: string
          created_at: string
          description: string | null
          external_platform: string | null
          file_size: number | null
          file_url: string
          id: string
          is_external_link: boolean | null
          is_favorite: boolean | null
          is_pinned_to_dashboard: boolean | null
          mime_type: string | null
          name: string
          project_id: string | null
          title: string | null
          update_id: string | null
          updated_at: string | null
          uploaded_by: string | null
          video_hosted_link: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["file_category"]
          company_id: string
          created_at?: string
          description?: string | null
          external_platform?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_external_link?: boolean | null
          is_favorite?: boolean | null
          is_pinned_to_dashboard?: boolean | null
          mime_type?: string | null
          name: string
          project_id?: string | null
          title?: string | null
          update_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          video_hosted_link?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["file_category"]
          company_id?: string
          created_at?: string
          description?: string | null
          external_platform?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_external_link?: boolean | null
          is_favorite?: boolean | null
          is_pinned_to_dashboard?: boolean | null
          mime_type?: string | null
          name?: string
          project_id?: string | null
          title?: string | null
          update_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          video_hosted_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          file_id: string | null
          flag_id: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          flag_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          flag_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "file_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          blocked_reason: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_blocked: boolean
          name: string
          project_type: Database["public"]["Enums"]["project_type"]
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_blocked?: boolean
          name: string
          project_type?: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          project_type?: Database["public"]["Enums"]["project_type"]
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          author_id: string | null
          change_request_draft: boolean | null
          change_request_link: string | null
          change_request_link_type: string | null
          change_request_submitted_at: string | null
          change_request_text: string | null
          content: string
          created_at: string
          hours_logged: number | null
          id: string
          is_approved: boolean | null
          is_deliverable: boolean
          project_id: string
        }
        Insert: {
          author_id?: string | null
          change_request_draft?: boolean | null
          change_request_link?: string | null
          change_request_link_type?: string | null
          change_request_submitted_at?: string | null
          change_request_text?: string | null
          content: string
          created_at?: string
          hours_logged?: number | null
          id?: string
          is_approved?: boolean | null
          is_deliverable?: boolean
          project_id: string
        }
        Update: {
          author_id?: string | null
          change_request_draft?: boolean | null
          change_request_link?: string | null
          change_request_link_type?: string | null
          change_request_submitted_at?: string | null
          change_request_text?: string | null
          content?: string
          created_at?: string
          hours_logged?: number | null
          id?: string
          is_approved?: boolean | null
          is_deliverable?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "team" | "admin"
      file_category:
        | "documents"
        | "images"
        | "testimonials"
        | "video"
        | "brand"
        | "content"
        | "designs"
        | "copy"
        | "other"
      project_status:
        | "queued"
        | "in_progress"
        | "revision"
        | "review"
        | "complete"
      project_type: "design" | "development" | "content" | "strategy" | "other"
      retainer_type: "unlimited" | "hourly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["client", "team", "admin"],
      file_category: [
        "documents",
        "images",
        "testimonials",
        "video",
        "brand",
        "content",
        "designs",
        "copy",
        "other",
      ],
      project_status: [
        "queued",
        "in_progress",
        "revision",
        "review",
        "complete",
      ],
      project_type: ["design", "development", "content", "strategy", "other"],
      retainer_type: ["unlimited", "hourly"],
    },
  },
} as const
