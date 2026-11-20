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
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string | null
          kind: string
          org_id: string
          phone: string | null
          revoked_at: string | null
          role_payload: Json
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          kind: string
          org_id: string
          phone?: string | null
          revoked_at?: string | null
          role_payload: Json
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          kind?: string
          org_id?: string
          phone?: string | null
          revoked_at?: string | null
          role_payload?: Json
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          invited_by: string | null
          is_driver: boolean
          org_id: string
          shipper_role: Database["public"]["Enums"]["shipper_role"] | null
          status: Database["public"]["Enums"]["account_status"]
          transporter_role:
            | Database["public"]["Enums"]["transporter_role"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          is_driver?: boolean
          org_id: string
          shipper_role?: Database["public"]["Enums"]["shipper_role"] | null
          status?: Database["public"]["Enums"]["account_status"]
          transporter_role?:
            | Database["public"]["Enums"]["transporter_role"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          is_driver?: boolean
          org_id?: string
          shipper_role?: Database["public"]["Enums"]["shipper_role"] | null
          status?: Database["public"]["Enums"]["account_status"]
          transporter_role?:
            | Database["public"]["Enums"]["transporter_role"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          blocked_reason: string | null
          cac_number: string | null
          created_at: string
          created_by: string | null
          id: string
          insured_until: string | null
          kind: Database["public"]["Enums"]["org_kind"]
          logo_path: string | null
          name: string
          status: Database["public"]["Enums"]["account_status"]
          tier: Database["public"]["Enums"]["owner_tier"] | null
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          cac_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insured_until?: string | null
          kind: Database["public"]["Enums"]["org_kind"]
          logo_path?: string | null
          name: string
          status?: Database["public"]["Enums"]["account_status"]
          tier?: Database["public"]["Enums"]["owner_tier"] | null
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          cac_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insured_until?: string | null
          kind?: Database["public"]["Enums"]["org_kind"]
          logo_path?: string | null
          name?: string
          status?: Database["public"]["Enums"]["account_status"]
          tier?: Database["public"]["Enums"]["owner_tier"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
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
        Relationships: [
          {
            foreignKeyName: "profiles_last_active_org_fk"
            columns: ["last_active_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      accept_invite: { Args: { p_token: string }; Returns: string }
      auth_code_failed: { Args: { p_key: string }; Returns: number }
      auth_code_open: { Args: { p_key: string }; Returns: boolean }
      auth_code_passed: { Args: { p_key: string }; Returns: undefined }
      auth_code_refund: { Args: { p_key: string }; Returns: undefined }
      auth_code_sending: {
        Args: { p_ip_key: string; p_key: string }
        Returns: boolean
      }
      auth_code_try: { Args: { p_key: string }; Returns: number }
      can_grant_role: {
        Args: { p_org: string; p_payload: Json }
        Returns: boolean
      }
      can_in_org: {
        Args: { p_action: string; p_org: string }
        Returns: boolean
      }
      change_member_role: {
        Args: { p_org: string; p_role: string; p_user: string }
        Returns: undefined
      }
      create_invite: {
        Args: {
          p_email?: string
          p_org: string
          p_phone?: string
          p_role: string
        }
        Returns: string
      }
      create_organization: {
        Args: {
          p_cac_number?: string
          p_is_driver?: boolean
          p_kind: Database["public"]["Enums"]["org_kind"]
          p_name: string
        }
        Returns: string
      }
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
      invite_details: {
        Args: { p_token: string }
        Returns: {
          invited_by_first_name: string
          org_kind: Database["public"]["Enums"]["org_kind"]
          org_name: string
          role: string
          state: string
        }[]
      }
      is_member: { Args: { p_org: string }; Returns: boolean }
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
      member_role: { Args: { p_org: string }; Returns: string }
      my_accounts: {
        Args: never
        Returns: {
          is_active: boolean
          is_driver: boolean
          kind: Database["public"]["Enums"]["org_kind"]
          name: string
          org_id: string
          role: string
        }[]
      }
      org_permissions: { Args: { p_org: string }; Returns: string[] }
      remove_member: {
        Args: { p_org: string; p_user: string }
        Returns: undefined
      }
      revoke_invite: { Args: { p_invite: string }; Returns: undefined }
      set_active_org: { Args: { p_org: string }; Returns: undefined }
      team_members: {
        Args: { p_org: string }
        Returns: {
          email: string
          full_name: string
          is_driver: boolean
          is_me: boolean
          phone: string
          role: string
          status: Database["public"]["Enums"]["account_status"]
          user_id: string
        }[]
      }
      update_organization: {
        Args: { p_cac_number?: string; p_name: string; p_org: string }
        Returns: undefined
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
      org_kind: "shipper" | "transporter"
      owner_tier: "new" | "established" | "gold"
      shipper_role: "owner" | "admin" | "booker" | "finance" | "viewer"
      transporter_role: "owner" | "manager" | "driver"
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
      org_kind: ["shipper", "transporter"],
      owner_tier: ["new", "established", "gold"],
      shipper_role: ["owner", "admin", "booker", "finance", "viewer"],
      transporter_role: ["owner", "manager", "driver"],
    },
  },
} as const
