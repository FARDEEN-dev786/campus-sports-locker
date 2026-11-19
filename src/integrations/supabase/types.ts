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
      equipment: {
        Row: {
          available: number
          borrowed: number
          category: string
          icon: string
          id: string
          locked: number
          name: string
          requires_id: string | null
          slug: string
          sort_order: number
          total: number
        }
        Insert: {
          available: number
          borrowed?: number
          category: string
          icon: string
          id?: string
          locked?: number
          name: string
          requires_id?: string | null
          slug: string
          sort_order?: number
          total: number
        }
        Update: {
          available?: number
          borrowed?: number
          category?: string
          icon?: string
          id?: string
          locked?: number
          name?: string
          requires_id?: string | null
          slug?: string
          sort_order?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_requires_id_fkey"
            columns: ["requires_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          roll_number: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          roll_number?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          roll_number?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          confirmed_at: string | null
          ended_at: string | null
          equipment_id: string
          expires_at: string
          holder_id: string
          holder_name: string
          id: string
          is_simulation: boolean
          locked_at: string
          owner_id: string
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          ended_at?: string | null
          equipment_id: string
          expires_at: string
          holder_id: string
          holder_name: string
          id?: string
          is_simulation?: boolean
          locked_at?: string
          owner_id: string
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          ended_at?: string | null
          equipment_id?: string
          expires_at?: string
          holder_id?: string
          holder_name?: string
          id?: string
          is_simulation?: boolean
          locked_at?: string
          owner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      semaphore_log: {
        Row: {
          actor: string
          created_at: string
          equipment_id: string | null
          equipment_name: string | null
          id: number
          level: number | null
          message: string
          op: string
          owner_id: string | null
          sem_value: number | null
        }
        Insert: {
          actor: string
          created_at?: string
          equipment_id?: string | null
          equipment_name?: string | null
          id?: never
          level?: number | null
          message: string
          op: string
          owner_id?: string | null
          sem_value?: number | null
        }
        Update: {
          actor?: string
          created_at?: string
          equipment_id?: string | null
          equipment_name?: string | null
          id?: never
          level?: number | null
          message?: string
          op?: string
          owner_id?: string | null
          sem_value?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _actor_name: { Args: { _uid: string }; Returns: string }
      _cascade: { Args: { _holder: string }; Returns: undefined }
      _log:
        | {
            Args: {
              _actor: string
              _eq: string
              _level: number
              _msg: string
              _op: string
              _sem: number
            }
            Returns: undefined
          }
        | {
            Args: {
              _actor: string
              _eq: string
              _level: number
              _msg: string
              _op: string
              _owner: string
              _sem: number
            }
            Returns: undefined
          }
      _release: {
        Args: { _new_status: string; _rid: string }
        Returns: boolean
      }
      acquire_item: {
        Args: { p_equipment_id: string; p_sim_label?: string }
        Returns: Json
      }
      confirm_borrow: { Args: { p_roll_number: string }; Returns: Json }
      release_expired: { Args: never; Returns: number }
      release_item: { Args: { p_reservation_id: string }; Returns: Json }
      release_simulation: { Args: never; Returns: number }
      return_item: { Args: { p_reservation_id: string }; Returns: Json }
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
