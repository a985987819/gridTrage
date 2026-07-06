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

// ===== 柳工 (000528) =====
// 数据源: 柳工_000528_grid_trading_20260703.html (distRanges 5.6~13.4, 共79档)
const LIUGONG_DIST_8Y = [4, 6, 15, 22, 25, 56, 108, 74, 85, 74, 57, 75, 52, 37, 35, 31, 50, 64, 41, 47, 35, 59, 36, 35, 38, 26, 19, 15, 17, 14, 13, 21, 13, 19, 13, 15, 18, 16, 19, 40, 32, 19, 32, 23, 32, 25, 11, 11, 16, 20, 20, 14, 25, 26, 35, 18, 19, 22, 22, 23, 24, 15, 14, 25, 8, 11, 9, 8, 10, 14, 5, 4, 3, 2, 1, 0, 1, 1, 0];
const LIUGONG_DIST_3Y = [0, 0, 0, 0, 0, 1, 8, 16, 12, 11, 9, 12, 10, 2, 3, 2, 19, 8, 3, 9, 6, 11, 9, 13, 17, 5, 8, 4, 2, 4, 2, 2, 1, 3, 5, 4, 7, 10, 12, 20, 17, 12, 23, 10, 19, 13, 6, 9, 10, 12, 12, 8, 21, 22, 34, 15, 19, 18, 21, 20, 23, 14, 12, 23, 8, 8, 6, 7, 9, 13, 4, 4, 3, 2, 1, 0, 1, 1, 0];
const LIUGONG_DIST_1Y = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 0, 1, 2, 2, 2, 0, 2, 3, 1, 1, 1, 3, 5, 3, 5, 5, 2, 7, 10, 5, 7, 4, 7, 3, 1, 1, 2, 0, 5, 1, 9, 12, 18, 5, 8, 7, 9, 8, 11, 9, 8, 18, 5, 1, 2, 4, 3, 4, 1, 3, 2, 0, 0, 0, 0, 0, 0];

// ===== 三一重工 (600031) =====
// 数据源: 三一重工_600031_网格交易分析报告_20260704.html
// 3年窗口: 12.6~24.0 共115档; 1年窗口: 15.3~24.0 共88档
const SANYI_DIST_3Y = [1, 3, 3, 3, 4, 7, 12, 1, 5, 1, 6, 6, 3, 9, 11, 10, 9, 3, 4, 3, 4, 1, 1, 8, 7, 5, 13, 10, 11, 15, 16, 14, 13, 13, 17, 19, 14, 18, 18, 10, 18, 9, 11, 17, 17, 9, 13, 13, 15, 6, 11, 13, 10, 13, 7, 8, 11, 4, 7, 7, 6, 7, 15, 11, 9, 13, 11, 7, 4, 8, 7, 5, 3, 11, 4, 7, 5, 7, 6, 4, 13, 7, 12, 11, 6, 7, 12, 4, 2, 3, 2, 2, 5, 3, 4, 8, 7, 0, 2, 5, 3, 0, 3, 6, 4, 2, 4, 1, 1, 2, 0, 1, 0, 4, 0];
const SANYI_DIST_1Y = [3, 2, 5, 0, 2, 2, 1, 1, 3, 1, 0, 0, 0, 0, 1, 1, 3, 1, 0, 1, 1, 5, 0, 5, 6, 5, 8, 6, 6, 3, 4, 5, 2, 4, 3, 12, 11, 9, 12, 6, 7, 3, 7, 7, 5, 3, 11, 4, 7, 4, 8, 6, 4, 13, 5, 14, 11, 6, 7, 9, 7, 2, 3, 2, 2, 5, 3, 4, 8, 7, 0, 2, 5, 3, 0, 3, 6, 4, 2, 4, 1, 1, 2, 0, 1, 0, 4, 0];

// ===== 安道麦 (000553) =====
// 数据源: 安道麦_000553_网格交易分析报告_2025年_20260704.html
// 3年窗口: 4.1~10.6 共66档; 1年窗口: 5.3~7.7 共25档
const ANDAOMAI_DIST_3Y = [3, 12, 19, 16, 9, 6, 3, 1, 3, 2, 4, 6, 4, 6, 8, 9, 15, 16, 23, 29, 30, 29, 20, 33, 22, 18, 17, 32, 36, 16, 14, 11, 17, 14, 15, 19, 7, 8, 9, 6, 8, 4, 8, 21, 20, 14, 8, 6, 11, 8, 6, 1, 2, 5, 8, 9, 7, 5, 3, 1, 3, 0, 1, 0, 1, 0];
const ANDAOMAI_DIST_1Y = [1, 4, 5, 6, 12, 9, 17, 21, 18, 13, 7, 18, 12, 9, 5, 18, 26, 12, 7, 6, 10, 5, 1, 1, 0];

