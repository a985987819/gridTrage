import type { StockData } from '../types';
import { ensureCycleState } from '../services/trading';
import { fmtMoney } from '../utils/format';

interface UnifiedTradeTableProps {
  stock: StockData;
}

export function UnifiedTradeTable({ stock }: UnifiedTradeTableProps) {
  const cycles = [...ensureCycleState(stock).cycles].sort((a, b) => {
    const byDate = b.buyDate.localeCompare(a.buyDate);
    if (byDate !== 0) return byDate;
    return b.cycleNumber - a.cycleNumber;
  });

  return (
    <div className="card">
      <div className="card-title">
        统一交易视图
        <span className="badge">一行 = 一次买入到卖出的周期</span>
      </div>
      <div className="note">
        明日可买和明日可卖之外，这里用于回看同一档位第几轮、上一轮卖出后何时再买回，以及“份数+1”对应的目标卖价。
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>周期</th>
              <th>档位</th>
              <th>买入日期</th>
              <th>买入价</th>
              <th>买入手数</th>
              <th>买入成本</th>
              <th>目标卖价</th>
              <th>卖出日期</th>
              <th>卖出价</th>
              <th>卖出金额</th>
              <th>单笔盈利</th>
              <th>累计盈利</th>
              <th>链路</th>
            </tr>
          </thead>
          <tbody>
            {cycles.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty-row p-[30px] text-center text-[#ccc]">
                  暂无交易周期
                </td>
              </tr>
            ) : (
              cycles.map((cycle) => (
                <tr key={cycle.id} className={cycle.status === 'open' ? 'bg-[#fcfffa]' : ''}>
                  <td>
                    <div className="font-semibold text-[#2c3e50]">第 {cycle.cycleNumber} 轮</div>
                    <div className="text-[10px] text-[#7f8c8d]">{cycle.status === 'open' ? '持有中' : '已完成'}</div>
                  </td>
                  <td className="td-level">#{cycle.gridLevel}</td>
                  <td>{cycle.buyDate}</td>
                  <td className="td-buy">{cycle.buyPrice.toFixed(2)}</td>
                  <td>{cycle.buyLots} 手</td>
                  <td>{fmtMoney(cycle.buyCost)}</td>
                  <td className="td-sell">{cycle.targetSellPrice.toFixed(2)}</td>
                  <td>{cycle.sellDate ?? '--'}</td>
                  <td className="td-sell">{cycle.sellPrice?.toFixed(2) ?? '--'}</td>
                  <td>{cycle.sellValue !== null ? fmtMoney(cycle.sellValue) : '--'}</td>
                  <td className={cycle.profit !== null && cycle.profit >= 0 ? 'td-profit-pos' : 'td-profit-neg'}>
                    {cycle.profit !== null ? `${cycle.profit >= 0 ? '+' : ''}${fmtMoney(cycle.profit)}` : '--'}
                  </td>
                  <td>{cycle.accumulatedProfit !== null ? fmtMoney(cycle.accumulatedProfit) : '--'}</td>
                  <td>
                    <div className="text-[11px] leading-4 text-[#5a6c7d]">
                      <div>{cycle.prevCycleId ? '接上轮' : '首轮'}</div>
                      <div>{cycle.nextCycleId ? '已连到下轮' : '等待下一轮'}</div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
