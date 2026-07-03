import type { StockData, BuyPlan, SellPlan } from '../types';
import { fmt, fmtMoney } from '../utils/format';
import { buildTodayBuyOrders, buildTodaySellOrders } from '../services/trading';

interface TodayOrdersProps {
  stock: StockData;
  onQuickBuy: (price: number, lots: number) => void;
  onQuickSell: (posId: number) => void;
  onHighlightPosition: (posId: number) => void;
}

/** 今日可交易挂单 */
export function TodayOrders({
  stock,
  onQuickBuy,
  onQuickSell,
  onHighlightPosition,
}: TodayOrdersProps) {
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  const buyOrders: BuyPlan[] = lastClose ? buildTodayBuyOrders(stock) : [];
  const sellOrders: SellPlan[] = lastClose ? buildTodaySellOrders(stock) : [];

  return (
    <div id="today-orders-card" className="card">
      <div className="card-title">
        今日可交易挂单{' '}
        <span className="badge" id="today-orders-badge">
          {lastClose ? `收盘价 ${fmt(lastClose)}` : '未设置收盘价'}
        </span>
      </div>
      <div className="note" id="today-orders-note">
        根据昨日收盘价, 买入挂单 = 当前价下方最近的网格买点; 卖出挂单 =
        当前持仓中目标卖价在当前价上方的最近卖点。价格未到范围时显示"没有可用"。
      </div>
      <div className="plan-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 买入挂单 */}
        <div className="plan-box buy-plan rounded-[8px] overflow-hidden border border-[#eee]">
          <div className="plan-header bg-gradient-to-br from-[#e88a83] to-[#c97168] text-white px-[14px] py-[10px] font-semibold text-[13px] flex justify-between items-center">
            <span>今日买入挂单(前5笔)</span>
            <span className="text-[11px] opacity-80" id="today-buy-subtitle">
              向下每{cfg.gridDrop}元
            </span>
          </div>
          <div className="plan-body" id="today-buy-body">
            {!lastClose ? (
              <div className="plan-empty-warn p-5 text-center text-[#c97168] text-[13px] font-semibold bg-[#fef7f6]">
                请先输入昨日收盘价
              </div>
            ) : buyOrders.length === 0 ? (
              <div className="plan-empty-warn p-5 text-center text-[#c97168] text-[13px] font-semibold bg-[#fef7f6]">
                没有可执行的推荐买单 (超出±10%涨跌限制或无可用网格层)
              </div>
            ) : (
              buyOrders.map((o, i) => (
                <div
                  key={o.level}
                  className={`plan-item flex justify-between items-center px-[14px] py-[10px] border-b border-[#f5f5f5] text-xs ${
                    i === 0 ? 'bg-[#fffde6]' : ''
                  }`}
                >
                  <div className="plan-left flex flex-col gap-[2px] flex-1">
                    <div className="plan-price text-[15px] font-bold text-[#c97168] tabular">
                      {fmt(o.price)} <span className="text-[11px] text-[#999]">买</span>
                    </div>
                    <div className="plan-meta text-[10px] text-[#999]">
                      网格层 #{o.level} | 距当前 {fmt(lastClose - o.price)}元 | 基础
                      {o.suggest.base}+利润{o.suggest.extra}手 | 需{fmtMoney(o.cost)}
                    </div>
                  </div>
                  <div className="plan-right flex items-center gap-2">
                    <span className="plan-lots text-[13px] font-semibold text-[#555] tabular">
                      {o.suggest.total}手
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickBuy(o.price, o.suggest.total);
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

        {/* 卖出挂单 */}
        <div className="plan-box sell-plan rounded-[8px] overflow-hidden border border-[#eee]">
          <div className="plan-header bg-gradient-to-br from-[#7dc88f] to-[#5fb374] text-white px-[14px] py-[10px] font-semibold text-[13px] flex justify-between items-center">
            <span>今日卖出挂单(前5笔)</span>
            <span className="text-[11px] opacity-80" id="today-sell-subtitle">
              买入价+{cfg.gridProfit}
            </span>
          </div>
          <div className="plan-body" id="today-sell-body">
            {!lastClose ? (
              <div className="plan-empty-warn p-5 text-center text-[#c97168] text-[13px] font-semibold bg-[#fef7f6]">
                请先输入昨日收盘价
              </div>
            ) : sellOrders.length === 0 ? (
              <div className="plan-empty-warn p-5 text-center text-[#c97168] text-[13px] font-semibold bg-[#fef7f6]">
                没有可执行的推荐卖单 (持仓目标卖价均超出+10%涨跌限制或无持仓)
              </div>
            ) : (
              sellOrders.map((o, i) => (
                <div
                  key={o.pos.id}
                  id={`today-sell-item-${o.pos.id}`}
                  className={`plan-item clickable flex justify-between items-center px-[14px] py-[10px] border-b border-[#f5f5f5] text-xs cursor-pointer hover:bg-[#f0f7ff] ${
                    i === 0 ? 'bg-[#fffde6]' : ''
                  }`}
                  onClick={() => onHighlightPosition(o.pos.id)}
                >
                  <div className="plan-left flex flex-col gap-[2px] flex-1">
                    <div className="plan-price text-[15px] font-bold text-[#5fb374] tabular">
                      {fmt(o.pos.targetSellPrice)}{' '}
                      <span className="text-[11px] text-[#999]">卖</span>
                    </div>
                    <div className="plan-meta text-[10px] text-[#999]">
                      对应买入 <span className="text-[#c97168] font-semibold">#{o.pos.id}</span>{' '}
                      {fmt(o.pos.buyPrice)}元 | 距当前 +
                      {fmt(o.pos.targetSellPrice - lastClose)}元 | {o.pos.lots}手 | 预期盈利
                      {o.profit >= 0 ? '+' : ''}
                      {fmtMoney(o.profit)}
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
                        onQuickSell(o.pos.id);
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
