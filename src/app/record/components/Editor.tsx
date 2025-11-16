'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { saveRecord, getRecord, updateSummary } from '../actions'
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
  const [generatingSummary, setGeneratingSummary] = useState(false) // 摘要生成中状态
  const [isEditingSummary, setIsEditingSummary] = useState(false) // 是否正在编辑摘要
  const [editingSummary, setEditingSummary] = useState('') // 编辑中的摘要内容
  const [savingSummary, setSavingSummary] = useState(false) // 保存摘要中状态
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null)
  const summaryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null) // 摘要检查定时器

  // 定期检查摘要是否已生成
  const startSummaryCheck = useCallback((recordId: string) => {
    // 清除之前的定时器
    if (summaryCheckIntervalRef.current) {
      clearInterval(summaryCheckIntervalRef.current)
    }

    let checkCount = 0
    const maxChecks = 20 // 最多检查20次（约1分钟）
    
    summaryCheckIntervalRef.current = setInterval(async () => {
      checkCount++
      
      try {
        const record = await getRecord(date)
        if (record && record.summary) {
          // 摘要已生成，更新记录
          setCurrentRecord(record)
          setGeneratingSummary(false)
          // 清除定时器
          if (summaryCheckIntervalRef.current) {
            clearInterval(summaryCheckIntervalRef.current)
            summaryCheckIntervalRef.current = null
          }
          // 通知父组件更新缓存
          onSave?.(record)
        } else if (checkCount >= maxChecks) {
          // 超过最大检查次数，停止检查
          setGeneratingSummary(false)
          if (summaryCheckIntervalRef.current) {
            clearInterval(summaryCheckIntervalRef.current)
            summaryCheckIntervalRef.current = null
          }
        }
      } catch (error) {
        console.error('Failed to check summary:', error)
        // 检查失败，停止检查
        if (checkCount >= maxChecks) {
          setGeneratingSummary(false)
          if (summaryCheckIntervalRef.current) {
            clearInterval(summaryCheckIntervalRef.current)
            summaryCheckIntervalRef.current = null
          }
        }
      }
    }, 3000) // 每3秒检查一次
  }, [date, onSave])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (summaryCheckIntervalRef.current) {
        clearInterval(summaryCheckIntervalRef.current)
        summaryCheckIntervalRef.current = null
      }
    }
  }, [])

  // 加载已有记录
  useEffect(() => {
    // 清除之前的摘要检查
    if (summaryCheckIntervalRef.current) {
      clearInterval(summaryCheckIntervalRef.current)
      summaryCheckIntervalRef.current = null
    }
    setGeneratingSummary(false)

    // 如果有缓存的记录，立即使用它（避免空白闪烁）
    if (cachedRecord && cachedRecord.date === date) {
      setContent(cachedRecord.content)
      setCurrentRecord(cachedRecord)
      setError(null)
      setShowPreview(false)
      
      // 如果记录有内容但没有摘要，开始检查摘要
      const hasContent = cachedRecord.content?.trim() && 
        /[\u4e00-\u9fa5a-zA-Z0-9]/.test(cachedRecord.content.trim())
      if (hasContent && !cachedRecord.summary && cachedRecord.id) {
        setGeneratingSummary(true)
        startSummaryCheck(cachedRecord.id)
      }
      
      // 在后台验证缓存是否有效（不阻塞UI）
      async function verifyCache() {
        try {
          const record = await getRecord(date)
          if (record && cachedRecord) {
            // 如果记录有更新，更新内容
            if (record.updated_at !== cachedRecord.updated_at || record.content !== cachedRecord.content) {
              setContent(record.content)
              setCurrentRecord(record)
              
              // 检查是否需要开始摘要检查
              const hasContent = record.content?.trim() && 
                /[\u4e00-\u9fa5a-zA-Z0-9]/.test(record.content.trim())
              if (hasContent && !record.summary && record.id) {
                setGeneratingSummary(true)
                startSummaryCheck(record.id)
              } else if (record.summary) {
                setGeneratingSummary(false)
              }
            } else if (record.summary && !cachedRecord.summary) {
              // 摘要已生成，更新记录
              setCurrentRecord(record)
              setGeneratingSummary(false)
            }
          } else if (!record) {
            // 如果记录被删除，清空内容
            setContent('')
            setCurrentRecord(null)
            setGeneratingSummary(false)
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
      setCurrentRecord(null) // 草稿不是正式记录
    } else {
      // 切换日期时，先清空内容，等待异步加载
      // 这样可以避免显示上一个日期的内容
      setContent('')
      setCurrentRecord(null)
    }
    setError(null)
    setShowPreview(false)

    // 然后异步加载最新数据（确保数据是最新的）
    async function loadRecord() {
      try {
        const record = await getRecord(date)
        if (record) {
          // 有记录，更新内容和状态
          setContent(record.content)
          setCurrentRecord(record)
          setError(null)
          
          // 检查是否需要开始摘要检查
          const hasContent = record.content?.trim() && 
            /[\u4e00-\u9fa5a-zA-Z0-9]/.test(record.content.trim())
          if (hasContent && !record.summary && record.id) {
            setGeneratingSummary(true)
            startSummaryCheck(record.id)
          } else {
            setGeneratingSummary(false)
          }
        } else {
          // 如果没有记录，检查是否有草稿
          const draft = localStorage.getItem(`draft-${date}`)
          if (draft) {
            setContent(draft)
            setCurrentRecord(null) // 草稿不是正式记录
          } else {
            // 只有在确认没有记录和草稿时才设置为空
            setContent('')
            setCurrentRecord(null)
          }
          setError(null)
          setGeneratingSummary(false)
        }
      } catch (error: any) {
        // 如果是认证错误，显示给用户
        if (error?.message?.includes('未登录')) {
          setError('未登录，请先登录')
        } else {
          console.error('Failed to load record:', error)
        }
        // 出错时检查是否有草稿，如果有则显示草稿
        const draft = localStorage.getItem(`draft-${date}`)
        if (draft) {
          setContent(draft)
          setCurrentRecord(null)
        } else {
          setContent('')
          setCurrentRecord(null)
        }
        setGeneratingSummary(false)
      }
    }

    loadRecord()
  }, [date, cachedRecord, startSummaryCheck])

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

  // 自动调整 textarea 高度（使用防抖优化性能）
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || showPreview) return

    // 使用 requestAnimationFrame 优化性能
    const adjustHeight = () => {
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

    // 使用防抖，避免频繁调整
    const timer = setTimeout(() => {
      requestAnimationFrame(adjustHeight)
    }, 50)

    return () => clearTimeout(timer)
  }, [content, showPreview])

  const handleSave = useCallback(async () => {
    if (saving) return // 防止重复保存
    
    setSaving(true)
    setError(null)

    try {
      const result = await saveRecord(date, content)
      if (result.record) {
        setCurrentRecord(result.record)
        localStorage.removeItem(`draft-${date}`)
        
        // 不再清除缓存，而是直接更新（由 Calendar 组件处理）
        onSave?.(result.record) // 通知父组件更新日历和缓存
        
        // 如果记录有内容但没有摘要，开始定期检查摘要是否生成
        const hasContent = result.record.content?.trim() && 
          /[\u4e00-\u9fa5a-zA-Z0-9]/.test(result.record.content.trim())
        if (hasContent && !result.record.summary) {
          setGeneratingSummary(true)
          // 开始定期检查摘要
          startSummaryCheck(result.record.id)
        } else {
          setGeneratingSummary(false)
        }
      } else {
        // 如果记录被删除（保存空内容），清空当前记录状态
        setCurrentRecord(null)
        localStorage.removeItem(`draft-${date}`)
        setGeneratingSummary(false)
        // 停止摘要检查
        if (summaryCheckIntervalRef.current) {
          clearInterval(summaryCheckIntervalRef.current)
          summaryCheckIntervalRef.current = null
        }
        
        // 不再清除缓存，而是直接更新（由 Calendar 组件处理）
        // 传递一个包含 date 的占位对象，让父组件知道是哪个日期被删除了
        onSave?.({ date } as DailyRecord | null) // 通知父组件更新日历和缓存
      }
    } catch (error: any) {
      setError(error.message || '保存失败，请重试')
      console.error('Failed to save record:', error)
      setGeneratingSummary(false)
    } finally {
      setSaving(false)
    }
  }, [date, content, saving, onSave, startSummaryCheck])

  const handleClear = useCallback(() => {
    if (confirm('确定要清空内容吗？')) {
      // 先清除 localStorage
      localStorage.removeItem(`draft-${date}`)
      // 然后清空所有状态
      setContent('')
      setCurrentRecord(null)
      setError(null) // 清空错误提示
      setShowPreview(false) // 重置预览状态
    }
  }, [date])

  // 判断选中的日期是否是今天（使用 useMemo 优化）
  const dateTitle = useMemo(() => {
    const dateObj = new Date(date)
    const today = new Date()
    const isToday = isSameDay(date, today)
    return isToday 
      ? '今日记录' 
      : `${dateObj.getMonth() + 1}月${dateObj.getDate()}日记录`
  }, [date])

  // 优化摘要渲染（使用 useMemo）
  const summaryPoints = useMemo(() => {
    if (!currentRecord?.summary) return []
    return currentRecord.summary
      .split('\n')
      .filter((line) => line.trim())
  }, [currentRecord?.summary])

  // 开始编辑摘要
  const handleStartEditSummary = useCallback(() => {
    // 如果记录不存在，提示用户先保存内容
    if (!currentRecord?.id) {
      setError('请先保存记录内容，然后再编辑摘要')
      return
    }
    
    // 如果有摘要，使用现有摘要；如果没有，使用空字符串
    setEditingSummary(currentRecord?.summary || '')
    setIsEditingSummary(true)
  }, [currentRecord?.summary, currentRecord?.id])

  // 取消编辑摘要
  const handleCancelEditSummary = useCallback(() => {
    setIsEditingSummary(false)
    setEditingSummary('')
  }, [])

  // 保存摘要
  const handleSaveSummary = useCallback(async () => {
    if (savingSummary) return
    
    // 如果记录不存在，提示用户先保存内容
    if (!currentRecord?.id) {
      setError('请先保存记录内容，然后再编辑摘要')
      return
    }
    
    setSavingSummary(true)
    setError(null)

    try {
      const summaryToSave = editingSummary.trim() || null
      const result = await updateSummary(date, summaryToSave)
      
      if (result.record) {
        setCurrentRecord(result.record)
        setIsEditingSummary(false)
        setEditingSummary('')
        // 通知父组件更新缓存
        onSave?.(result.record)
      }
    } catch (error: any) {
      setError(error.message || '保存摘要失败，请重试')
      console.error('Failed to save summary:', error)
    } finally {
      setSavingSummary(false)
    }
  }, [date, editingSummary, savingSummary, onSave, currentRecord?.id])

  // 自动调整摘要输入框高度
  useEffect(() => {
    const textarea = summaryTextareaRef.current
    if (!textarea || !isEditingSummary) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const minHeight = 80
      const maxHeight = 200
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
      
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto'
      } else {
        textarea.style.overflowY = 'hidden'
      }
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(adjustHeight)
    }, 50)

    return () => clearTimeout(timer)
  }, [editingSummary, isEditingSummary])

  // 优化事件处理函数
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }, [])

  const handleTogglePreview = useCallback(() => {
    setShowPreview(prev => !prev)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{dateTitle}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleTogglePreview}
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
            onChange={handleContentChange}
            placeholder="记录今天的学习和想法...&#10;&#10;支持 Markdown 格式"
            className="flex-1 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-white"
            style={{ minHeight: '300px' }}
          />
        ) : (
          <div className="flex-1 p-4 border rounded-lg bg-white overflow-auto prose max-w-none">
            <ReactMarkdown key={content}>{content || '*暂无内容*'}</ReactMarkdown>
          </div>
        )}
      </div>

      {generatingSummary && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm text-yellow-700 flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>AI 正在生成摘要，请稍候...</span>
          </div>
        </div>
      )}

      {summaryPoints.length > 0 && !isEditingSummary && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-900">
              摘要：
            </div>
            <button
              onClick={handleStartEditSummary}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              title="编辑摘要"
            >
              编辑
            </button>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            {summaryPoints.map((point, index) => (
              <div key={index} className="flex items-start">
                <span className="text-blue-500 mr-2 font-medium">{index + 1}.</span>
                <span>{point.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditingSummary && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="text-sm font-medium text-blue-900 mb-2">
            编辑摘要：
          </div>
          <textarea
            ref={summaryTextareaRef}
            value={editingSummary}
            onChange={(e) => setEditingSummary(e.target.value)}
            placeholder="每行一个要点，用换行符分隔..."
            className="w-full p-2 border border-blue-300 rounded text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            style={{ minHeight: '80px' }}
          />
          <div className="mt-2 flex gap-2 justify-end">
            <button
              onClick={handleCancelEditSummary}
              disabled={savingSummary}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSaveSummary}
              disabled={savingSummary}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSummary ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {currentRecord && currentRecord.id && !currentRecord.summary && !generatingSummary && !isEditingSummary && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              暂无摘要
            </div>
            <button
              onClick={handleStartEditSummary}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              title="添加摘要"
            >
              添加摘要
            </button>
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

