import { useMemo } from 'react';
import type { StockData } from '../types';
import { buildPendingSellSummary } from '../utils/trade-stats';
import { fmtMoney } from '../utils/format';

interface PendingSellSummaryProps {
  stock: StockData;
}

/** 待卖持仓汇总 — 按目标卖价分组展示 */
export function PendingSellSummary({ stock }: PendingSellSummaryProps) {
  const groups = useMemo(() => buildPendingSellSummary(stock), [stock]);

  if (groups.length === 0) return null;

  return (
    <div className="card" id="pending-sell-summary">
      <div className="card-title">
        待卖汇总
        <span className="badge">{groups.length}个卖价</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[10px]">
        {groups.map((g) => (
          <div
            key={g.sellPrice}
            className="border border-[#e0e0e0] rounded-[8px] p-[12px] hover:bg-[#f8f9fb] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#2c3e50]">
                {g.sellPrice.toFixed(2)} 元
              </span>
              <span className="text-[11px] text-[#95a5a6]">
                {g.positionCount}笔
              </span>
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#95a5a6]">股数</span>
                <span className="tabular">{g.totalShares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#95a5a6]">成本</span>
                <span className="tabular">{fmtMoney(g.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#95a5a6]">预期盈利</span>
                <span
                  className={`tabular font-semibold ${g.expectedProfit >= 0 ? 'text-[#5fb374]' : 'text-[#e88a83]'}`}
                >
                  {g.expectedProfit >= 0 ? '+' : ''}
                  {fmtMoney(g.expectedProfit)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
