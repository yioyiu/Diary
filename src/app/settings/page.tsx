'use client'

import { useState } from 'react'
import { exportData, importData, clearAllData } from '@/lib/storage'
import { Logo } from '../components/Logo'
import Link from 'next/link'

export default function SettingsPage() {
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExport = () => {
    try {
      const data = exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily-records-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: '导出成功！' })
    } catch (error) {
      console.error('Export failed:', error)
      setMessage({ type: 'error', text: `导出失败：${error instanceof Error ? error.message : '未知错误'}` })
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setImporting(true)
    setMessage(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // 验证数据格式
      if (!data || typeof data !== 'object') {
        throw new Error('无效的数据格式')
      }

      const result = importData(data)
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        // 刷新页面以显示新数据
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (error) {
      console.error('Import failed:', error)
      setMessage({ type: 'error', text: `导入失败：${error instanceof Error ? error.message : '未知错误'}` })
    } finally {
      setImporting(false)
      // 重置文件输入
      event.target.value = ''
    }
  }

  const handleClear = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      try {
        clearAllData()
        setMessage({ type: 'success', text: '数据已清空' })
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      } catch (error) {
        console.error('Clear failed:', error)
        setMessage({ type: 'error', text: `清空失败：${error instanceof Error ? error.message : '未知错误'}` })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 relative">
            <Logo />
            <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-4 items-center">
              <Link
                href="/record"
                className="text-gray-600 hover:text-gray-900 text-xl"
              >
                记录
              </Link>
              <Link
                href="/review"
                className="text-gray-600 hover:text-gray-900 text-xl"
              >
                回顾
              </Link>
              <Link
                href="/settings"
                className="text-blue-600 font-medium text-xl"
              >
                设置
              </Link>
            </div>
            <div className="flex items-center">
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">设置</h1>

        <div className="space-y-6">
          {/* 导出数据 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">导出数据</h2>
            <p className="text-gray-600 mb-4">
              将所有记录和月度总结导出为 JSON 文件，可以用于备份或迁移。
            </p>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              导出数据
            </button>
          </div>

          {/* 导入数据 */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">导入数据</h2>
            <p className="text-gray-600 mb-4">
              从之前导出的 JSON 文件导入数据。导入的数据会与现有数据合并，相同日期的记录会被覆盖。
            </p>
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </label>
            {importing && (
              <p className="mt-2 text-sm text-gray-600">导入中...</p>
            )}
          </div>

          {/* 清空数据 */}
          <div className="bg-white rounded-lg shadow border border-red-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">危险操作</h2>
            <p className="text-gray-600 mb-4">
              清空所有本地存储的数据。此操作不可恢复，请确保已导出备份。
            </p>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              清空所有数据
            </button>
          </div>

          {/* 消息提示 */}
          {message && (
            <div
              className={`p-4 rounded ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

