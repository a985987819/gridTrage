import * as XLSX from 'xlsx';
import type { AppData } from '../types';
import { buildSellPlan, buildTodayBuyOrders } from './trading';
import { todayStr } from '../utils/format';

/**
 * Excel 导出服务
 * 输出一个多 sheet 工作簿:
 *   - 概览       股票基本信息 + 当前资金/累计盈利
 *   - 持仓明细   当前持仓逐条
 *   - 已完成交易  已完成交易逐条 (含批次标记)
 *   - 今日挂单    自动规划买单 + 分组卖单 (展开关联买单)
 */

/** 把数据写入并触发下载 */
export function exportAppDataToExcel(
  appData: AppData,
  onToast: (msg: string, type: 'success' | 'error' | 'warn' | 'info') => void,
): void {
  try {
    const stock = appData.stocks[appData.currentStockKey];
    const cfg = stock.config;
    const lastClose = stock.lastClosePrice;

    const wb = XLSX.utils.book_new();

    // ===== Sheet 1: 概览 =====
    const overviewRows: (string | number)[][] = [
      ['项目', '数值'],
      ['股票名称', cfg.stockName],
      ['股票代码', cfg.stockCode],
      ['基准价', cfg.basePrice],
      ['网格间距(买入)', cfg.gridDrop],
      ['网格利润(卖出)', cfg.gridProfit],
      ['底仓股数', cfg.baseShares],
      ['基础买入金额', cfg.baseBuyAmount],
      ['佣金费率', cfg.commissionRate],
      ['印花税率', cfg.stampDutyRate],
      ['昨日收盘价', lastClose ?? ''],
      ['可用资金', Number(stock.availableCapital.toFixed(2))],
      ['累计盈利', Number(stock.accumulatedProfit.toFixed(2))],
      ['持仓笔数', stock.positions.length],
      ['已完成交易笔数', stock.completedTrades.length],
      ['导出时间', new Date().toLocaleString('zh-CN')],
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
    XLSX.utils.book_append_sheet(wb, wsOverview, '概览');

    // ===== Sheet 2: 持仓明细 =====
    const positionsHeader = [
      '持仓ID',
      '网格层',
      '买入价',
      '买入日期',
      '手数',
      '股数',
      '买入成本',
      '买佣金',
      '目标卖价',
      '预期卖收入',
      '预期盈利',
    ];
    const feeRate = cfg.commissionRate + cfg.stampDutyRate;
    const positionsRows: (string | number)[][] = stock.positions.map((p) => {
      const sellValue = p.shares * p.targetSellPrice;
      const fees = sellValue * feeRate;
      const profit = sellValue - fees - p.buyCost;
      return [
        p.id,
        p.gridLevel,
        p.buyPrice,
        p.buyDate,
        p.lots,
        p.shares,
        Number(p.buyCost.toFixed(2)),
        Number(p.buyCommission.toFixed(2)),
        p.targetSellPrice,
        Number(sellValue.toFixed(2)),
        Number(profit.toFixed(2)),
      ];
    });
    const wsPositions = XLSX.utils.aoa_to_sheet([positionsHeader, ...positionsRows]);
    XLSX.utils.book_append_sheet(wb, wsPositions, '持仓明细');

    // ===== Sheet 3: 已完成交易 =====
    // 批次标记: 同 sellDate + sellPrice 且 count>1 视为同一批次
    const batchCounter = new Map<string, number>();
    stock.completedTrades.forEach((t) => {
      const k = `${t.sellDate}|${t.sellPrice}`;
      batchCounter.set(k, (batchCounter.get(k) ?? 0) + 1);
    });
    const batchIdMap = new Map<string, number>();
    let batchSeq = 0;
    batchCounter.forEach((c, k) => {
      if (c > 1) {
        batchSeq++;
        batchIdMap.set(k, batchSeq);
      }
    });

    const tradesHeader = [
      '序号',
      '批次号',
      '网格层',
      '买入价',
      '买入日',
      '手数',
      '买入成本',
      '卖出价',
      '卖出日',
      '卖收入',
      '佣金',
      '印花税',
      '盈利',
      '持仓天数',
      '累计盈利',
    ];
    const tradesRows: (string | number)[][] = stock.completedTrades.map((t) => {
      const k = `${t.sellDate}|${t.sellPrice}`;
      const batchId = batchIdMap.get(k);
      return [
        t.tradeId,
        batchId ?? '',
        t.gridLevel,
        t.buyPrice,
        t.buyDate,
        t.buyLots,
        Number(t.buyCost.toFixed(2)),
        t.sellPrice,
        t.sellDate,
        Number(t.netProceeds.toFixed(2)),
        Number(t.sellCommission.toFixed(2)),
        Number(t.stampDuty.toFixed(2)),
        Number(t.profit.toFixed(2)),
        t.holdDays,
        Number(t.accumulatedProfit.toFixed(2)),
      ];
    });
    const wsTrades = XLSX.utils.aoa_to_sheet([tradesHeader, ...tradesRows]);
    XLSX.utils.book_append_sheet(wb, wsTrades, '已完成交易');

    // ===== Sheet 4: 今日挂单 (买单 + 分组卖单) =====
    const ordersHeader = [
      '类型',
      '卖出价/买价',
      '网格层',
      '关联买单ID',
      '买入价',
      '手数',
      '股数',
      '买入成本',
      '预期盈利',
    ];
    const orderRows: (string | number)[][] = [];

    // 买单
    if (lastClose) {
      buildTodayBuyOrders(stock).forEach((o) => {
        orderRows.push([
          '买单',
          o.price,
          o.level,
          '',
          '',
          o.suggest.total,
          o.suggest.total * 100,
          Number(o.cost.toFixed(2)),
          '',
        ]);
      });
    }

    // 分组卖单: 每个分组先输出一行汇总, 再逐条输出关联买单
    if (lastClose) {
      buildSellPlan(stock).forEach((g) => {
        // 汇总行
        orderRows.push([
          '卖单(汇总)',
          g.sellPrice,
          '',
          g.positions.map((p) => p.id).join(','),
          '',
          '',
          g.totalShares,
          Number(g.totalCost.toFixed(2)),
          Number(g.totalProfit.toFixed(2)),
        ]);
        // 关联买单逐条
        g.positions.forEach((p) => {
          const sellValue = p.shares * g.sellPrice;
          const fees = sellValue * feeRate;
          const profit = sellValue - fees - p.buyCost;
          orderRows.push([
            '卖单关联买单',
            g.sellPrice,
            p.gridLevel,
            p.id,
            p.buyPrice,
            p.lots,
            p.shares,
            Number(p.buyCost.toFixed(2)),
            Number(profit.toFixed(2)),
          ]);
        });
      });
    }

    const wsOrders = XLSX.utils.aoa_to_sheet([ordersHeader, ...orderRows]);
    XLSX.utils.book_append_sheet(wb, wsOrders, '今日挂单');

    // 设置列宽 (简单等宽)
    [wsOverview, wsPositions, wsTrades, wsOrders].forEach((ws) => {
      if (!ws['!cols']) ws['!cols'] = [];
      for (let i = 0; i < 20; i++) {
        ws['!cols']![i] = { wch: 14 };
      }
    });

    // 触发下载
    const filename = `网格交易_${cfg.stockName}_${cfg.stockCode}_${todayStr()}.xlsx`;
    XLSX.writeFile(wb, filename);
    onToast(`已导出 Excel: ${filename}`, 'success');
  } catch (err) {
    console.error(err);
    onToast('导出 Excel 失败: ' + (err as Error).message, 'error');
  }
}
