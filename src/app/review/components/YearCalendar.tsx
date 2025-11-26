'use client'

import { useState, useEffect, useMemo } from 'react'
import { DailyRecord } from '@/types/record'
import { getYearRecords } from '@/lib/storage'
import { RecordModal } from '@/app/record/components/RecordModal'

interface YearCalendarProps {
  currentYear: number
}

export function YearCalendar({ currentYear }: YearCalendarProps) {
  const [records, setRecords] = useState<Record<string, DailyRecord>>({})
  const [loading, setLoading] = useState(true)
  const [modalRecord, setModalRecord] = useState<DailyRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    function loadYearRecords() {
      setLoading(true)
      try {
        const yearRecords = getYearRecords(currentYear)
        const recordsMap: Record<string, DailyRecord> = {}
        yearRecords.forEach((record) => {
          // 只添加有内容的记录，或者有摘要的记录
          const hasContent = record.content?.trim() &&
            /[\u4e00-\u9fa5a-zA-Z0-9]/.test(record.content.trim())
          if (hasContent || record.summary) {
            recordsMap[record.date] = record
          }
        })
        setRecords(recordsMap)
      } catch (error: any) {
        console.error('Failed to load year records:', error)
        setRecords({})
      } finally {
        setLoading(false)
      }
    }

    loadYearRecords()
  }, [currentYear])

  // 按月份组织日期
  const monthsData = useMemo(() => {
    const months: Array<{ month: number; monthName: string; dates: string[] }> = []
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(currentYear, month, 0).getDate()
      const dates: string[] = []

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month - 1, day)
        dates.push(date.toISOString().split('T')[0])
      }

      months.push({
        month,
        monthName: monthNames[month - 1],
        dates,
      })
    }

    return months
  }, [currentYear])

  const handleDotClick = (date: string) => {
    const record = records[date]
    if (record) {
      setModalRecord(record)
      setIsModalOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 h-full">
        <h2 className="text-2xl font-bold mb-4">{currentYear}年记录</h2>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">{currentYear}年记录</h2>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {monthsData.map(({ month, monthName, dates }, index) => (
            <div key={month} className="relative">
              {index > 0 && (
                <div className="border-t border-gray-200 mb-3"></div>
              )}
              <div className="flex flex-wrap gap-1.5 items-center relative">
                <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg text-gray-400 font-bold pointer-events-none whitespace-nowrap" style={{ opacity: 0.3 }}>
                  {monthName}
                </span>
                {dates.map((date) => {
                  const hasRecord = !!records[date]
                  const isToday = date === new Date().toISOString().split('T')[0]

                  return (
                    <button
                      key={date}
                      onClick={() => handleDotClick(date)}
                      disabled={!hasRecord}
                      className={`
                        w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 flex-shrink-0 relative z-10
                        ${hasRecord
                          ? 'border-green-500 bg-green-100 hover:bg-green-300 hover:scale-150 hover:shadow-md cursor-pointer'
                          : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                        }
                        ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                      `}
                      title={hasRecord ? `${date} - 点击查看详情` : date}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-4 text-sm text-gray-600 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-green-500 bg-green-100"></div>
          <span>有记录 ({Object.keys(records).length} 天)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 bg-gray-100"></div>
          <span>无记录</span>
        </div>
      </div>

      <RecordModal
        record={modalRecord}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

