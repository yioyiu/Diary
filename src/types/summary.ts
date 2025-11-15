export interface MonthlySummary {
  overview: string;
  takeaways: string[];
  themes: Array<{
    name: string;
    description: string;
  }>;
  keywords?: Array<{
    word: string;
    count: number;
  }>;
}

