# 每日记录网页 - 项目技术文档

> AI增强的日记/学习记录工具 - 技术实现指南

## 📑 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [核心功能实现](#核心功能实现)
- [API 接口设计](#api-接口设计)
- [AI 集成](#ai-集成)
- [前端实现](#前端实现)
- [环境配置](#环境配置)

---

## 项目概述

### 产品定位

轻量级、AI增强的日记/学习记录工具，核心功能：

- ✅ **每日记录**：支持 Markdown 格式的日记/学习内容输入
- ✅ **AI 自动总结**：保存时自动生成简短摘要，显示在日历格子中
- ✅ **月度回顾**：基于当月所有记录生成 AI 学习报告
- ✅ **云端存储**：使用 Supabase 持久化所有数据

### 核心价值

1. **实时记录**：随时记录当天想法、学习内容、日记
2. **智能摘要**：AI 自动总结，快速回顾每日要点
3. **月度复盘**：自动生成"学习月报"或"成长回顾"
4. **数据持久化**：所有内容存储在 Supabase，可随时查看

---

## 技术栈

### 前端框架
- **Next.js 13+** (App Router) - 推荐
- **React 18+**
- **TypeScript** - 类型安全

### UI 框架
- **Tailwind CSS** - 样式框架
- **shadcn/ui** (可选) - 组件库

### 后端服务
- **Supabase** - 数据库 + 认证
- **ZHIPU AI (GLM 4.5 FLASH)** - AI 总结生成
- **Next.js API Routes** - 服务端接口

### 开发工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化

---

## 项目结构

```
project-root/
│
├── README.md                    # 项目说明文档
├── package.json                 # 项目依赖与脚本
├── .env.local                   # 环境变量（Supabase + AI keys）
├── tsconfig.json                # TypeScript 配置
├── next.config.js               # Next.js 配置
├── tailwind.config.js           # Tailwind 配置
│
├── public/                      # 静态资源
│   ├── icons/                   # 图标文件
│   ├── images/                  # 图片资源
│   └── favicon.ico              # 网站图标
│
├── src/
│   ├── app/                     # Next.js 13+ App Router
│   │   ├── layout.tsx           # 全局布局组件
│   │   ├── page.tsx             # 首页（导航到 record/review）
│   │   │
│   │   ├── record/              # 记录页面路由
│   │   │   ├── page.tsx         # 记录页主组件（日历 + 编辑器）
│   │   │   ├── components/
│   │   │   │   ├── Calendar.tsx      # 日历组件
│   │   │   │   └── Editor.tsx        # Markdown 编辑器组件
│   │   │   └── actions.ts            # Server Actions（保存、生成总结）
│   │   │
│   │   ├── review/              # 回顾页面路由
│   │   │   ├── page.tsx         # 回顾页主组件
│   │   │   ├── components/
│   │   │   │   ├── SummaryCard.tsx   # 月度总结卡片
│   │   │   │   ├── Charts.tsx        # 图表组件（词云、频率、情绪）
│   │   │   │   └── DailyList.tsx     # 每日摘要列表
│   │   │   └── actions.ts            # Server Actions（获取月度数据）
│   │   │
│   │   └── api/                 # API 路由（可选，用于复杂逻辑）
│   │       ├── saveRecord/route.ts
│   │       ├── generateDailySummary/route.ts
│   │       └── generateMonthlyReview/route.ts
│   │
│   ├── lib/                     # 工具库
│   │   ├── supabase/
│   │   │   ├── client.ts        # Supabase 客户端（浏览器端）
│   │   │   └── server.ts        # Supabase 客户端（服务端）
│   │   ├── ai/
│   │   │   └── zhipu.ts         # ZHIPU AI 客户端封装
│   │   ├── utils.ts             # 通用工具函数
│   │   └── date.ts              # 日期处理工具
│   │
│   ├── styles/
│   │   └── globals.css          # 全局样式（Tailwind 导入）
│   │
│   └── types/                   # TypeScript 类型定义
│       ├── record.ts            # DailyRecord 类型
│       ├── summary.ts           # MonthlySummary 类型
│       └── database.ts          # Supabase 数据库类型（自动生成）
│
└── scripts/                     # 工具脚本
    ├── seed.ts                  # 数据库初始化/种子数据
    └── generate-types.ts        # 生成 Supabase 类型定义
```

---

## 数据库设计

### Supabase 表结构

#### 1. `daily_records` - 每日记录表

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT uuid_generate_v4() | 主键 |
| `user_id` | `uuid` | NOT NULL, FOREIGN KEY → auth.users(id) | 用户ID（关联 Supabase Auth） |
| `date` | `date` | NOT NULL, UNIQUE(user_id, date) | 记录日期 |
| `content` | `text` | NOT NULL | 用户输入的原始内容 |
| `summary` | `text` | NULL | AI 生成的简短摘要（用于日历显示） |
| `created_at` | `timestamp` | DEFAULT now() | 创建时间 |
| `updated_at` | `timestamp` | DEFAULT now() | 更新时间 |

**索引：**
```sql
-- 唯一索引：确保一个用户一天只有一条记录
CREATE UNIQUE INDEX idx_daily_records_user_date 
ON daily_records(user_id, date);

-- 查询索引：按用户和日期范围查询
CREATE INDEX idx_daily_records_user_created 
ON daily_records(user_id, created_at DESC);
```

**Row Level Security (RLS) 策略：**
```sql
-- 用户只能查看和修改自己的记录
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
  ON daily_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON daily_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON daily_records FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 2. `monthly_summary` - 月度总结表（可选）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | `uuid` | PRIMARY KEY | 主键 |
| `user_id` | `uuid` | NOT NULL, FOREIGN KEY | 用户ID |
| `month` | `text` | NOT NULL, UNIQUE(user_id, month) | 月份标识，格式："YYYY-MM" |
| `summary` | `text` | NOT NULL | AI 生成的月度总结（JSON 格式） |
| `created_at` | `timestamp` | DEFAULT now() | 创建时间 |
| `updated_at` | `timestamp` | DEFAULT now() | 更新时间 |

**说明：**
- 如果每次进入回顾页都重新生成，此表可省略
- 如果想保存历史月报，建议保留此表

---

## 核心功能实现

### 功能 1：每日记录页面 (`/record`)

#### 页面布局

```
┌─────────────────────────────────────────────┐
│              [导航栏]                        │
├──────────────┬──────────────────────────────┤
│              │  今日记录                     │
│   日历视图    │  ┌────────────────────────┐  │
│              │  │                        │  │
│  [1] [2] [3] │  │   Markdown 编辑器      │  │
│  [4] [5] [6] │  │   (支持实时预览)        │  │
│  ...         │  │                        │  │
│              │  └────────────────────────┘  │
│              │  [保存] [清空]               │
└──────────────┴──────────────────────────────┘
```

#### 实现要点

1. **日历组件 (`Calendar.tsx`)**
   - 显示当月所有日期
   - 有记录的日期高亮显示
   - 点击日期显示详情（Modal/Drawer）
   - 显示 `summary` 字段内容（如果存在）

2. **编辑器组件 (`Editor.tsx`)**
   - 支持 Markdown 语法
   - 实时预览（可选）
   - 自动保存草稿到 `localStorage`
   - 防抖保存（避免频繁写入）

3. **保存流程**

```typescript
// src/app/record/actions.ts
'use server'

export async function saveDailyRecord(date: string, content: string) {
  // 1. 保存原始内容到 Supabase
  const { data: record, error } = await supabase
    .from('daily_records')
    .upsert({
      user_id: userId,
      date,
      content,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 2. 调用 AI 生成摘要
  const summary = await generateDailySummary(content);

  // 3. 更新记录的 summary 字段
  await supabase
    .from('daily_records')
    .update({ summary })
    .eq('id', record.id);

  return { success: true, summary };
}
```

### 功能 2：月度回顾页面 (`/review`)

#### 页面布局

```
┌─────────────────────────────────────────────┐
│  [导航栏] - 2025年3月回顾                    │
├─────────────────────────────────────────────┤
│  📊 本月学习总结（AI生成）                    │
│  ┌──────────────────────────────────────┐   │
│  │  • 整体概述：...                      │   │
│  │  • 5个重要收获：...                   │   │
│  │  • 常见主题：统计、交易、英语...      │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  🏷️  主题词云图                              │
│  [可视化图表]                                │
├─────────────────────────────────────────────┤
│  📅 本月每日摘要列表                          │
│  • 3月1日：学习React Hooks...               │
│  • 3月2日：完成交易系统设计...               │
│  ...                                        │
└─────────────────────────────────────────────┘
```

#### 实现要点

1. **数据获取**
   - 获取当月所有 `daily_records`
   - 提取所有 `summary` 字段
   - 传递给 AI 生成月度总结

2. **AI 总结生成**
   - 进入页面时自动触发（或点击"生成总结"按钮）
   - 使用当月所有摘要作为输入
   - 返回结构化的月度报告

3. **可视化展示**
   - 词云图：基于 `content` 字段提取关键词
   - 频率统计：统计学习主题出现次数
   - 情绪趋势（可选）：基于内容分析情绪变化

---

## API 接口设计

### Server Actions（推荐方式）

#### 1. 保存每日记录

```typescript
// src/app/record/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server';
import { generateDailySummary } from '@/lib/ai/zhipu';

export async function saveRecord(date: string, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('未登录');

  // 保存原始内容
  const { data: record, error } = await supabase
    .from('daily_records')
    .upsert({
      user_id: user.id,
      date,
      content,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single();

  if (error) throw error;

  // 生成摘要
  const summary = await generateDailySummary(content);

  // 更新摘要
  await supabase
    .from('daily_records')
    .update({ summary })
    .eq('id', record.id);

  return { success: true, summary };
}
```

#### 2. 获取每日记录

```typescript
export async function getRecord(date: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('未登录');

  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
```

#### 3. 获取月度记录列表

```typescript
export async function getMonthlyRecords(year: number, month: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('未登录');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const { data, error } = await supabase
    .from('daily_records')
    .select('date, summary, content')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
}
```

#### 4. 生成月度总结

```typescript
export async function generateMonthlyReview(year: number, month: number) {
  const records = await getMonthlyRecords(year, month);
  const summaries = records.map(r => r.summary).filter(Boolean);
  
  if (summaries.length === 0) {
    return { error: '本月暂无记录' };
  }

  const review = await generateMonthlySummary(summaries);
  return review;
}
```

---

## AI 集成

### ZHIPU AI 客户端封装

```typescript
// src/lib/ai/zhipu.ts
import { ZhipuAI } from '@zhipuai/sdk';

const client = new ZhipuAI({
  apiKey: process.env.ZHIPU_API_KEY!,
});

export async function generateDailySummary(content: string): Promise<string> {
  const prompt = `你是一个专业的日记总结和学习整理助手。
请对下面的日记内容生成一个一句话的简短总结，用于显示在日历格子里。
保留核心学习点、重要事件或反思。

日记内容：
${content}

输出格式：一段短文本（50字以内）。`;

  const response = await client.chat.completions.create({
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: '你是一个专业的日记总结助手。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 100,
  });

  return response.choices[0].message.content || '';
}

export async function generateMonthlySummary(summaries: string[]): Promise<{
  overview: string;
  takeaways: string[];
  themes: Array<{ name: string; description: string }>;
}> {
  const prompt = `你是学习与成长复盘专家。现在你拿到某用户在本月的所有日记总结。

请生成《本月学习与成长总结》，包括：
1. 本月整体表现概述（150字内）
2. 本月最重要的5个学习收获
3. 本月最常出现的主题（给出3~5个主题并附简述）

下面是这个月的所有每日总结：
${summaries.join('\n\n')}

请以 JSON 格式输出：
{
  "overview": "整体概述",
  "takeaways": ["收获1", "收获2", ...],
  "themes": [
    {"name": "主题名", "description": "描述"},
    ...
  ]
}`;

  const response = await client.chat.completions.create({
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: '你是一个专业的复盘专家，请以 JSON 格式输出结果。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return result;
}
```

### 环境变量配置

```bash
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ZHIPU AI
ZHIPU_API_KEY=your-zhipu-api-key
```

---

## 前端实现

### 类型定义

```typescript
// src/types/record.ts
export interface DailyRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  content: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

// src/types/summary.ts
export interface MonthlySummary {
  overview: string;
  takeaways: string[];
  themes: Array<{
    name: string;
    description: string;
  }>;
}
```

### 日历组件示例

```typescript
// src/app/record/components/Calendar.tsx
'use client'

import { useState, useEffect } from 'react';
import { getRecord } from '../actions';

export function Calendar({ year, month }: { year: number; month: number }) {
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 获取当月所有记录
  useEffect(() => {
    // 实现获取逻辑
  }, [year, month]);

  // 渲染日历格子
  return (
    <div className="grid grid-cols-7 gap-2">
      {/* 日历格子 */}
    </div>
  );
}
```

### 编辑器组件示例

```typescript
// src/app/record/components/Editor.tsx
'use client'

import { useState, useEffect } from 'react';
import { saveRecord } from '../actions';

export function Editor({ date }: { date: string }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 从 localStorage 恢复草稿
  useEffect(() => {
    const draft = localStorage.getItem(`draft-${date}`);
    if (draft) setContent(draft);
  }, [date]);

  // 自动保存草稿
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`draft-${date}`, content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, date]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRecord(date, content);
      localStorage.removeItem(`draft-${date}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-64 p-4 border rounded"
        placeholder="记录今天的学习和想法..."
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}
```

---

## 环境配置

### 依赖安装

```bash
npm install @supabase/supabase-js @zhipuai/sdk
npm install -D @types/node
```

### package.json 脚本

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

### Supabase 初始化

1. 在 Supabase 控制台创建项目
2. 执行 SQL 创建表结构（见[数据库设计](#数据库设计)）
3. 配置 RLS 策略
4. 获取 API Keys 并配置到 `.env.local`

### 开发流程

1. **克隆项目** → 安装依赖
2. **配置环境变量** → 填写 Supabase 和 AI 密钥
3. **初始化数据库** → 运行 SQL 脚本创建表
4. **启动开发服务器** → `npm run dev`
5. **实现功能** → 按照本文档逐步实现

---

## 注意事项

### 性能优化

- ✅ 使用 Server Actions 减少客户端代码
- ✅ 日历数据按需加载（只加载当月）
- ✅ AI 调用添加缓存（避免重复生成）
- ✅ 使用 React Suspense 优化加载体验

### 错误处理

- ✅ AI 调用失败时显示友好提示
- ✅ 网络错误时自动重试
- ✅ 保存失败时保留草稿到 localStorage

### 安全考虑

- ✅ 使用 Supabase RLS 确保数据隔离
- ✅ API Key 存储在服务端环境变量
- ✅ 用户认证使用 Supabase Auth

---

## 扩展功能（可选）

- [ ] 支持多用户（已完成基础架构）
- [ ] 导出功能（PDF/Markdown）
- [ ] 搜索功能（全文搜索）
- [ ] 标签系统
- [ ] 情绪分析可视化
- [ ] 移动端适配（PWA）

---

**最后更新：** 2025-01-XX
