import type { AppData, StockData } from '../types';
import {
  STOCK_PRESETS,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY_V1,
} from '../constants/presets';
import { calcSellPrice } from '../utils/grid';

/** 当前目标卖价算法版本 (用于一次性迁移已有数据) */
const SELL_PRICE_ALGO_VERSION = 2;

/** 根据预设创建一份全新的股票数据 */
export function createFreshStockData(presetKey: string): StockData {
  const cfg = { ...STOCK_PRESETS[presetKey] };
  return {
    config: cfg,
    availableCapital: cfg.startCapital,
    accumulatedProfit: 0,
    positions: [],
    completedTrades: [],
    tradeCounter: 0,
    positionIdCounter: 0,
    lastClosePrice: null,
    sellPriceAlgoVersion: SELL_PRICE_ALGO_VERSION,
  };
}

/** 默认应用数据 */
export function createDefaultAppData(): AppData {
  const stocks: Record<string, StockData> = {};
  // 为所有预设生成默认数据, 新增预设自动加入
  Object.keys(STOCK_PRESETS).forEach((key) => {
    stocks[key] = createFreshStockData(key);
  });
  return {
    currentStockKey: 'liugong',
    stocks,
  };
}

/** 持久化保存到 localStorage */
export function saveState(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // 静默失败
  }
}

/**
 * 从 localStorage 读取数据, 兼容 v1 旧版本数据迁移
 */
export function loadState(): AppData {
  const data = createDefaultAppData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const loaded = JSON.parse(raw) as Partial<AppData>;
      if (loaded.currentStockKey) data.currentStockKey = loaded.currentStockKey;
      if (loaded.stocks) {
        // 保留两个预设的默认值, 然后用 localStorage 中的数据覆盖
        for (const key of Object.keys(loaded.stocks) as Array<keyof typeof loaded.stocks>) {
          data.stocks[key as string] = loaded.stocks[key];
        }
      }
      if (!data.stocks.liugong) data.stocks.liugong = createFreshStockData('liugong');
      // 补全所有预设, 旧版本 localStorage 中可能缺新预设
      Object.keys(STOCK_PRESETS).forEach((key) => {
        if (!data.stocks[key]) data.stocks[key] = createFreshStockData(key);
      });
      if (!data.currentStockKey) data.currentStockKey = 'liugong';

      // 兼容旧数据: 从预设补全后续新增的统计字段 (priceStats / priceFreqWindows)
      // localStorage 中存储的 config 可能是旧版本, 不含新增字段, 需以预设为准
      // stockName / stockCode 等标识字段也以预设为准 (如改名后同步)
      Object.keys(data.stocks).forEach((key) => {
        const preset = STOCK_PRESETS[key];
        if (!preset) return;
        data.stocks[key].config.stockName = preset.stockName;
        data.stocks[key].config.stockCode = preset.stockCode;
        if (preset.priceStats && !data.stocks[key].config.priceStats) {
          data.stocks[key].config.priceStats = preset.priceStats;
        }
        if (preset.priceFreqWindows && !data.stocks[key].config.priceFreqWindows) {
          data.stocks[key].config.priceFreqWindows = preset.priceFreqWindows;
        }
      });

      // 兼容旧数据: 目标卖价算法升级迁移
      // 旧版算法 sellPrice = buyPrice + cfg.gridProfit (version 缺省或 1)
      // 新版算法 sellPrice = buyPrice + buyPrice*100/shares (version = 2)
      // 缺省或旧版本时一次性重算所有持仓的 targetSellPrice
      Object.keys(data.stocks).forEach((key) => {
        const stock = data.stocks[key];
        if (!stock.sellPriceAlgoVersion || stock.sellPriceAlgoVersion < SELL_PRICE_ALGO_VERSION) {
          stock.positions = stock.positions.map((p) => ({
            ...p,
            targetSellPrice: calcSellPrice(p.buyPrice, p.shares),
          }));
          stock.sellPriceAlgoVersion = SELL_PRICE_ALGO_VERSION;
        }
      });
    } else {
      // 尝试从 v1 迁移
      const v1raw = localStorage.getItem(LEGACY_STORAGE_KEY_V1);
      if (v1raw) {
        const v1 = JSON.parse(v1raw);
        data.stocks.liugong = {
          config: { ...STOCK_PRESETS.liugong, ...(v1.config || {}) },
          availableCapital: v1.availableCapital ?? STOCK_PRESETS.liugong.startCapital,
          accumulatedProfit: v1.accumulatedProfit ?? 0,
          positions: v1.positions ?? [],
          completedTrades: v1.completedTrades ?? [],
          tradeCounter: v1.tradeCounter ?? 0,
          positionIdCounter: v1.positionIdCounter ?? 0,
          lastClosePrice: null,
        };
      }
    }
  } catch (e) {
    console.error('loadState error', e);
  }
  return data;
}
