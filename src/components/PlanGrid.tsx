import { useState } from 'react';
import type { StockData } from '../types';
import { buildCapitalPressure, buildSellPlan, buildTodayBuyOrders } from '../services/trading';
import { fmtMoney } from '../utils/format';

interface PlanGridProps {
  stock: StockData;
  onQuickBuy: (price: number, lots: number) => void;
  onHoverSell: (posIds: number[]) => void;
  onHoverSellEnd: () => void;
  onLinkSell: (sellPrice: number, positionIds: number[]) => void;
  onBatchSell: (posIds: number[], sellPrice: number) => void;
}

export function PlanGrid({
  stock,
  onQuickBuy,
  onHoverSell,
  onHoverSellEnd,
  onLinkSell,
  onBatchSell,
}: PlanGridProps) {
  const buyPlans = buildTodayBuyOrders(stock);
  const sellPlans = buildSellPlan(stock);
  const capitalPressure = buildCapitalPressure(stock);

  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editSellPrice, setEditSellPrice] = useState<number>(0);

  const startEdit = (sellPrice: number, posIds: number[]) => {
    setEditingPrice(sellPrice);
    setSelectedIds(posIds);
    setEditSellPrice(sellPrice);
  };

  const cancelEdit = () => {
    setEditingPrice(null);
    setSelectedIds([]);
  };

  const saveEdit = () => {
    onLinkSell(editSellPrice, selectedIds);
    cancelEdit();
  };

  const toggleId = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="card" id="plan-grid-card">
      <div className="card-title">
        明日可买 / 明日可卖
        <span className="badge">以 2026-07-30 的收盘数据为基准生成下一交易日挂单</span>
      </div>
      <div className="note warn" id="plan-note">
        当前已部署 {(capitalPressure.deployedRatio * 100).toFixed(0)}% 资金，剩余可覆盖 {capitalPressure.remainingGridSlots} 档。
        “明日可买”优先看更靠前的低位档，“明日可卖”直接展示按“份数+1”推导出的目标卖价链条。
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[10px] border border-[#f4d4d1] overflow-hidden">
          <div className="bg-gradient-to-r from-[#f5b5ad] to-[#e88a83] px-4 py-3 text-white">
            <div className="text-[15px] font-semibold">明日可买</div>
            <div className="text-[11px] opacity-90">从昨收往下寻找未占用档位</div>
          </div>
          <div>
            {buyPlans.length === 0 ? (
              <div className="p-5 text-center text-[#c97168]">暂无可执行买单</div>
            ) : (
              buyPlans.map((plan, index) => (
                <div
                  key={plan.level}
                  className={`border-b border-[#f7e6e3] px-4 py-3 ${index === 0 ? 'bg-[#fff6f4]' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[16px] font-bold text-[#c97168]">
                        {plan.price.toFixed(2)} 元
                        <span className="ml-2 rounded-full bg-[#fde4e0] px-2 py-1 text-[10px] font-semibold text-[#b85c53]">
                          档位 #{plan.level}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-[#6b7280]">
                        建议 {plan.suggest.total} 手 = 基础 {plan.suggest.base} 手 + 盈利复投 {plan.suggest.extra} 手
                      </div>
                      <div className="mt-1 text-[11px] text-[#9a6a63]">
                        预计占用 {fmtMoney(plan.cost)}，买入后目标卖价会按“份数+1”自动计算
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => onQuickBuy(plan.price, plan.suggest.total)}>
                      买入
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[10px] border border-[#d6eadc] overflow-hidden">
          <div className="bg-gradient-to-r from-[#8fddb0] to-[#5fb374] px-4 py-3 text-white">
            <div className="text-[15px] font-semibold">明日可卖</div>
            <div className="text-[11px] opacity-90">同一卖价可合并多笔持仓统一挂出</div>
          </div>
          <div>
            {sellPlans.length === 0 ? (
              <div className="p-5 text-center text-[#5fb374]">暂无可执行卖单</div>
            ) : (
              sellPlans.map((group, index) => {
                const priceKey = Number(group.sellPrice.toFixed(2));
                const isEditing = editingPrice === priceKey;
                const posIds = group.positions.map((item) => item.id);
                const nextBuyLots = Math.floor(group.totalProfit / (group.positions[0]?.buyPrice ?? 1) / 100) + 1;
                return (
                  <div key={priceKey} className={`border-b border-[#ebf6ef] ${index === 0 ? 'bg-[#f7fff9]' : 'bg-white'}`}>
                    <div
                      className="cursor-pointer px-4 py-3 hover:bg-[#f2fbf5]"
                      onMouseEnter={() => onHoverSell(posIds)}
                      onMouseLeave={onHoverSellEnd}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[16px] font-bold text-[#35915b]">
                            {group.sellPrice.toFixed(2)} 元
                            <span className="ml-2 rounded-full bg-[#dff4e6] px-2 py-1 text-[10px] font-semibold text-[#3f8158]">
                              {group.totalShares} 股
                            </span>
                          </div>
                          <div className="mt-1 text-[12px] text-[#5f6b66]">
                            {group.positions.length} 笔联动，买入链：{group.positions.map((item) => `#${item.id}@${item.buyPrice.toFixed(2)}`).join(' / ')}
                          </div>
                          <div className="mt-1 rounded-[8px] bg-[#eef9f1] px-3 py-2 text-[11px] text-[#35724a]">
                            卖出后预计盈利 {fmtMoney(group.totalProfit)}，可在下一轮按低位价多买约 {Math.max(nextBuyLots, 1)} 手
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn btn-edit btn-sm" onClick={() => (isEditing ? cancelEdit() : startEdit(priceKey, posIds))}>
                            {isEditing ? '收起' : '关联'}
                          </button>
                          <button className="btn btn-success btn-sm" onClick={() => onBatchSell(posIds, group.sellPrice)}>
                            卖出
                          </button>
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t border-[#e0eee4] bg-[#fbfefc] px-4 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#4f5f57]">统一卖价</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editSellPrice}
                            onChange={(e) => setEditSellPrice(parseFloat(e.target.value) || 0)}
                            className="input-base w-[100px]"
                          />
                        </div>
                        <div className="rounded-[8px] border border-[#e6f1ea]">
                          {stock.positions.map((position) => (
                            <label
                              key={position.id}
                              className={`flex cursor-pointer items-center gap-2 border-b border-[#eef5f0] px-3 py-2 text-[12px] last:border-b-0 ${
                                selectedIds.includes(position.id) ? 'bg-[#eef9f1]' : 'bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(position.id)}
                                onChange={() => toggleId(position.id)}
                              />
                              <span className="flex-1">
                                #{position.id} · 买 {position.buyPrice.toFixed(2)} · {position.lots}手
                              </span>
                              <span className="text-[#7f8c8d]">当前卖价 {position.targetSellPrice.toFixed(2)}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className="btn btn-save btn-sm" onClick={saveEdit}>
                            保存关联
                          </button>
                          <button className="btn btn-cancel-edit btn-sm" onClick={cancelEdit}>
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
