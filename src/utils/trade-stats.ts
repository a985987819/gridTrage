import type { StockData, CompletedTrade, Position } from '../types';
import { fmtMoney } from './format';

// ===== 交易日历数据 =====

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  buyCount: number;
  buyShares: number;
  sellCount: number;
  sellShares: number;
  profit: number;
  hasActivity: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}

/** 从交易记录生成月度日历数据 */
export function buildCalendarData(stock: StockData, year: number, month: number): CalendarMonth {
  // 获取当月天数
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      dayOfMonth: d,
      buyCount: 0,
      buyShares: 0,
      sellCount: 0,
      sellShares: 0,
      profit: 0,
      hasActivity: false,
    });
  }

  // 填充买入数据 (从持仓)
  for (const p of stock.positions) {
    if (!p.buyDate) continue;
    const d = new Date(p.buyDate);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < days.length) {
        days[idx].buyCount++;
        days[idx].buyShares += p.shares;
        days[idx].hasActivity = true;
      }
    }
  }

  // 填充卖出数据 (从已完成交易)
  for (const t of stock.completedTrades) {
    if (!t.sellDate) continue;
    const d = new Date(t.sellDate);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < days.length) {
        days[idx].sellCount++;
        days[idx].sellShares += t.buyLots * 100;
        days[idx].profit += t.profit;
        days[idx].hasActivity = true;
      }
    }
  }

  return { year, month, days };
}

/** 获取当前有交易记录的年范围 (当前年始终包含) */
export function getTradeYearRange(stock: StockData): { min: number; max: number; current: number } {
  const today = new Date();
  const currentYear = today.getFullYear();
  let minYear = currentYear;
  let maxYear = currentYear;

  const allDates = [
    ...stock.positions.map((p) => p.buyDate),
    ...stock.completedTrades.map((t) => t.buyDate),
    ...stock.completedTrades.map((t) => t.sellDate),
  ].filter(Boolean);

  for (const ds of allDates) {
    const d = new Date(ds);
    if (!isNaN(d.getTime())) {
      minYear = Math.min(minYear, d.getFullYear());
      maxYear = Math.max(maxYear, d.getFullYear());
    }
  }

  // 确保当前年始终在可选范围内
  return { min: minYear, max: Math.max(maxYear, currentYear), current: currentYear };
}

// ===== 资金曲线数据 =====

export interface CapitalPoint {
  date: string; // YYYY-MM-DD
  cumulativeInvested: number; // 累计投入
  cumulativeProfit: number; // 累计盈利
}

export type AggregateMode = 'daily' | 'weekly' | 'monthly';

/** 从交易记录生成资金曲线数据 (按时间排序) */
export function buildCapitalCurve(stock: StockData): CapitalPoint[] {
  const events: { date: string; invested: number; profit: number }[] = [];

  // 买入事件: 投入资金 (buyCost)
  for (const p of stock.positions) {
    if (p.buyDate) {
      events.push({ date: p.buyDate, invested: p.buyCost, profit: 0 });
    }
  }

  // 卖出事件: 实现盈利
  for (const t of stock.completedTrades) {
    if (t.sellDate) {
      events.push({ date: t.sellDate, invested: 0, profit: t.profit });
    }
  }

  // 按日期排序
  events.sort((a, b) => a.date.localeCompare(b.date));

  const points: CapitalPoint[] = [];
  let cumInvested = 0;
  let cumProfit = 0;

  for (const e of events) {
    cumInvested += e.invested;
    cumProfit += e.profit;
    points.push({
      date: e.date,
      cumulativeInvested: cumInvested,
      cumulativeProfit: cumProfit,
    });
  }

  return points;
}

/** 聚合资本曲线 (按周/月) */
export function aggregateCapitalCurve(
  points: CapitalPoint[],
  mode: AggregateMode,
): CapitalPoint[] {
  if (points.length === 0) return [];

  const grouped = new Map<string, CapitalPoint[]>();

  for (const p of points) {
    let key: string;
    const d = new Date(p.date);
    if (mode === 'weekly') {
      // ISO week: 获取周一
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      key = monday.toISOString().slice(0, 10);
    } else if (mode === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = p.date;
    }

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const result: CapitalPoint[] = [];
  const keys = [...grouped.keys()].sort();
  for (const key of keys) {
    const group = grouped.get(key)!;
    const last = group[group.length - 1];
    result.push({
      date: key,
      cumulativeInvested: last.cumulativeInvested,
      cumulativeProfit: last.cumulativeProfit,
    });
  }

  return result;
}

// ===== 月度统计数据 =====

export interface MonthlyStat {
  month: string; // YYYY-MM
  buyCount: number;
  buyAmount: number;
  sellCount: number;
  realizedProfit: number;
}

/** 生成月度统计 */
export function buildMonthlyStats(stock: StockData): MonthlyStat[] {
  const map = new Map<string, MonthlyStat>();

  // 从持仓统计买入
  for (const p of stock.positions) {
    if (!p.buyDate) continue;
    const m = p.buyDate.slice(0, 7); // YYYY-MM
    if (!map.has(m)) {
      map.set(m, { month: m, buyCount: 0, buyAmount: 0, sellCount: 0, realizedProfit: 0 });
    }
    const s = map.get(m)!;
    s.buyCount++;
    s.buyAmount += p.buyCost;
  }

  // 从已完成交易统计卖出
  for (const t of stock.completedTrades) {
    if (!t.sellDate) continue;
    const m = t.sellDate.slice(0, 7);
    if (!map.has(m)) {
      map.set(m, { month: m, buyCount: 0, buyAmount: 0, sellCount: 0, realizedProfit: 0 });
    }
    const s = map.get(m)!;
    s.sellCount++;
    s.realizedProfit += t.profit;
  }

  // 按月降序
  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month));
}

// ===== 待卖持仓汇总 =====

export interface PendingSellGroup {
  sellPrice: number;
  positionCount: number;
  totalShares: number;
  totalCost: number;
  expectedProfit: number;
}

/** 按目标卖价汇总当前持仓 */
export function buildPendingSellSummary(stock: StockData): PendingSellGroup[] {
  const cfg = stock.config;
  const feeRate = cfg.commissionRate + cfg.stampDutyRate;

  // 按目标卖价分组
  const groups = new Map<number, Position[]>();
  for (const p of stock.positions) {
    const key = Number(p.targetSellPrice.toFixed(2));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const result: PendingSellGroup[] = [];
  for (const [sellPrice, positions] of groups) {
    const totalShares = positions.reduce((s, p) => s + p.shares, 0);
    const totalCost = positions.reduce((s, p) => s + p.buyCost, 0);
    const totalSellValue = totalShares * sellPrice;
    const totalFees = totalSellValue * feeRate;
    const expectedProfit = totalSellValue - totalFees - totalCost;

    result.push({
      sellPrice,
      positionCount: positions.length,
      totalShares,
      totalCost,
      expectedProfit,
    });
  }

  // 按卖价升序
  return result.sort((a, b) => a.sellPrice - b.sellPrice);
}
