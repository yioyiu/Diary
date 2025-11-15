# 每日记录网页

> AI增强的日记/学习记录工具

## 功能特性

- ✅ **每日记录**：支持 Markdown 格式的日记/学习内容输入
- ✅ **AI 自动总结**：保存时自动生成简短摘要，显示在日历格子中
- ✅ **月度回顾**：基于当月所有记录生成 AI 学习报告
- ✅ **主题词云**：AI 提取关键词，可视化展示学习主题
- ✅ **月度总结缓存**：智能缓存机制，提升加载速度
- ✅ **云端存储**：使用 Supabase 持久化所有数据
- ✅ **实时预览**：Markdown 编辑器支持实时预览

## 技术栈

- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS**
- **Supabase** (数据库 + 认证)
- **ZHIPU AI** (GLM 4.5 FLASH)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env.local` 并填写配置：

```bash
# Windows
copy env.example .env.local

# Linux/Mac
cp env.example .env.local
```

需要配置的变量：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（可选，用于服务端操作）
- `ZHIPU_API_KEY` - ZHIPU AI API 密钥

### 3. 初始化 Supabase 数据库

在 Supabase 控制台的 SQL Editor 中执行 `supabase-schema.sql` 文件中的 SQL 脚本。

该脚本会创建：
- `daily_records` 表：存储每日记录
- `monthly_summary` 表：存储月度总结（带缓存功能）
- 必要的索引和 RLS（行级安全）策略

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 全局布局
│   ├── page.tsx            # 首页
│   ├── record/             # 记录页面
│   │   ├── page.tsx
│   │   ├── actions.ts      # Server Actions
│   │   └── components/
│   │       ├── Calendar.tsx
│   │       └── Editor.tsx
│   └── review/             # 回顾页面
│       ├── page.tsx
│       ├── actions.ts
│       └── components/
│           ├── SummaryCard.tsx
│           ├── Charts.tsx
│           └── DailyList.tsx
├── lib/                    # 工具库
│   ├── supabase/          # Supabase 客户端
│   ├── ai/                # AI 客户端
│   ├── utils.ts           # 工具函数
│   └── date.ts            # 日期处理
└── types/                 # TypeScript 类型
    ├── record.ts
    ├── summary.ts
    └── database.ts
```

## 使用说明

### 记录页面 (`/record`)

1. 选择日期（点击日历或使用月份切换）
2. 在编辑器中输入内容（支持 Markdown）
3. 点击"保存"按钮
4. AI 会自动生成摘要并显示在日历格子上

### 回顾页面 (`/review`)

1. 选择要查看的月份
2. 点击"生成月度总结"按钮，选择要生成的月份
3. 查看 AI 生成的月度报告、主题词云和每日摘要列表
4. 月度总结会自动缓存，再次查看时无需重新生成

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

## 注意事项

1. **认证**：当前版本使用 Supabase Auth，需要先配置用户认证
2. **AI 调用**：确保 ZHIPU API Key 有效且有足够额度
3. **数据库**：确保 Supabase 项目已正确配置 RLS 策略

## 许可证

MIT

