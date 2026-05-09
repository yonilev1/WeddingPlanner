// ─────────────────────────────────────────────────────────────
// Supabase database types — generated from 001_initial_schema.sql
// Pass `Database` as the generic to `createClient<Database>()`.
// ─────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ── weddings ─────────────────────────────
      weddings: {
        Row: {
          id: string
          name: string
          date: string | null        // ISO date string (YYYY-MM-DD)
          share_code: string
          budget_total: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date?: string | null
          share_code?: string        // auto-generated if omitted
          budget_total?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string | null
          share_code?: string
          budget_total?: number | null
          created_at?: string
        }
      }

      // ── profiles ─────────────────────────────
      profiles: {
        Row: {
          id: string                 // mirrors auth.users.id
          name: string | null
          avatar_url: string | null
          wedding_id: string | null
          role: 'admin' | 'member'
          member_status: 'pending' | 'active'
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          avatar_url?: string | null
          wedding_id?: string | null
          role?: 'admin' | 'member'
          member_status?: 'pending' | 'active'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          avatar_url?: string | null
          wedding_id?: string | null
          role?: 'admin' | 'member'
          member_status?: 'pending' | 'active'
          created_at?: string
        }
      }

      // ── tasks ────────────────────────────────
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          priority: number | null    // 1 (low) – 5 (high)
          status: TaskStatus
          due_date: string | null
          wedding_id: string
          parent_task_id: string | null
          display_order: number
          estimated_cost: number | null
          actual_cost: number | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          priority?: number | null
          status?: TaskStatus
          due_date?: string | null
          wedding_id: string
          parent_task_id?: string | null
          display_order?: number
          estimated_cost?: number | null
          actual_cost?: number | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          priority?: number | null
          status?: TaskStatus
          due_date?: string | null
          wedding_id?: string
          parent_task_id?: string | null
          display_order?: number
          estimated_cost?: number | null
          actual_cost?: number | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ── comments ─────────────────────────────
      comments: {
        Row: {
          id: string
          text: string
          user_id: string
          task_id: string
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          user_id: string
          task_id: string
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          user_id?: string
          task_id?: string
          created_at?: string
        }
      }

      // ── notifications ────────────────────────
      notifications: {
        Row: {
          id: string
          user_id: string
          wedding_id: string
          task_id: string
          type: string
          message: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wedding_id: string
          task_id: string
          type?: string
          message?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          read?: boolean
        }
      }

      // ── guests ───────────────────────────────
      guests: {
        Row: {
          id: string
          wedding_id: string
          name: string
          email: string | null
          rsvp_status: 'pending' | 'confirmed' | 'declined'
          dietary: string | null
          plus_one: boolean
          plus_one_name: string | null
          table_number: number | null
          group_name: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          name: string
          email?: string | null
          rsvp_status?: 'pending' | 'confirmed' | 'declined'
          dietary?: string | null
          plus_one?: boolean
          plus_one_name?: string | null
          table_number?: number | null
          group_name?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          name?: string
          email?: string | null
          rsvp_status?: 'pending' | 'confirmed' | 'declined'
          dietary?: string | null
          plus_one?: boolean
          plus_one_name?: string | null
          table_number?: number | null
          group_name?: string | null
          notes?: string | null
          created_at?: string
        }
      }

      // ── vendors ───────────────────────────────
      vendors: {
        Row: {
          id: string
          wedding_id: string
          name: string
          category: string
          contact_name: string | null
          email: string | null
          phone: string | null
          website: string | null
          contract_status: 'none' | 'pending' | 'signed'
          deposit_paid: boolean
          deposit_amount: number | null
          total_cost: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          name: string
          category: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          contract_status?: 'none' | 'pending' | 'signed'
          deposit_paid?: boolean
          deposit_amount?: number | null
          total_cost?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          name?: string
          category?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          contract_status?: 'none' | 'pending' | 'signed'
          deposit_paid?: boolean
          deposit_amount?: number | null
          total_cost?: number | null
          notes?: string | null
          created_at?: string
        }
      }

      // ── task_activity ────────────────────────
      task_activity: {
        Row: {
          id: string
          task_id: string
          user_id: string
          action: TaskActivityAction
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          action: TaskActivityAction
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          action?: TaskActivityAction
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      get_user_wedding_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
    }

    Enums: {
      [_ in never]: never
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Convenience aliases — use these throughout the app
// ─────────────────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Domain row types
export type Wedding       = Tables<'weddings'>
export type Profile       = Tables<'profiles'>
export type Task          = Tables<'tasks'>
export type Comment       = Tables<'comments'>
export type TaskActivity  = Tables<'task_activity'>
export type Notification  = Tables<'notifications'>
export type Guest         = Tables<'guests'>
export type Vendor        = Tables<'vendors'> & { task_id?: string | null }

// Domain enum types (kept as string literals for DB compatibility)
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type TaskActivityAction =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'title_changed'
  | 'description_changed'
  | 'due_date_changed'
  | 'parent_changed'
  | 'order_changed'
  | 'deleted'

// ─────────────────────────────────────────────────────────────
// Enriched / joined shapes used in queries
// ─────────────────────────────────────────────────────────────

export interface TaskWithSubtasks extends Task {
  subtasks?: Task[]
}

export interface CommentWithAuthor extends Comment {
  author: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

export interface TaskActivityWithActor extends TaskActivity {
  actor: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

export interface TaskWithDetails extends Task {
  subtasks: Task[]
  comments: CommentWithAuthor[]
  activity: TaskActivityWithActor[]
}
