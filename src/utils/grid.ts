import type { StockConfig, SuggestLots, StockData } from '../types';

/**
 * 网格计算工具: 网格层级、强迫症价格管理、建议手数等
 */

/** 根据买入价计算对应的网格层级 */
export function gridLevelOf(price: number, cfg: StockConfig): number {
  if (cfg.gridDrop <= 0) return 0;
  return Math.round((cfg.basePrice - price) / cfg.gridDrop);
}

/**
 * 强迫症价格管理: 买入价第二位小数固定为 1
 * 例如 9.91, 10.01, 10.11
 */
export function forceBuyPrice(price: number): number {
  if (!Number.isFinite(price)) return 0;
  return Number((Math.floor(price * 10) / 10 + 0.01).toFixed(2));
}

/**
 * 强迫症价格管理: 卖出价第二位小数固定为 8
 * 例如 10.48, 10.58, 10.68
 */
export function forceSellPrice(price: number): number {
  if (!Number.isFinite(price)) return 0;
  return Number((Math.floor(price * 10) / 10 + 0.08).toFixed(2));
}

/** 根据网格层级计算买点价 (自动应用强迫症管理) */
export function gridPriceOf(level: number, cfg: StockConfig): number {
  return forceBuyPrice(cfg.basePrice - cfg.gridDrop * level);
}

/**
 * 根据买入价和股数计算卖出价
 * 算法: 买入股数 * (目标卖价 - 买入价) = 买入价 * 100
 * 即目标利润 = 100 股的买入成本 (固定每次盈利目标)
 * 解出: sellPrice = buyPrice + (buyPrice * 100) / shares
 * 最后应用强迫症管理 (.x8 结尾)
 */
export function calcSellPrice(buyPrice: number, shares: number): number {
  if (shares <= 0) return forceSellPrice(buyPrice);
  const profitTarget = buyPrice * 100;
  const rawSellPrice = buyPrice + profitTarget / shares;
  return forceSellPrice(rawSellPrice);
}

/**
 * 计算建议手数
 *  - 基础手数 = floor(baseBuyAmount / (price * 100))
 *  - 利润手数 = floor(累计盈利 / (price * 100))
 */
export function calcSuggestLots(price: number, stock: StockData): SuggestLots {
  const cfg = stock.config;
  const baseLots = Math.floor(cfg.baseBuyAmount / (price * 100));
  const extraLots = Math.floor(stock.accumulatedProfit / (price * 100));
  return {
    base: baseLots,
    extra: extraLots,
    total: Math.max(0, baseLots + extraLots),
  };
}
