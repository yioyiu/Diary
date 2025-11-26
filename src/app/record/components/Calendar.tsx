'use client'

import { useState, useEffect, useRef } from 'react'
import { getMonthlyRecords } from '@/lib/storage'
import { DailyRecord } from '@/types/record'
import { getDaysInMonth, getFirstDayOfMonth, formatDate, isSameDay } from '@/lib/date'
import { cn } from '@/lib/utils'

interface CalendarProps {
  year: number
  month: number
  selectedDate: string | null
  onDateSelect: (date: string) => void
  refreshKey?: number // 用于触发刷新
  onRecordsLoaded?: (records: Record<string, DailyRecord>) => void // 记录加载完成后的回调
  updatedRecord?: DailyRecord | null // 外部更新的记录，用于直接更新而不重新加载
}

export function Calendar({ year, month, selectedDate, onDateSelect, refreshKey, onRecordsLoaded, updatedRecord }: CalendarProps) {
  const [records, setRecords] = useState<Record<string, DailyRecord>>({})
  const [loading, setLoading] = useState(true)
  const lastUpdatedRecordRef = useRef<DailyRecord | null>(null)

  useEffect(() => {
    async function loadRecords() {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`
      
      // 先尝试从 localStorage 加载缓存
      try {
        const cached = localStorage.getItem(`calendar-${monthKey}`)
        if (cached) {
          const cachedData = JSON.parse(cached)
          // 检查缓存是否过期（24小时）
          const cacheTime = cachedData.timestamp || 0
          const now = Date.now()
          if (now - cacheTime < 24 * 60 * 60 * 1000) {
            // 缓存有效，立即显示
            setRecords(cachedData.records || {})
            setLoading(false)
            onRecordsLoaded?.(cachedData.records || {})
            
            // 在后台验证并更新缓存
            try {
              const monthlyRecords = await getMonthlyRecords(year, month)
              const recordsMap: Record<string, DailyRecord> = {}
              monthlyRecords.forEach((record) => {
                const hasContent = record.content?.trim() && 
                  /[\u4e00-\u9fa5a-zA-Z0-9]/.test(record.content.trim())
                if (hasContent || record.summary) {
                  recordsMap[record.date] = record
                }
              })
              
              // 更新缓存
              localStorage.setItem(`calendar-${monthKey}`, JSON.stringify({
                records: recordsMap,
                timestamp: Date.now(),
              }))
              
              setRecords(recordsMap)
              onRecordsLoaded?.(recordsMap)
            } catch (err) {
              console.error('Failed to update cache:', err)
            }
            return
          }
        }
      } catch (err) {
        console.error('Failed to load cache:', err)
      }
      
      // 没有缓存或缓存过期，加载新数据
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
        
        // 保存到缓存
        try {
          localStorage.setItem(`calendar-${monthKey}`, JSON.stringify({
            records: recordsMap,
            timestamp: Date.now(),
          }))
        } catch (err) {
          console.error('Failed to save cache:', err)
        }
        
        // 通知父组件记录已加载
        onRecordsLoaded?.(recordsMap)
      } catch (error: any) {
        console.error('Failed to load records:', error)
        setRecords({})
      } finally {
        setLoading(false)
      }
    }

    loadRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, refreshKey]) // 注意：onRecordsLoaded 不添加到依赖，避免无限循环

  // 处理外部更新的记录（保存后直接更新，不重新加载）
  useEffect(() => {
    if (!updatedRecord) {
      lastUpdatedRecordRef.current = null
      return
    }

    // 检查是否是同一个记录的重复更新（通过比较 date 和 updated_at）
    // 但如果是删除操作（只有 date），每次都处理
    const isDeleteOp = Object.keys(updatedRecord).length === 1 && 'date' in updatedRecord && !('id' in updatedRecord)
    
    if (!isDeleteOp) {
      const recordKey = updatedRecord.date + (updatedRecord.updated_at || '') + (updatedRecord.id || '')
      const lastKey = lastUpdatedRecordRef.current 
        ? lastUpdatedRecordRef.current.date + (lastUpdatedRecordRef.current.updated_at || '') + (lastUpdatedRecordRef.current.id || '')
        : ''
      
      if (recordKey === lastKey) {
        // 这是重复的更新，忽略
        return
      }
    }

    lastUpdatedRecordRef.current = updatedRecord

    const recordDate = updatedRecord.date
    const recordYear = new Date(recordDate).getFullYear()
    const recordMonth = new Date(recordDate).getMonth() + 1

    // 只更新当前显示的月份
    if (recordYear === year && recordMonth === month) {
      setRecords(prev => {
        const newRecords = { ...prev }
        
        // 检查是否是删除操作（只有 date 字段，没有 id）
        const isDeleteOperation = Object.keys(updatedRecord).length === 1 && 'date' in updatedRecord && !('id' in updatedRecord)
        
        if (isDeleteOperation) {
          // 删除记录
          delete newRecords[recordDate]
        } else {
          // 正常保存的记录（有 id 表示是真实记录）
          // 检查记录是否有内容或摘要
          const hasContent = updatedRecord.content?.trim() && 
            /[\u4e00-\u9fa5a-zA-Z0-9]/.test(updatedRecord.content.trim())
          
          // 如果有 id，说明是真实记录，应该显示（即使摘要还没生成）
          if (updatedRecord.id || hasContent || updatedRecord.summary) {
            // 更新或添加记录
            newRecords[recordDate] = updatedRecord
          } else {
            // 如果内容为空且没有 id，删除记录
            delete newRecords[recordDate]
          }
        }

        // 更新 localStorage 缓存
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        try {
          localStorage.setItem(`calendar-${monthKey}`, JSON.stringify({
            records: newRecords,
            timestamp: Date.now(),
          }))
        } catch (err) {
          console.error('Failed to update cache:', err)
        }

        // 通知父组件记录已更新
        onRecordsLoaded?.(newRecords)

        return newRecords
      })
    }
    // 注意：这里不添加 onRecordsLoaded 到依赖，避免无限循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedRecord, year, month])

  const days = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 填充前面的空白
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  // 显示加载状态
  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-2">
          <h2 className="text-base sm:text-lg font-semibold">
            {year}年{month}月
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500 text-sm">加载中...</div>
        </div>
      </div>
    )
  }

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
    </div>
  )
}

