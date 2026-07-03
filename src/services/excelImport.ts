import * as XLSX from 'xlsx';
import type { AppData, StockData, Position, CompletedTrade } from '../types';
import { STOCK_PRESETS } from '../constants/presets';
import { createFreshStockData } from './storage';
import { gridLevelOf } from '../utils/grid';

/**
 * Excel 导入服务
 * 支持"网格交易记录_*.xlsx"格式:
 *   股票 | 日期 | 买入价 | 买入份额 | 目标售价 | 预期盈利 | 实现份数 | 实现比例 | 实现盈利 | 卖出日期 | 完成 | 买入月份 | 卖出月份 | 买入金额 | 卖出金额
 */

/** Excel 原始行数据(数组形式, 按列索引访问) */
export type RawExcelRow = (string | number)[];

/** Excel 列索引 */
export const EXCEL_COLS = {
  stock: 0,
  buyDate: 1,
  buyPrice: 2,
  buyShares: 3,
  targetSellPrice: 4,
  expectedProfit: 5,
  realizedShares: 6,
  realizedRatio: 7,
  realizedProfit: 8,
  sellDate: 9,
  completed: 10,
  buyMonth: 11,
  sellMonth: 12,
  buyAmount: 13,
  sellAmount: 14,
} as const;

/** 解析 Excel 文件, 返回原始行数组(不含表头) */
export async function parseExcelFile(file: File): Promise<RawExcelRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel 文件无工作表');
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error('Excel 文件无工作表');
  // header:1 返回二维数组, 第一行是表头
  const rows = XLSX.utils.sheet_to_json<RawExcelRow>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  });
  // 跳过表头
  return rows.slice(1).filter((r) => r && r[EXCEL_COLS.stock]);
}

