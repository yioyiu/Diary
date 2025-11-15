'use server'

import { createClient } from '@/lib/supabase/server'
import { generateDailySummary } from '@/lib/ai/zhipu'
import { DailyRecord } from '@/types/record'

export async function saveRecord(date: string, content: string) {
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

  try {
    const trimmedContent = content.trim()
    // 检查内容是否为空或仅有空格、符号
    const hasMeaningfulContent = trimmedContent.length > 0 && 
      /[\u4e00-\u9fa5a-zA-Z0-9]/.test(trimmedContent) // 至少包含中文、英文或数字
    
    // 如果内容为空或仅有空格/符号，删除记录
    if (!hasMeaningfulContent) {
      const { error: deleteError } = await supabase
        .from('daily_records')
        .delete()
        .eq('user_id', user.id)
        .eq('date', date)

      if (deleteError) {
        console.error('Failed to delete record:', deleteError)
        throw deleteError
      }

      return { success: true, summary: null, record: null }
    }

    // 保存原始内容（有意义的内容）
    const { data: record, error: upsertError } = await supabase
      .from('daily_records')
      .upsert(
        {
          user_id: user.id,
          date,
          content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single()

    if (upsertError) {
      throw upsertError
    }

    // 生成摘要
    let summary: string | null = null
    try {
      summary = await generateDailySummary(content)
    } catch (error) {
      console.error('Failed to generate summary:', error)
      // 即使 AI 失败，也保存记录
    }

    // 更新摘要
    if (summary) {
      const { error: updateError } = await supabase
        .from('daily_records')
        .update({ summary })
        .eq('id', record.id)

      if (updateError) {
        console.error('Failed to update summary:', updateError)
      }
    } else {
      // 如果AI没有生成摘要，清空之前的摘要
      const { error: updateError } = await supabase
        .from('daily_records')
        .update({ summary: null })
        .eq('id', record.id)

      if (updateError) {
        console.error('Failed to update summary:', updateError)
      }
    }

    return { success: true, summary, record }
  } catch (error) {
    console.error('Error saving record:', error)
    throw error
  }
}

export async function getRecord(date: string): Promise<DailyRecord | null> {
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

  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // 记录不存在
      return null
    }
    throw error
  }

  return data as DailyRecord
}

export async function getMonthlyRecords(
  year: number,
  month: number
): Promise<DailyRecord[]> {
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

  // 计算月份的第一天和最后一天
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  // 获取月份的最后一天（使用下个月的第一天减去1天）
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

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

