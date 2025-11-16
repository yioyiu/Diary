'use server'

import { createClient } from '@/lib/supabase/server'
import { generateDailySummary } from '@/lib/ai/zhipu'
import { DailyRecord } from '@/types/record'
import { Database } from '@/types/database'

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
    const insertData = {
      user_id: user.id,
      date,
      content,
      updated_at: new Date().toISOString(),
    }
    
    const { data: record, error: upsertError } = await supabase
      .from('daily_records')
      .upsert(insertData as any, {
        onConflict: 'user_id,date',
      })
      .select()
      .single()

    if (upsertError) {
      throw upsertError
    }

    // 先返回记录（不等待摘要生成），摘要将在后台异步生成
    // 这样可以避免阻塞前端操作
    const returnedRecord = record as DailyRecord | null
    
    // 在后台异步生成摘要（不阻塞返回）
    if (record) {
      const recordId = (record as any).id
      if (recordId) {
        // 异步生成摘要，不等待结果
        generateDailySummary(content)
          .then(async (summary) => {
            if (summary) {
              // 更新摘要到数据库
              const { error: updateError } = await (supabase
                .from('daily_records') as any)
                .update({ summary })
                .eq('id', recordId)

              if (updateError) {
                console.error('Failed to update summary:', updateError)
              }
            } else {
              // 如果AI没有生成摘要，清空之前的摘要
              const { error: updateError } = await (supabase
                .from('daily_records') as any)
                .update({ summary: null })
                .eq('id', recordId)

              if (updateError) {
                console.error('Failed to clear summary:', updateError)
              }
            }
          })
          .catch((error) => {
            console.error('Failed to generate summary in background:', error)
            // 即使 AI 失败，也不影响已保存的记录
          })
      }
    }

    return { success: true, summary: null, record: returnedRecord }
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

export async function updateSummary(date: string, summary: string | null) {
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
    const { data: record, error: updateError } = await supabase
      .from('daily_records')
      .update({ summary })
      .eq('user_id', user.id)
      .eq('date', date)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return { success: true, record: record as DailyRecord | null }
  } catch (error) {
    console.error('Error updating summary:', error)
    throw error
  }
}

