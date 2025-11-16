'use server'

import { createClient } from '@/lib/supabase/server'
import { generateMonthlySummary, extractKeywordsFromSummaries, generateMonthlySummaryFromContent } from '@/lib/ai/zhipu'
import { getMonthlyRecords } from '@/app/record/actions'
import { MonthlySummary } from '@/types/summary'
import { DailyRecord } from '@/types/record'

export async function getMonthlyRecordsForReview(
  year: number,
  month: number
): Promise<DailyRecord[]> {
  return getMonthlyRecords(year, month)
}

/**
 * 获取指定年份的所有记录
 */
export async function getYearRecords(year: number): Promise<DailyRecord[]> {
  const supabase = createClient()
  
  // 先尝试获取 session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 如果 session 不存在，再尝试 getUser
  let user = session?.user
  if (!user) {
    const {
      data: { user: fetchedUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !fetchedUser) {
      throw new Error('未登录，请先登录')
    }
    user = fetchedUser
  }

  if (!user) {
    throw new Error('未登录，请先登录')
  }

  // 计算年份的第一天和最后一天
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as DailyRecord[]
}

export async function generateMonthlyReview(
  year: number,
  month: number
): Promise<MonthlySummary | { error: string }> {
  const supabase = createClient()
  
  // 先尝试获取 session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 如果 session 不存在，再尝试 getUser
  let user = session?.user
  if (!user) {
    const {
      data: { user: fetchedUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !fetchedUser) {
      return { error: '未登录，请先登录' }
    }
    user = fetchedUser
  }

  if (!user) {
    return { error: '未登录，请先登录' }
  }

  try {
    const records = await getMonthlyRecordsForReview(year, month)
    
    // 使用所有内容（content）而不是摘要
    const contents = records
      .map((r) => r.content)
      .filter((content) => content && content.trim().length > 0) as string[]

    if (contents.length === 0) {
      return { error: '本月暂无记录，无法生成总结' }
    }

    // 生成月份标识
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    
    // 检查是否有缓存
    const { data: cachedSummary, error: cacheError } = await supabase
      .from('monthly_summary')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', monthKey)
      .single()

    // 检查缓存是否有效：如果记录有更新，需要重新生成
    if (cachedSummary && !cacheError && records.length > 0) {
      const cacheTime = new Date((cachedSummary as any).updated_at).getTime()
      // 检查是否有记录在缓存之后被更新
      const recordUpdateTimes = records.map((r) => new Date(r.updated_at).getTime())
      const latestRecordUpdate = recordUpdateTimes.length > 0 
        ? Math.max(...recordUpdateTimes)
        : 0
      
      // 如果缓存时间晚于所有记录的更新时间，可以使用缓存
      if (cacheTime >= latestRecordUpdate) {
        try {
          const parsed = JSON.parse((cachedSummary as any).summary)
          return {
            overview: parsed.overview || '暂无概述',
            takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
            themes: Array.isArray(parsed.themes) ? parsed.themes : [],
            keywords: Array.isArray(parsed.keywords) 
              ? parsed.keywords.map((k: any) => ({
                  word: k.word || k.name || '',
                  count: typeof k.count === 'number' ? k.count : 1,
                })).filter((k: any) => k.word)
              : [],
          }
        } catch (parseError) {
          console.error('Failed to parse cached summary:', parseError)
          // 解析失败，重新生成
        }
      }
    }

    // 需要重新生成
    // 合并所有内容，按日期排序
    const mergedContent = records
      .filter((r) => r.content && r.content.trim().length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => {
        const date = new Date(r.date)
        const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
        return `【${dateStr}】\n${r.content}`
      })
      .join('\n\n')

    const review = await generateMonthlySummaryFromContent(mergedContent, year, month)
    
    // 保存到缓存
    try {
      await supabase
        .from('monthly_summary')
        .upsert(
          {
            user_id: user.id,
            month: monthKey,
            summary: JSON.stringify(review),
            updated_at: new Date().toISOString(),
          } as any,
          {
            onConflict: 'user_id,month',
          }
        )
    } catch (saveError) {
      console.error('Failed to save monthly summary to cache:', saveError)
      // 保存失败不影响返回结果
    }

    return review
  } catch (error) {
    console.error('Failed to generate monthly review:', error)
    return { error: '生成月度总结失败，请重试' }
  }
}

/**
 * 获取已缓存的月度总结（不生成新的）
 */
export async function getCachedMonthlySummary(
  year: number,
  month: number
): Promise<MonthlySummary | null> {
  const supabase = createClient()
  
  // 先尝试获取 session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 如果 session 不存在，再尝试 getUser
  let user = session?.user
  if (!user) {
    const {
      data: { user: fetchedUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !fetchedUser) {
      return null
    }
    user = fetchedUser
  }

  if (!user) {
    return null
  }

  try {
    const records = await getMonthlyRecordsForReview(year, month)
    
    if (records.length === 0) {
      return null
    }

    // 生成月份标识
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    
    // 检查是否有缓存
    const { data: cachedSummary, error: cacheError } = await supabase
      .from('monthly_summary')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', monthKey)
      .single()

    // 检查缓存是否有效：如果记录有更新，需要重新生成
    if (cachedSummary && !cacheError && records.length > 0) {
      const cacheTime = new Date((cachedSummary as any).updated_at).getTime()
      // 检查是否有记录在缓存之后被更新
      const recordUpdateTimes = records.map((r) => new Date(r.updated_at).getTime())
      const latestRecordUpdate = recordUpdateTimes.length > 0 
        ? Math.max(...recordUpdateTimes)
        : 0
      
      // 如果缓存时间晚于所有记录的更新时间，可以使用缓存
      if (cacheTime >= latestRecordUpdate) {
        try {
          const parsed = JSON.parse((cachedSummary as any).summary)
          return {
            overview: parsed.overview || '暂无概述',
            takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
            themes: Array.isArray(parsed.themes) ? parsed.themes : [],
            keywords: Array.isArray(parsed.keywords) 
              ? parsed.keywords.map((k: any) => ({
                  word: k.word || k.name || '',
                  count: typeof k.count === 'number' ? k.count : 1,
                })).filter((k: any) => k.word)
              : [],
          }
        } catch (parseError) {
          console.error('Failed to parse cached summary:', parseError)
          return null
        }
      }
    }

    return null
  } catch (error) {
    console.error('Failed to get cached monthly summary:', error)
    return null
  }
}

/**
 * 从记录的摘要中提取关键词
 */
export async function extractKeywordsFromRecords(
  records: DailyRecord[]
): Promise<Array<{ word: string; count: number }>> {
  try {
    const summaries = records
      .map((r) => r.summary)
      .filter(Boolean) as string[]

    if (summaries.length === 0) {
      return []
    }

    const keywords = await extractKeywordsFromSummaries(summaries)
    return keywords
  } catch (error) {
    console.error('Failed to extract keywords from records:', error)
    return []
  }
}

