// src/types/index.ts
export interface TradeRecord {
  id: number;
  stockName: string;
  date: string;
  timestamp: number;
  buyPrice: string;
  buyAmount: number;
  targetPrice: string;
  expectedProfit: string;
  status: '未完成' | '已完成';
  completeDate: string;
}

export type StockNameList = string[];

export type DateStat = {
  [key: string]: number;
};

export interface StatData {
  profit: string;
  totalCount: number;
  completedCount: number;
  uncompletedCount: number;
}

export interface ChartData {
  dates: string[];
  profitData: number[];
  countData: number[];
  successCountData: number[]; // 新增：成功次数数据
}
