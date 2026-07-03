import type { StockConfig, PriceFreqBin } from '../types';

/**
 * 股票预设参数 (基准价、网格间距、价格统计等)
 * 修改配置时会被覆盖, 载入预设时使用最新值。
 */

/** 由天数数组构建 0.1元一档的 bin 列表 (从 start 起, 每档 step 宽) */
function buildFreqBins(start: number, step: number, counts: number[]): PriceFreqBin[] {
  return counts.map((days, i) => {
    const from = Number((start + i * step).toFixed(1));
    const to = Number((from + step).toFixed(1));
    return { from, to, days };
  });
}

// 数据源: 柳工_000528_grid_trading_20260703.html (distRanges 5.6~13.4, 共79档)
const DIST_8Y_COUNTS = [4, 6, 15, 22, 25, 56, 108, 74, 85, 74, 57, 75, 52, 37, 35, 31, 50, 64, 41, 47, 35, 59, 36, 35, 38, 26, 19, 15, 17, 14, 13, 21, 13, 19, 13, 15, 18, 16, 19, 40, 32, 19, 32, 23, 32, 25, 11, 11, 16, 20, 20, 14, 25, 26, 35, 18, 19, 22, 22, 23, 24, 15, 14, 25, 8, 11, 9, 8, 10, 14, 5, 4, 3, 2, 1, 0, 1, 1, 0];
const DIST_3Y_COUNTS = [0, 0, 0, 0, 0, 1, 8, 16, 12, 11, 9, 12, 10, 2, 3, 2, 19, 8, 3, 9, 6, 11, 9, 13, 17, 5, 8, 4, 2, 4, 2, 2, 1, 3, 5, 4, 7, 10, 12, 20, 17, 12, 23, 10, 19, 13, 6, 9, 10, 12, 12, 8, 21, 22, 34, 15, 19, 18, 21, 20, 23, 14, 12, 23, 8, 8, 6, 7, 9, 13, 4, 4, 3, 2, 1, 0, 1, 1, 0];
const DIST_1Y_COUNTS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 0, 1, 2, 2, 2, 0, 2, 3, 1, 1, 1, 3, 5, 3, 5, 5, 2, 7, 10, 5, 7, 4, 7, 3, 1, 1, 2, 0, 5, 1, 9, 12, 18, 5, 8, 7, 9, 8, 11, 9, 8, 18, 5, 1, 2, 4, 3, 4, 1, 3, 2, 0, 0, 0, 0, 0, 0];

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
    // 多时间窗口价格分布频率 (0.1元一档) - 数据源: 柳工_000528_grid_trading_20260703.html
    // 对比 过去8年(2039天)/3年(730天)/1年(244天), 观察价格中枢迁移
    priceFreqWindows: [
      { label: '过去8年', totalDays: 2039, bins: buildFreqBins(5.6, 0.1, DIST_8Y_COUNTS) },
      { label: '过去3年', totalDays: 730, bins: buildFreqBins(5.6, 0.1, DIST_3Y_COUNTS) },
      { label: '过去1年', totalDays: 244, bins: buildFreqBins(5.6, 0.1, DIST_1Y_COUNTS) },
    ],
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
