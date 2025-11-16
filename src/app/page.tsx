'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { AuthButton } from './components/AuthButton'
import { Logo } from './components/Logo'
import type { User, Session } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: Session | null) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!user) {
      e.preventDefault()
      router.push(`/auth?redirect=${path}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <AuthButton />
          </div>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)]">
        <div className="max-w-2xl w-full text-center space-y-8">
          <h1 className="text-4xl font-bold mb-4">每日记录</h1>
          <p className="text-lg text-gray-600 mb-8">
            学习/想法记录工具
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a
              href="/record"
              onClick={(e) => handleLinkClick(e, '/record')}
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors bg-white cursor-pointer"
            >
              <h2 className="text-2xl font-semibold mb-2">📝 记录</h2>
              <p className="text-gray-600">
                记录今天的学习和想法，自动生成摘要
              </p>
            </a>

            <a
              href="/review"
              onClick={(e) => handleLinkClick(e, '/review')}
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors bg-white cursor-pointer"
            >
              <h2 className="text-2xl font-semibold mb-2">📊 回顾</h2>
              <p className="text-gray-600">
                查看月度学习总结和成长报告
              </p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

