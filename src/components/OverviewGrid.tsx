import type { StockData } from '../types';
import { fmtMoney } from '../utils/format';
import { buildCapitalPressure, buildSellPlan, buildTodayBuyOrders } from '../services/trading';

interface OverviewGridProps {
  stock: StockData;
}

interface StatCard {
  label: string;
  value: string;
  sub: string;
  cls: 'green' | 'red' | 'purple' | '';
}

export function OverviewGrid({ stock }: OverviewGridProps) {
  const cfg = stock.config;
  const positionsValue = stock.positions.reduce((sum, p) => sum + p.buyCost, 0);
  const unrealized = stock.positions.reduce((sum, p) => {
    const sellValue = p.shares * p.targetSellPrice;
    return sum + sellValue - sellValue * (cfg.commissionRate + cfg.stampDutyRate) - p.buyCost;
  }, 0);
  const baseCost = cfg.baseShares * cfg.basePrice;
  const capitalPressure = buildCapitalPressure(stock);
  const tomorrowBuy = buildTodayBuyOrders(stock)[0];
  const tomorrowSell = buildSellPlan(stock)[0];

  const cards: StatCard[] = [
    {
      label: '累计已实现盈利',
      value: `${stock.accumulatedProfit >= 0 ? '+' : ''}${fmtMoney(stock.accumulatedProfit)}`,
      sub: '已完成交易累计',
      cls: stock.accumulatedProfit >= 0 ? 'green' : 'red',
    },
    {
      label: '当前持仓',
      value: `${stock.positions.length} 笔`,
      sub: `成本 ${fmtMoney(positionsValue)}`,
      cls: 'purple',
    },
    {
      label: '持仓预期盈利',
      value: `${unrealized >= 0 ? '+' : ''}${fmtMoney(unrealized)}`,
      sub: '按目标卖价估算',
      cls: unrealized >= 0 ? 'green' : 'red',
    },
    {
      label: '已完成交易',
      value: `${stock.completedTrades.length} 笔`,
      sub: '已平仓周期',
      cls: '',
    },
    {
      label: '底仓',
      value: cfg.baseShares > 0 ? fmtMoney(baseCost) : '无底仓',
      sub: cfg.baseShares > 0 ? `${cfg.baseShares}股 @ ${cfg.basePrice}` : '未设置底仓',
      cls: '',
    },
    {
      label: '明日可买',
      value: tomorrowBuy ? `${tomorrowBuy.price.toFixed(2)} / ${tomorrowBuy.suggest.total}手` : '--',
      sub: tomorrowBuy ? `档位 #${tomorrowBuy.level} · 约 ${fmtMoney(tomorrowBuy.cost)}` : '暂无可挂买单',
      cls: 'red',
    },
    {
      label: '明日可卖',
      value: tomorrowSell ? `${tomorrowSell.sellPrice.toFixed(2)} / ${tomorrowSell.totalShares}股` : '--',
      sub: tomorrowSell
        ? `${tomorrowSell.positions.length}笔联动 · 预盈 ${fmtMoney(tomorrowSell.totalProfit)}`
        : '暂无可挂卖单',
      cls: 'green',
    },
    {
      label: '资金压力',
      value: `${(capitalPressure.deployedRatio * 100).toFixed(0)}%`,
      sub: `剩余 ${fmtMoney(capitalPressure.reserveCapital)} · 还能覆盖 ${capitalPressure.remainingGridSlots} 档`,
      cls:
        capitalPressure.warningLevel === 'danger'
          ? 'red'
          : capitalPressure.warningLevel === 'warn'
            ? 'purple'
            : 'green',
    },
  ];

  const borderClass = (cls: StatCard['cls']) => {
    if (cls === 'green') return 'border-l-[#7dc88f]';
    if (cls === 'red') return 'border-l-[#e88a83]';
    if (cls === 'purple') return 'border-l-[#8e44ad]';
    return 'border-l-[#3498db]';
  };

  const valueColor = (cls: StatCard['cls']) => {
    if (cls === 'green') return 'text-[#5fb374]';
    if (cls === 'red') return 'text-[#c97168]';
    if (cls === 'purple') return 'text-[#8e44ad]';
    return 'text-[#2c3e50]';
  };

  return (
    <div id="overview-grid" className="grid gap-[10px] grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`stat-card bg-white rounded-[8px] p-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-l-[3px] ${borderClass(
            card.cls,
          )}`}
        >
          <div className="stat-label text-[11px] text-[#95a5a6] mb-1">{card.label}</div>
          <div className={`stat-value text-xl font-bold tabular ${valueColor(card.cls)}`}>
            {card.value}
          </div>
          <div className="stat-sub text-[10px] text-[#7f8c8d] mt-[2px] leading-4">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
