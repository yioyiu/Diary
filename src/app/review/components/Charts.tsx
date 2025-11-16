'use client'

import { DailyRecord } from '@/types/record'
import { MonthlySummary } from '@/types/summary'
import { useMemo } from 'react'

interface ChartsProps {
  records: DailyRecord[]
  summary?: MonthlySummary | null
  keywords?: Array<{ word: string; count: number }>
  extractingKeywords?: boolean
}

export function Charts({ records, summary, keywords: extractedKeywords, extractingKeywords }: ChartsProps) {
  // 优先使用AI提取的关键词
  const keywords = useMemo(() => {
    // 优先使用从摘要中提取的关键词
    if (extractedKeywords && extractedKeywords.length > 0) {
      return extractedKeywords
    }
    
    // 其次使用月度总结中的关键词
    if (summary?.keywords && summary.keywords.length > 0) {
      return summary.keywords
    }
    
    // 否则使用手动提取（作为fallback）
    const wordCount: Record<string, number> = {}
    
    // 扩展的停用词列表
    const stopWords = new Set([
      // 常用助词、语气词
      '的', '了', '是', '在', '和', '有', '我', '你', '他', '她', '它', '这', '那', '个', '一', '二', '三', '四', '五',
      // 时间词
      '今天', '今日', '明天', '昨天', '上午', '下午', '晚上', '早上', '中午', '傍晚', '深夜', '今日', '本周', '本月',
      // 常用动词（无实际意义）
      '学习', '完成', '进行', '开始', '结束', '继续', '复习', '练习', '阅读', '查看', '了解', '理解', '掌握', '做了',
      // 常用连接词
      '以及', '还有', '并且', '而且', '或者', '如果', '因为', '所以', '但是', '然而',
      // 其他无意义词
      '一个', '一些', '很多', '非常', '特别', '比较', '更加', '十分', '相当',
    ])

    // 时间短语模式（需要过滤）
    const timePatterns = [
      /今天\S*/g,
      /今日\S*/g,
      /明天\S*/g,
      /昨天\S*/g,
      /上午\S*/g,
      /下午\S*/g,
      /晚上\S*/g,
      /早上\S*/g,
      /中午\S*/g,
      /傍晚\S*/g,
      /深夜\S*/g,
      /完成了\S*/g,
      /学习了\S*/g,
      /复习了\S*/g,
      /练习了\S*/g,
    ]

    records.forEach((record) => {
      // 优先使用摘要（已经过滤了无意义词），如果没有摘要则使用内容
      let text = record.summary || record.content || ''
      
      // 处理摘要中的换行符（摘要现在是分点格式）
      text = text.replace(/\n/g, ' ')
      
      // 先移除时间短语
      timePatterns.forEach(pattern => {
        text = text.replace(pattern, ' ')
      })
      
      // 移除常见的无意义短语
      text = text
        .replace(/今天学习了/g, ' ')
        .replace(/今天完成了/g, ' ')
        .replace(/晚上复习了/g, ' ')
        .replace(/上午学习了/g, ' ')
        .replace(/下午完成了/g, ' ')
        .replace(/了解了\S*/g, ' ')
        .replace(/解决了\S*/g, ' ')
        .replace(/完成了\S*/g, ' ')
        .replace(/学习了\S*/g, ' ')
        .replace(/复习了\S*/g, ' ')
        .replace(/练习了\S*/g, ' ')
      
      // 提取2-4字的中文词（更可能是主题词）
      const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
      
      // 提取英文单词（技术术语等）
      const englishWords = text.match(/[a-zA-Z]{3,}/g) || []
      
      // 合并所有词
      const allWords = [...chineseWords, ...englishWords]
      
      allWords.forEach((word) => {
        const lowerWord = word.toLowerCase()
        // 过滤停用词和太短的词
        if (word.length >= 2 && !stopWords.has(word) && !stopWords.has(lowerWord)) {
          // 只保留有意义的词（至少2个字符，且不是纯数字）
          if (!/^\d+$/.test(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1
          }
        }
      })
    })

    // 按频率排序，取前 20 个
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }))
  }, [records, summary, extractedKeywords])

  // 如果正在提取关键词，显示加载状态
  if (extractingKeywords) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-4">主题词云</h2>
        <p className="text-gray-500 text-center py-8">
          正在提取关键词...
        </p>
      </div>
    )
  }

  // 如果有记录但关键词为空，应该显示"正在提取关键词..."而不是"数据不足"
  // 因为关键词是异步提取的，需要时间
  if (records.length > 0 && keywords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-4">主题词云</h2>
        <p className="text-gray-500 text-center py-8">
          正在提取关键词...
        </p>
      </div>
    )
  }

  // 只有在没有记录的情况下才显示"数据不足"
  if (keywords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-4">主题词云</h2>
        <p className="text-gray-500 text-center py-8">
          数据不足，无法生成词云
        </p>
      </div>
    )
  }

  // 计算字体大小（基于频率）
  const maxCount = Math.max(...keywords.map((k) => k.count))
  const minSize = 10
  const maxSize = 24

  // 定义颜色方案（根据频率使用不同颜色）
  const getColorScheme = (count: number, maxCount: number) => {
    const ratio = count / maxCount
    if (ratio > 0.7) {
      // 高频词：深蓝色
      return {
        bg: 'bg-blue-100',
        border: 'border-blue-300',
        text: 'text-blue-800',
        hover: 'hover:bg-blue-200',
      }
    } else if (ratio > 0.4) {
      // 中频词：绿色
      return {
        bg: 'bg-green-100',
        border: 'border-green-300',
        text: 'text-green-800',
        hover: 'hover:bg-green-200',
      }
    } else {
      // 低频词：灰色
      return {
        bg: 'bg-gray-100',
        border: 'border-gray-300',
        text: 'text-gray-700',
        hover: 'hover:bg-gray-200',
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-4">🏷️ 主题词云</h2>
      <div className="flex flex-wrap gap-3 items-center justify-center min-h-[200px] py-4">
        {keywords.map(({ word, count }, index) => {
          const size =
            minSize + ((count / maxCount) * (maxSize - minSize))
          const colors = getColorScheme(count, maxCount)
          
          // 根据索引使用不同的圆角样式（增加视觉多样性）
          const borderRadius = index % 3 === 0 
            ? 'rounded-lg'  // 圆角矩形
            : index % 3 === 1 
            ? 'rounded-full' // 圆形
            : 'rounded-md'   // 中等圆角

          return (
            <span
              key={word}
              className={`inline-block px-3 py-1.5 border-2 ${colors.bg} ${colors.border} ${colors.text} ${colors.hover} ${borderRadius} transition-all duration-200 cursor-default`}
              style={{
                fontSize: `${size}px`,
                fontWeight: count > maxCount * 0.5 ? 'bold' : 'semibold',
              }}
              title={`出现 ${count} 次`}
            >
              {word}
            </span>
          )
        })}
      </div>
      <div className="mt-4 text-sm text-gray-500 text-center">
        共 {keywords.length} 个关键词
      </div>
    </div>
  )
}

