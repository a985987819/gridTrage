import type { StockConfig } from '../types';

/**
 * 股票预设参数 (基准价、网格间距、价格统计等)
 * 修改配置时会被覆盖, 载入预设时使用最新值。
 */
export const STOCK_PRESETS: Record<string, StockConfig> = {
  liugong: {
    stockName: '柳工',
    stockCode: '000528',
    basePrice: 11.57,
    baseShares: 2000,
    startCapital: 100000,
    gridDrop: 0.1,
    gridProfit: 0.57,
    baseBuyAmount: 5500,
    commissionRate: 0.0001,
    stampDutyRate: 0.0005,
    // 2025年全年价格统计 (243个交易日)
    priceStats: {
      min: 9.42,
      p10: 9.87,
      p25: 10.37,
      median: 11.1,
      mean: 11.15,
      p75: 11.77,
      p90: 12.4,
      max: 13.38,
    },
    // 价格分布频率 (1元一档) - 数据源: 柳工_000528_grid_trading_20260703.html
    // 共 2039 个交易日 (历史全量), 档位 5~14 元
    priceFreq: {
      totalDays: 2039,
      bins: [
        { from: 5, to: 6, days: 47 },
        { from: 6, to: 7, days: 643 },
        { from: 7, to: 8, days: 433 },
        { from: 8, to: 9, days: 195 },
        { from: 9, to: 10, days: 227 },
        { from: 10, to: 11, days: 200 },
        { from: 11, to: 12, days: 217 },
        { from: 12, to: 13, days: 74 },
        { from: 13, to: 14, days: 3 },
      ],
    },
  },
  sanyi: {
    stockName: '三一重工',
    stockCode: '600031',
    basePrice: 16.5,
    baseShares: 2000,
    startCapital: 100000,
    gridDrop: 0.3,
    gridProfit: 1.17,
    baseBuyAmount: 5500,
    commissionRate: 0.0001,
    stampDutyRate: 0.0005,
    // 2025年全年价格统计 (243个交易日)
    priceStats: {
      min: 15.31,
      p10: 16.99,
      p25: 18.41,
      median: 19.78,
      mean: 19.62,
      p75: 20.97,
      p90: 21.89,
      max: 23.57,
    },
  },
};

/** localStorage 主键 */
export const STORAGE_KEY = 'grid_trading_tool_v2';

/** 旧版本迁移用的 key */
export const LEGACY_STORAGE_KEY_V1 = 'grid_trading_tool_v1';

/** 同步数据在 localStorage 中的键 */
export const SYNC_DATA_KEY = 'grid_sync_data';

/** 本地同步 HTTP 服务器地址 */
export const SYNC_HTTP_URL = 'http://127.0.0.1:8766';
