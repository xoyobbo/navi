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
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string | null
          display_name: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          clerk_id: string
          email?: string | null
          display_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string | null
          display_name?: string | null
          created_at?: string | null
        }
      }
      search_history: {
        Row: {
          id: string
          user_id: string | null
          query: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          query?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          query?: string | null
          created_at?: string | null
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          product_image: string | null
          product_url: string | null
          source: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          product_image?: string | null
          product_url?: string | null
          source?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          product_image?: string | null
          product_url?: string | null
          source?: string | null
          created_at?: string | null
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          created_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string | null
          role: string
          content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          role: string
          content?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          role?: string
          content?: string | null
          created_at?: string | null
        }
      }
    }
  }
}

// 便利な型エイリアス
export type User = Database['public']['Tables']['users']['Row']
export type SearchHistory = Database['public']['Tables']['search_history']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
