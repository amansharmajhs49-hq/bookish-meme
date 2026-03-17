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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          announcement_type: string
          created_at: string
          created_by: string | null
          id: string
          message_template: string
          occasion_date: string | null
          title: string
        }
        Insert: {
          announcement_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message_template: string
          occasion_date?: string | null
          title: string
        }
        Update: {
          announcement_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message_template?: string
          occasion_date?: string | null
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          client_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          client_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          client_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      body_progress: {
        Row: {
          biceps: number | null
          body_fat: number | null
          chest: number | null
          client_id: string
          created_at: string
          height: number | null
          hips: number | null
          id: string
          notes: string | null
          photo_paths: string[] | null
          recorded_at: string
          thighs: number | null
          updated_at: string
          waist: number | null
          weight: number | null
        }
        Insert: {
          biceps?: number | null
          body_fat?: number | null
          chest?: number | null
          client_id: string
          created_at?: string
          height?: number | null
          hips?: number | null
          id?: string
          notes?: string | null
          photo_paths?: string[] | null
          recorded_at?: string
          thighs?: number | null
          updated_at?: string
          waist?: number | null
          weight?: number | null
        }
        Update: {
          biceps?: number | null
          body_fat?: number | null
          chest?: number | null
          client_id?: string
          created_at?: string
          height?: number | null
          hips?: number | null
          id?: string
          notes?: string | null
          photo_paths?: string[] | null
          recorded_at?: string
          thighs?: number | null
          updated_at?: string
          waist?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_links: {
        Row: {
          client_id_1: string
          client_id_2: string
          created_at: string
          created_by: string | null
          id: string
          link_type: string
        }
        Insert: {
          client_id_1: string
          client_id_2: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
        }
        Update: {
          client_id_1?: string
          client_id_2?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_links_client_id_1_fkey"
            columns: ["client_id_1"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_links_client_id_2_fkey"
            columns: ["client_id_2"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          advance_balance: number | null
          alias_name: string | null
          created_at: string
          first_name: string | null
          goal: string | null
          id: string
          is_inactive: boolean | null
          last_name: string | null
          name: string
          onboarding_completed: boolean
          phone: string
          photo_path: string | null
          pin: string | null
          remarks: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advance_balance?: number | null
          alias_name?: string | null
          created_at?: string
          first_name?: string | null
          goal?: string | null
          id?: string
          is_inactive?: boolean | null
          last_name?: string | null
          name: string
          onboarding_completed?: boolean
          phone: string
          photo_path?: string | null
          pin?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advance_balance?: number | null
          alias_name?: string | null
          created_at?: string
          first_name?: string | null
          goal?: string | null
          id?: string
          is_inactive?: boolean | null
          last_name?: string | null
          name?: string
          onboarding_completed?: boolean
          phone?: string
          photo_path?: string | null
          pin?: string | null
          remarks?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          recurring_interval: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          recurring_interval?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          recurring_interval?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      extension_logs: {
        Row: {
          admin_id: string | null
          client_id: string
          created_at: string
          extended_days: number
          id: string
          join_id: string
          new_end_date: string
          previous_end_date: string
        }
        Insert: {
          admin_id?: string | null
          client_id: string
          created_at?: string
          extended_days: number
          id?: string
          join_id: string
          new_end_date: string
          previous_end_date: string
        }
        Update: {
          admin_id?: string | null
          client_id?: string
          created_at?: string
          extended_days?: number
          id?: string
          join_id?: string
          new_end_date?: string
          previous_end_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_logs_join_id_fkey"
            columns: ["join_id"]
            isOneToOne: false
            referencedRelation: "joins"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_locks: {
        Row: {
          feature_key: string
          is_locked: boolean
          locked_message: string | null
          updated_at: string | null
        }
        Insert: {
          feature_key: string
          is_locked?: boolean
          locked_message?: string | null
          updated_at?: string | null
        }
        Update: {
          feature_key?: string
          is_locked?: boolean
          locked_message?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hosting_plans_v2: {
        Row: {
          billing_cycle: string
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          plan_name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      hosting_subscriptions: {
        Row: {
          admin_id: string
          created_at: string | null
          expiry_date: string
          id: string
          payment_link: string | null
          payment_qr: string | null
          plan_id: string | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          expiry_date: string
          id?: string
          payment_link?: string | null
          payment_qr?: string | null
          plan_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          payment_link?: string | null
          payment_qr?: string | null
          plan_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosting_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hosting_plans_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      joins: {
        Row: {
          client_id: string
          created_at: string
          custom_price: number | null
          expiry_date: string
          id: string
          join_date: string
          plan_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          custom_price?: number | null
          expiry_date: string
          id?: string
          join_date?: string
          plan_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          custom_price?: number | null
          expiry_date?: string
          id?: string
          join_date?: string
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "joins_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_after: number | null
          due_before: number | null
          id: string
          join_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          product_purchase_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          due_after?: number | null
          due_before?: number | null
          id?: string
          join_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          product_purchase_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_after?: number | null
          due_before?: number | null
          id?: string
          join_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          product_purchase_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_join_id_fkey"
            columns: ["join_id"]
            isOneToOne: false
            referencedRelation: "joins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_product_purchase_id_fkey"
            columns: ["product_purchase_id"]
            isOneToOne: false
            referencedRelation: "product_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_months: number
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_months?: number
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_months?: number
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_logins: {
        Row: {
          client_id: string
          client_name: string
          client_phone: string
          id: string
          logged_in_at: string
        }
        Insert: {
          client_id: string
          client_name: string
          client_phone: string
          id?: string
          logged_in_at?: string
        }
        Update: {
          client_id?: string
          client_name?: string
          client_phone?: string
          id?: string
          logged_in_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_logins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          product_id: string
          purchase_date: string
          quantity: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          purchase_date?: string
          quantity?: number
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          purchase_date?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          stock: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          stock?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          stock?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          client_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          client_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          client_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          id: string
          is_read: boolean
          message: string
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          description: string | null
          facebook_url: string | null
          gallery_enabled: boolean | null
          gym_name: string | null
          hero_bg_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          payment_name: string | null
          primary_color: string | null
          tagline: string | null
          timings_weekday: string | null
          timings_weekend: string | null
          updated_at: string | null
          upi_id: string | null
          upi_qr: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          description?: string | null
          facebook_url?: string | null
          gallery_enabled?: boolean | null
          gym_name?: string | null
          hero_bg_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          payment_name?: string | null
          primary_color?: string | null
          tagline?: string | null
          timings_weekday?: string | null
          timings_weekend?: string | null
          updated_at?: string | null
          upi_id?: string | null
          upi_qr?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          description?: string | null
          facebook_url?: string | null
          gallery_enabled?: boolean | null
          gym_name?: string | null
          hero_bg_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          payment_name?: string | null
          primary_color?: string | null
          tagline?: string | null
          timings_weekday?: string | null
          timings_weekend?: string | null
          updated_at?: string | null
          upi_id?: string | null
          upi_qr?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      whatsapp_reminders: {
        Row: {
          client_id: string
          created_at: string
          id: string
          message: string | null
          reminder_type: string
          sent_at: string
          status: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          message?: string | null
          reminder_type: string
          sent_at?: string
          status?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          message?: string | null
          reminder_type?: string
          sent_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_portal_data: {
        Args: { p_client_id: string; p_pin: string }
        Returns: Json
      }
      get_public_website_settings: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_signup_enabled: { Args: never; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      verify_client_portal: {
        Args: { p_phone: string; p_pin: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user" | "moderator"
      client_status: "Active" | "Expired" | "Left" | "Deleted"
      membership_status: "ACTIVE" | "PAYMENT_DUE" | "EXPIRED" | "INACTIVE"
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
      app_role: ["super_admin", "admin", "user", "moderator"],
      client_status: ["Active", "Expired", "Left", "Deleted"],
      membership_status: ["ACTIVE", "PAYMENT_DUE", "EXPIRED", "INACTIVE"],
    },
  },
} as const
