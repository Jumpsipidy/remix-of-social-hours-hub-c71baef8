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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_admin_event: boolean
          meta: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_admin_event?: boolean
          meta?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_admin_event?: boolean
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          message: string
          page_url: string | null
          reporter_email: string | null
          reporter_user_id: string | null
          severity: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message: string
          page_url?: string | null
          reporter_email?: string | null
          reporter_user_id?: string | null
          severity?: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          message?: string
          page_url?: string | null
          reporter_email?: string | null
          reporter_user_id?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          content_hash: string
          created_at: string
          generated_at: string
          hours_needed: number
          id: string
          ip_address: string | null
          reservations_json: Json
          revoked_at: string | null
          revoked_reason: string | null
          school_id: string | null
          school_name: string | null
          signature: string
          student_class: string | null
          student_id: string
          student_name: string
          total_hours: number
        }
        Insert: {
          code: string
          content_hash: string
          created_at?: string
          generated_at?: string
          hours_needed?: number
          id?: string
          ip_address?: string | null
          reservations_json?: Json
          revoked_at?: string | null
          revoked_reason?: string | null
          school_id?: string | null
          school_name?: string | null
          signature: string
          student_class?: string | null
          student_id: string
          student_name: string
          total_hours?: number
        }
        Update: {
          code?: string
          content_hash?: string
          created_at?: string
          generated_at?: string
          hours_needed?: number
          id?: string
          ip_address?: string | null
          reservations_json?: Json
          revoked_at?: string | null
          revoked_reason?: string | null
          school_id?: string | null
          school_name?: string | null
          signature?: string
          student_class?: string | null
          student_id?: string
          student_name?: string
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reservation_id: string | null
          school_admin_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reservation_id?: string | null
          school_admin_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reservation_id?: string | null
          school_admin_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
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
      dm_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "dm_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_rooms: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_rooms_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_rooms_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gsc_daily: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date: string
          id: string
          impressions: number
          position: number
          property_id: string
          top_page: string | null
          top_query: string | null
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date: string
          id?: string
          impressions?: number
          position?: number
          property_id: string
          top_page?: string | null
          top_query?: string | null
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date?: string
          id?: string
          impressions?: number
          position?: number
          property_id?: string
          top_page?: string | null
          top_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gsc_daily_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "gsc_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_properties: {
        Row: {
          connected: boolean
          created_at: string
          id: string
          label: string | null
          last_sync_at: string | null
          site_url: string
          updated_at: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          site_url: string
          updated_at?: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          site_url?: string
          updated_at?: string
        }
        Relationships: []
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
      organization_access_requests: {
        Row: {
          admin_notes: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          legal_code: string | null
          organization_name: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          description: string
          id?: string
          legal_code?: string | null
          organization_name: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          legal_code?: string | null
          organization_name?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_tags: string[] | null
          address: string | null
          assigned_classes: string[]
          associated_school_id: string | null
          bio: string | null
          city: string | null
          class_year: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          full_name: string | null
          gallery_urls: string[] | null
          hours_earned: number
          hours_needed: number
          id: string
          instagram_url: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          org_category: Database["public"]["Enums"]["org_category"] | null
          organization_name: string | null
          phone: string | null
          profile_verified: boolean
          public_email: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          activity_tags?: string[] | null
          address?: string | null
          assigned_classes?: string[]
          associated_school_id?: string | null
          bio?: string | null
          city?: string | null
          class_year?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gallery_urls?: string[] | null
          hours_earned?: number
          hours_needed?: number
          id: string
          instagram_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          org_category?: Database["public"]["Enums"]["org_category"] | null
          organization_name?: string | null
          phone?: string | null
          profile_verified?: boolean
          public_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          activity_tags?: string[] | null
          address?: string | null
          assigned_classes?: string[]
          associated_school_id?: string | null
          bio?: string | null
          city?: string | null
          class_year?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gallery_urls?: string[] | null
          hours_earned?: number
          hours_needed?: number
          id?: string
          instagram_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          org_category?: Database["public"]["Enums"]["org_category"] | null
          organization_name?: string | null
          phone?: string | null
          profile_verified?: boolean
          public_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_participants: {
        Row: {
          created_at: string
          hours_awarded: number
          id: string
          invited_by: string | null
          reservation_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours_awarded?: number
          id?: string
          invited_by?: string | null
          reservation_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours_awarded?: number
          id?: string
          invited_by?: string | null
          reservation_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_participants_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          address: string | null
          created_at: string
          end_time: string
          hours_to_earn: number
          id: string
          latitude: number | null
          legal_disclosure: string | null
          location: string | null
          longitude: number | null
          note: string | null
          organization_id: string
          reservation_date: string
          start_time: string
          status: Database["public"]["Enums"]["reservation_status"]
          student_id: string
          tags: string[]
          task_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          end_time: string
          hours_to_earn?: number
          id?: string
          latitude?: number | null
          legal_disclosure?: string | null
          location?: string | null
          longitude?: number | null
          note?: string | null
          organization_id: string
          reservation_date: string
          start_time: string
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id: string
          tags?: string[]
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          end_time?: string
          hours_to_earn?: number
          id?: string
          latitude?: number | null
          legal_disclosure?: string | null
          location?: string | null
          longitude?: number | null
          note?: string | null
          organization_id?: string
          reservation_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id?: string
          tags?: string[]
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
      schools: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          signup_code: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          signup_code: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          signup_code?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: boolean
          lockdown_code: string | null
          lockdown_enabled: boolean
          lockdown_message: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          lockdown_code?: string | null
          lockdown_enabled?: boolean
          lockdown_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          lockdown_code?: string | null
          lockdown_enabled?: boolean
          lockdown_message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          address: string | null
          available_hours: number
          created_at: string
          created_by: string | null
          description: string
          end_time: string | null
          event_host_name: string | null
          id: string
          is_event: boolean
          is_open: boolean
          latitude: number | null
          location: string
          longitude: number | null
          organization_id: string
          recurrence: string
          recurrence_active: boolean
          recurrence_until: string | null
          recurrence_weekday: number | null
          spots_total: number
          start_time: string | null
          tags: string[]
          task_date: string
          template_source_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          available_hours?: number
          created_at?: string
          created_by?: string | null
          description?: string
          end_time?: string | null
          event_host_name?: string | null
          id?: string
          is_event?: boolean
          is_open?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          organization_id: string
          recurrence?: string
          recurrence_active?: boolean
          recurrence_until?: string | null
          recurrence_weekday?: number | null
          spots_total?: number
          start_time?: string | null
          tags?: string[]
          task_date: string
          template_source_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          available_hours?: number
          created_at?: string
          created_by?: string | null
          description?: string
          end_time?: string | null
          event_host_name?: string | null
          id?: string
          is_event?: boolean
          is_open?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          organization_id?: string
          recurrence?: string
          recurrence_active?: boolean
          recurrence_until?: string | null
          recurrence_weekday?: number | null
          spots_total?: number
          start_time?: string | null
          tags?: string[]
          task_date?: string
          template_source_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_source_id_fkey"
            columns: ["template_source_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          id: string
          key: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          key: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          key?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics_v2: { Args: { _days?: number }; Returns: Json }
      admin_recent_activity: {
        Args: { _limit?: number }
        Returns: {
          action: string
          browser: string
          created_at: string
          device: string
          id: string
          lang: string
          os: string
          path: string
          ref_host: string
          user_id: string
          user_name: string
          user_role: string
        }[]
      }
      analytics_prune: { Args: { _days?: number }; Returns: number }
      analytics_reset: { Args: never; Returns: number }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      auto_lockdown_if_unhealthy: { Args: never; Returns: Json }
      award_reservation_hours: {
        Args: { _reservation_id: string }
        Returns: {
          hours_awarded: number
          new_total: number
          student_id: string
        }[]
      }
      can_view_profile: { Args: { _target: string }; Returns: boolean }
      generate_recurring_tasks: { Args: never; Returns: number }
      get_lockdown_public: {
        Args: never
        Returns: {
          lockdown_code: string
          lockdown_enabled: boolean
          lockdown_message: string
          updated_at: string
        }[]
      }
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
      is_dm_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      open_dm_room: { Args: { _other: string }; Returns: string }
      purge_dm_messages: { Args: never; Returns: undefined }
      purge_old_messages: { Args: never; Returns: undefined }
      revoke_certificate: {
        Args: { _code: string; _reason: string }
        Returns: boolean
      }
      run_deep_health_scan: { Args: never; Returns: Json }
      search_classmates: {
        Args: { _q?: string }
        Returns: {
          class_year: string
          full_name: string
          hours_earned: number
          id: string
          public_email: string
          school_id: string
        }[]
      }
      verify_certificate: { Args: { _code: string }; Returns: Json }
      verify_school_signup_code: {
        Args: { _code: string; _school_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "school_admin" | "organization" | "admin"
      org_category: "organizacija" | "bendruomene"
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
      org_category: ["organizacija", "bendruomene"],
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
