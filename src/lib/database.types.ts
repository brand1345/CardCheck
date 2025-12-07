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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      parallel_images: {
        Row: {
          angle: string | null
          caption: string | null
          card_number: string | null
          created_at: string
          id: string
          is_approved: boolean
          parallel_id: string
          player_name: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          angle?: string | null
          caption?: string | null
          card_number?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          parallel_id: string
          player_name?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          angle?: string | null
          caption?: string | null
          card_number?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          parallel_id?: string
          player_name?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parallel_images_parallel_id_fkey"
            columns: ["parallel_id"]
            isOneToOne: false
            referencedRelation: "parallels"
            referencedColumns: ["id"]
          },
        ]
      }
      parallels: {
        Row: {
          color_family: string | null
          created_at: string
          finish: string | null
          id: string
          is_auto: boolean | null
          is_fotl_hit: boolean | null
          is_hobby_exclusive: boolean | null
          is_numbered: boolean | null
          is_retail_exclusive: boolean | null
          is_sp: boolean | null
          is_ssp: boolean | null
          name: string
          notes: string | null
          print_style: string | null
          product_id: string
          rarity_tier: string | null
          serial_max: number | null
          serial_min: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color_family?: string | null
          created_at?: string
          finish?: string | null
          id?: string
          is_auto?: boolean | null
          is_fotl_hit?: boolean | null
          is_hobby_exclusive?: boolean | null
          is_numbered?: boolean | null
          is_retail_exclusive?: boolean | null
          is_sp?: boolean | null
          is_ssp?: boolean | null
          name: string
          notes?: string | null
          print_style?: string | null
          product_id: string
          rarity_tier?: string | null
          serial_max?: number | null
          serial_min?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color_family?: string | null
          created_at?: string
          finish?: string | null
          id?: string
          is_auto?: boolean | null
          is_fotl_hit?: boolean | null
          is_hobby_exclusive?: boolean | null
          is_numbered?: boolean | null
          is_retail_exclusive?: boolean | null
          is_sp?: boolean | null
          is_ssp?: boolean | null
          name?: string
          notes?: string | null
          print_style?: string | null
          product_id?: string
          rarity_tier?: string | null
          serial_max?: number | null
          serial_min?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parallels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          full_display_name: string
          id: string
          is_active: boolean
          manufacturer_id: string
          name: string
          slug: string
          sport_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          full_display_name: string
          id?: string
          is_active?: boolean
          manufacturer_id: string
          name: string
          slug: string
          sport_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          full_display_name?: string
          id?: string
          is_active?: boolean
          manufacturer_id?: string
          name?: string
          slug?: string
          sport_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          username?: string | null
        }
        Relationships: []
      }
      sports: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
