export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Insert row for `webhook_subscriptions` (declared outside `Database` to avoid TS circular `Partial<Insert>` → `never`). */
export type WebhookSubscriptionInsert = {
  id?: string
  created_at?: string
  updated_at?: string
  organization_id: string
  created_by?: string | null
  name: string
  target_url: string
  enabled?: boolean
  event_filters?: string[]
  custom_headers?: Json
  schema_version?: number
  last_delivery_at?: string | null
  last_http_status?: number | null
  last_delivery_error?: string | null
}

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          job_title: string | null
          company_id: string | null
          status: string
          source: string
          score: number
          tags: string[]
          notes: string | null
          assigned_to: string | null
          created_by: string | null
          last_contacted_at: string | null
          custom_fields: Json
          organization_id: string
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
          marketing_opt_in_source: string | null
        } & Record<string, unknown>
        Insert: (Omit<
          Database['public']['Tables']['contacts']['Row'],
          'created_at' | 'updated_at' | 'marketing_opt_in' | 'marketing_opt_in_at' | 'marketing_opt_in_source'
        > & {
          created_at?: string
          updated_at?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          marketing_opt_in_source?: string | null
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['contacts']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          industry: string | null
          size: string | null
          country: string | null
          city: string | null
          website: string | null
          revenue: number | null
          status: string
          tags: string[]
          notes: string | null
          created_by: string | null
          custom_fields: Json
          organization_id: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['companies']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['companies']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          value: number
          stage: string
          probability: number
          expected_close_date: string | null
          contact_id: string | null
          company_id: string | null
          assigned_to: string | null
          priority: string
          source: string | null
          notes: string | null
          quote_items: Json
          created_by: string | null
          custom_fields: Json
          organization_id: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['deals']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['deals']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          type: string
          subject: string
          description: string | null
          status: string
          deal_id: string | null
          contact_id: string | null
          company_id: string | null
          due_date: string | null
          completed_at: string | null
          created_by: string | null
          assigned_to: string | null
          outcome: string | null
          organization_id: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['activities']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['activities']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          created_at: string
          type: string
          title: string
          message: string
          entity_type: string | null
          entity_id: string | null
          user_id: string | null
          is_read: boolean
          organization_id: string
        } & Record<string, unknown>
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'created_at'> & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          created_at: string
          name: string
          domain: string | null
          logo_url: string | null
          plan: string
          max_users: number
          settings: Json
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['organizations']['Row'], 'created_at'> & {
          created_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          job_title: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          invited_by: string | null
          joined_at: string
          created_at: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['organization_members']['Row'], 'joined_at' | 'created_at'> & {
          joined_at?: string
          created_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: string
          token: string
          invited_by: string
          status: string
          expires_at: string
          created_at: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['invitations']['Row'], 'token' | 'created_at'> & {
          token?: string
          created_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['invitations']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      gmail_tokens: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          email_address: string
          access_token: string | null
          refresh_token: string | null
          refresh_token_cipher: string | null
          token_type: string
          scope: string
          expires_at: string | null
          google_sub: string | null
          name: string | null
          avatar_url: string | null
          is_active: boolean
          revoked_at: string | null
          calendar_sync_token: string | null
          gmail_history_id: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['gmail_tokens']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['gmail_tokens']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      gmail_thread_links: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          organization_id: string
          contact_id: string | null
          company_id: string | null
          deal_id: string | null
          source: string
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['gmail_thread_links']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['gmail_thread_links']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      quick_replies: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          title: string
          body: string
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['quick_replies']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['quick_replies']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          organization_id: string
          created_by: string | null
          name: string
          target_url: string
          enabled: boolean
          event_filters: string[]
          custom_headers: Json
          schema_version: number
          last_delivery_at: string | null
          last_http_status: number | null
          last_delivery_error: string | null
        } & Record<string, unknown>
        Insert: WebhookSubscriptionInsert & Record<string, unknown>
        Update: Partial<WebhookSubscriptionInsert> & Record<string, unknown>
        Relationships: []
      }
      webhook_subscription_secrets: {
        Row: {
          subscription_id: string
          signing_secret: string
        } & Record<string, unknown>
        Insert: {
          subscription_id: string
          signing_secret: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['webhook_subscription_secrets']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      webhook_outbox: {
        Row: {
          id: string
          created_at: string
          organization_id: string
          event_key: string
          entity_type: string
          entity_id: string
          payload: Json
          previous: Json | null
          actor_user_id: string | null
          status: string
          attempts: number
          next_retry_at: string | null
          last_error: string | null
        } & Record<string, unknown>
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          event_key: string
          entity_type: string
          entity_id: string
          payload: Json
          previous?: Json | null
          actor_user_id?: string | null
          status?: string
          attempts?: number
          next_retry_at?: string | null
          last_error?: string | null
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['webhook_outbox']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      webhook_delivery_log: {
        Row: {
          id: string
          created_at: string
          outbox_id: string
          subscription_id: string
          attempt: number
          http_status: number | null
          duration_ms: number | null
          error_message: string | null
        } & Record<string, unknown>
        Insert: {
          id?: string
          created_at?: string
          outbox_id: string
          subscription_id: string
          attempt?: number
          http_status?: number | null
          duration_ms?: number | null
          error_message?: string | null
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['webhook_delivery_log']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      organization_api_keys: {
        Row: {
          id: string
          created_at: string
          organization_id: string
          created_by: string | null
          name: string
          key_prefix: string
          key_hash: string
          revoked_at: string | null
          last_used_at: string | null
        } & Record<string, unknown>
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          created_by?: string | null
          name: string
          key_prefix: string
          key_hash: string
          revoked_at?: string | null
          last_used_at?: string | null
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['organization_api_keys']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      lead_capture_tokens: {
        Row: {
          id: string
          created_at: string
          organization_id: string
          created_by: string | null
          label: string
          token_hash: string
          enabled: boolean
        } & Record<string, unknown>
        Insert: {
          id?: string
          created_at?: string
          organization_id: string
          created_by?: string | null
          label: string
          token_hash: string
          enabled?: boolean
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['lead_capture_tokens']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          company_name: string | null
          job_title: string | null
          source: string
          status: string
          lifecycle_stage: string
          score: number
          assigned_to: string | null
          owner_user_id: string | null
          tags: string[]
          notes: string | null
          last_engaged_at: string | null
          converted_contact_id: string | null
          converted_company_id: string | null
          converted_deal_id: string | null
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['leads']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['leads']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      automation_rules: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          organization_id: string
          name: string
          description: string | null
          is_active: boolean
          trigger: Json
          actions: Json
          execution_count: number
          last_executed_at: string | null
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['automation_rules']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['automation_rules']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      automation_executions: {
        Row: {
          id: string
          created_at: string
          organization_id: string
          rule_id: string
          trigger_type: string
          status: string
          context: Json
          result: Json
          error_message: string | null
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['automation_executions']['Row'], 'created_at'> & {
          created_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['automation_executions']['Insert']> & Record<string, unknown>
        Relationships: []
      }
      lead_score_maintenance_runs: {
        Row: {
          id: string
          organization_id: string | null
          mode: string
          status: string
          processed: number
          error_message: string | null
          started_at: string
          finished_at: string | null
        } & Record<string, unknown>
        Insert: (Omit<Database['public']['Tables']['lead_score_maintenance_runs']['Row'], 'started_at'> & {
          started_at?: string
        }) &
          Record<string, unknown>
        Update: Partial<Database['public']['Tables']['lead_score_maintenance_runs']['Insert']> & Record<string, unknown>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      list_organization_members_with_identity: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          member_role: string
          job_title: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
        }[]
      }
      resolve_workspace_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
        }[]
      }
    }
    Enums: Record<string, never>
  }
}
