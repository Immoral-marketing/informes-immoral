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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      authorized_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: []
      }
      client_recipients: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          email: string
          full_name: string | null
          id: string
          is_primary: boolean
          role_label: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          email: string
          full_name?: string | null
          id?: string
          is_primary?: boolean
          role_label?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string | null
          id?: string
          is_primary?: boolean
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_recipients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_spaces: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          slug: string
          vertical_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          slug: string
          vertical_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          slug?: string
          vertical_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_spaces_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_spaces_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_link_requests: {
        Row: {
          attempts: number
          id: string
          ip_address: string
          last_attempt: string
          recipient_id: string | null
          report_id: string
          window_start: string
        }
        Insert: {
          attempts?: number
          id?: string
          ip_address: string
          last_attempt?: string
          recipient_id?: string | null
          report_id: string
          window_start?: string
        }
        Update: {
          attempts?: number
          id?: string
          ip_address?: string
          last_attempt?: string
          recipient_id?: string | null
          report_id?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_link_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "client_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_link_requests_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_link_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          recipient_id: string
          report_id: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          recipient_id: string
          report_id: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          recipient_id?: string
          report_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "magic_link_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_link_tokens_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "client_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_link_tokens_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_attempts: {
        Row: {
          attempts: number
          blocked_until: string | null
          id: string
          ip_address: string
          last_attempt: string
          report_id: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          id?: string
          ip_address: string
          last_attempt?: string
          report_id: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          id?: string
          ip_address?: string
          last_attempt?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_attempts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          notification_email_enabled: boolean
          personal_pin_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          notification_email_enabled?: boolean
          personal_pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          notification_email_enabled?: boolean
          personal_pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      report_attachments: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          filename: string
          id: string
          mime_type: string
          report_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          filename: string
          id?: string
          mime_type: string
          report_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          filename?: string
          id?: string
          mime_type?: string
          report_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          recipient_id: string | null
          report_id: string
          session_type: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          recipient_id?: string | null
          report_id: string
          session_type?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          recipient_id?: string | null
          report_id?: string
          session_type?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_sessions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "client_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_sessions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_versions: {
        Row: {
          created_at: string
          created_by: string
          format: string
          id: string
          report_id: string
          size_bytes: number | null
          storage_path: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          format: string
          id?: string
          report_id: string
          size_bytes?: number | null
          storage_path: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          format?: string
          id?: string
          report_id?: string
          size_bytes?: number | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          auto_send_on_publish: boolean
          created_at: string
          created_by: string
          current_version: number
          expiry_date: string | null
          id: string
          name: string
          pin_encrypted: string | null
          pin_hash: string
          pin_updated_at: string
          slug: string
          space_id: string
          updated_at: string
        }
        Insert: {
          auto_send_on_publish?: boolean
          created_at?: string
          created_by: string
          current_version?: number
          expiry_date?: string | null
          id?: string
          name: string
          pin_encrypted?: string | null
          pin_hash: string
          pin_updated_at?: string
          slug: string
          space_id: string
          updated_at?: string
        }
        Update: {
          auto_send_on_publish?: boolean
          created_at?: string
          created_by?: string
          current_version?: number
          expiry_date?: string | null
          id?: string
          name?: string
          pin_encrypted?: string | null
          pin_hash?: string
          pin_updated_at?: string
          slug?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "client_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      verticals: {
        Row: {
          color_hex: string
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          color_hex: string
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          color_hex?: string
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "verticals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "employee"
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
      user_role: ["admin", "employee"],
    },
  },
} as const
