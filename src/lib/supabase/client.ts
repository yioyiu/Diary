import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗')
  throw new Error(
    'Your project\'s URL and Key are required to create a Supabase client! ' +
    'Check your Supabase project\'s API settings to find these values ' +
    'https://supabase.com/dashboard/project/_/settings/api'
  )
}

// 创建浏览器客户端，使用 @supabase/ssr 确保 cookies 同步
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

