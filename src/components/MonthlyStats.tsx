import { useMemo } from 'react';
import type { StockData } from '../types';
import { buildMonthlyStats } from '../utils/trade-stats';
import { fmtMoney } from '../utils/format';

interface MonthlyStatsProps {
  stock: StockData;
}

/** 月度统计面板 — 按月汇总买卖次数与盈利 */
export function MonthlyStats({ stock }: MonthlyStatsProps) {
  const stats = useMemo(() => buildMonthlyStats(stock), [stock]);

  if (stats.length === 0) {
    return (
      <div className="card" id="monthly-stats">
        <div className="card-title">月度统计</div>
        <p className="text-sm text-[#95a5a6] text-center py-4">暂无交易记录</p>
      </div>
    );
  }

  return (
    <div className="card" id="monthly-stats">
      <div className="card-title">月度统计</div>
      <div className="table-wrap" style={{ maxHeight: '300px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>月份</th>
              <th>买入次数</th>
              <th>买入金额</th>
              <th>卖出次数</th>
              <th>实现盈利</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.month}>
                <td className="font-semibold">{s.month}</td>
                <td>{s.buyCount}</td>
                <td>{fmtMoney(s.buyAmount)}</td>
                <td>{s.sellCount}</td>
                <td
                  className={
                    s.realizedProfit >= 0 ? 'td-profit-pos' : 'td-profit-neg'
                  }
                >
                  {s.realizedProfit >= 0 ? '+' : ''}
                  {fmtMoney(s.realizedProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
