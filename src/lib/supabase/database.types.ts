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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      consents: {
        Row: {
          at: string
          granted: boolean
          id: number
          ip_key: string | null
          kind: Database["public"]["Enums"]["consent_kind"]
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          at?: string
          granted: boolean
          id?: never
          ip_key?: string | null
          kind: Database["public"]["Enums"]["consent_kind"]
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          at?: string
          granted?: boolean
          id?: never
          ip_key?: string | null
          kind?: Database["public"]["Enums"]["consent_kind"]
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          language: Database["public"]["Enums"]["language_code"]
          last_active_org_id: string | null
          night_look: string
          nin_enc: string | null
          nin_last4: string | null
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          language?: Database["public"]["Enums"]["language_code"]
          last_active_org_id?: string | null
          night_look?: string
          nin_enc?: string | null
          nin_last4?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          language?: Database["public"]["Enums"]["language_code"]
          last_active_org_id?: string | null
          night_look?: string
          nin_enc?: string | null
          nin_last4?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          consent_at: string
          corridor_interest: string[]
          created_at: string
          email: string | null
          id: string
          invited_at: string | null
          name: string
          phone: string
          role: string
          source: string
          trucks_count: number | null
        }
        Insert: {
          consent_at: string
          corridor_interest?: string[]
          created_at?: string
          email?: string | null
          id?: string
          invited_at?: string | null
          name: string
          phone: string
          role: string
          source?: string
          trucks_count?: number | null
        }
        Update: {
          consent_at?: string
          corridor_interest?: string[]
          created_at?: string
          email?: string | null
          id?: string
          invited_at?: string | null
          name?: string
          phone?: string
          role?: string
          source?: string
          trucks_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_code_failed: { Args: { p_key: string }; Returns: number }
      auth_code_open: { Args: { p_key: string }; Returns: boolean }
      auth_code_passed: { Args: { p_key: string }; Returns: undefined }
      auth_code_refund: { Args: { p_key: string }; Returns: undefined }
      auth_code_try: { Args: { p_key: string }; Returns: number }
      give_onboarding_consents: {
        Args: {
          p_ip_key?: string
          p_marketing: boolean
          p_user_agent?: string
          p_version: string
        }
        Returns: undefined
      }
      has_accepted_terms: { Args: { p_version: string }; Returns: boolean }
      auth_code_sending: {
        Args: { p_ip_key: string; p_key: string }
        Returns: boolean
      }
      join_waitlist: {
        Args: {
          p_corridors: string[]
          p_email: string
          p_ip_key: string
          p_name: string
          p_phone: string
          p_role: string
          p_source: string
          p_trucks: number
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "pending" | "suspended" | "banned"
      consent_kind: "terms" | "privacy" | "whatsapp" | "location" | "marketing"
      kyc_status:
        | "not_started"
        | "in_progress"
        | "approved"
        | "declined"
        | "needs_review"
        | "expired"
      language_code: "en" | "pcm" | "ha" | "yo" | "ig"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "pending", "suspended", "banned"],
      consent_kind: ["terms", "privacy", "whatsapp", "location", "marketing"],
      kyc_status: [
        "not_started",
        "in_progress",
        "approved",
        "declined",
        "needs_review",
        "expired",
      ],
      language_code: ["en", "pcm", "ha", "yo", "ig"],
    },
  },
} as const
