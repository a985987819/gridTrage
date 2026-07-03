import type { StockData } from '../types';
import { fmt } from '../utils/format';
import { ZoneChart } from './ZoneChart';
import { PriceFreqChart } from './PriceFreqChart';

interface ZoneAnalysisProps {
  stock: StockData;
  onLastCloseChange: (val: number | null) => void;
}

/** 价格区间分析卡片 */
export function ZoneAnalysis({ stock, onLastCloseChange }: ZoneAnalysisProps) {
  const cfg = stock.config;
  const ps = cfg.priceStats;
  if (!ps) return null;

  const lastClose = stock.lastClosePrice;
  const med = ps.median;
  const p75 = ps.p75;

  let statusCls = 'price-status no-price bg-[#f0f0f0] text-[#bdc3c7]';
  let statusText = '未输入收盘价';
  if (lastClose) {
    if (lastClose < med) {
      statusCls = 'price-status in-buy-zone bg-[#fbeae7] text-[#c97168]';
      statusText = `当前 ${fmt(lastClose)} → 高胜率买区 (低于中位数${fmt(med)})`;
    } else if (lastClose > p75) {
      statusCls = 'price-status in-sell-zone bg-[#e3f1e7] text-[#5fb374]';
      statusText = `当前 ${fmt(lastClose)} → 高收益卖区 (高于P75 ${fmt(p75)})`;
    } else {
      statusCls = 'price-status in-normal-zone bg-[#f8f9fa] text-[#7f8c8d]';
      statusText = `当前 ${fmt(lastClose)} → 中性区 (${fmt(med)} ~ ${fmt(p75)})`;
    }
  }

  const stats = [
    { l: '最低价', v: fmt(ps.min) },
    { l: 'P10', v: fmt(ps.p10) },
    { l: 'P25', v: fmt(ps.p25) },
    { l: '中位数', v: fmt(ps.median) },
    { l: '均值', v: fmt(ps.mean) },
    { l: 'P75', v: fmt(ps.p75) },
    { l: 'P90', v: fmt(ps.p90) },
    { l: '最高价', v: fmt(ps.max) },
  ];

  return (
    <div id="zone-card" className="card">
      <div className="card-title">
        价格区间分析 <span className="badge" id="zone-badge">{cfg.stockName} 2025年全年统计</span>
      </div>
      <div className="note" id="zone-note">
        基于2025年全年243个交易日的收盘价分布, 中位数划分买卖区间。红色区域价格低于中位数,
        历史胜率高, 鼓励大胆买入; 绿色区域价格高于P75, 历史收益高, 鼓励及时卖出。
      </div>
      <div className="price-input-row flex items-end gap-[14px] mb-3 flex-wrap">
        <div className="price-input-field flex flex-col gap-1">
          <label className="text-[11px] text-[#95a5a6]">昨日收盘价</label>
          <input
            id="last-close-price"
            type="number"
            step="0.01"
            placeholder="输入昨日收盘价"
            className="px-3 py-2 border-2 border-[#3498db] rounded-[6px] text-sm w-[160px] tabular font-semibold focus:outline-none focus:border-[#e88a83] focus:shadow-[0_0_0_3px_rgba(232,138,131,0.1)]"
            value={lastClose ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (val && val > 0) onLastCloseChange(val);
              else onLastCloseChange(null);
            }}
          />
        </div>
        <div className={statusCls + ' text-[13px] font-semibold px-3 py-1.5 rounded-[6px]'}>
          {statusText}
        </div>
      </div>
      <div className="zone-bar-wrap my-4 mb-2">
        <ZoneChart priceStats={ps} config={cfg} lastClose={lastClose} />
      </div>
      {cfg.priceFreqWindows && cfg.priceFreqWindows.length > 0 && (
        <div
          id="price-freq-section"
          className="mt-4 pt-3 border-t border-dashed border-[#e0e0e0]"
        >
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-[13px] font-semibold text-[#2c3e50]">
              价格分布频率 (0.1元一档 · 三时间窗口对比)
            </h4>
            <span className="badge" id="price-freq-badge">
              8年/3年/1年
            </span>
          </div>
          <div className="note tip" id="price-freq-note">
            对比过去8年 / 3年 / 1年的收盘价分布, 观察价格中枢迁移趋势。
            点击图例可切换显示某窗口; 输入昨日收盘价后, 虚线标注当前价所在档位。
          </div>
          <PriceFreqChart windows={cfg.priceFreqWindows} lastClose={lastClose} />
        </div>
      )}
      <div className="zone-cards grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div className="zone-card buy-zone bg-[#fef7f6] border-l-4 border-[#e88a83] rounded-[8px] p-3 px-[14px]">
          <div className="zc-title text-[13px] font-bold mb-1 text-[#c97168]">
            高胜率区间 · 大胆买入
          </div>
          <div className="zc-range text-lg font-bold tabular mb-1">
            {fmt(ps.min)} ~ {fmt(med)}
          </div>
          <div className="zc-desc text-[11px] text-[#777]">
            价格低于中位数, 全年约50%时间在此区间下方, 历史反弹概率高
          </div>
          <div className="zc-action bg-[#e88a83] text-white text-[11px] font-semibold mt-1.5 px-2 py-[3px] rounded inline-block">
            逢低加仓, 放大网格
          </div>
        </div>
        <div className="zone-card sell-zone bg-[#f4faf6] border-l-4 border-[#7dc88f] rounded-[8px] p-3 px-[14px]">
          <div className="zc-title text-[13px] font-bold mb-1 text-[#5fb374]">
            高收益区间 · 及时卖出
          </div>
          <div className="zc-range text-lg font-bold tabular mb-1">
            {fmt(p75)} ~ {fmt(ps.max)}
          </div>
          <div className="zc-desc text-[11px] text-[#777]">
            价格高于P75, 全年仅25%时间到达, 历史高位区域
          </div>
          <div className="zc-action bg-[#7dc88f] text-white text-[11px] font-semibold mt-1.5 px-2 py-[3px] rounded inline-block">
            逢高减仓, 落袋为安
          </div>
        </div>
      </div>
      <div className="zone-stats-row flex gap-2 flex-wrap mt-[10px] text-[11px]">
        {stats.map((s) => (
          <div
            key={s.l}
            className="zone-stat-item bg-[#f8f9fa] px-[10px] py-1 rounded text-[#555]"
          >
            {s.l}: <strong className="text-[#2c3e50]">{s.v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
