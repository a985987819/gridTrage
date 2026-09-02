import type { StockData } from '../types';
import { buildGridLevelStats } from '../services/trading';
import { fmtMoney } from '../utils/format';

interface GridLevelStatsProps {
  stock: StockData;
}

export function GridLevelStats({ stock }: GridLevelStatsProps) {
  const stats = buildGridLevelStats(stock);

  const statusLabel = (status: 'holding' | 'closed' | 'waiting') => {
    if (status === 'holding') return '持有中';
    if (status === 'closed') return '已卖出';
    return '等待买入';
  };

  const statusClass = (status: 'holding' | 'closed' | 'waiting') => {
    if (status === 'holding') return 'bg-[#e9f4ff] text-[#2776b7]';
    if (status === 'closed') return 'bg-[#f1f3f5] text-[#6c757d]';
    return 'bg-[#e8f7ed] text-[#4e9b65]';
  };

  return (
    <div className="card">
      <div className="card-title">
        档位周期统计
        <span className="badge">{stats.length} 个活跃档位</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>档位</th>
              <th>参考买价</th>
              <th>已循环次数</th>
              <th>已完成</th>
              <th>当前持有</th>
              <th>累计盈亏</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row p-[30px] text-center text-[#ccc]">
                  暂无档位周期数据
                </td>
              </tr>
            ) : (
              stats.map((item) => (
                <tr key={item.gridLevel}>
                  <td className="td-level">#{item.gridLevel}</td>
                  <td className="td-buy">{item.referenceBuyPrice.toFixed(2)}</td>
                  <td>{item.latestCycleNumber}</td>
                  <td>{item.closedCycles}</td>
                  <td>{item.openCycles}</td>
                  <td className={item.accumulatedProfit >= 0 ? 'td-profit-pos' : 'td-profit-neg'}>
                    {item.accumulatedProfit >= 0 ? '+' : ''}
                    {fmtMoney(item.accumulatedProfit)}
                  </td>
                  <td>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
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
