'use client'

import { DailyRecord } from '@/types/record'
import { formatDate } from '@/lib/date'

interface DailyListProps {
  records: DailyRecord[]
  loading?: boolean
}

export function DailyList({ records, loading }: DailyListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <p className="text-gray-500 text-center py-8">
          本月暂无记录
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-4">本月每日摘要</h2>
      <div className="space-y-3">
        {records.map((record) => {
          const date = new Date(record.date)
          const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
          
          // 将摘要按换行符分割成多个要点
          const summaryPoints = record.summary 
            ? record.summary.split('\n').filter(line => line.trim())
            : []

          return (
            <div
              key={record.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {dateStr}
                  </div>
                  {summaryPoints.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                      {summaryPoints.map((point, index) => (
                        <span key={index} className="flex items-center">
                          <span>{point.trim()}</span>
                          {index < summaryPoints.length - 1 && (
                            <span className="mx-2 text-gray-300">|</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      暂无摘要
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

