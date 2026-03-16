// src/types/index.ts
export interface TradeRecord {
  id: number | string;
  stockName: string;
  date: string;
  timestamp: number;
  buyPrice: string;
  buyAmount: number; // 买入数量（总数）
  targetPrice: string;
  expectedProfit: string;
  status: '未完成' | '已完成';
  completeDate: string;
  completedAmount: number; // 新增：已完成数量（默认0，完成后=buyAmount或指定值）
  nextPurchasePrice?: string; // 新增：下次购入预估价
  nextExpectedShares?: number; // 新增：下次预计购买份额
}

export type StockNameList = string[];

export type DateStat = {
  [key: string]: number;
};

// 扩展统计类型，新增完成数量相关
export interface StatData {
  profit: string;
  totalCount: number;
  completedCount: number;
  uncompletedCount: number;
  totalBuyAmount: number; // 总买入数量
  totalCompletedAmount: number; // 总完成数量
}

export interface ChartData {
  dates: string[];
  profitData: number[];
  countData: number[];
  successCountData: number[]; // 新增：成功次数数据
}
