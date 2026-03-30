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
      blog_posts: {
        Row: {
          author_name: string
          category_slug: string | null
          city_slug: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category_slug?: string | null
          city_slug?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category_slug?: string | null
          city_slug?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      claim_requests: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          note: string | null
          phone: string
          status: string
          tax_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          note?: string | null
          phone: string
          status?: string
          tax_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          note?: string | null
          phone?: string
          status?: string
          tax_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          firm_id: string
          id: string
          lead_id: string | null
          stripe_session_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          lead_id?: string | null
          stripe_session_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          lead_id?: string | null
          stripe_session_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_for_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_gallery: {
        Row: {
          caption: string | null
          created_at: string
          firm_id: string
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          firm_id: string
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_gallery_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_reviews: {
        Row: {
          comment: string | null
          created_at: string
          firm_id: string
          id: string
          is_approved: boolean
          photo_url: string | null
          rating: number
          reviewer_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          firm_id: string
          id?: string
          is_approved?: boolean
          photo_url?: string | null
          rating: number
          reviewer_name: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          is_approved?: boolean
          photo_url?: string | null
          rating?: number
          reviewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_reviews_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address: string | null
          city: string
          coin_balance: number
          company_name: string
          created_at: string
          description: string | null
          detailed_services: Json | null
          district: string | null
          email: string | null
          google_maps_url: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          is_claimed: boolean
          is_premium: boolean
          logo_url: string | null
          phone: string
          premium_until: string | null
          response_time: string | null
          trust_badges: Json | null
          faq_items: Json | null
          before_after: Json | null
          portfolio_items: Json | null
          services: string[] | null
          slug: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_x: string | null
          social_youtube: string | null
          tax_number: string | null
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          coin_balance?: number
          company_name: string
          created_at?: string
          description?: string | null
          detailed_services?: Json | null
          district?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_claimed?: boolean
          is_premium?: boolean
          logo_url?: string | null
          phone: string
          premium_until?: string | null
          response_time?: string | null
          trust_badges?: Json | null
          faq_items?: Json | null
          before_after?: Json | null
          portfolio_items?: Json | null
          services?: string[] | null
          slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_x?: string | null
          social_youtube?: string | null
          tax_number?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          coin_balance?: number
          company_name?: string
          created_at?: string
          description?: string | null
          detailed_services?: Json | null
          district?: string | null
          email?: string | null
          google_maps_url?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_claimed?: boolean
          is_premium?: boolean
          logo_url?: string | null
          phone?: string
          premium_until?: string | null
          response_time?: string | null
          trust_badges?: Json | null
          faq_items?: Json | null
          before_after?: Json | null
          portfolio_items?: Json | null
          services?: string[] | null
          slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_x?: string | null
          social_youtube?: string | null
          tax_number?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      lead_purchases: {
        Row: {
          amount: number
          created_at: string
          firm_id: string
          id: string
          lead_id: string
          purchased_at: string
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          firm_id: string
          id?: string
          lead_id: string
          purchased_at?: string
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          firm_id?: string
          id?: string
          lead_id?: string
          purchased_at?: string
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_for_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          admin_approved: boolean
          area_size: string | null
          assigned_firms: string[] | null
          budget: string
          city: string
          created_at: string
          current_condition: string | null
          district: string | null
          email: string
          full_name: string
          id: string
          irrigation_system: string | null
          irrigation_type: string | null
          lead_score: number | null
          notes: string | null
          phone: string
          photo_urls: string[] | null
          project_size: string | null
          project_type: string | null
          property_type: string | null
          scope: string[] | null
          service_type: string
          status: string
          timeline: string
          updated_at: string
          user_id: string
          water_source: string | null
          token_price: number
        }
        Insert: {
          address?: string | null
          admin_approved?: boolean
          area_size?: string | null
          assigned_firms?: string[] | null
          budget: string
          city: string
          created_at?: string
          current_condition?: string | null
          district?: string | null
          email: string
          full_name: string
          id?: string
          irrigation_system?: string | null
          irrigation_type?: string | null
          lead_score?: number | null
          notes?: string | null
          phone: string
          photo_urls?: string[] | null
          project_size?: string | null
          project_type?: string | null
          property_type?: string | null
          scope?: string[] | null
          service_type: string
          status?: string
          timeline: string
          updated_at?: string
          user_id: string
          water_source?: string | null
          token_price?: number
        }
        Update: {
          address?: string | null
          admin_approved?: boolean
          area_size?: string | null
          assigned_firms?: string[] | null
          budget?: string
          city?: string
          created_at?: string
          current_condition?: string | null
          district?: string | null
          email?: string
          full_name?: string
          id?: string
          irrigation_system?: string | null
          irrigation_type?: string | null
          lead_score?: number | null
          notes?: string | null
          phone?: string
          photo_urls?: string[] | null
          project_size?: string | null
          project_type?: string | null
          property_type?: string | null
          scope?: string[] | null
          service_type?: string
          status?: string
          timeline?: string
          updated_at?: string
          user_id?: string
          water_source?: string | null
          token_price?: number
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
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
      leads_for_firms: {
        Row: {
          address: string | null
          assigned_firms: string[] | null
          budget: string | null
          city: string | null
          created_at: string | null
          district: string | null
          email: string | null
          full_name: string | null
          id: string | null
          lead_score: number | null
          phone: string | null
          project_size: string | null
          service_type: string | null
          status: string | null
          timeline: string | null
          updated_at: string | null
          user_id: string | null
          token_price: number | null
        }
        Insert: {
          address?: string | null
          assigned_firms?: string[] | null
          budget?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
          email?: never
          full_name?: never
          id?: string | null
          lead_score?: number | null
          phone?: never
          project_size?: string | null
          service_type?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string | null
          token_price?: number | null
        }
        Update: {
          address?: string | null
          assigned_firms?: string[] | null
          budget?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
          email?: never
          full_name?: never
          id?: string | null
          lead_score?: number | null
          phone?: never
          project_size?: string | null
          service_type?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string | null
          token_price?: number | null
        }
        Relationships: []
      }
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
      app_role: "homeowner" | "firm" | "admin"
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
      app_role: ["homeowner", "firm", "admin"],
    },
  },
} as const
