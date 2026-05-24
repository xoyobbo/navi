import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 未認証リクエスト用（公開データ取得など）
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Clerk JWT を使って認証済みクライアントを生成する関数
// ClerkのuseAuth().getToken({ template: 'supabase' }) の戻り値を渡す
export const createAuthClient = (getToken: () => Promise<string | null>) =>
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await getToken()
        const headers = new Headers(options?.headers)
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`)
        }
        return fetch(url, { ...options, headers })
      },
    },
  })
