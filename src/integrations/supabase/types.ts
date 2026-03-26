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
      complaints: {
        Row: {
          agent_id: string | null
          agent_notes: string | null
          category: string
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
      drivers: {
        Row: {
          car_id: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
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
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          status: string
          trip_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          status?: string
          trip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
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
          name: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
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
          country: string | null
          created_at: string
          delivery_fee: number | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          description: string | null
          google_place_id: string | null
          id: string
          image_url: string | null
          is_open: boolean
          lat: number | null
          lng: number | null
          min_order: number | null
          name: string
          owner_id: string | null
          phone: string | null
          rating: number | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          min_order?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          category?: string
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          min_order?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
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
        }
        Insert: {
          brand?: string
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          model?: string
          plate_no?: string
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          model?: string
          plate_no?: string
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
      enforce_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_route_name: string
          p_window_seconds: number
        }
        Returns: Json
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
