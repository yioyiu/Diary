'use client'

import { useState, useEffect } from 'react'
import { getMonthlyRecords } from '../actions'
import { DailyRecord } from '@/types/record'
import { getDaysInMonth, getFirstDayOfMonth, formatDate, isSameDay } from '@/lib/date'
import { cn } from '@/lib/utils'
import { RecordModal } from './RecordModal'

interface CalendarProps {
  year: number
  month: number
  selectedDate: string | null
  onDateSelect: (date: string) => void
  refreshKey?: number // 用于触发刷新
}

export function Calendar({ year, month, selectedDate, onDateSelect, refreshKey }: CalendarProps) {
  const [records, setRecords] = useState<Record<string, DailyRecord>>({})
  const [loading, setLoading] = useState(true)
  const [modalRecord, setModalRecord] = useState<DailyRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function loadRecords() {
      setLoading(true)
      try {
        const monthlyRecords = await getMonthlyRecords(year, month)
        const recordsMap: Record<string, DailyRecord> = {}
        monthlyRecords.forEach((record) => {
          // 只添加有内容的记录，或者有摘要的记录
          // 如果内容为空且没有摘要，不显示在日历上
          const hasContent = record.content?.trim() && 
            /[\u4e00-\u9fa5a-zA-Z0-9]/.test(record.content.trim())
          if (hasContent || record.summary) {
            recordsMap[record.date] = record
          }
        })
        setRecords(recordsMap)
      } catch (error: any) {
        // 如果是认证错误，静默处理（不显示错误，因为用户可能正在登录）
        if (error?.message?.includes('未登录')) {
          console.warn('User not authenticated, calendar will be empty')
          setRecords({})
        } else {
          console.error('Failed to load records:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    loadRecords()
  }, [year, month, refreshKey]) // 添加 refreshKey 作为依赖

  const days = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 填充前面的空白
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="w-full">
      <div className="mb-2">
        <h2 className="text-base sm:text-lg font-semibold">
          {year}年{month}月
        </h2>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 px-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-600 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 px-1">
        {emptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="min-h-[70px] sm:min-h-[90px] lg:min-h-[110px] xl:min-h-[130px]" />
        ))}

        {days.map((day) => {
          const dateStr = formatDate(day)
          const record = records[dateStr]
          const isSelected = selectedDate === dateStr
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={dateStr}
              onClick={() => {
                // 总是更新选中的日期，这样右侧编辑器会切换到该日期
                onDateSelect(dateStr)
                // 如果该日期有记录，同时打开详情卡片
                if (record) {
                  setModalRecord(record)
                  setIsModalOpen(true)
                }
              }}
              className={cn(
                'min-h-[70px] sm:min-h-[90px] lg:min-h-[110px] xl:min-h-[130px] p-1.5 sm:p-2 text-sm border rounded hover:bg-gray-100 transition-colors flex flex-col',
                isToday && 'bg-blue-50',
                record && 'bg-green-50'
              )}
              style={isSelected ? { boxShadow: '0 0 0 2px rgb(59 130 246)' } : undefined}
            >
              <div className="font-medium mb-1 text-sm sm:text-base">{day.getDate()}</div>
              {/* 只在较大屏幕上显示摘要 */}
              {record?.summary && (
                <div className="hidden sm:block text-xs text-gray-600 text-left flex-1 space-y-0.5">
                  {record.summary
                    .split('\n')
                    .filter((line) => line.trim())
                    .slice(0, 3) // 最多显示3个要点
                    .map((point, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-gray-400 mr-1">{index + 1}.</span>
                        <span className="line-clamp-1">{point.trim()}</span>
                      </div>
                    ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <RecordModal
        record={modalRecord}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

