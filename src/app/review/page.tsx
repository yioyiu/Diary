'use client'

import { useState, useEffect, useRef } from 'react'
import { SummaryCard } from './components/SummaryCard'
import { DailyList } from './components/DailyList'
import { Charts } from './components/Charts'
import { YearCalendar } from './components/YearCalendar'
import {
  generateMonthlyReviewFromContent,
} from './actions'
import {
  getMonthlyRecords,
  getYearRecords,
  getMonthlySummary,
  saveMonthlySummary,
} from '@/lib/storage'
import { MonthlySummary } from '@/types/summary'
import { DailyRecord } from '@/types/record'
import Link from 'next/link'
import { Logo } from '../components/Logo'

// 从摘要中提取关键词（简单版本，不使用 AI）
function extractKeywordsFromSummaries(records: DailyRecord[]): Array<{ word: string; count: number }> {
  const keywordMap = new Map<string, number>()
  
  records.forEach(record => {
    if (record.summary) {
      const points = record.summary.split('\n').filter(p => p.trim())
      points.forEach(point => {
        // 简单的关键词提取：取每行的核心内容（去掉常见动词）
        const cleaned = point.trim()
          .replace(/^(学习了|复习了|完成了|解决了|了解了|掌握了)\s*/, '')
          .trim()
        
        if (cleaned.length > 0 && cleaned.length < 30) {
          keywordMap.set(cleaned, (keywordMap.get(cleaned) || 0) + 1)
        }
      })
    }
  })
  
  return Array.from(keywordMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // 最多返回20个关键词
}

// 缓存类型定义
interface MonthDataCache {
  records: DailyRecord[]
  keywords: Array<{ word: string; count: number }>
  recordsHash: string // 用于验证缓存是否有效
}

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
  
  // 客户端缓存：存储已加载的月份数据（使用 useRef 避免触发重新渲染）
  const dataCacheRef = useRef<Record<string, MonthDataCache>>({})

  // 从 localStorage 加载缓存
  useEffect(() => {
    try {
      const cached = localStorage.getItem('review-data-cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        dataCacheRef.current = parsed
      }
    } catch (err) {
      console.error('Failed to load cache from localStorage:', err)
    }
  }, [])

  // 保存缓存到 localStorage
  const saveCacheToStorage = (cache: Record<string, MonthDataCache>) => {
    try {
      localStorage.setItem('review-data-cache', JSON.stringify(cache))
    } catch (err) {
      console.error('Failed to save cache to localStorage:', err)
    }
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      setSummary(null) // 切换月份时先清空总结
      
      const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      
      // 检查缓存（先从内存，再从 localStorage）
      let cachedData = dataCacheRef.current[monthKey]
      
      // 如果内存缓存不存在，尝试从 localStorage 加载
      if (!cachedData) {
        try {
          const stored = localStorage.getItem('review-data-cache')
          if (stored) {
            const parsed = JSON.parse(stored)
            dataCacheRef.current = parsed
            cachedData = parsed[monthKey]
          }
        } catch (err) {
          console.error('Failed to load cache from localStorage:', err)
        }
      }
      
      // 如果缓存存在，先使用缓存数据（立即显示）
      if (cachedData) {
        setRecords(cachedData.records)
        setKeywords(cachedData.keywords)
        setLoading(false)
        
        // 在后台验证缓存是否有效
        try {
          const monthlyRecords = getMonthlyRecords(currentYear, currentMonth)
          
          // 生成记录哈希（基于记录的ID和更新时间）
          const recordsHash = monthlyRecords
            .map(r => `${r.id}-${r.updated_at}`)
            .sort()
            .join('|')
          
          // 如果缓存有效，不需要更新
          if (cachedData.recordsHash === recordsHash) {
            return
          }
          
          // 缓存已失效，更新数据
          setRecords(monthlyRecords)
          
          // 从摘要中提取关键词（简单提取，不使用 AI）
          if (monthlyRecords.length > 0) {
            const extractedKeywords = extractKeywordsFromSummaries(monthlyRecords)
            setKeywords(extractedKeywords)
            
            // 更新缓存
            dataCacheRef.current[monthKey] = {
              records: monthlyRecords,
              keywords: extractedKeywords,
              recordsHash,
            }
            // 保存到 localStorage
            saveCacheToStorage(dataCacheRef.current)
          } else {
            setKeywords([])
          }
        } catch (err) {
          console.error('Failed to verify cache:', err)
        }
        return
      }
      
      // 缓存不存在，加载新数据
      try {
        const monthlyRecords = getMonthlyRecords(currentYear, currentMonth)
        
        setRecords(monthlyRecords)
        
        // 生成记录哈希
        const recordsHash = monthlyRecords
          .map(r => `${r.id}-${r.updated_at}`)
          .sort()
          .join('|')
        
        // 从摘要中提取关键词（简单提取，不使用 AI）
        if (monthlyRecords.length > 0) {
          const extractedKeywords = extractKeywordsFromSummaries(monthlyRecords)
          setKeywords(extractedKeywords)
          
          // 保存到缓存
          dataCacheRef.current[monthKey] = {
            records: monthlyRecords,
            keywords: extractedKeywords,
            recordsHash,
          }
          // 保存到 localStorage
          saveCacheToStorage(dataCacheRef.current)
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
    
    loadData()
  }, [currentYear, currentMonth])

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
      // 获取该月的所有记录
      const monthlyRecords = getMonthlyRecords(selectedYear, selectedMonth)
      
      if (monthlyRecords.length === 0) {
        setError('本月暂无记录，无法生成总结')
        setGenerating(false)
        return
      }

      // 合并所有内容，按日期排序
      const mergedContent = monthlyRecords
        .filter((r) => r.content && r.content.trim().length > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => {
          const date = new Date(r.date)
          const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
          return `【${dateStr}】\n${r.content}`
        })
        .join('\n\n')

      // 调用 Server Action 生成总结
      const result = await generateMonthlyReviewFromContent(mergedContent, selectedYear, selectedMonth)
      
      if ('error' in result) {
        setError(result.error)
      } else {
        setSummary(result)
        // 保存到本地存储
        saveMonthlySummary(selectedYear, selectedMonth, result)
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
    // 注意：summary 会在 useEffect 中自动加载或清空
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
                className="text-blue-600 font-medium text-xl"
              >
                回顾
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900 text-xl"
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
          <YearCalendar currentYear={currentYear} />
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

