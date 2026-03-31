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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          content_text: string | null
          content_type: string
          created_at: string
          duration_seconds: number
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          slot_number: number
          sort_order: number
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_type?: string
          created_at?: string
          duration_seconds?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          slot_number: number
          sort_order?: number
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          created_at?: string
          duration_seconds?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          slot_number?: number
          sort_order?: number
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_presence_log: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          present_end: string | null
          present_start: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          present_end?: string | null
          present_start?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          present_end?: string | null
          present_start?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_presence_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          actions_count: number
          agent_code: string
          created_at: string
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          actions_count?: number
          agent_code?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          actions_count?: number
          agent_code?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          message: string
          resolved_at: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          request_count: number
          route_name: string
          updated_at: string
          window_bucket: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          request_count?: number
          route_name: string
          updated_at?: string
          window_bucket: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          request_count?: number
          route_name?: string
          updated_at?: string
          window_bucket?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      assistant_activity_log: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          details: string
          id: string
          metadata: Json | null
          title: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          details?: string
          id?: string
          metadata?: Json | null
          title?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          details?: string
          id?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: []
      }
      assistant_campaign_ideas: {
        Row: {
          admin_approved: boolean
          approved_at: string | null
          campaign_type: string
          content_data: Json | null
          created_at: string
          created_by: string | null
          description: string
          estimated_impact: string
          id: string
          status: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_approved?: boolean
          approved_at?: string | null
          campaign_type?: string
          content_data?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string
          estimated_impact?: string
          id?: string
          status?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Update: {
          admin_approved?: boolean
          approved_at?: string | null
          campaign_type?: string
          content_data?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string
          estimated_impact?: string
          id?: string
          status?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistant_files: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          label: string | null
          metadata: Json | null
          reference_number: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          reference_number?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          label?: string | null
          metadata?: Json | null
          reference_number?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      assistant_issue_patterns: {
        Row: {
          affected_area: string
          created_at: string
          description: string
          first_seen_at: string
          id: string
          last_seen_at: string
          occurrence_count: number
          pattern_type: string
          resolution_notes: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          affected_area?: string
          created_at?: string
          description?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          pattern_type?: string
          resolution_notes?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Update: {
          affected_area?: string
          created_at?: string
          description?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          pattern_type?: string
          resolution_notes?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      assistant_knowledge_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          priority: string
          source_type: string
          source_url: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string
          source_type?: string
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistant_recommendations: {
        Row: {
          admin_response: string | null
          area: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          impact: string
          responded_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          area?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          impact?: string
          responded_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          area?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          impact?: string
          responded_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_center: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          request: string
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          request?: string
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          request?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          agent_id: string | null
          call_type: string
          caller_name: string
          caller_phone: string
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          reason: string
          status: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          call_type?: string
          caller_name?: string
          caller_phone?: string
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          reason?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          call_type?: string
          caller_name?: string
          caller_phone?: string
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          reason?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          callee_id: string
          caller_id: string
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          metadata: Json
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          metadata?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          id: string
          payload: Json
          recipient_id: string
          sender_id: string
          signal_type: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          payload?: Json
          recipient_id: string
          sender_id: string
          signal_type: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          payload?: Json
          recipient_id?: string
          sender_id?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          category: string
          created_at: string
          id: string
          rate: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rate?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_mutes: {
        Row: {
          created_at: string
          id: string
          muted_by: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_by: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_by?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          agent_id: string | null
          agent_notes: string | null
          category: string
          complaint_code: string | null
          created_at: string
          description: string
          driver_id: string | null
          id: string
          priority: string
          status: string
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_notes?: string | null
          category?: string
          complaint_code?: string | null
          created_at?: string
          description?: string
          driver_id?: string | null
          id?: string
          priority?: string
          status?: string
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_notes?: string | null
          category?: string
          complaint_code?: string | null
          created_at?: string
          description?: string
          driver_id?: string | null
          id?: string
          priority?: string
          status?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          created_at: string
          credits: number | null
          description_ar: string | null
          description_fr: string | null
          duration_days: number
          id: string
          is_active: boolean
          is_featured: boolean
          name_ar: string
          name_en: string
          name_fr: string
          original_price: number | null
          package_type: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          description_ar?: string | null
          description_fr?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name_ar?: string
          name_en?: string
          name_fr?: string
          original_price?: number | null
          package_type?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          description_ar?: string | null
          description_fr?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name_ar?: string
          name_en?: string
          name_fr?: string
          original_price?: number | null
          package_type?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          credits_remaining: number
          credits_total: number
          expires_at: string
          id: string
          package_id: string | null
          payment_method: string
          starts_at: string
          status: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          expires_at: string
          id?: string
          package_id?: string | null
          payment_method?: string
          starts_at?: string
          status?: string
          subscription_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          expires_at?: string
          id?: string
          package_id?: string | null
          payment_method?: string
          starts_at?: string
          status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      db_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          accepted_at: string | null
          cancel_reason: string | null
          category: string
          city: string | null
          country: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_type: string
          driver_id: string | null
          estimated_price: number | null
          final_price: number | null
          id: string
          items: Json | null
          notes: string | null
          order_code: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          status: string
          store_id: string | null
          store_name: string | null
          subtotal: number | null
          total_price: number | null
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancel_reason?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: string
          driver_id?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_code?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          subtotal?: number | null
          total_price?: number | null
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancel_reason?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_type?: string
          driver_id?: string | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_code?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          status?: string
          store_id?: string | null
          store_name?: string | null
          subtotal?: number | null
          total_price?: number | null
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          driver_id: string
          file_url: string
          id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          file_url?: string
          id?: string
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          file_url?: string
          id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_packages: {
        Row: {
          created_at: string
          description_ar: string | null
          description_fr: string | null
          driver_type: string
          duration_days: number
          id: string
          is_active: boolean
          is_featured: boolean
          max_km: number | null
          max_orders: number | null
          name_ar: string
          name_en: string
          name_fr: string
          original_price: number | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_fr?: string | null
          driver_type?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_km?: number | null
          max_orders?: number | null
          name_ar?: string
          name_en?: string
          name_fr?: string
          original_price?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_fr?: string | null
          driver_type?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_km?: number | null
          max_orders?: number | null
          name_ar?: string
          name_en?: string
          name_fr?: string
          original_price?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_reward_points: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          points?: number
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_reward_points_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_reward_points_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          km_used: number
          orders_used: number
          package_id: string
          payment_method: string
          payment_status: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          driver_id: string
          expires_at: string
          id?: string
          km_used?: number
          orders_used?: number
          package_id: string
          payment_method?: string
          payment_status?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          km_used?: number
          orders_used?: number
          package_id?: string
          payment_method?: string
          payment_status?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "driver_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          car_id: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          driver_code: string | null
          driver_type: string
          id: string
          license_no: string
          location_updated_at: string | null
          rating: number | null
          status: string
          user_id: string
        }
        Insert: {
          car_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          driver_code?: string | null
          driver_type?: string
          id?: string
          license_no?: string
          location_updated_at?: string | null
          rating?: number | null
          status?: string
          user_id: string
        }
        Update: {
          car_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          driver_code?: string | null
          driver_type?: string
          id?: string
          license_no?: string
          location_updated_at?: string | null
          rating?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_drivers_car"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_pages: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          css_overrides: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          page_type: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          css_overrides?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          slug: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          css_overrides?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          date: string
          driver_id: string
          id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          driver_id: string
          id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          driver_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      face_auth_attempts: {
        Row: {
          created_at: string | null
          id: string
          photo_data: string | null
          result: string | null
          target_email: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_data?: string | null
          result?: string | null
          target_email: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_data?: string | null
          result?: string | null
          target_email?: string
        }
        Relationships: []
      }
      face_auth_profiles: {
        Row: {
          created_at: string | null
          descriptor: Json
          email: string
          id: string
          photo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descriptor?: Json
          email: string
          id?: string
          photo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descriptor?: Json
          email?: string
          id?: string
          photo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      geo_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          parent_name: string | null
          type: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          parent_name?: string | null
          type?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_name?: string | null
          type?: string
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          categories_count: number
          city: string
          created_at: string
          error_message: string | null
          id: string
          imported_by: string | null
          products_count: number
          restaurants_count: number
          source_type: string
          source_url: string
          status: string
        }
        Insert: {
          categories_count?: number
          city?: string
          created_at?: string
          error_message?: string | null
          id?: string
          imported_by?: string | null
          products_count?: number
          restaurants_count?: number
          source_type?: string
          source_url?: string
          status?: string
        }
        Update: {
          categories_count?: number
          city?: string
          created_at?: string
          error_message?: string | null
          id?: string
          imported_by?: string | null
          products_count?: number
          restaurants_count?: number
          source_type?: string
          source_url?: string
          status?: string
        }
        Relationships: []
      }
      internal_chat_members: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          role: string
          unread_count: number
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          role?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          role?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "internal_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_fr: string
          sort_order: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_fr?: string
          sort_order?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_fr?: string
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description_ar: string | null
          description_fr: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name_ar: string
          name_fr: string
          price: number
          sort_order: number
          store_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description_ar?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name_ar?: string
          name_fr?: string
          price?: number
          sort_order?: number
          store_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description_ar?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name_ar?: string
          name_fr?: string
          price?: number
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      page_customizations: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          page_slug: string
          properties: Json
          section_id: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug: string
          properties?: Json
          section_id: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          properties?: Json
          section_id?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          payment_code: string | null
          status: string
          trip_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payment_code?: string | null
          status?: string
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payment_code?: string | null
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      permission_roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_languages: {
        Row: {
          code: string
          created_at: string
          flag: string
          id: string
          is_active: boolean
          is_rtl: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          flag?: string
          id?: string
          is_active?: boolean
          is_rtl?: boolean
          label?: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          flag?: string
          id?: string
          is_active?: boolean
          is_rtl?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      platform_translations: {
        Row: {
          created_at: string
          id: string
          key: string
          locale: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          locale: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          locale?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      platform_versions: {
        Row: {
          build_size_kb: number | null
          change_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          modules_updated: string[] | null
          published_at: string | null
          release_notes: string | null
          status: string
          total_files_changed: number | null
          updated_at: string
          version_code: string
          version_name: string
        }
        Insert: {
          build_size_kb?: number | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          modules_updated?: string[] | null
          published_at?: string | null
          release_notes?: string | null
          status?: string
          total_files_changed?: number | null
          updated_at?: string
          version_code: string
          version_name?: string
        }
        Update: {
          build_size_kb?: number | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          modules_updated?: string[] | null
          published_at?: string | null
          release_notes?: string | null
          status?: string
          total_files_changed?: number | null
          updated_at?: string
          version_code?: string
          version_name?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          menu_item_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string
          menu_item_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          menu_item_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_confirmed: boolean
          is_suspended: boolean
          last_seen_at: string | null
          name: string
          phone: string | null
          user_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_confirmed?: boolean
          is_suspended?: boolean
          last_seen_at?: string | null
          name?: string
          phone?: string | null
          user_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_confirmed?: boolean
          is_suspended?: boolean
          last_seen_at?: string | null
          name?: string
          phone?: string | null
          user_code?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          discount_percent: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
          used_count: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          ride_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          ride_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          ride_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      ride_requests: {
        Row: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          city: string | null
          country: string | null
          created_at: string
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          distance: number | null
          driver_id: string | null
          id: string
          pickup: string
          pickup_lat: number | null
          pickup_lng: number | null
          price: number | null
          status: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance?: number | null
          driver_id?: string | null
          id?: string
          pickup?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          status?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          distance?: number | null
          driver_id?: string | null
          id?: string
          pickup?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          status?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean | null
          created_at: string | null
          id: string
          module: string
          operation: string
          role_id: string
        }
        Insert: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          operation: string
          role_id: string
        }
        Update: {
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          operation?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "permission_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_analytics_daily: {
        Row: {
          city: string
          country: string
          created_at: string
          date: string
          desktop_visits: number
          id: string
          mobile_visits: number
          top_pages: Json | null
          top_referrers: Json | null
          total_visits: number
          unique_visitors: number
        }
        Insert: {
          city?: string
          country?: string
          created_at?: string
          date?: string
          desktop_visits?: number
          id?: string
          mobile_visits?: number
          top_pages?: Json | null
          top_referrers?: Json | null
          total_visits?: number
          unique_visitors?: number
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          date?: string
          desktop_visits?: number
          id?: string
          mobile_visits?: number
          top_pages?: Json | null
          top_referrers?: Json | null
          total_visits?: number
          unique_visitors?: number
        }
        Relationships: []
      }
      site_visit_counter: {
        Row: {
          id: number
          today_date: string
          today_visits: number
          total_visits: number
          unique_visitors: number
          updated_at: string
        }
        Insert: {
          id?: number
          today_date?: string
          today_visits?: number
          total_visits?: number
          unique_visitors?: number
          updated_at?: string
        }
        Update: {
          id?: number
          today_date?: string
          today_visits?: number
          total_visits?: number
          unique_visitors?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          language: string | null
          os: string | null
          page_path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visitor_ip: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          language?: string | null
          os?: string | null
          page_path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_ip?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          language?: string | null
          os?: string | null
          page_path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_ip?: string | null
        }
        Relationships: []
      }
      smart_assistant_commands: {
        Row: {
          accepted_at: string | null
          admin_id: string
          ai_response: string | null
          attached_file_type: string | null
          attached_file_url: string | null
          command_text: string
          command_type: string
          created_at: string
          generated_files: Json | null
          id: string
          rejected_at: string | null
          status: string
          target_page: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          admin_id: string
          ai_response?: string | null
          attached_file_type?: string | null
          attached_file_url?: string | null
          command_text?: string
          command_type?: string
          created_at?: string
          generated_files?: Json | null
          id?: string
          rejected_at?: string | null
          status?: string
          target_page?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          admin_id?: string
          ai_response?: string | null
          attached_file_type?: string | null
          attached_file_url?: string | null
          command_text?: string
          command_type?: string
          created_at?: string
          generated_files?: Json | null
          id?: string
          rejected_at?: string | null
          status?: string
          target_page?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          admin_approved: boolean
          approved_at: string | null
          content: string
          created_at: string
          created_by: string | null
          hashtags: string[] | null
          id: string
          image_url: string | null
          metadata: Json | null
          platform: string
          post_type: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_approved?: boolean
          approved_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          hashtags?: string[] | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          platform?: string
          post_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          admin_approved?: boolean
          approved_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          hashtags?: string[] | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          platform?: string
          post_type?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          area: string | null
          category: string
          city: string | null
          commission_rate: number | null
          country: string | null
          created_at: string
          delivery_fee: number | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          description: string | null
          google_place_id: string | null
          id: string
          image_url: string | null
          is_confirmed: boolean | null
          is_open: boolean
          lat: number | null
          lng: number | null
          min_order: number | null
          name: string
          owner_id: string | null
          phone: string | null
          rating: number | null
          store_code: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          category?: string
          city?: string | null
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_confirmed?: boolean | null
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          min_order?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          store_code?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          category?: string
          city?: string | null
          commission_rate?: number | null
          country?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_confirmed?: boolean | null
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          min_order?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          store_code?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_assistants: {
        Row: {
          allowed_tables: string[]
          allowed_tools: string[]
          assistant_type: string
          color: string
          created_at: string
          created_by: string | null
          description: string
          execution_log: Json
          icon: string
          id: string
          is_active: boolean
          max_actions_per_minute: number
          name: string
          name_ar: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          allowed_tables?: string[]
          allowed_tools?: string[]
          assistant_type?: string
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          execution_log?: Json
          icon?: string
          id?: string
          is_active?: boolean
          max_actions_per_minute?: number
          name?: string
          name_ar?: string
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          allowed_tables?: string[]
          allowed_tools?: string[]
          assistant_type?: string
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          execution_log?: Json
          icon?: string
          id?: string
          is_active?: boolean
          max_actions_per_minute?: number
          name?: string
          name_ar?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          agent_id: string | null
          category: string
          created_at: string
          description: string
          driver_id: string | null
          id: string
          priority: string
          status: string
          ticket_code: string | null
          title: string
          trip_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          category?: string
          created_at?: string
          description?: string
          driver_id?: string | null
          id?: string
          priority?: string
          status?: string
          ticket_code?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          category?: string
          created_at?: string
          description?: string
          driver_id?: string | null
          id?: string
          priority?: string
          status?: string
          ticket_code?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          trip_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          trip_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_status_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          distance: number | null
          driver_id: string | null
          end_location: string | null
          ended_at: string | null
          fare: number | null
          id: string
          start_location: string | null
          started_at: string | null
          status: string
          trip_code: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          distance?: number | null
          driver_id?: string | null
          end_location?: string | null
          ended_at?: string | null
          fare?: number | null
          id?: string
          start_location?: string | null
          started_at?: string | null
          status?: string
          trip_code?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          distance?: number | null
          driver_id?: string | null
          end_location?: string | null
          ended_at?: string | null
          fare?: number | null
          id?: string
          start_location?: string | null
          started_at?: string | null
          status?: string
          trip_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          permission_role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          permission_role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          permission_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_roles_permission_role_id_fkey"
            columns: ["permission_role_id"]
            isOneToOne: false
            referencedRelation: "permission_roles"
            referencedColumns: ["id"]
          },
        ]
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
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          driver_id: string
          id: string
          model: string
          plate_no: string
          vehicle_code: string | null
        }
        Insert: {
          brand?: string
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          model?: string
          plate_no?: string
          vehicle_code?: string | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          model?: string
          plate_no?: string
          vehicle_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_drivers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_orders: {
        Row: {
          agent_id: string | null
          agent_notes: string | null
          audio_url: string
          created_at: string
          id: string
          order_id: string | null
          status: string
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_notes?: string | null
          audio_url?: string
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_notes?: string | null
          audio_url?: string
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          center_lat: number
          center_lng: number
          city: string
          country: string
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          name_ar: string
          name_fr: string
          radius_km: number
          zone_code: string | null
        }
        Insert: {
          center_lat?: number
          center_lng?: number
          city?: string
          country?: string
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_fr?: string
          radius_km?: number
          zone_code?: string | null
        }
        Update: {
          center_lat?: number
          center_lng?: number
          city?: string
          country?: string
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          name_ar?: string
          name_fr?: string
          radius_km?: number
          zone_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_drivers_public: {
        Row: {
          car_id: string | null
          current_lat: number | null
          current_lng: number | null
          id: string | null
          rating: number | null
          status: string | null
        }
        Insert: {
          car_id?: string | null
          current_lat?: never
          current_lng?: never
          id?: string | null
          rating?: number | null
          status?: string | null
        }
        Update: {
          car_id?: string | null
          current_lat?: never
          current_lng?: never
          id?: string | null
          rating?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_drivers_car"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enforce_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_route_name: string
          p_window_seconds: number
        }
        Returns: Json
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_entity_code: { Args: { prefix: string }; Returns: string }
      get_public_tables: { Args: never; Returns: string[] }
      get_table_columns: {
        Args: { p_table: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_visit:
        | {
            Args: { p_page_path?: string; p_session_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_browser?: string
              p_city?: string
              p_country?: string
              p_device_type?: string
              p_language?: string
              p_os?: string
              p_page_path?: string
              p_referrer?: string
              p_session_id: string
            }
            Returns: Json
          }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "driver"
        | "agent"
        | "delivery"
        | "store_owner"
        | "smart_admin_assistant"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "driver",
        "agent",
        "delivery",
        "store_owner",
        "smart_admin_assistant",
      ],
    },
  },
} as const
