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
      ai_error_analyses: {
        Row: {
          confidence: number | null
          cost_usd: number | null
          created_at: string
          error_message: string | null
          fingerprint: string
          id: string
          model: string
          raw_response: Json | null
          severity_estimate: string | null
          suggested_file: string | null
          suggested_fix: string | null
          summary: string | null
          super_prompt: string | null
          suspected_cause: string | null
          tokens_input: number | null
          tokens_output: number | null
          tokens_used: number | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          fingerprint: string
          id?: string
          model: string
          raw_response?: Json | null
          severity_estimate?: string | null
          suggested_file?: string | null
          suggested_fix?: string | null
          summary?: string | null
          super_prompt?: string | null
          suspected_cause?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          fingerprint?: string
          id?: string
          model?: string
          raw_response?: Json | null
          severity_estimate?: string | null
          suggested_file?: string | null
          suggested_fix?: string | null
          summary?: string | null
          super_prompt?: string | null
          suspected_cause?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_used?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      api_key_usage: {
        Row: {
          api_key_id: string | null
          created_at: string
          id: number
          ip: string | null
          path: string
          status: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          path: string
          status: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          id?: number
          ip?: string | null
          path?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          note: string | null
          request_count: number
          revoked_at: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          note?: string | null
          request_count?: number
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          note?: string | null
          request_count?: number
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      auth_security_events: {
        Row: {
          created_at: string
          event: string
          id: string
          meta: Json
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          meta?: Json
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          meta?: Json
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_security_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "auth_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_tickets: {
        Row: {
          action: string
          attempts: number
          consumed_at: string | null
          created_at: string
          decided_at: string | null
          description: string | null
          expires_at: string
          id: string
          ip: string | null
          nonce_hash: string | null
          origin: string | null
          payload: Json
          return_url: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          decided_at?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          ip?: string | null
          nonce_hash?: string | null
          origin?: string | null
          payload?: Json
          return_url?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          decided_at?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          ip?: string | null
          nonce_hash?: string | null
          origin?: string | null
          payload?: Json
          return_url?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          diagnostics: Json | null
          id: string
          message: string
          page_url: string | null
          reporter_email: string | null
          reporter_user_id: string | null
          session_id: string | null
          severity: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          diagnostics?: Json | null
          id?: string
          message: string
          page_url?: string | null
          reporter_email?: string | null
          reporter_user_id?: string | null
          session_id?: string | null
          severity?: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          diagnostics?: Json | null
          id?: string
          message?: string
          page_url?: string | null
          reporter_email?: string | null
          reporter_user_id?: string | null
          session_id?: string | null
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
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          last_read_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          merged_into: string | null
          organization_id: string | null
          reservation_id: string | null
          school_admin_id: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          merged_into?: string | null
          organization_id?: string | null
          reservation_id?: string | null
          school_admin_id?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          merged_into?: string | null
          organization_id?: string | null
          reservation_id?: string | null
          school_admin_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
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
      class_promotions: {
        Row: {
          created_at: string
          graduated_count: number
          id: string
          promoted_count: number
          school_year: string
        }
        Insert: {
          created_at?: string
          graduated_count?: number
          id?: string
          promoted_count?: number
          school_year: string
        }
        Update: {
          created_at?: string
          graduated_count?: number
          id?: string
          promoted_count?: number
          school_year?: string
        }
        Relationships: []
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
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["email_kind"]
          last_error: string | null
          payload: Json
          scheduled_for: string
          sent_at: string | null
          status: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["email_kind"]
          last_error?: string | null
          payload?: Json
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["email_kind"]
          last_error?: string | null
          payload?: Json
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          certificate_ready: boolean
          hours_confirmed: boolean
          new_message: boolean
          reservation_status: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          certificate_ready?: boolean
          hours_confirmed?: boolean
          new_message?: boolean
          reservation_status?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          certificate_ready?: boolean
          hours_confirmed?: boolean
          new_message?: boolean
          reservation_status?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string
        }
        Relationships: []
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
      gate_nonces: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          expires_at: string
          nonce: string
          ua_hash: string
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          nonce: string
          ua_hash: string
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce?: string
          ua_hash?: string
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string
          max_uses: number | null
          message: string | null
          opens: number
          revoked_at: string | null
          school_id: string | null
          token_hash: string
          uses: number
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label: string
          max_uses?: number | null
          message?: string | null
          opens?: number
          revoked_at?: string | null
          school_id?: string | null
          token_hash: string
          uses?: number
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string
          max_uses?: number | null
          message?: string | null
          opens?: number
          revoked_at?: string | null
          school_id?: string | null
          token_hash?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lockdown_health_state: {
        Row: {
          created_at: string
          failures: number
          healthy: number
          id: boolean
          locked_at: string | null
          locked_message: string | null
          threat_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failures?: number
          healthy?: number
          id?: boolean
          locked_at?: string | null
          locked_message?: string | null
          threat_level?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failures?: number
          healthy?: number
          id?: boolean
          locked_at?: string | null
          locked_message?: string | null
          threat_level?: string
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
          assigned_letter: string | null
          associated_school_id: string | null
          auto_year_renewal: boolean
          bio: string | null
          city: string | null
          class_letter: string | null
          class_year: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          freeze_used_at: string | null
          full_name: string | null
          gallery_urls: string[] | null
          hours_earned: number
          hours_needed: number
          id: string
          instagram_url: string | null
          last_login_day: string | null
          latitude: number | null
          login_streak: number
          logo_url: string | null
          longest_login_streak: number
          longitude: number | null
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
          assigned_letter?: string | null
          associated_school_id?: string | null
          auto_year_renewal?: boolean
          bio?: string | null
          city?: string | null
          class_letter?: string | null
          class_year?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          freeze_used_at?: string | null
          full_name?: string | null
          gallery_urls?: string[] | null
          hours_earned?: number
          hours_needed?: number
          id: string
          instagram_url?: string | null
          last_login_day?: string | null
          latitude?: number | null
          login_streak?: number
          logo_url?: string | null
          longest_login_streak?: number
          longitude?: number | null
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
          assigned_letter?: string | null
          associated_school_id?: string | null
          auto_year_renewal?: boolean
          bio?: string | null
          city?: string | null
          class_letter?: string | null
          class_year?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          freeze_used_at?: string | null
          full_name?: string | null
          gallery_urls?: string[] | null
          hours_earned?: number
          hours_needed?: number
          id?: string
          instagram_url?: string | null
          last_login_day?: string | null
          latitude?: number | null
          login_streak?: number
          logo_url?: string | null
          longest_login_streak?: number
          longitude?: number | null
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
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reservation_participants: {
        Row: {
          check_in_code: string | null
          checked_in_at: string | null
          checked_in_by: string | null
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
          check_in_code?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
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
          check_in_code?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
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
            foreignKeyName: "reservation_participants_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          check_in_code: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          city: string | null
          created_at: string
          end_time: string | null
          hours_approved_at: string | null
          hours_approved_by: string | null
          hours_to_earn: number
          id: string
          kind: string
          latitude: number | null
          legal_disclosure: string | null
          location: string | null
          longitude: number | null
          note: string | null
          organization_id: string
          requires_checkin: boolean
          reservation_date: string
          source: string
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          student_id: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          check_in_code?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          city?: string | null
          created_at?: string
          end_time?: string | null
          hours_approved_at?: string | null
          hours_approved_by?: string | null
          hours_to_earn?: number
          id?: string
          kind?: string
          latitude?: number | null
          legal_disclosure?: string | null
          location?: string | null
          longitude?: number | null
          note?: string | null
          organization_id: string
          requires_checkin?: boolean
          reservation_date: string
          source?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          check_in_code?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          city?: string | null
          created_at?: string
          end_time?: string | null
          hours_approved_at?: string | null
          hours_approved_by?: string | null
          hours_to_earn?: number
          id?: string
          kind?: string
          latitude?: number | null
          legal_disclosure?: string | null
          location?: string | null
          longitude?: number | null
          note?: string | null
          organization_id?: string
          requires_checkin?: boolean
          reservation_date?: string
          source?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          student_id?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_hours_approved_by_fkey"
            columns: ["hours_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      resolved_error_groups: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          last_seen_at: string | null
          note: string | null
          resolved_at: string
          resolved_by: string | null
          resolved_in_build: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          last_seen_at?: string | null
          note?: string | null
          resolved_at?: string
          resolved_by?: string | null
          resolved_in_build?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          last_seen_at?: string | null
          note?: string | null
          resolved_at?: string
          resolved_by?: string | null
          resolved_in_build?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_class_codes: {
        Row: {
          class_letter: string
          class_year: string
          created_at: string
          hours_needed: number | null
          id: string
          is_active: boolean
          school_id: string
          signup_code: string
          updated_at: string
        }
        Insert: {
          class_letter: string
          class_year: string
          created_at?: string
          hours_needed?: number | null
          id?: string
          is_active?: boolean
          school_id: string
          signup_code: string
          updated_at?: string
        }
        Update: {
          class_letter?: string
          class_year?: string
          created_at?: string
          hours_needed?: number | null
          id?: string
          is_active?: boolean
          school_id?: string
          signup_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_class_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
          signup_code?: string
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
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          ip_hash: string | null
          provider: string | null
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          provider?: string | null
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          provider?: string | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          page: string | null
          status: string
          summary: string | null
          token_hash: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          page?: string | null
          status?: string
          summary?: string | null
          token_hash: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          page?: string | null
          status?: string
          summary?: string | null
          token_hash?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          address: string | null
          available_hours: number
          city: string | null
          created_at: string
          created_by: string | null
          description: string
          end_time: string | null
          event_host_name: string | null
          id: string
          is_event: boolean
          is_open: boolean
          kind: string
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
          task_date: string
          template_source_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          available_hours?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_time?: string | null
          event_host_name?: string | null
          id?: string
          is_event?: boolean
          is_open?: boolean
          kind?: string
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
          task_date: string
          template_source_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          available_hours?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_time?: string | null
          event_host_name?: string | null
          id?: string
          is_event?: boolean
          is_open?: boolean
          kind?: string
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
      uptime_checks: {
        Row: {
          checked_at: string
          db_ok: boolean | null
          error_message: string | null
          id: number
          latency_ms: number | null
          ok: boolean
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          db_ok?: boolean | null
          error_message?: string | null
          id?: number
          latency_ms?: number | null
          ok?: boolean
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          db_ok?: boolean | null
          error_message?: string | null
          id?: number
          latency_ms?: number | null
          ok?: boolean
          status_code?: number | null
        }
        Relationships: []
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
      web_vitals_log: {
        Row: {
          connection_type: string | null
          created_at: string
          id: number
          metric: string
          navigation_type: string | null
          rating: string | null
          route: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          connection_type?: string | null
          created_at?: string
          id?: number
          metric: string
          navigation_type?: string | null
          rating?: string | null
          route: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          connection_type?: string | null
          created_at?: string
          id?: number
          metric?: string
          navigation_type?: string | null
          rating?: string | null
          route?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_reset: { Args: never; Returns: number }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      auto_lockdown_if_unhealthy: { Args: never; Returns: Json }
      award_reservation_hours: {
        Args: { _hours?: number; _reservation_id: string }
        Returns: {
          hours_awarded: number
          new_total: number
          student_id: string
        }[]
      }
      bump_gate_attempt: { Args: { _nonce: string }; Returns: number }
      bump_login_streak: {
        Args: never
        Returns: {
          freeze_used_at: string
          login_streak: number
          longest_login_streak: number
        }[]
      }
      can_view_profile: { Args: { _target: string }; Returns: boolean }
      check_in_by_code: { Args: { _code: string }; Returns: Json }
      classify_lockdown_health: { Args: { _scan: Json }; Returns: string }
      complete_student_setup: {
        Args: {
          _class_letter: string
          _class_year: string
          _code: string
          _full_name: string
          _hours_needed: number
          _school_id: string
        }
        Returns: boolean
      }
      ensure_chat_participants: {
        Args: {
          _org: string
          _reservation?: string
          _student: string
          _teacher: string
        }
        Returns: string
      }
      ensure_check_in_code: {
        Args: { _participant_id?: string; _reservation_id?: string }
        Returns: string
      }
      expire_stale_reservations: { Args: never; Returns: number }
      generate_check_in_code: { Args: never; Returns: string }
      generate_recurring_tasks: { Args: never; Returns: number }
      get_invite: { Args: { _accept?: boolean; _token: string }; Returns: Json }
      get_lockdown_public: {
        Args: never
        Returns: {
          lockdown_code: string
          lockdown_enabled: boolean
          lockdown_message: string
          updated_at: string
        }[]
      }
      get_school_streak_leaderboard: {
        Args: never
        Returns: {
          class_year: string
          full_name: string
          id: string
          login_streak: number
          longest_login_streak: number
        }[]
      }
      has_reservation_for_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
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
      is_lockdown_active: { Args: never; Returns: boolean }
      is_reservation_participant: {
        Args: { _reservation_id: string; _user_id: string }
        Returns: boolean
      }
      list_chat_contacts: {
        Args: never
        Returns: {
          class_year: string
          id: string
          name: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      list_my_conversations: {
        Args: never
        Returns: {
          last_at: string
          last_message: string
          organization_id: string
          organization_name: string
          reservation_date: string
          reservation_id: string
          room_id: string
          school_admin_id: string
          school_admin_name: string
          student_id: string
          student_name: string
          unread: number
        }[]
      }
      list_my_teachers: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      next_class_year: { Args: { _c: string }; Returns: string }
      open_chat_with: { Args: { _other: string }; Returns: string }
      open_dm_room: { Args: { _other: string }; Returns: string }
      open_org_chat: { Args: { _org: string }; Returns: string }
      open_reservation_chat: { Args: { _reservation: string }; Returns: string }
      open_school_student_chat: {
        Args: { _org: string; _student: string }
        Returns: string
      }
      promote_class_years: { Args: never; Returns: Json }
      purge_dm_messages: { Args: never; Returns: undefined }
      purge_old_messages: { Args: never; Returns: undefined }
      purge_support_messages: { Args: never; Returns: undefined }
      resolve_chat_room: { Args: { _room: string }; Returns: string }
      revoke_certificate: {
        Args: { _code: string; _reason: string }
        Returns: boolean
      }
      run_deep_health_scan: { Args: never; Returns: Json }
      school_admin_can_manage: { Args: { _student: string }; Returns: boolean }
      school_complete_reservation: {
        Args: { _decline?: boolean; _hours: number; _reservation_id: string }
        Returns: boolean
      }
      school_create_reservations: {
        Args: {
          _date: string
          _end: string
          _hours: number
          _kind: string
          _note: string
          _organization_id: string
          _start: string
          _student_ids: string[]
          _task_id: string
        }
        Returns: number
      }
      school_delete_reservation: {
        Args: { _caller: string; _reservation_id: string }
        Returns: boolean
      }
      school_update_reservation: {
        Args: {
          _caller: string
          _date: string
          _end: string
          _hours: number
          _kind: string
          _note: string
          _reservation_id: string
          _start: string
        }
        Returns: boolean
      }
      search_classmates: {
        Args: { _q: string }
        Returns: {
          class_year: string
          full_name: string
          hours_earned: number
          id: string
          public_email: string
          school_id: string
        }[]
      }
      set_my_assigned_classes: {
        Args: { _classes: string[] }
        Returns: string[]
      }
      tick_auto_lockdown: { Args: never; Returns: undefined }
      verify_certificate: { Args: { _code: string }; Returns: Json }
      verify_school_signup_code: {
        Args: { _code: string; _school_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "school_admin" | "organization" | "admin"
      email_kind:
        | "hours_confirmed"
        | "reservation_approved"
        | "reservation_declined"
        | "new_message"
        | "certificate_ready"
        | "org_access_granted"
        | "weekly_digest"
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
      app_role: ["student", "school_admin", "organization", "admin"],
      email_kind: [
        "hours_confirmed",
        "reservation_approved",
        "reservation_declined",
        "new_message",
        "certificate_ready",
        "org_access_granted",
        "weekly_digest",
      ],
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
