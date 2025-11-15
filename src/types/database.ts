// Supabase 数据库类型定义
// 可以通过 Supabase CLI 自动生成，这里手动定义基础类型

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
      daily_records: {
        Row: {
          id: string
          user_id: string
          date: string
          content: string
          summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          content: string
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          content?: string
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      monthly_summary: {
        Row: {
          id: string
          user_id: string
          month: string
          summary: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          summary: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          summary?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

