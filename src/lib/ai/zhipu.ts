/**
 * ZHIPU AI 客户端封装
 */

// 注意：这里使用 fetch API 直接调用，因为 @zhipuai/sdk 可能版本不兼容
// 如果 SDK 可用，可以替换为 SDK 调用

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY!
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

if (!ZHIPU_API_KEY) {
  console.warn('ZHIPU_API_KEY is not set. AI features will not work.')
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * 调用 ZHIPU AI API
 */
async function callZhipuAI(
  messages: ChatMessage[],
  options: {
    temperature?: number
    max_tokens?: number
    response_format?: { type: 'json_object' }
  } = {}
): Promise<string> {
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPU_API_KEY is not configured')
  }

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
      ...(options.response_format && { response_format: options.response_format }),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ZHIPU AI API error: ${error}`)
  }

  const data: ChatCompletionResponse = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * 智能分割摘要为多个要点
 */
function splitSummaryIntoPoints(summary: string): string {
  // 如果已经有换行符，直接返回
  if (summary.includes('\n')) {
    return summary
  }

  // 先尝试根据空行或双换行符分割段落
  const paragraphs = summary
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  if (paragraphs.length > 1) {
    // 如果有多个段落，提取每段的核心内容
    return paragraphs
      .map(p => {
        // 提取段落的核心内容（去掉"今天"、"完成了"、"晚上"等时间词）
        let point = p
          .replace(/^(今天|今日|完成了|完成了|晚上|上午|下午|早上|中午|傍晚|深夜)\s*/, '')
          .replace(/^学习了\s*/, '学习')
          .replace(/^复习了\s*/, '复习')
          .replace(/^解决了\s*/, '解决')
          .trim()

        // 如果段落太长，提取前30字
        if (point.length > 30) {
          point = point.substring(0, 30).replace(/[。，,]$/, '')
        }

        return point
      })
      .filter(p => p.length > 0)
      .join('\n')
  }

  // 尝试根据句号、分号等标点符号分割
  const sentences = summary
    .split(/[。；\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 5) // 过滤太短的片段

  // 如果分割后有多句话，提取核心内容并用换行符连接
  if (sentences.length > 1) {
    return sentences
      .map(s => {
        // 简化句子，提取核心
        let point = s
          .replace(/^(今天|今日|完成了|完成了|晚上|上午|下午|早上|中午|傍晚|深夜)\s*/, '')
          .replace(/^学习了\s*/, '学习')
          .replace(/^复习了\s*/, '复习')
          .replace(/^解决了\s*/, '解决')
          .trim()

        if (point.length > 30) {
          point = point.substring(0, 30).replace(/[。，,]$/, '')
        }

        return point
      })
      .filter(p => p.length > 0)
      .join('\n')
  }

  // 如果只有一句话，尝试根据逗号分割（但要确保每段不太短）
  const parts = summary
    .split(/[，,]/)
    .map(s => s.trim())
    .filter(s => s.length > 5)

  if (parts.length > 1) {
    return parts
      .map(p => {
        if (p.length > 30) {
          p = p.substring(0, 30).replace(/[。，,]$/, '')
        }
        return p
      })
      .join('\n')
  }

  // 如果都无法分割，返回原内容
  return summary
}

/**
 * 检查内容是否有意义（不是空内容或仅有空格、符号）
 */
function hasMeaningfulContent(content: string): boolean {
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return false
  }
  // 检查是否至少包含中文、英文或数字
  return /[\u4e00-\u9fa5a-zA-Z0-9]/.test(trimmed)
}

export async function generateDailySummary(content: string): Promise<string> {
  // 如果内容为空或仅有空格、符号，直接返回空字符串
  if (!hasMeaningfulContent(content)) {
    return ''
  }

  const prompt = `你是一个专业的日记总结和学习整理助手。
请仔细分析下面的日记内容，提取出2-5个核心要点。每个要点应该是独立的学习点、重要事件或反思。

日记内容：
${content}

重要要求：
1. 必须将内容分析成多个独立的要点，每个要点一行
2. 每个要点用换行符（\\n）分隔，不要用其他符号
3. 每个要点不超过30字，简洁明了
4. 不要把所有内容合并成一个要点
5. 只输出要点内容，不要添加编号、序号、项目符号等前缀
6. 直接输出要点，每行一个，不要有多余的文字

输出示例（注意：每行之间用换行符分隔）：
学习了 Next.js 的 Server Actions
完成了认证系统的开发
复习了 TypeScript 类型系统`

  const messages: ChatMessage[] = [
    { role: 'system', content: '你是一个专业的日记总结助手。你必须将日记内容分析成多个独立的要点，每个要点用换行符（\\n）分隔，不要合并成一个要点。只输出要点内容，不要添加任何编号、序号或前缀。' },
    { role: 'user', content: prompt },
  ]

  try {
    let summary = await callZhipuAI(messages, {
      temperature: 0.7,
      max_tokens: 200, // 增加token数量以支持多个要点
    })

    summary = summary.trim()

    // 清理可能的编号前缀（如 "1. "、"1、"等）
    summary = summary.replace(/^\d+[\.、]\s*/gm, '')

    // 如果AI没有正确分点，尝试智能分割
    if (!summary.includes('\n')) {
      // 先尝试分割AI返回的摘要
      summary = splitSummaryIntoPoints(summary)

      // 如果AI摘要还是无法分割，直接分析原内容
      if (!summary.includes('\n') && content.includes('\n')) {
        // 原内容有换行，说明用户已经分段了，直接分析原内容
        const contentPoints = content
          .split(/\n\s*\n/)
          .filter(p => p.trim().length > 10)
          .map(p => {
            let point = p.trim()
            // 提取核心内容
            point = point
              .replace(/^(今天|今日|完成了|完成了|晚上|上午|下午|早上|中午|傍晚|深夜)\s*/, '')
              .replace(/^学习了\s*/, '学习')
              .replace(/^复习了\s*/, '复习')
              .replace(/^解决了\s*/, '解决')
              .replace(/，[^，]{0,20}$/, '') // 去掉最后的逗号及后面的短句
              .trim()

            if (point.length > 30) {
              point = point.substring(0, 30).replace(/[。，,]$/, '')
            }
            return point
          })
          .filter(p => p.length > 5)

        if (contentPoints.length > 1) {
          return contentPoints.join('\n')
        }
      }
    }

    return summary
  } catch (error) {
    console.error('Failed to generate daily summary:', error)
    // 如果 AI 调用失败，尝试从原内容智能提取要点
    const fallbackSummary = splitSummaryIntoPoints(content)
    // 如果原内容也无法分割，至少尝试提取核心内容
    if (!fallbackSummary.includes('\n') && content.length > 50) {
      // 如果内容很长但没有分割，尝试按段落分割
      const contentParagraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 10)
      if (contentParagraphs.length > 1) {
        return contentParagraphs
          .map(p => {
            let point = p.trim()
            // 提取核心内容
            point = point
              .replace(/^(今天|今日|完成了|完成了|晚上|上午|下午|早上|中午|傍晚|深夜)\s*/, '')
              .replace(/^学习了\s*/, '学习')
              .replace(/^复习了\s*/, '复习')
              .replace(/^解决了\s*/, '解决')
              .replace(/，[^，]{0,20}$/, '') // 去掉最后的逗号及后面的短句
              .trim()

            if (point.length > 30) {
              point = point.substring(0, 30).replace(/[。，,]$/, '')
            }
            return point
          })
          .filter(p => p.length > 5)
          .join('\n')
      }
    }
    return fallbackSummary
  }
}

/**
 * 生成月度总结
 */
export async function generateMonthlySummary(
  summaries: string[]
): Promise<{
  overview: string
  takeaways: string[]
  themes: Array<{ name: string; description: string }>
  keywords: Array<{ word: string; count: number }>
}> {
  const prompt = `你是学习与成长复盘专家。现在你拿到某用户在本月的所有日记总结。

请生成《本月学习与成长总结》，包括：
1. 本月整体表现概述（150字内）
2. 本月最重要的5个学习收获
3. 本月最常出现的主题（给出3~5个主题并附简述）
4. 本月出现的关键词（15-20个关键词，按重要性排序）

关键词提取规则（非常重要）：
- 分析每个句子，找出"做了什么"的宾语部分作为关键词
- 例如："学习了 Next.js" → 关键词是"Next.js"
- 例如："解决了 Supabase 同步问题" → 关键词是"Supabase 同步问题"
- 例如："复习了 TypeScript 泛型" → 关键词是"TypeScript 泛型"
- 例如："完成了认证系统开发" → 关键词是"认证系统"
- 关键词应该是动作的宾语，即学习的内容、解决的问题、完成的项目等
- 不要提取动词本身（如"学习"、"完成"、"解决"等）
- 不要提取时间词（如"今天"、"晚上"等）
- 关键词应该是完整的概念，不要拆分。例如："Server Actions"、"同步问题"、"泛型使用"等
- 统计每个关键词出现的次数

主题要求：
- 主题应该是具体的学习领域、技术栈、知识主题等，例如："React开发"、"TypeScript"、"算法学习"、"英语学习"等
- 不要提取时间词（如"今天"、"晚上"）、常用动词（如"学习"、"完成"）等无意义的词
- 主题名应该简洁明了，2-6个字
- 主题描述应该说明这个主题在本月的学习情况

下面是这个月的所有每日总结：
${summaries.join('\n\n')}

请以 JSON 格式输出：
{
  "overview": "整体概述",
  "takeaways": ["收获1", "收获2", ...],
  "themes": [
    {"name": "主题名", "description": "描述"},
    ...
  ],
  "keywords": [
    {"word": "关键词1", "count": 出现次数},
    {"word": "关键词2", "count": 出现次数},
    ...
  ]
}`

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的复盘专家，请以 JSON 格式输出结果。',
    },
    { role: 'user', content: prompt },
  ]

  try {
    const result = await callZhipuAI(messages, {
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(result)
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
  } catch (error) {
    console.error('Failed to generate monthly summary:', error)
    // 返回默认值
    return {
      overview: '本月记录较少，无法生成详细总结。',
      takeaways: [],
      themes: [],
      keywords: [],
    }
  }
}

/**
 * 从合并的内容生成月度总结
 */
export async function generateMonthlySummaryFromContent(
  mergedContent: string,
  year: number,
  month: number
): Promise<{
  overview: string
  takeaways: string[]
  themes: Array<{ name: string; description: string }>
  keywords: Array<{ word: string; count: number }>
}> {
  const prompt = `你是学习与成长复盘专家。现在你拿到某用户在${year}年${month}月的所有日记内容，这些内容已经按日期合并在一起。

请仔细阅读所有内容，然后生成一篇完整的《${year}年${month}月学习与成长总结》。

要求：
1. 整体概述（200-300字）：总结本月整体的学习情况、主要成就和成长
2. 重要收获（5-8条）：列出本月最重要的学习收获和感悟
3. 学习主题（3-5个）：归纳本月主要的学习主题，每个主题包含名称和简要描述
4. 关键词（15-20个）：提取本月出现的关键词，应该是动作的宾语（学习的内容、解决的问题等），统计出现次数

关键词提取规则：
- 分析每个句子，找出"做了什么"的宾语部分作为关键词
- 例如："学习了 Next.js" → 关键词是"Next.js"
- 例如："解决了 Supabase 同步问题" → 关键词是"Supabase 同步问题"
- 关键词应该是完整的概念，不要拆分

本月所有日记内容：
${mergedContent}

请以 JSON 格式输出：
{
  "overview": "整体概述（200-300字）",
  "takeaways": ["收获1", "收获2", ...],
  "themes": [
    {"name": "主题名", "description": "描述"},
    ...
  ],
  "keywords": [
    {"word": "关键词1", "count": 出现次数},
    {"word": "关键词2", "count": 出现次数},
    ...
  ]
}`

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的复盘专家，请仔细分析所有日记内容，生成一篇完整的月度总结，并以 JSON 格式输出结果。',
    },
    { role: 'user', content: prompt },
  ]

  try {
    const result = await callZhipuAI(messages, {
      temperature: 0.7,
      max_tokens: 3000, // 增加token数量以支持更长的内容
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(result)
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
  } catch (error) {
    console.error('Failed to generate monthly summary from content:', error)
    // 返回默认值
    return {
      overview: '本月记录较少，无法生成详细总结。',
      takeaways: [],
      themes: [],
      keywords: [],
    }
  }
}

/**
 * 从摘要中提取关键词（宾语）
 */
export async function extractKeywordsFromSummaries(
  summaries: string[]
): Promise<Array<{ word: string; count: number }>> {
  if (summaries.length === 0) {
    return []
  }

  const prompt = `你是一个关键词提取专家。请从下面的所有摘要中提取关键词。

提取规则：
- 分析每个摘要句子，找出"做了什么"的宾语部分作为关键词
- 例如："学习了 Next.js" → 关键词是"Next.js"
- 例如："解决了 Supabase 同步问题" → 关键词是"Supabase 同步问题"
- 例如："复习了 TypeScript 泛型" → 关键词是"TypeScript 泛型"
- 例如："完成了认证系统开发" → 关键词是"认证系统"
- 关键词应该是动作的宾语，即学习的内容、解决的问题、完成的项目等
- 不要提取动词本身（如"学习"、"完成"、"解决"等）
- 不要提取时间词（如"今天"、"晚上"等）
- 关键词应该是完整的概念，不要拆分。例如："Server Actions"、"同步问题"、"泛型使用"等
- 统计每个关键词出现的次数

所有摘要（每行一个摘要，摘要可能包含多个要点，用换行符分隔）：
${summaries.join('\n')}

请以 JSON 格式输出关键词数组：
{
  "keywords": [
    {"word": "关键词1", "count": 出现次数},
    {"word": "关键词2", "count": 出现次数},
    ...
  ]
}`

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的关键词提取专家，请从摘要中提取动作的宾语作为关键词，并以 JSON 格式输出结果。',
    },
    { role: 'user', content: prompt },
  ]

  try {
    const result = await callZhipuAI(messages, {
      temperature: 0.5, // 降低温度，使结果更稳定
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(result)
    if (Array.isArray(parsed.keywords)) {
      return parsed.keywords
        .map((k: any) => ({
          word: k.word || k.name || '',
          count: typeof k.count === 'number' ? k.count : 1,
        }))
        .filter((k: any) => k.word && k.word.length > 0)
    }
    return []
  } catch (error) {
    console.error('Failed to extract keywords from summaries:', error)
    return []
  }
}