// ===== 奥佳华 (002614) =====
// 数据源: 奥佳华_002614_网格交易分析报告_20260704.html
// 3年窗口: 5.1~9.7 共47档; 1年窗口: 5.7~8.2 共26档
const AOJIAHUA_DIST_3Y = [4, 10, 16, 22, 11, 8, 2, 6, 9, 10, 20, 15, 20, 14, 38, 37, 27, 32, 39, 38, 22, 17, 29, 17, 26, 39, 38, 22, 18, 19, 17, 9, 9, 17, 8, 12, 6, 7, 11, 3, 0, 0, 1, 1, 0, 1, 0];
const AOJIAHUA_DIST_1Y = [1, 1, 3, 4, 7, 11, 11, 9, 29, 26, 23, 16, 25, 20, 12, 6, 11, 9, 5, 4, 6, 1, 2, 0, 1, 0];

export const STOCK_PRESETS: Record<string, StockConfig> = {
  liugong: {
    stockName: '柳工',
    stockCode: '000528',
    basePrice: 11.57,
    baseShares: 2000,
    startCapital: 100000,
    gridDrop: 0.5,
    gridProfit: 0.57,
    baseBuyAmount: 6000,
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
      { label: '过去8年', totalDays: 2039, bins: buildFreqBins(5.6, 0.1, LIUGONG_DIST_8Y) },
      { label: '过去3年', totalDays: 730, bins: buildFreqBins(5.6, 0.1, LIUGONG_DIST_3Y) },
      { label: '过去1年', totalDays: 244, bins: buildFreqBins(5.6, 0.1, LIUGONG_DIST_1Y) },
    ],
  },
  sanyi: {
    stockName: '三一重工',
    stockCode: '600031',
    basePrice: 16.5,
    baseShares: 2000,
    startCapital: 100000,
    gridDrop: 0.5,
    gridProfit: 1.17,
    baseBuyAmount: 6000,
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
    // 多时间窗口价格分布频率 (0.1元一档) - 数据源: 三一重工_600031_网格交易分析报告_20260704.html
    // 3年(727天)/1年(243天) - 8年窗口在该报告中未提供 0.1元一档数据
    priceFreqWindows: [
      { label: '过去3年', totalDays: 727, bins: buildFreqBins(12.6, 0.1, SANYI_DIST_3Y) },
      { label: '过去1年', totalDays: 243, bins: buildFreqBins(15.3, 0.1, SANYI_DIST_1Y) },
    ],
  },
  andaomai: {
    stockName: '安道麦A',
    stockCode: '000553',
    basePrice: 6.16,
    baseShares: 2000,
    startCapital: 100000,
    gridDrop: 0.5,
    gridProfit: 0.30,
    baseBuyAmount: 6000,
    commissionRate: 0.0001,
    stampDutyRate: 0.0005,
    // 2025年全年价格统计 (243个交易日) - 数据源: 安道麦_000553_网格交易分析报告_2025年_20260704.html
    // 注: 报告仅给出 min/max, 其余分位基于1年分布估算
    priceStats: {
      min: 5.22,
      p10: 5.50,
      p25: 5.85,
      median: 6.30,
      mean: 6.40,
      p75: 6.95,
      p90: 7.30,
      max: 7.70,
    },
    // 多时间窗口价格分布频率 (0.1元一档) - 数据源: 安道麦_000553_网格交易分析报告_2025年_20260704.html
    // 3年(727天)/1年(243天) - 8年窗口在该报告中未提供 0.1元一档数据
    priceFreqWindows: [
      { label: '过去3年', totalDays: 727, bins: buildFreqBins(4.1, 0.1, ANDAOMAI_DIST_3Y) },
      { label: '过去1年', totalDays: 243, bins: buildFreqBins(5.3, 0.1, ANDAOMAI_DIST_1Y) },
    ],
  },
  aojiahua: {
    stockName: '奥佳华',
    stockCode: '002614',
    basePrice: 6.76,
    baseShares: 2000,
    startCapital: 100000,
    gridDrop: 0.5,
    gridProfit: 0.30,
    baseBuyAmount: 6000,
    commissionRate: 0.0001,
    stampDutyRate: 0.0005,
    // 2025年全年价格统计 (243个交易日) - 数据源: 奥佳华_002614_网格交易分析报告_20260704.html
    // 注: 报告仅给出 min/max, 其余分位基于1年分布估算
    priceStats: {
      min: 5.31,
      p10: 5.80,
      p25: 6.20,
      median: 6.70,
      mean: 6.83,
      p75: 7.20,
      p90: 7.60,
      max: 8.45,
    },
    // 多时间窗口价格分布频率 (0.1元一档) - 数据源: 奥佳华_002614_网格交易分析报告_20260704.html
    // 3年(727天)/1年(243天) - 8年窗口在该报告中未提供 0.1元一档数据
    priceFreqWindows: [
      { label: '过去3年', totalDays: 727, bins: buildFreqBins(5.1, 0.1, AOJIAHUA_DIST_3Y) },
      { label: '过去1年', totalDays: 243, bins: buildFreqBins(5.7, 0.1, AOJIAHUA_DIST_1Y) },
    ],
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
