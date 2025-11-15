-- 每日记录网页 - Supabase 数据库初始化脚本

-- 创建 daily_records 表
CREATE TABLE IF NOT EXISTS daily_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_records_user_date 
ON daily_records(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_records_user_created 
ON daily_records(user_id, created_at DESC);

-- 启用 Row Level Security
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：用户只能查看自己的记录
CREATE POLICY "Users can view own records"
  ON daily_records FOR SELECT
  USING (auth.uid() = user_id);

-- 创建 RLS 策略：用户只能插入自己的记录
CREATE POLICY "Users can insert own records"
  ON daily_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 创建 RLS 策略：用户只能更新自己的记录
CREATE POLICY "Users can update own records"
  ON daily_records FOR UPDATE
  USING (auth.uid() = user_id);

-- 创建 RLS 策略：用户只能删除自己的记录
CREATE POLICY "Users can delete own records"
  ON daily_records FOR DELETE
  USING (auth.uid() = user_id);

-- 创建 updated_at 自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_daily_records_updated_at
  BEFORE UPDATE ON daily_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 可选：创建 monthly_summary 表（用于保存历史月报）
CREATE TABLE IF NOT EXISTS monthly_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_month UNIQUE(user_id, month)
);

-- 为 monthly_summary 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_summary_user_month 
ON monthly_summary(user_id, month);

-- 为 monthly_summary 启用 RLS
ALTER TABLE monthly_summary ENABLE ROW LEVEL SECURITY;

-- 创建 monthly_summary 的 RLS 策略
CREATE POLICY "Users can view own monthly summaries"
  ON monthly_summary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly summaries"
  ON monthly_summary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly summaries"
  ON monthly_summary FOR UPDATE
  USING (auth.uid() = user_id);

-- 为 monthly_summary 创建 updated_at 触发器
CREATE TRIGGER update_monthly_summary_updated_at
  BEFORE UPDATE ON monthly_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

