'use client'

import { useState, useCallback } from 'react'
import { Calendar } from './components/Calendar'
import { Editor } from './components/Editor'
import Link from 'next/link'
import { getToday } from '@/lib/date'
import { AuthButton } from '../components/AuthButton'
import { Logo } from '../components/Logo'
import { DailyRecord } from '@/types/record'

export default function RecordPage() {
  const today = getToday()
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [refreshKey, setRefreshKey] = useState(0) // 用于触发日历刷新
  const [recordsCache, setRecordsCache] = useState<Record<string, DailyRecord>>({}) // 缓存已加载的记录

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
  }

  const handleRecordSave = (record?: DailyRecord | null) => {
    // 保存后刷新日历
    setRefreshKey(prev => prev + 1)
    // 如果保存了记录，更新缓存
    if (record && record.date) {
      setRecordsCache(prev => ({ ...prev, [record.date]: record }))
    } else if (record === null && selectedDate) {
      // 如果记录被删除，从缓存中移除
      setRecordsCache(prev => {
        const newCache = { ...prev }
        delete newCache[selectedDate]
        return newCache
      })
    }
  }

  // 使用 useCallback 包装回调函数，避免 Calendar 组件无限循环
  const handleRecordsLoaded = useCallback((records: Record<string, DailyRecord>) => {
    // 更新缓存
    setRecordsCache(prev => ({ ...prev, ...records }))
  }, [])

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
                className="text-blue-600 font-medium text-xl"
              >
                记录
              </Link>
              <Link
                href="/review"
                className="text-gray-600 hover:text-gray-900 text-xl"
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 h-[calc(100vh-8rem)]">
          {/* 左侧：日历 */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-3 lg:p-4 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <button
                  onClick={() => handleMonthChange(-1)}
                  className="p-1.5 hover:bg-gray-100 rounded text-sm"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    const now = new Date()
                    setCurrentYear(now.getFullYear())
                    setCurrentMonth(now.getMonth() + 1)
                    setSelectedDate(getToday())
                  }}
                  className="text-xs sm:text-sm text-blue-600 hover:underline px-2"
                >
                  今天
                </button>
                <button
                  onClick={() => handleMonthChange(1)}
                  className="p-1.5 hover:bg-gray-100 rounded text-sm"
                >
                  →
                </button>
              </div>
              <div className="flex-1 overflow-auto -mx-1 px-1">
                <Calendar
                  year={currentYear}
                  month={currentMonth}
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  refreshKey={refreshKey}
                  onRecordsLoaded={handleRecordsLoaded}
                />
              </div>
            </div>
          </div>

          {/* 右侧：编辑器 */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 lg:p-6 flex flex-col">
              <div className="mb-4 text-sm text-gray-600 flex-shrink-0">
                日期：{selectedDate}
              </div>
              <div className="flex-1 min-h-0 overflow-visible">
                <Editor 
                  date={selectedDate} 
                  onSave={handleRecordSave}
                  cachedRecord={recordsCache[selectedDate] || null}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

