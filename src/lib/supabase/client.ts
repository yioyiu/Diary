import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 延迟创建客户端，避免构建时错误
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

function getSupabaseClient() {
  // 如果已经创建，直接返回
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 检查环境变量
  if (!supabaseUrl || !supabaseAnonKey) {
    // 构建时：返回一个占位符对象，避免构建失败
    if (typeof window === 'undefined') {
      // 服务端构建时，返回一个模拟对象
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Missing environment variables' } }),
          signUp: async () => ({ data: null, error: { message: 'Missing environment variables' } }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
      } as any
    }
    // 客户端运行时：抛出错误
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
  supabaseInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

export const supabase = getSupabaseClient()

