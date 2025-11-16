'use client'

import { useState, useEffect, useRef } from 'react'
import { saveRecord, getRecord } from '../actions'
import { DailyRecord } from '@/types/record'
import ReactMarkdown from 'react-markdown'
import { isSameDay } from '@/lib/date'

interface EditorProps {
  date: string
  onSave?: (record?: DailyRecord | null) => void // 保存后回调，用于刷新日历和更新缓存
  cachedRecord?: DailyRecord | null // 缓存的记录，用于立即显示
}

export function Editor({ date, onSave, cachedRecord }: EditorProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<DailyRecord | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 加载已有记录
  useEffect(() => {
    // 如果有缓存的记录，立即使用它（避免空白闪烁）
    if (cachedRecord && cachedRecord.date === date) {
      setContent(cachedRecord.content)
      setCurrentRecord(cachedRecord)
      setError(null)
      setShowPreview(false)
      
      // 在后台验证缓存是否有效（不阻塞UI）
      async function verifyCache() {
        try {
          const record = await getRecord(date)
          if (record) {
            // 如果记录有更新，更新内容
            if (record.updated_at !== cachedRecord.updated_at || record.content !== cachedRecord.content) {
              setContent(record.content)
              setCurrentRecord(record)
            }
          } else {
            // 如果记录被删除，清空内容
            setContent('')
            setCurrentRecord(null)
          }
        } catch (error: any) {
          // 验证失败不影响已显示的内容
          console.error('Failed to verify cache:', error)
        }
      }
      
      // 延迟验证，不阻塞初始渲染
      setTimeout(verifyCache, 100)
      return
    }
    
    // 如果没有缓存，先尝试从 localStorage 恢复草稿
    const draft = localStorage.getItem(`draft-${date}`)
    if (draft) {
      setContent(draft)
    } else {
      setContent('')
    }
    setCurrentRecord(null)
    setError(null)
    setShowPreview(false)

    // 然后异步加载最新数据（确保数据是最新的）
    async function loadRecord() {
      try {
        const record = await getRecord(date)
        if (record) {
          setContent(record.content)
          setCurrentRecord(record)
          setError(null)
        } else {
          // 如果没有记录，检查是否有草稿
          const draft = localStorage.getItem(`draft-${date}`)
          if (draft) {
            setContent(draft)
          } else {
            setContent('')
          }
          setCurrentRecord(null)
          setError(null)
        }
      } catch (error: any) {
        // 如果是认证错误，显示给用户
        if (error?.message?.includes('未登录')) {
          setError('未登录，请先登录')
        } else {
          console.error('Failed to load record:', error)
        }
        // 出错时不清空已有内容（可能是缓存或草稿）
      }
    }

    loadRecord()
  }, [date, cachedRecord])

  // 自动保存草稿到 localStorage
  useEffect(() => {
    if (content && !currentRecord) {
      const timer = setTimeout(() => {
        localStorage.setItem(`draft-${date}`, content)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (!content) {
      // 如果内容为空，清除草稿
      localStorage.removeItem(`draft-${date}`)
    }
  }, [content, date, currentRecord])

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea && !showPreview) {
      // 重置高度以获取正确的 scrollHeight
      textarea.style.height = 'auto'
      // 设置新高度，但不超过最大高度
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 800 // 最大高度 800px
      const minHeight = 300 // 最小高度 300px
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
      
      // 如果内容超过最大高度，允许滚动
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto'
      } else {
        textarea.style.overflowY = 'hidden'
      }
    }
  }, [content, showPreview])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const result = await saveRecord(date, content)
      if (result.record) {
        setCurrentRecord(result.record)
        localStorage.removeItem(`draft-${date}`)
        
        // 清除相关月份的日历缓存，确保显示最新数据
        const dateObj = new Date(date)
        const year = dateObj.getFullYear()
        const month = dateObj.getMonth() + 1
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        localStorage.removeItem(`calendar-${monthKey}`)
        
        onSave?.(result.record) // 通知父组件刷新日历和更新缓存
      } else {
        // 如果记录被删除（保存空内容），清空当前记录状态
        setCurrentRecord(null)
        localStorage.removeItem(`draft-${date}`)
        
        // 清除相关月份的日历缓存
        const dateObj = new Date(date)
        const year = dateObj.getFullYear()
        const month = dateObj.getMonth() + 1
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        localStorage.removeItem(`calendar-${monthKey}`)
        
        onSave?.(null) // 通知父组件刷新日历和清除缓存
      }
    } catch (error: any) {
      setError(error.message || '保存失败，请重试')
      console.error('Failed to save record:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = () => {
    if (confirm('确定要清空内容吗？')) {
      // 先清除 localStorage
      localStorage.removeItem(`draft-${date}`)
      // 然后清空所有状态
      setContent('')
      setCurrentRecord(null)
      setError(null) // 清空错误提示
      setShowPreview(false) // 重置预览状态
    }
  }

  // 判断选中的日期是否是今天
  const isToday = isSameDay(date, new Date())
  const dateObj = new Date(date)
  const dateTitle = isToday 
    ? '今日记录' 
    : `${dateObj.getMonth() + 1}月${dateObj.getDate()}日记录`

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{dateTitle}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
          >
            {showPreview ? '编辑' : '预览'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-visible">
        {!showPreview ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录今天的学习和想法...&#10;&#10;支持 Markdown 格式"
            className="flex-1 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-white"
            style={{ minHeight: '300px' }}
          />
        ) : (
          <div className="flex-1 p-4 border rounded-lg bg-white overflow-auto prose max-w-none">
            <ReactMarkdown>{content || '*暂无内容*'}</ReactMarkdown>
          </div>
        )}
      </div>

      {currentRecord?.summary && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm font-medium text-blue-900 mb-2">
            摘要：
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            {currentRecord.summary
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

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={handleClear}
          disabled={saving}
          className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          清空
        </button>
      </div>
    </div>
  )
}

