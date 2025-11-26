'use client'

import { useRouter } from 'next/navigation'
import { Logo } from './components/Logo'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
          </div>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center p-8 min-h-[calc(100vh-4rem)]">
        <div className="max-w-2xl w-full text-center space-y-8">
          <h1 className="text-4xl font-bold mb-4">每日记录</h1>
          <p className="text-lg text-gray-600 mb-8">
            学习/想法记录工具
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="/record"
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors bg-white cursor-pointer"
            >
              <h2 className="text-2xl font-semibold mb-2">📝 记录</h2>
              <p className="text-gray-600">
                记录今天的学习和想法，自动生成摘要
              </p>
            </a>

            <a
              href="/review"
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors bg-white cursor-pointer"
            >
              <h2 className="text-2xl font-semibold mb-2">📊 回顾</h2>
              <p className="text-gray-600">
                查看月度学习总结和成长报告
              </p>
            </a>

            <a
              href="/settings"
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors bg-white cursor-pointer"
            >
              <h2 className="text-2xl font-semibold mb-2">⚙️ 设置</h2>
              <p className="text-gray-600">
                导出/导入数据，管理本地存储
              </p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

