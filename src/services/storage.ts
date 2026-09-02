import type { AppData, StockData } from '../types';
import {
  STOCK_PRESETS,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY_V1,
  LAST_BACKUP_KEY,
  BACKUP_REMIND_DAYS,
} from '../constants/presets';
import { calcSellPrice, gridLevelOf } from '../utils/grid';
import { saveSnapshot, loadSnapshot, validateAppData } from './idb-storage';
import { ensureCycleState } from './trading';
import { storageKey } from './syncIdentity';

/** 当前目标卖价算法版本 (用于一次性迁移已有数据) */
const SELL_PRICE_ALGO_VERSION = 2;

/** 当前策略参数版本 (预设策略变更时升级, 触发一次性同步) */
const STRATEGY_VERSION = 2;

/** 根据预设创建一份全新的股票数据 */
export function createFreshStockData(presetKey: string): StockData {
  const cfg = { ...STOCK_PRESETS[presetKey] };
  return {
    config: cfg,
    availableCapital: cfg.startCapital,
    accumulatedProfit: 0,
    positions: [],
    completedTrades: [],
    cycles: [],
    gridLevelCycleMap: {},
    tradeCounter: 0,
    positionIdCounter: 0,
    lastClosePrice: null,
    sellPriceAlgoVersion: SELL_PRICE_ALGO_VERSION,
    strategyVersion: STRATEGY_VERSION,
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

/** 持久化保存到 localStorage (同时写入 IndexedDB 冗余备份) */
export function saveState(data: AppData): void {
  try {
    // 写入前校验数据完整性
    if (!validateAppData(data)) {
      console.error('[Storage] 数据完整性校验失败, 拒绝写入');
      return;
    }
    localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(data));
    // 异步写入 IndexedDB 备份 (不阻塞主流程)
    saveSnapshot(data).catch(() => {});
  } catch (e) {
    console.warn('[Storage] localStorage 写入失败:', e);
  }
}

/**
 * 从 localStorage 读取数据, 兼容 v1 旧版本数据迁移
 * 当 localStorage 损坏或为空时, 自动从 IndexedDB 恢复
 */
export function loadState(): AppData {
  // 先尝试从 localStorage 加载
  let data = tryLoadFromLocalStorage();
  if (data) return data;

  // localStorage 为空/损坏 → 尝试从 IndexedDB 恢复
  console.warn('[Storage] localStorage 数据无效, 尝试从 IndexedDB 恢复...');
  // IndexedDB 恢复是异步的, 但 loadState 必须是同步的
  // 采用同步降级策略: 先返回默认数据, 后台异步恢复
  data = createDefaultAppData();

  // 异步从 IndexedDB 恢复 (下次渲染生效)
  loadSnapshot().then((recovered) => {
    if (recovered && validateAppData(recovered)) {
      console.info('[Storage] 已从 IndexedDB 恢复数据');
      localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(recovered));
      // 触发页面重新加载使恢复的数据生效
      window.location.reload();
    } else {
      console.warn('[Storage] IndexedDB 中也没有有效数据, 使用默认数据');
    }
  });

  return data;
}

/** 尝试从 localStorage 加载数据, 失败返回 null */
function tryLoadFromLocalStorage(): AppData | null {
  const data = createDefaultAppData();
  try {
    const raw = localStorage.getItem(storageKey(STORAGE_KEY));
    if (raw) {
      const loaded = JSON.parse(raw) as Partial<AppData>;
      if (!validateAppData(loaded)) {
        console.warn('[Storage] localStorage 数据结构校验失败');
        return null;
      }
      if (loaded.currentStockKey) data.currentStockKey = loaded.currentStockKey;
      if (loaded.stocks) {
        for (const key of Object.keys(loaded.stocks) as Array<keyof typeof loaded.stocks>) {
          data.stocks[key as string] = loaded.stocks[key];
        }
      }
      if (!data.stocks.liugong) data.stocks.liugong = createFreshStockData('liugong');
      // 补全所有预设
      Object.keys(STOCK_PRESETS).forEach((key) => {
        if (!data.stocks[key]) data.stocks[key] = createFreshStockData(key);
      });
      if (!data.currentStockKey) data.currentStockKey = 'liugong';

      // 从预设补全统计字段
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

      // 目标卖价算法升级迁移
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

      // 策略参数升级迁移
      Object.keys(data.stocks).forEach((key) => {
        const stock = data.stocks[key];
        const preset = STOCK_PRESETS[key];
        if (!preset) return;
        if (!stock.strategyVersion || stock.strategyVersion < STRATEGY_VERSION) {
          stock.config.gridDrop = preset.gridDrop;
          stock.config.baseBuyAmount = preset.baseBuyAmount;
          stock.config.basePrice = preset.basePrice;
          stock.config.baseShares = preset.baseShares;
          stock.config.gridProfit = preset.gridProfit;
          stock.config.startCapital = preset.startCapital;
          stock.positions = stock.positions.map((p) => ({
            ...p,
            gridLevel: gridLevelOf(p.buyPrice, stock.config),
          }));
          stock.strategyVersion = STRATEGY_VERSION;
        }
      });
      Object.keys(data.stocks).forEach((key) => {
        data.stocks[key] = ensureCycleState(data.stocks[key]);
      });
      return data;
    } else {
      const v1raw = localStorage.getItem(LEGACY_STORAGE_KEY_V1);
      if (v1raw) {
        const v1 = JSON.parse(v1raw);
        data.stocks.liugong = {
          config: { ...STOCK_PRESETS.liugong, ...(v1.config || {}) },
          availableCapital: v1.availableCapital ?? STOCK_PRESETS.liugong.startCapital,
          accumulatedProfit: v1.accumulatedProfit ?? 0,
          positions: v1.positions ?? [],
          completedTrades: v1.completedTrades ?? [],
          cycles: [],
          gridLevelCycleMap: {},
          tradeCounter: v1.tradeCounter ?? 0,
          positionIdCounter: v1.positionIdCounter ?? 0,
          lastClosePrice: null,
        };
        data.stocks.liugong = ensureCycleState(data.stocks.liugong);
        return data;
      }
    }
  } catch (e) {
    console.error('[Storage] loadState 异常:', e);
    return null;
  }
  return null;
}

/** 记录备份时间 (JSON/Excel 导出后调用) */
export function recordBackupTime(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
  } catch {}
}

/**
 * 启用身份时把 default 命名空间的旧数据迁入新身份命名空间。
 * 目标命名空间已有数据时不覆盖。返回迁移的数据（无则 null）。
 */
export function migrateLegacyDataToIdentity(uid: string): AppData | null {
  const targetKey = storageKey(STORAGE_KEY);
  if (localStorage.getItem(targetKey)) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as AppData;
    if (!validateAppData(data)) return null;
    localStorage.setItem(targetKey, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

/** 检查是否需要备份提醒 (> BACKUP_REMIND_DAYS 天未导出) */
export function shouldRemindBackup(): boolean {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    if (!raw) return true; // 从未备份
    const last = parseInt(raw, 10);
    if (isNaN(last)) return true;
    const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return daysSince > BACKUP_REMIND_DAYS;
  } catch {
    return false;
  }
}
