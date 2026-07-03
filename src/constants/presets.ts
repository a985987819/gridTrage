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
    // 价格分布频率 (0.1元一档) - 数据源: 柳工_000528_grid_trading_20260703.html
    // 共 2039 个交易日 (历史全量), 档位 5.6~13.4 元 (跳过 13.1 无数据)
    priceFreq: {
      totalDays: 2039,
      bins: [
        { from: 5.6, to: 5.7, days: 4 },
        { from: 5.7, to: 5.8, days: 6 },
        { from: 5.8, to: 5.9, days: 15 },
        { from: 5.9, to: 6.0, days: 22 },
        { from: 6.0, to: 6.1, days: 25 },
        { from: 6.1, to: 6.2, days: 56 },
        { from: 6.2, to: 6.3, days: 108 },
        { from: 6.3, to: 6.4, days: 74 },
        { from: 6.4, to: 6.5, days: 85 },
        { from: 6.5, to: 6.6, days: 74 },
        { from: 6.6, to: 6.7, days: 57 },
        { from: 6.7, to: 6.8, days: 75 },
        { from: 6.8, to: 6.9, days: 52 },
        { from: 6.9, to: 7.0, days: 37 },
        { from: 7.0, to: 7.1, days: 35 },
        { from: 7.1, to: 7.2, days: 31 },
        { from: 7.2, to: 7.3, days: 50 },
        { from: 7.3, to: 7.4, days: 64 },
        { from: 7.4, to: 7.5, days: 41 },
        { from: 7.5, to: 7.6, days: 47 },
        { from: 7.6, to: 7.7, days: 35 },
        { from: 7.7, to: 7.8, days: 59 },
        { from: 7.8, to: 7.9, days: 36 },
        { from: 7.9, to: 8.0, days: 35 },
        { from: 8.0, to: 8.1, days: 38 },
        { from: 8.1, to: 8.2, days: 26 },
        { from: 8.2, to: 8.3, days: 19 },
        { from: 8.3, to: 8.4, days: 15 },
        { from: 8.4, to: 8.5, days: 17 },
        { from: 8.5, to: 8.6, days: 14 },
        { from: 8.6, to: 8.7, days: 13 },
        { from: 8.7, to: 8.8, days: 21 },
        { from: 8.8, to: 8.9, days: 13 },
        { from: 8.9, to: 9.0, days: 19 },
        { from: 9.0, to: 9.1, days: 13 },
        { from: 9.1, to: 9.2, days: 15 },
        { from: 9.2, to: 9.3, days: 18 },
        { from: 9.3, to: 9.4, days: 16 },
        { from: 9.4, to: 9.5, days: 19 },
        { from: 9.5, to: 9.6, days: 40 },
        { from: 9.6, to: 9.7, days: 32 },
        { from: 9.7, to: 9.8, days: 19 },
        { from: 9.8, to: 9.9, days: 32 },
        { from: 9.9, to: 10.0, days: 23 },
        { from: 10.0, to: 10.1, days: 32 },
        { from: 10.1, to: 10.2, days: 25 },
        { from: 10.2, to: 10.3, days: 11 },
        { from: 10.3, to: 10.4, days: 11 },
        { from: 10.4, to: 10.5, days: 16 },
        { from: 10.5, to: 10.6, days: 20 },
        { from: 10.6, to: 10.7, days: 20 },
        { from: 10.7, to: 10.8, days: 14 },
        { from: 10.8, to: 10.9, days: 25 },
        { from: 10.9, to: 11.0, days: 26 },
        { from: 11.0, to: 11.1, days: 35 },
        { from: 11.1, to: 11.2, days: 18 },
        { from: 11.2, to: 11.3, days: 19 },
        { from: 11.3, to: 11.4, days: 22 },
        { from: 11.4, to: 11.5, days: 22 },
        { from: 11.5, to: 11.6, days: 23 },
        { from: 11.6, to: 11.7, days: 24 },
        { from: 11.7, to: 11.8, days: 15 },
        { from: 11.8, to: 11.9, days: 14 },
        { from: 11.9, to: 12.0, days: 25 },
        { from: 12.0, to: 12.1, days: 8 },
        { from: 12.1, to: 12.2, days: 11 },
        { from: 12.2, to: 12.3, days: 9 },
        { from: 12.3, to: 12.4, days: 8 },
        { from: 12.4, to: 12.5, days: 10 },
        { from: 12.5, to: 12.6, days: 14 },
        { from: 12.6, to: 12.7, days: 5 },
        { from: 12.7, to: 12.8, days: 4 },
        { from: 12.8, to: 12.9, days: 3 },
        { from: 12.9, to: 13.0, days: 2 },
        { from: 13.0, to: 13.1, days: 1 },
        { from: 13.2, to: 13.3, days: 1 },
        { from: 13.3, to: 13.4, days: 1 },
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
