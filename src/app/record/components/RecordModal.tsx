'use client'

import { DailyRecord } from '@/types/record'
import ReactMarkdown from 'react-markdown'
import { formatDate } from '@/lib/date'

interface RecordModalProps {
  record: DailyRecord | null
  isOpen: boolean
  onClose: () => void
}

export function RecordModal({ record, isOpen, onClose }: RecordModalProps) {
  if (!isOpen || !record) return null

  const date = new Date(record.date)
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">{dateStr}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {record.summary && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm font-medium text-blue-900 mb-2">
                摘要：
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                {record.summary
                  .split('\n')
                  .filter((line) => line.trim())
                  .map((point, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2 font-medium">{index + 1}.</span>
                      <span>{point.trim()}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="prose max-w-none">
            <ReactMarkdown>{record.content}</ReactMarkdown>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            创建时间：{new Date(record.created_at).toLocaleString('zh-CN')}
            {record.updated_at !== record.created_at && (
              <span className="ml-4">
                更新时间：{new Date(record.updated_at).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

