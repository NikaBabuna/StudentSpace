/* =============================================================================
 * lib/database.types.ts — GENERATED Supabase TypeScript types
 * -----------------------------------------------------------------------------
 * Role: Typed Database schema for Supabase clients. Do not edit by hand.
 * Regenerate: npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
 * Used by: lib/supabase/*, all server actions and loaders
 * ========================================================================== */
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
      class_members: {
        Row: {
          class_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["class_member_role"]
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["class_member_role"]
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["class_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          created_by: string
          cycle_hours: number
          deleted_at: string | null
          description: string | null
          id: string
          level: string | null
          subject: string | null
          title: string
          tutor_notes: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          cycle_hours?: number
          deleted_at?: string | null
          description?: string | null
          id?: string
          level?: string | null
          subject?: string | null
          title: string
          tutor_notes?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          cycle_hours?: number
          deleted_at?: string | null
          description?: string | null
          id?: string
          level?: string | null
          subject?: string | null
          title?: string
          tutor_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachments: Json
          class_id: string
          created_at: string
          created_by: string
          deadline: string
          deleted_at: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          attachments?: Json
          class_id: string
          created_at?: string
          created_by: string
          deadline: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          attachments?: Json
          class_id?: string
          created_at?: string
          created_by?: string
          deadline?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          class_id: string
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["invite_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          role: Database["public"]["Enums"]["invite_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["invite_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invites_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string
          created_at: string
          deleted_at: string | null
          duration_hours: number
          id: string
          payment_cycle_id: string | null
          recurring_schedule_id: string | null
          replaces_lesson_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["lesson_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          deleted_at?: string | null
          duration_hours: number
          id?: string
          payment_cycle_id?: string | null
          recurring_schedule_id?: string | null
          replaces_lesson_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["lesson_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          deleted_at?: string | null
          duration_hours?: number
          id?: string
          payment_cycle_id?: string | null
          recurring_schedule_id?: string | null
          replaces_lesson_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_payment_cycle_id_fkey"
            columns: ["payment_cycle_id"]
            isOneToOne: false
            referencedRelation: "payment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_replaces_lesson_id_fkey"
            columns: ["replaces_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedules: {
        Row: {
          active: boolean
          anchor_date: string
          class_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          duration_hours: number
          generated_until: string | null
          id: string
          interval_weeks: number
          start_time: string
          timezone: string
          until_date: string | null
          weekday: number
        }
        Insert: {
          active?: boolean
          anchor_date?: string
          class_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          duration_hours: number
          generated_until?: string | null
          id?: string
          interval_weeks?: number
          start_time: string
          timezone?: string
          until_date?: string | null
          weekday: number
        }
        Update: {
          active?: boolean
          anchor_date?: string
          class_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          duration_hours?: number
          generated_until?: string | null
          id?: string
          interval_weeks?: number
          start_time?: string
          timezone?: string
          until_date?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      material_groups: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_groups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          class_id: string
          created_at: string
          deleted_at: string | null
          file_name: string
          file_size_bytes: number | null
          file_url: string
          group_id: string
          id: string
          is_pinned: boolean
          mime_type: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          class_id: string
          created_at?: string
          deleted_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          group_id: string
          id?: string
          is_pinned?: boolean
          mime_type?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          class_id?: string
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          group_id?: string
          id?: string
          is_pinned?: boolean
          mime_type?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "material_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          class_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          class_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          class_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_requests: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_cycles: {
        Row: {
          class_id: string
          closed_at: string | null
          cycle_number: number
          id: string
          paid_at: string | null
          payment_amount: number | null
          payment_currency: string | null
          started_at: string
        }
        Insert: {
          class_id: string
          closed_at?: string | null
          cycle_number: number
          id?: string
          paid_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          started_at?: string
        }
        Update: {
          class_id?: string
          closed_at?: string | null
          cycle_number?: number
          id?: string
          paid_at?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_cycles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          attachments: Json
          created_at: string
          grade: string | null
          homework_id: string
          id: string
          student_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          grade?: string | null
          homework_id: string
          id?: string
          student_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          grade?: string | null
          homework_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_employer: boolean
          timezone: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          is_employer?: boolean
          timezone?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_employer?: boolean
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_future_recurring_lessons: {
        Args: { p_schedule_id: string; p_from?: string }
        Returns: number
      }
      generate_all_recurring_lessons: {
        Args: { p_horizon_weeks?: number }
        Returns: number
      }
      generate_recurring_lessons: {
        Args: { p_schedule_id: string; p_horizon_weeks?: number }
        Returns: number
      }
      has_pending_invite_to_class: {
        Args: { p_class_id: string }
        Returns: boolean
      }
      is_class_member: { Args: { p_class_id: string }; Returns: boolean }
      is_class_tutor: { Args: { p_class_id: string }; Returns: boolean }
      is_parent_of: { Args: { p_student_id: string }; Returns: boolean }
      shares_class_with: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      class_member_role: "tutor" | "student" | "parent" | "employer"
      invite_role: "tutor" | "student" | "parent" | "employer"
      invite_status: "pending" | "accepted" | "declined"
      lesson_status: "scheduled" | "completed" | "missed" | "cancelled"
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
      class_member_role: ["tutor", "student", "parent", "employer"],
      invite_role: ["tutor", "student", "parent", "employer"],
      invite_status: ["pending", "accepted", "declined"],
      lesson_status: ["scheduled", "completed", "missed", "cancelled"],
    },
  },
} as const
