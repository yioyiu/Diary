'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    // 先尝试从 session 获取（更快，从缓存读取）
    async function initAuth() {
      try {
        // 先获取 session（从缓存读取，更快）
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mountedRef.current) {
          setUser(session?.user ?? null)
          setLoading(false)
        }

        // 然后验证用户（确保 session 有效）
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (mountedRef.current && user) {
          setUser(user)
        }
      } catch (error) {
        console.error('Auth error:', error)
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // 使用 window.location 确保完全刷新
    window.location.href = '/'
  }

  // 加载时显示占位符，保持布局稳定
  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-12 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <a
        href="/auth"
        className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        登录
      </a>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600 truncate max-w-[150px]">
        {user.email}
      </span>
      <button
        onClick={handleLogout}
        className="px-4 py-2 text-sm border rounded hover:bg-gray-100 transition-colors whitespace-nowrap"
      >
        退出
      </button>
    </div>
  )
}
