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
      ai_usage: {
        Row: {
          created_at: string
          id: string
          kind: string
          lease_generation: number | null
          lease_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          lease_generation?: number | null
          lease_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lease_generation?: number | null
          lease_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      guest_claim_tokens: {
        Row: {
          anonymous_user_id: string
          claimed_owner_id: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          token: string
        }
        Insert: {
          anonymous_user_id: string
          claimed_owner_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          token: string
        }
        Update: {
          anonymous_user_id?: string
          claimed_owner_id?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          token?: string
        }
        Relationships: []
      }
      habit_patterns: {
        Row: {
          auto_apply: boolean
          corrected_grams: number | null
          corrected_name: string | null
          created_at: string
          device_id: string | null
          id: string
          occurrence_count: number
          original_name: string
          preferred_cook_method: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_apply?: boolean
          corrected_grams?: number | null
          corrected_name?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          occurrence_count?: number
          original_name: string
          preferred_cook_method?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_apply?: boolean
          corrected_grams?: number | null
          corrected_name?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          occurrence_count?: number
          original_name?: string
          preferred_cook_method?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meal_analyses: {
        Row: {
          calories: number
          carbs_g: number
          consumed_at: string | null
          created_at: string
          fat_g: number
          food_name: string
          id: string
          idempotency_key: string | null
          ingredients: Json
          meal_id: string | null
          model: string | null
          protein_g: number
          provider: string | null
          suggestion: string | null
          uncertainty: string | null
          user_id: string
          validation_status: string | null
          verdict: string | null
        }
        Insert: {
          calories: number
          carbs_g: number
          consumed_at?: string | null
          created_at?: string
          fat_g: number
          food_name: string
          id?: string
          idempotency_key?: string | null
          ingredients?: Json
          meal_id?: string | null
          model?: string | null
          protein_g: number
          provider?: string | null
          suggestion?: string | null
          uncertainty?: string | null
          user_id: string
          validation_status?: string | null
          verdict?: string | null
        }
        Update: {
          calories?: number
          carbs_g?: number
          consumed_at?: string | null
          created_at?: string
          fat_g?: number
          food_name?: string
          id?: string
          idempotency_key?: string | null
          ingredients?: Json
          meal_id?: string | null
          model?: string | null
          protein_g?: number
          provider?: string | null
          suggestion?: string | null
          uncertainty?: string | null
          user_id?: string
          validation_status?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_analyses_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meal_records"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_feedbacks: {
        Row: {
          actual_feeling: string
          created_at: string
          damage_adjustment: number | null
          device_id: string | null
          food_name: string
          id: string
          ingredients: Json | null
          meal_id: string
          predicted_feeling: string | null
          prediction_correct: boolean | null
          user_id: string | null
        }
        Insert: {
          actual_feeling: string
          created_at?: string
          damage_adjustment?: number | null
          device_id?: string | null
          food_name: string
          id?: string
          ingredients?: Json | null
          meal_id: string
          predicted_feeling?: string | null
          prediction_correct?: boolean | null
          user_id?: string | null
        }
        Update: {
          actual_feeling?: string
          created_at?: string
          damage_adjustment?: number | null
          device_id?: string | null
          food_name?: string
          id?: string
          ingredients?: Json | null
          meal_id?: string
          predicted_feeling?: string | null
          prediction_correct?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      meal_records: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          device_id: string | null
          fat_g: number
          food_name: string
          id: string
          image_url: string | null
          ingredients: Json | null
          meal_type: string | null
          protein_g: number
          recorded_at: string
          sequence_score: number | null
          suggestion: string | null
          updated_at: string
          user_id: string | null
          verdict: string | null
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          device_id?: string | null
          fat_g?: number
          food_name: string
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          meal_type?: string | null
          protein_g?: number
          recorded_at?: string
          sequence_score?: number | null
          suggestion?: string | null
          updated_at?: string
          user_id?: string | null
          verdict?: string | null
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          device_id?: string | null
          fat_g?: number
          food_name?: string
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          meal_type?: string | null
          protein_g?: number
          recorded_at?: string
          sequence_score?: number | null
          suggestion?: string | null
          updated_at?: string
          user_id?: string | null
          verdict?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          allergies: string | null
          avatar_url: string | null
          cooking_source: string | null
          created_at: string
          device_id: string | null
          diet_preference: string | null
          gender: string | null
          goal: string | null
          health_conditions: string[] | null
          height_cm: number | null
          id: string
          nickname: string | null
          onboarding_completed: boolean
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_protein_g: number | null
          tdee: number | null
          updated_at: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          allergies?: string | null
          avatar_url?: string | null
          cooking_source?: string | null
          created_at?: string
          device_id?: string | null
          diet_preference?: string | null
          gender?: string | null
          goal?: string | null
          health_conditions?: string[] | null
          height_cm?: number | null
          id?: string
          nickname?: string | null
          onboarding_completed?: boolean
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          tdee?: number | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          allergies?: string | null
          avatar_url?: string | null
          cooking_source?: string | null
          created_at?: string
          device_id?: string | null
          diet_preference?: string | null
          gender?: string | null
          goal?: string | null
          health_conditions?: string[] | null
          height_cm?: number | null
          id?: string
          nickname?: string | null
          onboarding_completed?: boolean
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_protein_g?: number | null
          tdee?: number | null
          updated_at?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_guest_meals: {
        Args: { p_owner_id: string; p_token: string }
        Returns: Json
      }
      complete_guest_food_slot: {
        Args: { p_lease_id: string; p_user_id: string }
        Returns: boolean
      }
      consume_analysis_into_meal: {
        Args: {
          p_analysis_id: string
          p_meal_type: string
          p_replace_meal_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      consume_hourly_ai_slot: { Args: { p_limit: number }; Returns: boolean }
      issue_guest_claim_token: {
        Args: { p_anonymous_user_id: string }
        Returns: string
      }
      purge_user_owned_rows: { Args: { p_user_id: string }; Returns: undefined }
      release_guest_food_slot: {
        Args: { p_lease_id: string; p_user_id: string }
        Returns: boolean
      }
      reserve_guest_food_slot: { Args: { p_user_id: string }; Returns: Json }
      store_guest_analysis_with_lease: {
        Args: {
          p_calories: number
          p_carbs_g: number
          p_fat_g: number
          p_food_name: string
          p_idempotency_key: string
          p_ingredients: Json
          p_lease_id: string
          p_model: string
          p_protein_g: number
          p_provider: string
          p_suggestion: string
          p_uncertainty: string
          p_user_id: string
          p_verdict: string
        }
        Returns: Json
      }
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
    Enums: {},
  },
} as const
