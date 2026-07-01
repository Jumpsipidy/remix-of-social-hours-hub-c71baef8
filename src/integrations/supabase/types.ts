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
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reservation_id: string
          school_admin_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reservation_id: string
          school_admin_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reservation_id?: string
          school_admin_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_school_admin_id_fkey"
            columns: ["school_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_room_id: string
          content: string
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          chat_room_id: string
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          chat_room_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          associated_school_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          hours_earned: number
          hours_needed: number
          id: string
          organization_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          associated_school_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hours_earned?: number
          hours_needed?: number
          id: string
          organization_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          associated_school_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hours_earned?: number
          hours_needed?: number
          id?: string
          organization_name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          end_time: string
          hours_to_earn: number
          id: string
          note: string | null
          organization_id: string
          reservation_date: string
          start_time: string
          status: Database["public"]["Enums"]["reservation_status"]
          student_id: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          hours_to_earn?: number
          id?: string
          note?: string | null
          organization_id: string
          reservation_date: string
          start_time: string
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          hours_to_earn?: number
          id?: string
          note?: string | null
          organization_id?: string
          reservation_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          available_hours: number
          created_at: string
          description: string
          end_time: string | null
          id: string
          is_open: boolean
          location: string
          organization_id: string
          spots_total: number
          start_time: string | null
          task_date: string
          title: string
          updated_at: string
        }
        Insert: {
          available_hours?: number
          created_at?: string
          description?: string
          end_time?: string | null
          id?: string
          is_open?: boolean
          location?: string
          organization_id: string
          spots_total?: number
          start_time?: string | null
          task_date: string
          title: string
          updated_at?: string
        }
        Update: {
          available_hours?: number
          created_at?: string
          description?: string
          end_time?: string | null
          id?: string
          is_open?: boolean
          location?: string
          organization_id?: string
          spots_total?: number
          start_time?: string | null
          task_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      purge_old_messages: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "student" | "school_admin" | "organization" | "admin"
      reservation_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "approved"
        | "completed"
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
      app_role: ["student", "school_admin", "organization", "admin"],
      reservation_status: [
        "pending",
        "confirmed",
        "declined",
        "approved",
        "completed",
      ],
    },
  },
} as const
