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
      approvals: {
        Row: {
          approved_by: string | null
          created_at: string
          decided_at: string | null
          id: string
          kind: string
          note: string | null
          payload: Json
          requested_by: string
          self_approved: boolean
          status: string
          subject_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          kind: string
          note?: string | null
          payload: Json
          requested_by: string
          self_approved?: boolean
          status?: string
          subject_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          payload?: Json
          requested_by?: string
          self_approved?: boolean
          status?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string | null
          created_at: string
          id: number
          ip: string | null
          new: Json | null
          old: Json | null
          row_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          ip?: string | null
          new?: Json | null
          old?: Json | null
          row_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          ip?: string | null
          new?: Json | null
          old?: Json | null
          row_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
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
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
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
      ledger_accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          kind: Database["public"]["Enums"]["ledger_account_kind"]
          load_id: string | null
          org_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_account_kind"]
          load_id?: string | null
          org_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_account_kind"]
          load_id?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          credit_kobo: number
          debit_kobo: number
          id: number
          transaction_id: string
        }
        Insert: {
          account_id: string
          credit_kobo?: number
          debit_kobo?: number
          id?: never
          transaction_id: string
        }
        Update: {
          account_id?: string
          credit_kobo?: number
          debit_kobo?: number
          id?: never
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["ledger_transaction_kind"]
          load_id: string | null
          memo: string | null
          trip_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["ledger_transaction_kind"]
          load_id?: string | null
          memo?: string | null
          trip_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["ledger_transaction_kind"]
          load_id?: string | null
          memo?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notify_channel"]
          code: string
          language: Database["public"]["Enums"]["language_code"]
          meta_category: string | null
          meta_status: string | null
          meta_template_name: string | null
          subject: string | null
          variables: string[]
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notify_channel"]
          code: string
          language?: Database["public"]["Enums"]["language_code"]
          meta_category?: string | null
          meta_status?: string | null
          meta_template_name?: string | null
          subject?: string | null
          variables?: string[]
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notify_channel"]
          code?: string
          language?: Database["public"]["Enums"]["language_code"]
          meta_category?: string | null
          meta_status?: string | null
          meta_template_name?: string | null
          subject?: string | null
          variables?: string[]
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: Database["public"]["Enums"]["notify_channel"]
          enabled: boolean
          event: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notify_channel"]
          enabled: boolean
          event: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notify_channel"]
          enabled?: boolean
          event?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["notify_channel"]
          claimed_at: string | null
          created_at: string
          dedupe_key: string | null
          deliver_when_stopped: boolean
          error: string | null
          event: string
          fallback_of: string | null
          id: string
          language: Database["public"]["Enums"]["language_code"]
          load_id: string | null
          next_attempt_at: string
          payload: Json
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notify_status"]
          template_code: string
          to_email: string | null
          to_phone: string | null
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["notify_channel"]
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          deliver_when_stopped?: boolean
          error?: string | null
          event: string
          fallback_of?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          load_id?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notify_status"]
          template_code: string
          to_email?: string | null
          to_phone?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notify_channel"]
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          deliver_when_stopped?: boolean
          error?: string | null
          event?: string
          fallback_of?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          load_id?: string | null
          next_attempt_at?: string
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notify_status"]
          template_code?: string
          to_email?: string | null
          to_phone?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_fallback_of_fkey"
            columns: ["fallback_of"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          joining_as: string | null
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
          joining_as?: string | null
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
          joining_as?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_ok_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_ok_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_ok_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string
          is_money: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description: string
          is_money?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          is_money?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          corridor_ids: string[] | null
          created_at: string
          invited_by: string | null
          mfa_required: boolean
          role: Database["public"]["Enums"]["staff_role"]
          staff_code_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          corridor_ids?: string[] | null
          created_at?: string
          invited_by?: string | null
          mfa_required?: boolean
          role: Database["public"]["Enums"]["staff_role"]
          staff_code_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          corridor_ids?: string[] | null
          created_at?: string
          invited_by?: string | null
          mfa_required?: boolean
          role?: Database["public"]["Enums"]["staff_role"]
          staff_code_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      am_i_demo: { Args: never; Returns: boolean }
      accept_staff_code: { Args: never; Returns: undefined }
      accept_staff_invite: {
        Args: { p_token: string }
        Returns: Database["public"]["Enums"]["staff_role"]
      }
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
      can_self_approve: { Args: never; Returns: boolean }
      change_member_role: {
        Args: { p_org: string; p_role: string; p_user: string }
        Returns: undefined
      }
      change_setting: {
        Args: { p_key: string; p_note?: string; p_value: Json }
        Returns: string
      }
      claim_notifications: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          channel: Database["public"]["Enums"]["notify_channel"]
          event: string
          id: string
          language: Database["public"]["Enums"]["language_code"]
          payload: Json
          template_code: string
          to_email: string
          to_phone: string
        }[]
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
      create_staff_invite: {
        Args: {
          p_corridor_ids?: string[]
          p_email: string
          p_role: Database["public"]["Enums"]["staff_role"]
        }
        Returns: string
      }
      decide_approval: {
        Args: { p_approval: string; p_approve: boolean; p_note?: string }
        Returns: undefined
      }
      finish_notification: {
        Args: {
          p_error?: string
          p_id: string
          p_provider_message_id?: string
          p_result: string
        }
        Returns: undefined
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
      is_staff: {
        Args: { p_role?: Database["public"]["Enums"]["staff_role"] }
        Returns: boolean
      }
      is_staff_in: {
        Args: { p_roles: Database["public"]["Enums"]["staff_role"][] }
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
      ledger_account_balances: {
        Args: never
        Returns: {
          account_id: string
          balance_kobo: number
          kind: Database["public"]["Enums"]["ledger_account_kind"]
          load_id: string
          org_id: string
        }[]
      }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: undefined }
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
      my_staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      new_staff_backup_codes: { Args: never; Returns: string[] }
      org_permissions: { Args: { p_org: string }; Returns: string[] }
      public_setting: { Args: { p_key: string }; Returns: Json }
      queue_test_notification: {
        Args: { p_reference: string; p_to_email: string }
        Returns: number
      }
      remove_member: {
        Args: { p_org: string; p_user: string }
        Returns: undefined
      }
      revoke_invite: { Args: { p_invite: string }; Returns: undefined }
      set_active_org: { Args: { p_org: string }; Returns: undefined }
      set_notification_preference: {
        Args: {
          p_channel: Database["public"]["Enums"]["notify_channel"]
          p_enabled: boolean
          p_event: string
        }
        Returns: undefined
      }
      staff_backup_codes_left: { Args: never; Returns: number }
      staff_invite_details: {
        Args: { p_token: string }
        Returns: {
          role: Database["public"]["Enums"]["staff_role"]
          state: string
        }[]
      }
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
      use_staff_backup_code: { Args: { p_code: string }; Returns: boolean }
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
      ledger_account_kind:
        | "provider_cash"
        | "escrow"
        | "owner_payable"
        | "agent_payable"
        | "shipper_refundable"
        | "platform_revenue"
        | "processing_cost"
        | "promo_expense"
        | "dispute_reserve"
        | "owner_receivable"
      ledger_transaction_kind:
        | "fund_load"
        | "advance"
        | "balance"
        | "commission"
        | "fee"
        | "refund"
        | "cancellation"
        | "waiting"
        | "agent_share"
        | "promo"
        | "processing"
        | "adjustment"
      notify_channel: "whatsapp" | "sms" | "email" | "push" | "in_app"
      notify_status:
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "skipped"
      org_kind: "shipper" | "transporter"
      owner_tier: "new" | "established" | "gold"
      shipper_role: "owner" | "admin" | "booker" | "finance" | "viewer"
      staff_role:
        | "super_admin"
        | "operations"
        | "verification"
        | "finance"
        | "support"
        | "field_agent"
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
      ledger_account_kind: [
        "provider_cash",
        "escrow",
        "owner_payable",
        "agent_payable",
        "shipper_refundable",
        "platform_revenue",
        "processing_cost",
        "promo_expense",
        "dispute_reserve",
        "owner_receivable",
      ],
      ledger_transaction_kind: [
        "fund_load",
        "advance",
        "balance",
        "commission",
        "fee",
        "refund",
        "cancellation",
        "waiting",
        "agent_share",
        "promo",
        "processing",
        "adjustment",
      ],
      notify_channel: ["whatsapp", "sms", "email", "push", "in_app"],
      notify_status: [
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
        "skipped",
      ],
      org_kind: ["shipper", "transporter"],
      owner_tier: ["new", "established", "gold"],
      shipper_role: ["owner", "admin", "booker", "finance", "viewer"],
      staff_role: [
        "super_admin",
        "operations",
        "verification",
        "finance",
        "support",
        "field_agent",
      ],
      transporter_role: ["owner", "manager", "driver"],
    },
  },
} as const
