'use client'

import { useState, useEffect } from 'react'
import { SummaryCard } from './components/SummaryCard'
import { DailyList } from './components/DailyList'
import { Charts } from './components/Charts'
import {
  getMonthlyRecordsForReview,
  generateMonthlyReview,
  extractKeywordsFromRecords,
} from './actions'
import { MonthlySummary } from '@/types/summary'
import { DailyRecord } from '@/types/record'
import Link from 'next/link'
import { AuthButton } from '../components/AuthButton'
import { Logo } from '../components/Logo'

export default function ReviewPage() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [keywords, setKeywords] = useState<Array<{ word: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [extractingKeywords, setExtractingKeywords] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMonthSelector, setShowMonthSelector] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useEffect(() => {
    loadData()
  }, [currentYear, currentMonth])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const monthlyRecords = await getMonthlyRecordsForReview(
        currentYear,
        currentMonth
      )
      setRecords(monthlyRecords)
      
      // 自动从摘要中提取关键词
      if (monthlyRecords.length > 0) {
        setExtractingKeywords(true)
        try {
          const extractedKeywords = await extractKeywordsFromRecords(monthlyRecords)
          setKeywords(extractedKeywords)
        } catch (err) {
          console.error('Failed to extract keywords:', err)
          // 提取关键词失败不影响主流程
        } finally {
          setExtractingKeywords(false)
        }
      } else {
        setKeywords([])
      }
    } catch (err: any) {
      // 格式化错误信息，避免显示原始错误对象
      const errorMessage = err?.message || err?.error?.message || '加载数据失败'
      setError(errorMessage)
      console.error('Failed to load monthly records:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateSummary() {
    // 先显示月份选择器，默认选择当前查看的月份
    setSelectedYear(currentYear)
    setSelectedMonth(currentMonth)
    setShowMonthSelector(true)
  }

  async function handleConfirmGenerate() {
    setShowMonthSelector(false)
    setGenerating(true)
    setError(null)
    try {
      const result = await generateMonthlyReview(selectedYear, selectedMonth)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSummary(result)
      }
    } catch (err: any) {
      // 格式化错误信息
      const errorMessage = err?.message || err?.error?.message || '生成总结失败'
      setError(errorMessage)
      console.error('Failed to generate monthly review:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleMonthChange = (delta: number) => {
    let newMonth = currentMonth + delta
    let newYear = currentYear

    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }

    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
    setSummary(null) // 切换月份时清空总结
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
                className="text-gray-600 hover:text-gray-900"
              >
                记录
              </Link>
              <Link
                href="/review"
                className="text-blue-600 font-medium"
              >
                回顾
              </Link>
            </div>
            <div className="flex items-center">
              <AuthButton />
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 月份选择 */}
        <div className="mb-6 flex items-center justify-between bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold">
              {currentYear}年{currentMonth}月回顾
            </h1>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={generating || records.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? '生成中...' : '生成月度总结'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* 月度总结卡片 */}
        {summary && (
          <div className="mb-6">
            <SummaryCard summary={summary} />
          </div>
        )}

        {/* 图表和列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Charts records={records} summary={summary} keywords={keywords} extractingKeywords={extractingKeywords} />
          <div className="lg:col-span-1">
            {/* 可以添加其他图表 */}
          </div>
        </div>

        {/* 每日摘要列表 */}
        <DailyList records={records} loading={loading} />
      </div>

      {/* 月份选择弹窗 */}
      {showMonthSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">选择月份</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年份
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月份
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowMonthSelector(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={generating}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? '生成中...' : '生成总结'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