/** 把日期值转为 YYYY-MM-DD */
function normalizeDate(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // 兼容 "2026/1/28" "2026-01-28" 等
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[%,]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** 导入结果摘要 */
export interface ImportSummary {
  totalRows: number;
  imported: number;
  skipped: number;
  skippedStocks: string[];
  stocksUpdated: string[];
}

/**
 * 将 Excel 数据导入到 appData
 * - 按"股票"列分组, 匹配预设股票名
 * - 完成=1 → CompletedTrade; 完成=0 → Position
 * - 已完成交易按买入日期排序后重算累计盈利
 * - 默认替换目标股票的全部数据
 */
export function importExcelToAppData(
  appData: AppData,
  rows: RawExcelRow[],
): { data: AppData; summary: ImportSummary } {
  const summary: ImportSummary = {
    totalRows: rows.length,
    imported: 0,
    skipped: 0,
    skippedStocks: [],
    stocksUpdated: [],
  };

  // 按"股票"列分组
  const grouped = new Map<string, RawExcelRow[]>();
  for (const row of rows) {
    const name = String(row[EXCEL_COLS.stock] || '').trim();
    if (!name) {
      summary.skipped++;
      continue;
    }
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(row);
  }

  // 建立 stockName → stockKey 映射 (含预设)
  const nameToKey = new Map<string, string>();
  for (const [key, cfg] of Object.entries(STOCK_PRESETS)) {
    nameToKey.set(cfg.stockName, key);
  }
  for (const [key, stock] of Object.entries(appData.stocks)) {
    nameToKey.set(stock.config.stockName, key);
  }

  const newStocks: Record<string, StockData> = { ...appData.stocks };

  for (const [stockName, groupRows] of grouped) {
    const stockKey = nameToKey.get(stockName);
    if (!stockKey) {
      summary.skippedStocks.push(stockName);
      summary.skipped += groupRows.length;
      continue;
    }

    const baseStock = createFreshStockData(stockKey);
    const cfg = baseStock.config;
    const positions: Position[] = [];
    const completedTrades: CompletedTrade[] = [];
    let positionIdCounter = 0;
    let tradeCounter = 0;

    for (const row of groupRows) {
      const buyPrice = toNum(row[EXCEL_COLS.buyPrice]);
      const buyShares = toNum(row[EXCEL_COLS.buyShares]);
      const buyAmount = toNum(row[EXCEL_COLS.buyAmount]);
      const targetSellPrice = toNum(row[EXCEL_COLS.targetSellPrice]);
      const completed = toNum(row[EXCEL_COLS.completed]);
      const buyDate = normalizeDate(row[EXCEL_COLS.buyDate]);
      const sellDate = normalizeDate(row[EXCEL_COLS.sellDate]);
      const realizedProfit = toNum(row[EXCEL_COLS.realizedProfit]);
      const sellAmount = toNum(row[EXCEL_COLS.sellAmount]);
      const buyLots = Math.round(buyShares / 100);

      if (!buyPrice || buyShares <= 0) {
        summary.skipped++;
        continue;
      }

      // 买入佣金反推: buyAmount = shares*buyPrice*(1+rate) → comm = buyAmount - shares*buyPrice
      const buyCommission = Math.max(
        0,
        buyAmount - buyShares * buyPrice,
      );

      if (completed >= 1) {
        // 已完成交易
        tradeCounter++;
        // sellAmount 是毛卖出金额; netProceeds 反推保证 profit 与 Excel 一致
        const sellValue = sellAmount > 0 ? sellAmount : buyShares * targetSellPrice;
        const sellCommission = sellValue * cfg.commissionRate;
        const stampDuty = sellValue * cfg.stampDutyRate;
        const netProceeds =
          realizedProfit !== 0 ? buyAmount + realizedProfit : sellValue - sellCommission - stampDuty;
        const profit = realizedProfit !== 0 ? realizedProfit : netProceeds - buyAmount;
        const holdDays = sellDate
          ? Math.round(
              (new Date(sellDate).getTime() - new Date(buyDate).getTime()) / 86400000,
            )
          : 0;

        completedTrades.push({
          tradeId: tradeCounter,
          gridLevel: gridLevelOf(buyPrice, cfg),
          buyPrice,
          buyDate,
          buyLots,
          buyCost: Number(buyAmount.toFixed(2)),
          buyCommission: Number(buyCommission.toFixed(2)),
          sellPrice: targetSellPrice,
          sellDate,
          sellValue: Number(sellValue.toFixed(2)),
          sellCommission: Number(sellCommission.toFixed(2)),
          stampDuty: Number(stampDuty.toFixed(2)),
          netProceeds: Number(netProceeds.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          accumulatedProfit: 0, // 后面统一重算
          holdDays,
          linkedPositionId: 0,
        });
      } else {
        // 持仓中
        positionIdCounter++;
        positions.push({
          id: positionIdCounter,
          gridLevel: gridLevelOf(buyPrice, cfg),
          buyPrice,
          buyDate,
          lots: buyLots,
          shares: Math.round(buyShares),
          buyCost: Number(buyAmount.toFixed(2)),
          buyCommission: Number(buyCommission.toFixed(2)),
          targetSellPrice,
        });
      }
      summary.imported++;
    }

    // 按买入日期排序已完成交易, 重算累计盈利
    completedTrades.sort((a, b) => a.buyDate.localeCompare(b.buyDate));
    let acc = 0;
    completedTrades.forEach((t, i) => {
      acc += t.profit;
      completedTrades[i] = { ...t, tradeId: i + 1, accumulatedProfit: Number(acc.toFixed(2)) };
    });

    const newStock: StockData = {
      ...baseStock,
      positions,
      completedTrades,
      tradeCounter: completedTrades.length,
      positionIdCounter: positions.length,
      availableCapital: cfg.startCapital,
      accumulatedProfit: Number(acc.toFixed(2)),
      // 保留原有的 lastClosePrice
      lastClosePrice: newStocks[stockKey]?.lastClosePrice ?? null,
    };
    newStocks[stockKey] = newStock;
    if (!summary.stocksUpdated.includes(stockName)) {
      summary.stocksUpdated.push(stockName);
    }
  }

  return {
    data: { ...appData, stocks: newStocks },
    summary,
  };
}
