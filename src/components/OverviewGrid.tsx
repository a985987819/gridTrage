import type { StockData } from '../types';
import { fmtMoney } from '../utils/format';

interface OverviewGridProps {
  stock: StockData;
}

interface StatCard {
  label: string;
  value: string;
  sub: string;
  cls: 'green' | 'red' | 'purple' | '';
}

/** 概览卡片 */
export function OverviewGrid({ stock }: OverviewGridProps) {
  const cfg = stock.config;
  const positionsValue = stock.positions.reduce((sum, p) => sum + p.buyCost, 0);
  const unrealized = stock.positions.reduce((sum, p) => {
    const sv = p.shares * p.targetSellPrice;
    return sum + sv - sv * (cfg.commissionRate + cfg.stampDutyRate) - p.buyCost;
  }, 0);
  const baseCost = cfg.baseShares * cfg.basePrice;

  const cards: StatCard[] = [
    {
      label: '累计已实现盈利',
      value: (stock.accumulatedProfit >= 0 ? '+' : '') + fmtMoney(stock.accumulatedProfit),
      sub: '网格交易利润',
      cls: stock.accumulatedProfit >= 0 ? 'green' : 'red',
    },
    {
      label: '可用资金',
      value: fmtMoney(stock.availableCapital),
      sub: '当前现金',
      cls: '',
    },
    {
      label: '当前持仓',
      value: stock.positions.length + '笔',
      sub: '成本' + fmtMoney(positionsValue),
      cls: 'purple',
    },
    {
      label: '持仓预期盈利',
      value: (unrealized >= 0 ? '+' : '') + fmtMoney(unrealized),
      sub: '按目标卖价算',
      cls: unrealized >= 0 ? 'green' : 'red',
    },
    {
      label: '已完成交易',
      value: stock.completedTrades.length + '笔',
      sub: '全部已平仓',
      cls: '',
    },
    {
      label: '底仓',
      value: cfg.baseShares > 0 ? fmtMoney(baseCost) : '无底仓',
      sub:
        cfg.baseShares > 0 ? `${cfg.baseShares}股@${cfg.basePrice}` : '未设置底仓',
      cls: '',
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
    return 'text-[#2c3e50]';
  };

  return (
    <div
      id="overview-grid"
      className="grid gap-[10px] grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
    >
      {cards.map((c, i) => (
        <div
          key={i}
          className={`stat-card bg-white rounded-[8px] p-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] border-l-[3px] ${borderClass(
            c.cls,
          )}`}
        >
          <div className="stat-label text-[11px] text-[#95a5a6] mb-1">{c.label}</div>
          <div className={`stat-value text-xl font-bold tabular ${valueColor(c.cls)}`}>
            {c.value}
          </div>
          <div className="stat-sub text-[10px] text-[#bdc3c7] mt-[2px]">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
