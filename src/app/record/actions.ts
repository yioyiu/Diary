'use server'

import { generateDailySummary } from '@/lib/ai/zhipu'

/**
 * 生成每日摘要（仅 AI 功能，存储由客户端处理）
 */
export async function generateSummary(content: string): Promise<string | null> {
  try {
    if (!content || !content.trim()) {
      return null
    }
    
    const hasMeaningfulContent = content.trim().length > 0 && 
      /[\u4e00-\u9fa5a-zA-Z0-9]/.test(content.trim())
    
    if (!hasMeaningfulContent) {
      return null
    }

    const summary = await generateDailySummary(content)
    return summary || null
  } catch (error) {
    console.error('Error generating summary:', error)
    return null
  }
}

