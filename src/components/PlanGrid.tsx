import { useState } from 'react';
import type { StockData } from '../types';
import { fmt, fmtMoney } from '../utils/format';
import { buildBuyPlan, buildSellPlan } from '../services/trading';

interface PlanGridProps {
  stock: StockData;
  onQuickBuy: (price: number, lots: number) => void;
  onHoverSell: (posIds: number[]) => void;
  onHoverSellEnd: () => void;
  onLinkSell: (sellPrice: number, positionIds: number[]) => void;
  onBatchSell: (posIds: number[], sellPrice: number) => void;
}

/** 自动规划: 买单 & 卖单 (各前5笔) - 卖单可关联多个买单 */
export function PlanGrid({
  stock,
  onQuickBuy,
  onHoverSell,
  onHoverSellEnd,
  onLinkSell,
  onBatchSell,
}: PlanGridProps) {
  const cfg = stock.config;
  const buyPlans = buildBuyPlan(stock);
  const sellPlans = buildSellPlan(stock);

  // 关联编辑状态: 正在编辑的卖价 + 当前选中的持仓ID集合 + 可编辑的卖价输入
  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editSellPrice, setEditSellPrice] = useState<number>(0);

  const startEdit = (sellPrice: number, posIds: number[]) => {
    setEditingKey(sellPrice);
    setSelectedIds(posIds);
    setEditSellPrice(sellPrice);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setSelectedIds([]);
  };

  const saveEdit = () => {
    onLinkSell(editSellPrice, selectedIds);
    cancelEdit();
  };

  const toggleId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="card" id="plan-grid-card">
      <div className="card-title">
        自动规划: 买单 &amp; 卖单 (各前5笔){' '}
        <span className="badge" id="plan-grid-badge">
          hover 卖单高亮关联买单
        </span>
      </div>
      <div className="note" id="plan-note">
        买单: 从当前最深网格层向下每{cfg.gridDrop}元规划; 卖单:
        按目标卖价分组, 可关联多个买单 (数量/盈利合并计算)。鼠标悬停卖单可在下方持仓明细高亮关联买单。
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
                      <span className="text-[#c97168] font-bold text-[11px]">
                        {fmtMoney(p.cost)}
                      </span>
                    </div>
                  </div>
                  <div className="plan-right flex items-center gap-2">
                    <span className="plan-lots text-[16px] font-bold text-[#c97168] tabular px-[6px] py-[2px] rounded-[4px] bg-[#fbeae7]">
                      {p.suggest.total}
                      <span className="text-[10px] font-normal ml-[2px]">手</span>
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

        {/* 建议卖单 (分组) */}
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
              sellPlans.map((g, i) => {
                const priceKey = Number(g.sellPrice.toFixed(2));
                const isEditing = editingKey === priceKey;
                const posIds = g.positions.map((p) => p.id);
                return (
                  <div key={priceKey} id={`sell-plan-group-${g.sellPrice.toFixed(2)}`}>
                    <div
                      className={`plan-item flex justify-between items-center px-[14px] py-[10px] border-b border-[#f5f5f5] text-xs cursor-pointer hover:bg-[#f0f7ff] ${
                        i === 0 ? 'bg-[#fffde6]' : ''
                      }`}
                      onMouseEnter={() => onHoverSell(posIds)}
                      onMouseLeave={onHoverSellEnd}
                    >
                      <div className="plan-left flex flex-col gap-[2px] flex-1">
                        <div className="plan-price text-[15px] font-bold text-[#5fb374] tabular">
                          {fmt(g.sellPrice)} <span className="text-[11px] text-[#999]">卖</span>
                          <span className="ml-2 text-[10px] text-[#888] font-normal">
                            关联 {g.positions.length}笔 ·{' '}
                            <span className="text-[16px] font-bold text-[#5fb374] px-[4px] py-[1px] rounded-[4px] bg-[#e3f1e7] align-middle">
                              {g.totalShares}
                              <span className="text-[10px] font-normal ml-[2px]">股</span>
                            </span>
                          </span>
                        </div>
                        <div className="plan-meta text-[10px] text-[#999]">
                          买单{' '}
                          {g.positions
                            .map((p) => `#${p.id}@${fmt(p.buyPrice)}`)
                            .join(' / ')}{' '}
                          | 预期盈利
                          {g.totalProfit >= 0 ? '+' : ''}
                          {fmtMoney(g.totalProfit)}
                        </div>
                      </div>
                      <div className="plan-right flex items-center gap-2">
                        <button
                          className="btn btn-edit btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isEditing) cancelEdit();
                            else startEdit(priceKey, posIds);
                          }}
                        >
                          {isEditing ? '收起' : '关联'}
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBatchSell(posIds, g.sellPrice);
                          }}
                        >
                          卖出
                        </button>
                      </div>
                    </div>

                    {/* 关联编辑面板 */}
                    {isEditing && (
                      <div
                        className="sell-link-editor bg-[#fafcff] border-b border-[#e0e8f5] px-[14px] py-[10px] text-xs"
                        id={`sell-link-editor-${g.sellPrice.toFixed(2)}`}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <label className="text-[11px] text-[#555] font-semibold">
                            卖价:
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            id={`edit-sell-price-${g.sellPrice.toFixed(2)}`}
                            value={editSellPrice}
                            onChange={(e) =>
                              setEditSellPrice(parseFloat(e.target.value) || 0)
                            }
                            className="editing border border-[#f39c12] bg-white w-[90px] px-1 py-[2px]"
                          />
                          <span className="text-[10px] text-[#999]">
                            勾选要关联到此卖价的买单 (未勾选且原属此卖价的买单回归默认卖价)
                          </span>
                        </div>
                        <div className="max-h-[180px] overflow-y-auto border border-[#eee] rounded">
                          {stock.positions.length === 0 ? (
                            <div className="p-2 text-center text-[#bbb]">无持仓</div>
                          ) : (
                            stock.positions.map((p) => {
                              const checked = selectedIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center gap-2 px-2 py-1 border-b border-[#f5f5f5] cursor-pointer hover:bg-[#f0f7ff] ${
                                    checked ? 'bg-[#fffde6]' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleId(p.id)}
                                  />
                                  <span className="tabular">
                                    #{p.id} 买{fmt(p.buyPrice)}元 · {p.lots}手
                                  </span>
                                  <span className="text-[10px] text-[#999]">
                                    当前卖价 {fmt(p.targetSellPrice)}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="btn btn-save btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit();
                            }}
                          >
                            保存关联
                          </button>
                          <button
                            className="btn btn-cancel-edit btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEdit();
                            }}
                          >
                            取消
                          </button>
                          <span className="text-[10px] text-[#999] self-center ml-1">
                            已选 {selectedIds.length} 笔
                          </span>
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
