import type { AppData, SyncSummary, ToastType } from '../types';
import { buildTodayBuyOrders, buildSellPlan } from './trading';
import { todayStr } from '../utils/format';

/** 构建同步摘要数据 (导出挂单用) */
export function buildSyncSummary(appData: AppData): SyncSummary {
  const stock = appData.stocks[appData.currentStockKey];
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;

  return {
    syncTime: new Date().toISOString(),
    stockKey: appData.currentStockKey,
    stockName: cfg.stockName,
    stockCode: cfg.stockCode,
    config: {
      basePrice: cfg.basePrice,
      gridDrop: cfg.gridDrop,
      gridProfit: cfg.gridProfit,
      baseBuyAmount: cfg.baseBuyAmount,
    },
    lastClosePrice: lastClose,
    availableCapital: Number(stock.availableCapital.toFixed(2)),
    accumulatedProfit: Number(stock.accumulatedProfit.toFixed(2)),
    positionsCount: stock.positions.length,
    completedTradesCount: stock.completedTrades.length,
    positions: stock.positions.map((p) => ({
      id: p.id,
      gridLevel: p.gridLevel,
      buyPrice: p.buyPrice,
      buyDate: p.buyDate,
      lots: p.lots,
      shares: p.shares,
      buyCost: Number(p.buyCost.toFixed(2)),
      targetSellPrice: p.targetSellPrice,
    })),
    todayBuyOrders: lastClose
      ? buildTodayBuyOrders(stock).map((o) => ({
          level: o.level,
          price: o.price,
          lots: o.suggest.total,
          baseLots: o.suggest.base,
          extraLots: o.suggest.extra,
          cost: Number(o.cost.toFixed(2)),
        }))
      : [],
    todaySellOrders: lastClose
      ? buildSellPlan(stock).map((g) => ({
          sellPrice: g.sellPrice,
          totalShares: g.totalShares,
          totalCost: Number(g.totalCost.toFixed(2)),
          totalSellValue: Number(g.totalSellValue.toFixed(2)),
          totalFees: Number(g.totalFees.toFixed(2)),
          totalProfit: Number(g.totalProfit.toFixed(2)),
          positions: g.positions.map((p) => {
            const sellValue = p.shares * g.sellPrice;
            const fees = sellValue * (cfg.commissionRate + cfg.stampDutyRate);
            const profit = sellValue - fees - p.buyCost;
            return {
              positionId: p.id,
              buyPrice: p.buyPrice,
              lots: p.lots,
              profit: Number(profit.toFixed(2)),
            };
          }),
        }))
      : [],
  };
}

/** 手动导出挂单 JSON 下载 */
export function exportSyncFile(appData: AppData, onToast: (msg: string, type: ToastType) => void): void {
  const data = buildSyncSummary(appData);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grid_sync_${data.stockKey}_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  onToast('挂单已导出', 'success');
}
