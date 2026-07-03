import type { StockData } from '../types';
import { fmt, fmtMoney } from '../utils/format';
import { buildBuyPlan, buildSellPlan } from '../services/trading';

interface PlanGridProps {
  stock: StockData;
  onQuickBuy: (price: number, lots: number) => void;
  onQuickSell: (posId: number) => void;
  onHighlightPosition: (posId: number) => void;
}

/** 自动规划: 买单 & 卖单 (各前5笔) */
export function PlanGrid({
  stock,
  onQuickBuy,
  onQuickSell,
  onHighlightPosition,
}: PlanGridProps) {
  const cfg = stock.config;
  const buyPlans = buildBuyPlan(stock);
  const sellPlans = buildSellPlan(stock);

  return (
    <div className="card">
      <div className="card-title">
        自动规划: 买单 &amp; 卖单 (各前5笔){' '}
        <span className="badge">点击卖单可高亮对应买单</span>
      </div>
      <div className="note" id="plan-note">
        买单: 从当前最深网格层向下每{cfg.gridDrop}元规划; 卖单:
        当前持仓按目标卖价排序。点击卖单条目可高亮跳转到对应买单记录。
      </div>
      <div className="plan-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 建议买单 */}
        <div className="plan-box buy-plan rounded-[8px] overflow-hidden border border-[#eee]" id="buy-plan-box">
          <div className="plan-header bg-gradient-to-br from-[#e88a83] to-[#c97168] text-white px-[14px] py-[10px] font-semibold text-[13px] flex justify-between items-center">
            <span>建议买单</span>
            <span className="text-[11px] opacity-80" id="buy-plan-subtitle">
              向下每{cfg.gridDrop}元
            </span>
          </div>
          <div className="plan-body" id="buy-plan-body">
            {buyPlans.length === 0 ? (
              <div className="plan-empty-warn p-5 text-center text-[#c97168] text-[13px] font-semibold bg-[#fef7f6]">
                没有可执行的推荐买单 (超出±10%涨跌限制或无可用网格层)
              </div>
            ) : (
              buyPlans.map((p, i) => (
                <div
                  key={p.level}
                  className={`plan-item flex justify-between items-center px-[14px] py-[10px] border-b border-[#f5f5f5] text-xs ${
                    i === 0 ? 'bg-[#fffde6]' : ''
                  }`}
                >
                  <div className="plan-left flex flex-col gap-[2px] flex-1">
                    <div className="plan-price text-[15px] font-bold text-[#c97168] tabular">
                      {fmt(p.price)} <span className="text-[11px] text-[#999]">买</span>
                    </div>
                    <div className="plan-meta text-[10px] text-[#999]">
                      网格层 #{p.level} | 基础{p.suggest.base}手+利润{p.suggest.extra}手 | 需
                      {fmtMoney(p.cost)}
                    </div>
                  </div>
                  <div className="plan-right flex items-center gap-2">
                    <span className="plan-lots text-[13px] font-semibold text-[#555] tabular">
                      {p.suggest.total}手
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickBuy(p.price, p.suggest.total);
                      }}
                    >
                      买入
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 建议卖单 */}
        <div className="plan-box sell-plan rounded-[8px] overflow-hidden border border-[#eee]" id="sell-plan-box">
          <div className="plan-header bg-gradient-to-br from-[#7dc88f] to-[#5fb374] text-white px-[14px] py-[10px] font-semibold text-[13px] flex justify-between items-center">
            <span>建议卖单</span>
            <span className="text-[11px] opacity-80" id="sell-plan-subtitle">
              买入价+{cfg.gridProfit}
            </span>
          </div>
          <div className="plan-body" id="sell-plan-body">
            {sellPlans.length === 0 ? (
              <div className="plan-empty-warn p-5 text-center text-[#c97168] text-[13px] font-semibold bg-[#fef7f6]">
                没有可执行的推荐卖单 (持仓目标卖价均超出+10%涨跌限制或无持仓)
              </div>
            ) : (
              sellPlans.map((p, i) => (
                <div
                  key={p.pos.id}
                  id={`sell-plan-item-${p.pos.id}`}
                  className={`plan-item clickable flex justify-between items-center px-[14px] py-[10px] border-b border-[#f5f5f5] text-xs cursor-pointer hover:bg-[#f0f7ff] ${
                    i === 0 ? 'bg-[#fffde6]' : ''
                  }`}
                  onClick={() => onHighlightPosition(p.pos.id)}
                >
                  <div className="plan-left flex flex-col gap-[2px] flex-1">
                    <div className="plan-price text-[15px] font-bold text-[#5fb374] tabular">
                      {fmt(p.pos.targetSellPrice)}{' '}
                      <span className="text-[11px] text-[#999]">卖</span>
                    </div>
                    <div className="plan-meta text-[10px] text-[#999]">
                      对应买入 <span className="text-[#c97168] font-semibold">#{p.pos.id}</span>{' '}
                      {fmt(p.pos.buyPrice)}元({p.pos.buyDate}) | {p.pos.lots}手 | 预期盈利
                      {p.profit >= 0 ? '+' : ''}
                      {fmtMoney(p.profit)}
                    </div>
                  </div>
                  <div className="plan-right flex items-center gap-2">
                    <span className="plan-link-hint text-[10px] text-[#3498db] whitespace-nowrap">
                      点击高亮买单
                    </span>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickSell(p.pos.id);
                      }}
                    >
                      卖出
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
