// ============================================================
// 数据文档 — 云同步/恢复共用的统一格式 (AppData ↔ CloudDoc)
// ============================================================

import type { AppData, CloudDoc, StockData } from '../types';
import { createDefaultAppData } from './storage';
import { ensureCycleState } from './trading';

// 剔除临时编辑字段，避免同步到云端
function stripEditingFields(appData: AppData): AppData {
  const stocks: Record<string, StockData> = {};
  for (const [key, stock] of Object.entries(appData.stocks)) {
    const { _editingPosId, _editingTradeId, ...rest } = stock;
    stocks[key] = rest;
  }
  return { ...appData, stocks };
}

// 汇总当前全部状态为一个文档
export function buildCloudDoc(appData: AppData): CloudDoc {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: stripEditingFields(appData),
  };
}

// 文档内容指纹（不含 exportedAt，仅比较语义数据）
export function docFingerprint(doc: CloudDoc): string {
  return JSON.stringify(doc.data);
}

// 全新设备 / 全新用户的判空（云端播种守卫）
export function isPristine(doc: CloudDoc | null | undefined): boolean {
  if (!doc) return true;
  const data = doc.data;
  if (!data || !data.stocks) return true;
  const stocks = Object.values(data.stocks);
  if (stocks.length === 0) return true;
  return stocks.every(
    (s) =>
      s.positions.length === 0 &&
      s.completedTrades.length === 0 &&
      (s.cycles ?? []).length === 0 &&
      s.availableCapital === s.config.startCapital,
  );
}

// 把一篇云端文档还原为 AppData（校验 + 周期归一化），失败返回 null
export function applyCloudDoc(doc: CloudDoc | null | undefined): AppData | null {
  if (!doc || !doc.data || typeof doc.data !== 'object') return null;
  const data = doc.data as unknown as AppData;
  if (!data.stocks || typeof data.stocks !== 'object') return null;
  if (typeof data.currentStockKey !== 'string') return null;

  const stocks: Record<string, StockData> = {};
  for (const [key, stock] of Object.entries(data.stocks)) {
    if (!stock || !stock.config || !Array.isArray(stock.positions) || !Array.isArray(stock.completedTrades)) {
      return null;
    }
    stocks[key] = ensureCycleState(stock);
  }

  const fallback = createDefaultAppData();
  const currentStockKey = data.currentStockKey in stocks ? data.currentStockKey : fallback.currentStockKey;
  return { currentStockKey, stocks };
}
