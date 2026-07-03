/**
 * 网格交易记账工具 - 类型定义
 */

/** 价格统计区间数据 */
export interface PriceStats {
  min: number;
  p10: number;
  p25: number;
  median: number;
  mean: number;
  p75: number;
  p90: number;
  max: number;
}

/** 价格分布频率 (1元一档) 单档数据 */
export interface PriceFreqBin {
  /** 档位下界 (元), 例如 5 表示 5~6 元档 */
  from: number;
  /** 档位上界 (元) */
  to: number;
  /** 此档位天数 */
  days: number;
}

/** 价格分布频率统计集合 */
export interface PriceFreq {
  /** 总样本天数 */
  totalDays: number;
  /** 1元一档的分布数据 */
  bins: PriceFreqBin[];
}

/** 股票配置 */
export interface StockConfig {
  stockName: string;
  stockCode: string;
  basePrice: number;
  baseShares: number;
  startCapital: number;
  gridDrop: number;
  gridProfit: number;
  baseBuyAmount: number;
  commissionRate: number;
  stampDutyRate: number;
  priceStats?: PriceStats;
  /** 价格分布频率 (1元一档), 用于价格分布柱状图 */
  priceFreq?: PriceFreq;
}

/** 持仓 */
export interface Position {
  id: number;
  gridLevel: number;
  buyPrice: number;
  buyDate: string;
  lots: number;
  shares: number;
  buyCost: number;
  buyCommission: number;
  targetSellPrice: number;
}

/** 已完成交易 */
export interface CompletedTrade {
  tradeId: number;
  gridLevel: number;
  buyPrice: number;
  buyDate: string;
  buyLots: number;
  buyCost: number;
  buyCommission: number;
  sellPrice: number;
  sellDate: string;
  sellValue: number;
  sellCommission: number;
  stampDuty: number;
  netProceeds: number;
  profit: number;
  accumulatedProfit: number;
  holdDays: number;
  linkedPositionId: number;
}

/** 单只股票的全部数据 */
export interface StockData {
  config: StockConfig;
  availableCapital: number;
  accumulatedProfit: number;
  positions: Position[];
  completedTrades: CompletedTrade[];
  tradeCounter: number;
  positionIdCounter: number;
  lastClosePrice: number | null;
  /** 临时编辑状态(不持久化) */
  _editingPosId?: number;
  _editingTradeId?: number;
}

/** 应用全局数据 */
export interface AppData {
  currentStockKey: string;
  stocks: Record<string, StockData>;
}

/** 建议手数结果 */
export interface SuggestLots {
  base: number;
  extra: number;
  total: number;
}

/** 买入规划 */
export interface BuyPlan {
  level: number;
  price: number;
  suggest: SuggestLots;
  cost: number;
}

/** 卖出规划 */
export interface SellPlan {
  pos: Position;
  profit: number;
}

/** Toast 类型 */
export type ToastType = 'info' | 'success' | 'error' | 'warn';

/** 同步摘要数据 */
export interface SyncSummary {
  syncTime: string;
  stockKey: string;
  stockName: string;
  stockCode: string;
  config: {
    basePrice: number;
    gridDrop: number;
    gridProfit: number;
    baseBuyAmount: number;
  };
  lastClosePrice: number | null;
  availableCapital: number;
  accumulatedProfit: number;
  positionsCount: number;
  completedTradesCount: number;
  positions: Array<{
    id: number;
    gridLevel: number;
    buyPrice: number;
    buyDate: string;
    lots: number;
    shares: number;
    buyCost: number;
    targetSellPrice: number;
  }>;
  todayBuyOrders: Array<{
    level: number;
    price: number;
    lots: number;
    baseLots: number;
    extraLots: number;
    cost: number;
  }>;
  todaySellOrders: Array<{
    positionId: number;
    buyPrice: number;
    targetSellPrice: number;
    lots: number;
    profit: number;
  }>;
}
