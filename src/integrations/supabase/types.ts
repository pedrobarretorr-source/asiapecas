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
      after_sales: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string
          id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          sale_id: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "after_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "after_sales_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_compatibility_results: {
        Row: {
          compatible_machines: string[] | null
          id: string
          maintenance_tips: string | null
          material: string
          model_used: string | null
          part_id: string
          probable_function: string | null
          related_parts: string[] | null
          researched_at: string
          technical_description: string | null
          technical_specs: string[] | null
        }
        Insert: {
          compatible_machines?: string[] | null
          id?: string
          maintenance_tips?: string | null
          material: string
          model_used?: string | null
          part_id: string
          probable_function?: string | null
          related_parts?: string[] | null
          researched_at?: string
          technical_description?: string | null
          technical_specs?: string[] | null
        }
        Update: {
          compatible_machines?: string[] | null
          id?: string
          maintenance_tips?: string | null
          material?: string
          model_used?: string | null
          part_id?: string
          probable_function?: string | null
          related_parts?: string[] | null
          researched_at?: string
          technical_description?: string | null
          technical_specs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_compatibility_results_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_leads: {
        Row: {
          cnpj: string | null
          company: string | null
          created_at: string
          email: string | null
          estimated_volume: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
          segment: string | null
          status: string
          utm: Json | null
        }
        Insert: {
          cnpj?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_volume?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          segment?: string | null
          status?: string
          utm?: Json | null
        }
        Update: {
          cnpj?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_volume?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          segment?: string | null
          status?: string
          utm?: Json | null
        }
        Relationships: []
      }
      cart_sessions: {
        Row: {
          created_at: string
          id: string
          items: Json
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_report_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_shared: boolean
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_reports_log: {
        Row: {
          created_at: string
          file_name: string | null
          filters: Json | null
          format: string
          id: string
          row_count: number | null
          scope: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          filters?: Json | null
          format: string
          id?: string
          row_count?: number | null
          scope?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          filters?: Json | null
          format?: string
          id?: string
          row_count?: number | null
          scope?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: string
          payload: Json
          sent_at: string | null
          sent_to_ads: boolean
          utm: Json | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: string
          payload?: Json
          sent_at?: string | null
          sent_to_ads?: boolean
          utm?: Json | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          payload?: Json
          sent_at?: string | null
          sent_to_ads?: boolean
          utm?: Json | null
        }
        Relationships: []
      }
      customer_equipment: {
        Row: {
          created_at: string
          customer_id: string
          delivery_location: string | null
          id: string
          model: string | null
          notes: string | null
          order_form: string | null
          purchase_year: number | null
          sale_value: number | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_location?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          order_form?: string | null
          purchase_year?: number | null
          sale_value?: number | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_location?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          order_form?: string | null
          purchase_year?: number | null
          sale_value?: number | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_imports: {
        Row: {
          created_at: string
          file_name: string
          id: string
          imported_at: string
          inserted: number
          report: Json | null
          skipped: number
          status: string
          total_rows: number
          updated: number
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          imported_at?: string
          inserted?: number
          report?: Json | null
          skipped?: number
          status?: string
          total_rows?: number
          updated?: number
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          imported_at?: string
          inserted?: number
          report?: Json | null
          skipped?: number
          status?: string
          total_rows?: number
          updated?: number
        }
        Relationships: []
      }
      customer_invoices: {
        Row: {
          created_at: string
          customer_id: string
          document_number: string | null
          id: string
          invoice_date: string | null
          payer_name: string | null
          payment_terms: string | null
          source: string | null
          total_value: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          document_number?: string | null
          id?: string
          invoice_date?: string | null
          payer_name?: string | null
          payment_terms?: string | null
          source?: string | null
          total_value?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          document_number?: string | null
          id?: string
          invoice_date?: string | null
          payer_name?: string | null
          payment_terms?: string | null
          source?: string | null
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          cnpj_cpf: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          enriched_at: string | null
          enrichment_data: Json | null
          enrichment_status: string
          id: string
          interest_models: string[] | null
          last_proposal_at: string | null
          last_visit_at: string | null
          name: string
          notes: string | null
          phone: string | null
          relationship_status: string | null
          segment: string | null
          source: string | null
          state: string | null
          total_invoiced: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj_cpf?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          enriched_at?: string | null
          enrichment_data?: Json | null
          enrichment_status?: string
          id?: string
          interest_models?: string[] | null
          last_proposal_at?: string | null
          last_visit_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          relationship_status?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
          total_invoiced?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj_cpf?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          enriched_at?: string | null
          enrichment_data?: Json | null
          enrichment_status?: string
          id?: string
          interest_models?: string[] | null
          last_proposal_at?: string | null
          last_visit_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          relationship_status?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
          total_invoiced?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_research: {
        Row: {
          availability: string | null
          created_at: string
          delivery_days: number | null
          distributor_name: string
          id: string
          is_genuine: boolean | null
          match_confidence: string | null
          matched_part_number: string | null
          notes: string | null
          part_id: string
          payment_terms: string | null
          price_found: number
          researched_at: string
          researched_by: string | null
          source_url: string | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          delivery_days?: number | null
          distributor_name: string
          id?: string
          is_genuine?: boolean | null
          match_confidence?: string | null
          matched_part_number?: string | null
          notes?: string | null
          part_id: string
          payment_terms?: string | null
          price_found?: number
          researched_at?: string
          researched_by?: string | null
          source_url?: string | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          delivery_days?: number | null
          distributor_name?: string
          id?: string
          is_genuine?: boolean | null
          match_confidence?: string | null
          matched_part_number?: string | null
          notes?: string | null
          part_id?: string
          payment_terms?: string | null
          price_found?: number
          researched_at?: string
          researched_by?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_research_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      part_promotions: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          part_id: string
          promo_price: number
          starts_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          part_id: string
          promo_price: number
          starts_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          part_id?: string
          promo_price?: number
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_promotions_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          attributes: Json | null
          classification_method: string | null
          compatible_models: string[] | null
          created_at: string
          description: string
          estimated_price: number
          id: string
          image_url: string | null
          is_caminhao_eletrico: boolean
          is_guindaste: boolean
          is_linha_amarela: boolean
          is_mineracao: boolean
          is_perfuratriz: boolean
          last_entry_time: string | null
          machine_model: string | null
          manufacturer: string | null
          material: string
          needs_review: boolean
          part_category: string | null
          reviewed_at: string | null
          search_vector: unknown
          stock: number
          subcategory: string | null
          subcategory_confidence: number | null
          subcategory_source: string | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          classification_method?: string | null
          compatible_models?: string[] | null
          created_at?: string
          description: string
          estimated_price?: number
          id?: string
          image_url?: string | null
          is_caminhao_eletrico?: boolean
          is_guindaste?: boolean
          is_linha_amarela?: boolean
          is_mineracao?: boolean
          is_perfuratriz?: boolean
          last_entry_time?: string | null
          machine_model?: string | null
          manufacturer?: string | null
          material: string
          needs_review?: boolean
          part_category?: string | null
          reviewed_at?: string | null
          search_vector?: unknown
          stock?: number
          subcategory?: string | null
          subcategory_confidence?: number | null
          subcategory_source?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          classification_method?: string | null
          compatible_models?: string[] | null
          created_at?: string
          description?: string
          estimated_price?: number
          id?: string
          image_url?: string | null
          is_caminhao_eletrico?: boolean
          is_guindaste?: boolean
          is_linha_amarela?: boolean
          is_mineracao?: boolean
          is_perfuratriz?: boolean
          last_entry_time?: string | null
          machine_model?: string | null
          manufacturer?: string | null
          material?: string
          needs_review?: boolean
          part_category?: string | null
          reviewed_at?: string | null
          search_vector?: unknown
          stock?: number
          subcategory?: string | null
          subcategory_confidence?: number | null
          subcategory_source?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          default_markup: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          default_markup?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          default_markup?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      proposal_settings: {
        Row: {
          address: string
          cnpj: string
          company_name: string
          default_delivery_terms: string
          default_observations: string
          default_validity_days: number
          default_warranty_text: string
          email: string
          id: string
          phone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string
          cnpj?: string
          company_name?: string
          default_delivery_terms?: string
          default_observations?: string
          default_validity_days?: number
          default_warranty_text?: string
          email?: string
          id?: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string
          cnpj?: string
          company_name?: string
          default_delivery_terms?: string
          default_observations?: string
          default_validity_days?: number
          default_warranty_text?: string
          email?: string
          id?: string
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      prospection_campaigns: {
        Row: {
          converted: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          target_country: string
          target_segments: string[] | null
          target_states: string[] | null
          total_prospects: number | null
        }
        Insert: {
          converted?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          target_country?: string
          target_segments?: string[] | null
          target_states?: string[] | null
          total_prospects?: number | null
        }
        Update: {
          converted?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          target_country?: string
          target_segments?: string[] | null
          target_states?: string[] | null
          total_prospects?: number | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          ai_summary: string | null
          city: string | null
          cnpj_cpf: string | null
          company: string | null
          country: string
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          matched_parts: string[] | null
          name: string
          notes: string | null
          phone: string | null
          score: number | null
          segment: string | null
          source: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          city?: string | null
          cnpj_cpf?: string | null
          company?: string | null
          country?: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          matched_parts?: string[] | null
          name: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          segment?: string | null
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          city?: string | null
          cnpj_cpf?: string | null
          company?: string | null
          country?: string
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          matched_parts?: string[] | null
          name?: string
          notes?: string | null
          phone?: string | null
          score?: number | null
          segment?: string | null
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          cnpj_cpf: string | null
          company: string | null
          converted_sale_id: string | null
          created_at: string
          customer_name: string
          email: string | null
          id: string
          items: Json
          notes: string | null
          phone: string | null
          status: string
          utm: Json | null
        }
        Insert: {
          cnpj_cpf?: string | null
          company?: string | null
          converted_sale_id?: string | null
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          items?: Json
          notes?: string | null
          phone?: string | null
          status?: string
          utm?: Json | null
        }
        Update: {
          cnpj_cpf?: string | null
          company?: string | null
          converted_sale_id?: string | null
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          items?: Json
          notes?: string | null
          phone?: string | null
          status?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_converted_sale_id_fkey"
            columns: ["converted_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          part_id: string | null
          quantity: number
          sale_id: string
          sell_price: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          part_id?: string | null
          quantity?: number
          sale_id: string
          sell_price?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string | null
          quantity?: number
          sale_id?: string
          sell_price?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          order_number: number
          payment_method: string | null
          payment_terms: string | null
          sale_date: string
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_terms?: string | null
          sale_date?: string
          status?: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_terms?: string | null
          sale_date?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_import_items: {
        Row: {
          created_at: string
          description: string
          estimated_price: number | null
          id: string
          import_id: string
          is_caminhao_eletrico: boolean | null
          is_guindaste: boolean | null
          is_linha_amarela: boolean | null
          is_mineracao: boolean | null
          is_perfuratriz: boolean | null
          last_entry_time: string | null
          machine_model: string | null
          manufacturer: string | null
          material: string
          stock: number | null
          supplier: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          estimated_price?: number | null
          id?: string
          import_id: string
          is_caminhao_eletrico?: boolean | null
          is_guindaste?: boolean | null
          is_linha_amarela?: boolean | null
          is_mineracao?: boolean | null
          is_perfuratriz?: boolean | null
          last_entry_time?: string | null
          machine_model?: string | null
          manufacturer?: string | null
          material: string
          stock?: number | null
          supplier?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          estimated_price?: number | null
          id?: string
          import_id?: string
          is_caminhao_eletrico?: boolean | null
          is_guindaste?: boolean | null
          is_linha_amarela?: boolean | null
          is_mineracao?: boolean | null
          is_perfuratriz?: boolean | null
          last_entry_time?: string | null
          machine_model?: string | null
          manufacturer?: string | null
          material?: string
          stock?: number | null
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_import_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "stock_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_imports: {
        Row: {
          created_at: string
          file_name: string
          id: string
          imported_at: string
          source_label: string | null
          status: string
          total_rows: number | null
          total_stock: number | null
          total_value: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          imported_at?: string
          source_label?: string | null
          status?: string
          total_rows?: number | null
          total_stock?: number | null
          total_value?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          imported_at?: string
          source_label?: string | null
          status?: string
          total_rows?: number | null
          total_stock?: number | null
          total_value?: number | null
        }
        Relationships: []
      }
      subcategory_taxonomy: {
        Row: {
          active: boolean
          attribute_extractors: Json
          category_group: string
          created_at: string
          id: string
          min_score: number
          negative_terms: string[]
          priority: number
          subcategory: string
          synonyms_en: string[]
          synonyms_es: string[]
          synonyms_pt: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          attribute_extractors?: Json
          category_group: string
          created_at?: string
          id?: string
          min_score?: number
          negative_terms?: string[]
          priority?: number
          subcategory: string
          synonyms_en?: string[]
          synonyms_es?: string[]
          synonyms_pt?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          attribute_extractors?: Json
          category_group?: string
          created_at?: string
          id?: string
          min_score?: number
          negative_terms?: string[]
          priority?: number
          subcategory?: string
          synonyms_en?: string[]
          synonyms_es?: string[]
          synonyms_pt?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      taxonomy_feedback: {
        Row: {
          applied: boolean
          corrected_subcategory: string
          created_at: string
          description_snapshot: string | null
          id: string
          original_subcategory: string | null
          part_id: string | null
          user_id: string | null
        }
        Insert: {
          applied?: boolean
          corrected_subcategory: string
          created_at?: string
          description_snapshot?: string | null
          id?: string
          original_subcategory?: string | null
          part_id?: string | null
          user_id?: string | null
        }
        Update: {
          applied?: boolean
          corrected_subcategory?: string
          created_at?: string
          description_snapshot?: string | null
          id?: string
          original_subcategory?: string | null
          part_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_feedback_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitrine_banners: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          cta_link: string | null
          ends_at: string | null
          id: string
          image_url: string
          lang: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          lang?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          lang?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vitrine_collection_parts: {
        Row: {
          collection_id: string
          part_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          part_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          part_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vitrine_collection_parts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "vitrine_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitrine_collection_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      vitrine_collections: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vitrine_featured_parts: {
        Row: {
          active: boolean
          badge_color: string | null
          badge_label: string | null
          created_at: string
          id: string
          part_id: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          badge_color?: string | null
          badge_label?: string | null
          created_at?: string
          id?: string
          part_id: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          badge_color?: string | null
          badge_label?: string | null
          created_at?: string
          id?: string
          part_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vitrine_featured_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      vitrine_seo_overrides: {
        Row: {
          description: string | null
          kind: string
          noindex: boolean
          og_image: string | null
          slug: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          kind: string
          noindex?: boolean
          og_image?: string | null
          slug: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          kind?: string
          noindex?: boolean
          og_image?: string | null
          slug?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      vitrine_settings: {
        Row: {
          ads_conversion_id: string | null
          ads_conversion_label: string | null
          ads_label_b2b: string | null
          ads_label_quote: string | null
          ads_label_whatsapp: string | null
          b2b_whatsapp: string | null
          ga4_id: string | null
          gtm_id: string | null
          hero_mode: string | null
          id: string
          meta_pixel_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ads_conversion_id?: string | null
          ads_conversion_label?: string | null
          ads_label_b2b?: string | null
          ads_label_quote?: string | null
          ads_label_whatsapp?: string | null
          b2b_whatsapp?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          hero_mode?: string | null
          id?: string
          meta_pixel_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ads_conversion_id?: string | null
          ads_conversion_label?: string | null
          ads_label_b2b?: string | null
          ads_label_quote?: string | null
          ads_label_whatsapp?: string | null
          b2b_whatsapp?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          hero_mode?: string | null
          id?: string
          meta_pixel_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_subcategory_rules: {
        Args: { _only_missing?: boolean }
        Returns: number
      }
      classify_parts_v4: { Args: { _only_missing?: boolean }; Returns: Json }
      cleanup_bad_attributes: { Args: never; Returns: number }
      find_duplicate_parts: {
        Args: never
        Returns: {
          description_a: string
          description_b: string
          material_a: string
          material_b: string
          price_a: number
          price_b: number
          stock_a: number
          stock_b: number
        }[]
      }
      get_catalog_intelligence: { Args: never; Returns: Json }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_distinct_values: {
        Args: { col_name: string; stock_min?: number }
        Returns: string[]
      }
      get_drilldown: {
        Args: { _limit?: number; filters?: Json }
        Returns: Json
      }
      get_intelligence_view: { Args: { filters?: Json }; Returns: Json }
      get_stock_analytics: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      search_parts: {
        Args: { _limit?: number; _offset?: number; filters?: Json; q?: string }
        Returns: {
          attributes: Json
          description: string
          estimated_price: number
          id: string
          image_url: string
          last_entry_time: string
          machine_model: string
          manufacturer: string
          material: string
          part_category: string
          score: number
          stock: number
          subcategory: string
          total_count: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
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
      app_role: ["admin", "manager", "user"],
    },
  },
} as const
