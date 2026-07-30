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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          cost_sms: number
          created_at: string
          delivered_count: number
          failed_count: number
          id: string
          message: string
          metadata: Json | null
          name: string
          recipient_count: number
          scheduled_at: string | null
          sender_id: string | null
          sent_count: number
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_sms?: number
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          message: string
          metadata?: Json | null
          name: string
          recipient_count?: number
          scheduled_at?: string | null
          sender_id?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_sms?: number
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          message?: string
          metadata?: Json | null
          name?: string
          recipient_count?: number
          scheduled_at?: string | null
          sender_id?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_group_members: {
        Row: {
          added_at: string
          contact_id: string
          group_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          group_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          name: string | null
          phone: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          allow_custom_amount: boolean | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          price_per_sms: number
          slug: string
          sms_count: number
          sort_order: number
          total_price: number
          updated_at: string
        }
        Insert: {
          allow_custom_amount?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          price_per_sms: number
          slug: string
          sms_count: number
          sort_order?: number
          total_price: number
          updated_at?: string
        }
        Update: {
          allow_custom_amount?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          price_per_sms?: number
          slug?: string
          sms_count?: number
          sort_order?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sender_id_marketplace: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          network: string | null
          price_kes: number
          rating: number | null
          sales_count: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          network?: string | null
          price_kes: number
          rating?: number | null
          sales_count?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          network?: string | null
          price_kes?: number
          rating?: number | null
          sales_count?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sender_ids: {
        Row: {
          admin_notes: string | null
          business_name: string
          category: string | null
          created_at: string
          description: string | null
          document_urls: string[] | null
          id: string
          invoice_number: string | null
          network: string | null
          purpose: string
          sender_id: string
          status: Database["public"]["Enums"]["sender_id_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_name: string
          category?: string | null
          created_at?: string
          description?: string | null
          document_urls?: string[] | null
          id?: string
          invoice_number?: string | null
          network?: string | null
          purpose: string
          sender_id: string
          status?: Database["public"]["Enums"]["sender_id_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_name?: string
          category?: string | null
          created_at?: string
          description?: string | null
          document_urls?: string[] | null
          id?: string
          invoice_number?: string | null
          network?: string | null
          purpose?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["sender_id_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_balances: {
        Row: {
          free_sms: number
          free_sms_granted: boolean
          paid_sms: number
          total_delivered: number
          total_failed: number
          total_sent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          free_sms?: number
          free_sms_granted?: boolean
          paid_sms?: number
          total_delivered?: number
          total_failed?: number
          total_sent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          free_sms?: number
          free_sms_granted?: boolean
          paid_sms?: number
          total_delivered?: number
          total_failed?: number
          total_sent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          delivered_at: string | null
          error: string | null
          id: string
          message: string
          phone: string
          provider_message_id: string | null
          provider_response: Json | null
          sender_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["sms_status"]
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          message: string
          phone: string
          provider_message_id?: string | null
          provider_response?: Json | null
          sender_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"]
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          message?: string
          phone?: string
          provider_message_id?: string | null
          provider_response?: Json | null
          sender_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_kes: number
          created_at: string
          id: string
          mpesa_checkout_id: string | null
          mpesa_receipt: string | null
          package_id: string | null
          phone: string
          raw_callback: Json | null
          sender_id_market_id: string | null
          sms_credited: number
          status: Database["public"]["Enums"]["transaction_status"]
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          created_at?: string
          id?: string
          mpesa_checkout_id?: string | null
          mpesa_receipt?: string | null
          package_id?: string | null
          phone: string
          raw_callback?: Json | null
          sender_id_market_id?: string | null
          sms_credited?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          created_at?: string
          id?: string
          mpesa_checkout_id?: string | null
          mpesa_receipt?: string | null
          package_id?: string | null
          phone?: string
          raw_callback?: Json | null
          sender_id_market_id?: string | null
          sms_credited?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
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
      wallets: {
        Row: {
          balance_kes: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_kes?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_kes?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_sms: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      deduct_sms: {
        Args: { _amount: number; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "reseller" | "developer" | "admin"
      campaign_status:
        | "draft"
        | "scheduled"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      sender_id_status: "pending" | "approved" | "rejected" | "active"
      sms_status: "queued" | "sent" | "delivered" | "failed" | "undelivered"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
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
      app_role: ["customer", "reseller", "developer", "admin"],
      campaign_status: [
        "draft",
        "scheduled",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      sender_id_status: ["pending", "approved", "rejected", "active"],
      sms_status: ["queued", "sent", "delivered", "failed", "undelivered"],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
    },
  },
} as const
