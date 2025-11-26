'use server'

import { generateMonthlySummaryFromContent } from '@/lib/ai/zhipu'
import { MonthlySummary } from '@/types/summary'

/**
 * 生成月度总结（仅 AI 功能，数据获取和存储由客户端处理）
 */
export async function generateMonthlyReviewFromContent(
  mergedContent: string,
  year: number,
  month: number
): Promise<MonthlySummary | { error: string }> {
  try {
    if (!mergedContent || !mergedContent.trim()) {
      return { error: '本月暂无记录，无法生成总结' }
    }

    const review = await generateMonthlySummaryFromContent(mergedContent, year, month)
    return review
  } catch (error) {
    console.error('Failed to generate monthly review:', error)
    return { error: '生成月度总结失败，请重试' }
  }
}
