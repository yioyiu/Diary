/**
 * 本地存储层 - 替代 Supabase
 * 使用 localStorage 存储数据
 */

import { DailyRecord } from '@/types/record'
import { MonthlySummary } from '@/types/summary'

const STORAGE_KEY_RECORDS = 'daily_records'
const STORAGE_KEY_SUMMARIES = 'monthly_summaries'

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取所有记录
 */
export function getAllRecords(): DailyRecord[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY_RECORDS)
    if (!data) {
      return []
    }
    return JSON.parse(data) as DailyRecord[]
  } catch (error) {
    console.error('Failed to load records from localStorage:', error)
    return []
  }
}

/**
 * 保存所有记录
 */
function saveAllRecords(records: DailyRecord[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records))
  } catch (error) {
    console.error('Failed to save records to localStorage:', error)
    throw new Error('保存失败：存储空间可能已满')
  }
}

/**
 * 获取指定日期的记录
 */
export function getRecord(date: string): DailyRecord | null {
  const records = getAllRecords()
  return records.find(r => r.date === date) || null
}

/**
 * 保存或更新记录
 */
export function saveRecord(date: string, content: string): DailyRecord {
  const records = getAllRecords()
  const existingIndex = records.findIndex(r => r.date === date)

  const now = new Date().toISOString()
  const record: DailyRecord = {
    id: existingIndex >= 0 ? records[existingIndex].id : generateId(),
    user_id: 'local_user', // 本地存储不需要真实的 user_id
    date,
    content,
    summary: existingIndex >= 0 ? records[existingIndex].summary : null,
    created_at: existingIndex >= 0 ? records[existingIndex].created_at : now,
    updated_at: now,
  }

  if (existingIndex >= 0) {
    records[existingIndex] = record
  } else {
    records.push(record)
  }

  saveAllRecords(records)
  return record
}

/**
 * 删除记录
 */
export function deleteRecord(date: string): void {
  const records = getAllRecords()
  const filtered = records.filter(r => r.date !== date)
  saveAllRecords(filtered)
}

/**
 * 获取指定月份的所有记录
 */
export function getMonthlyRecords(year: number, month: number): DailyRecord[] {
  const records = getAllRecords()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return records
    .filter(r => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 获取指定年份的所有记录
 */
export function getYearRecords(year: number): DailyRecord[] {
  const records = getAllRecords()
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  return records
    .filter(r => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 更新记录的摘要
 */
export function updateRecordSummary(date: string, summary: string | null): DailyRecord | null {
  const records = getAllRecords()
  const index = records.findIndex(r => r.date === date)

  if (index < 0) {
    return null
  }

  records[index].summary = summary
  records[index].updated_at = new Date().toISOString()
  saveAllRecords(records)

  return records[index]
}

/**
 * 获取月度总结
 */
export function getMonthlySummary(year: number, month: number): MonthlySummary | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY_SUMMARIES)
    if (!data) {
      return null
    }

    const summaries = JSON.parse(data) as Record<string, MonthlySummary>
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    return summaries[monthKey] || null
  } catch (error) {
    console.error('Failed to load monthly summary from localStorage:', error)
    return null
  }
}

/**
 * 保存月度总结
 */
export function saveMonthlySummary(
  year: number,
  month: number,
  summary: MonthlySummary
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY_SUMMARIES)
    const summaries = data ? (JSON.parse(data) as Record<string, MonthlySummary>) : {}
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    summaries[monthKey] = summary
    localStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(summaries))
  } catch (error) {
    console.error('Failed to save monthly summary to localStorage:', error)
    throw new Error('保存失败：存储空间可能已满')
  }
}

/**
 * 导出所有数据
 */
export function exportData(): {
  records: DailyRecord[]
  summaries: Record<string, MonthlySummary>
  exportDate: string
  version: string
} {
  const records = getAllRecords()
  let summaries: Record<string, MonthlySummary> = {}

  try {
    const data = localStorage.getItem(STORAGE_KEY_SUMMARIES)
    if (data) {
      summaries = JSON.parse(data) as Record<string, MonthlySummary>
    }
  } catch (error) {
    console.error('Failed to export summaries:', error)
  }

  return {
    records,
    summaries,
    exportDate: new Date().toISOString(),
    version: '1.0.0',
  }
}

/**
 * 导入数据
 */
export function importData(data: {
  records?: DailyRecord[]
  summaries?: Record<string, MonthlySummary>
}): { success: boolean; message: string } {
  try {
    // 导入记录
    if (data.records && Array.isArray(data.records)) {
      // 验证记录格式
      const validRecords = data.records.filter(r => 
        r && 
        typeof r.date === 'string' && 
        typeof r.content === 'string' &&
        r.date.match(/^\d{4}-\d{2}-\d{2}$/)
      )

      if (validRecords.length > 0) {
        // 合并现有记录和新记录（新记录优先）
        const existingRecords = getAllRecords()
        const recordMap = new Map<string, DailyRecord>()

        // 先添加现有记录
        existingRecords.forEach(r => {
          recordMap.set(r.date, r)
        })

        // 用导入的记录覆盖
        validRecords.forEach(r => {
          const now = new Date().toISOString()
          recordMap.set(r.date, {
            ...r,
            id: r.id || generateId(),
            user_id: 'local_user',
            created_at: r.created_at || now,
            updated_at: now,
          })
        })

        saveAllRecords(Array.from(recordMap.values()))
      }
    }

    // 导入月度总结
    if (data.summaries && typeof data.summaries === 'object') {
      try {
        const existingData = localStorage.getItem(STORAGE_KEY_SUMMARIES)
        const existingSummaries = existingData 
          ? (JSON.parse(existingData) as Record<string, MonthlySummary>)
          : {}

        // 合并总结（导入的优先）
        const mergedSummaries = { ...existingSummaries, ...data.summaries }
        localStorage.setItem(STORAGE_KEY_SUMMARIES, JSON.stringify(mergedSummaries))
      } catch (error) {
        console.error('Failed to import summaries:', error)
      }
    }

    return {
      success: true,
      message: `成功导入 ${data.records?.length || 0} 条记录和 ${Object.keys(data.summaries || {}).length} 个月度总结`,
    }
  } catch (error) {
    console.error('Failed to import data:', error)
    return {
      success: false,
      message: `导入失败：${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

/**
 * 清空所有数据
 */
export function clearAllData(): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(STORAGE_KEY_RECORDS)
  localStorage.removeItem(STORAGE_KEY_SUMMARIES)
}

