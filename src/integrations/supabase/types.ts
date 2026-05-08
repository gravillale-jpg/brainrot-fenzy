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
      brainrots_catalog: {
        Row: {
          base_click: number
          base_passive: number
          base_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_starter: boolean
          name: string
          rarity: Database["public"]["Enums"]["rarity"]
          sell_price: number
          theme_set: string | null
        }
        Insert: {
          base_click?: number
          base_passive?: number
          base_price?: number
          created_at?: string
          description?: string | null
          id: string
          image_url?: string | null
          is_starter?: boolean
          name: string
          rarity: Database["public"]["Enums"]["rarity"]
          sell_price?: number
          theme_set?: string | null
        }
        Update: {
          base_click?: number
          base_passive?: number
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_starter?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["rarity"]
          sell_price?: number
          theme_set?: string | null
        }
        Relationships: []
      }
      pets_catalog: {
        Row: {
          base_price: number
          click_bonus: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          luck_bonus: number
          name: string
          passive_bonus: number
          quest_bonus: number
          rarity: Database["public"]["Enums"]["rarity"]
          sell_price: number
          theme_set: string | null
        }
        Insert: {
          base_price?: number
          click_bonus?: number
          created_at?: string
          description?: string | null
          id: string
          image_url?: string | null
          luck_bonus?: number
          name: string
          passive_bonus?: number
          quest_bonus?: number
          rarity: Database["public"]["Enums"]["rarity"]
          sell_price?: number
          theme_set?: string | null
        }
        Update: {
          base_price?: number
          click_bonus?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          luck_bonus?: number
          name?: string
          passive_bonus?: number
          quest_bonus?: number
          rarity?: Database["public"]["Enums"]["rarity"]
          sell_price?: number
          theme_set?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nickname: string
          nickname_lower: string
          settings: Json
        }
        Insert: {
          created_at?: string
          id: string
          nickname: string
          nickname_lower: string
          settings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string
          nickname_lower?: string
          settings?: Json
        }
        Relationships: []
      }
      quests_catalog: {
        Row: {
          difficulty: number
          id: string
          kind: string
          reward_btoken: number
          target_meta: Json
          target_value: number
          title_en: string
          title_ru: string
        }
        Insert: {
          difficulty?: number
          id: string
          kind: string
          reward_btoken?: number
          target_meta?: Json
          target_value?: number
          title_en: string
          title_ru: string
        }
        Update: {
          difficulty?: number
          id?: string
          kind?: string
          reward_btoken?: number
          target_meta?: Json
          target_value?: number
          title_en?: string
          title_ru?: string
        }
        Relationships: []
      }
      roll_history: {
        Row: {
          brainrot_id: string
          cost: number
          created_at: string
          id: string
          result: Json
          user_brainrot_id: string
          user_id: string
        }
        Insert: {
          brainrot_id: string
          cost?: number
          created_at?: string
          id?: string
          result: Json
          user_brainrot_id: string
          user_id: string
        }
        Update: {
          brainrot_id?: string
          cost?: number
          created_at?: string
          id?: string
          result?: Json
          user_brainrot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roll_history_user_brainrot_id_fkey"
            columns: ["user_brainrot_id"]
            isOneToOne: false
            referencedRelation: "user_brainrots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brainrots: {
        Row: {
          acquired_at: string
          brainrot_id: string
          id: string
          modifiers: Json
          rolls_used: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          brainrot_id: string
          id?: string
          modifiers?: Json
          rolls_used?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          brainrot_id?: string
          id?: string
          modifiers?: Json
          rolls_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brainrots_brainrot_id_fkey"
            columns: ["brainrot_id"]
            isOneToOne: false
            referencedRelation: "brainrots_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_loadout: {
        Row: {
          equipped_brainrot: string | null
          pet_slot_1: string | null
          pet_slot_2: string | null
          pet_slot_3: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          equipped_brainrot?: string | null
          pet_slot_1?: string | null
          pet_slot_2?: string | null
          pet_slot_3?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          equipped_brainrot?: string | null
          pet_slot_1?: string | null
          pet_slot_2?: string | null
          pet_slot_3?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_loadout_equipped_brainrot_fkey"
            columns: ["equipped_brainrot"]
            isOneToOne: false
            referencedRelation: "user_brainrots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_loadout_pet_slot_1_fkey"
            columns: ["pet_slot_1"]
            isOneToOne: false
            referencedRelation: "user_pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_loadout_pet_slot_2_fkey"
            columns: ["pet_slot_2"]
            isOneToOne: false
            referencedRelation: "user_pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_loadout_pet_slot_3_fkey"
            columns: ["pet_slot_3"]
            isOneToOne: false
            referencedRelation: "user_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pets: {
        Row: {
          acquired_at: string
          id: string
          pet_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          pet_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          pet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pets_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quests: {
        Row: {
          quest_date: string
          quests: Json
          user_id: string
        }
        Insert: {
          quest_date: string
          quests?: Json
          user_id: string
        }
        Update: {
          quest_date?: string
          quests?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_shop: {
        Row: {
          items: Json
          refresh_at: string
          shop_type: Database["public"]["Enums"]["shop_type"]
          user_id: string
        }
        Insert: {
          items?: Json
          refresh_at?: string
          shop_type: Database["public"]["Enums"]["shop_type"]
          user_id: string
        }
        Update: {
          items?: Json
          refresh_at?: string
          shop_type?: Database["public"]["Enums"]["shop_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_state: {
        Row: {
          best_roll_multiplier: number
          btoken: number
          created_at: string
          last_click_window_count: number
          last_click_window_start: string
          last_passive_tick: string
          total_clicks: number
          total_earned: number
          user_id: string
        }
        Insert: {
          best_roll_multiplier?: number
          btoken?: number
          created_at?: string
          last_click_window_count?: number
          last_click_window_start?: string
          last_passive_tick?: string
          total_clicks?: number
          total_earned?: number
          user_id: string
        }
        Update: {
          best_roll_multiplier?: number
          btoken?: number
          created_at?: string
          last_click_window_count?: number
          last_click_window_start?: string
          last_passive_tick?: string
          total_clicks?: number
          total_earned?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          btoken: number
          nickname: string
          total_clicks: number
          total_earned: number
        }[]
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
      app_role: "admin" | "moderator" | "user"
      rarity:
        | "common"
        | "uncommon"
        | "rare"
        | "epic"
        | "mythic"
        | "legendary"
        | "secret"
      shop_type: "brainrot" | "pet"
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
      app_role: ["admin", "moderator", "user"],
      rarity: [
        "common",
        "uncommon",
        "rare",
        "epic",
        "mythic",
        "legendary",
        "secret",
      ],
      shop_type: ["brainrot", "pet"],
    },
  },
} as const
