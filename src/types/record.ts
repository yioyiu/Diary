export interface DailyRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  content: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

