import { useState, useEffect } from 'react';
import type { StockData } from '../types';
import { fmt, fmtMoney, todayStr } from '../utils/format';
import { calcSuggestLots, calcSellPrice, gridPriceOf } from '../utils/grid';

interface OperationPanelProps {
  stock: StockData;
  onExecuteBuy: (price: number, lots: number, date: string) => void;
  onExecuteSell: (posId: number, price: number, lots: number, date: string) => void;
  /** 批量卖出: 一次性卖出多笔持仓 (统一卖价) */
  onExecuteBatchSell: (posIds: number[], sellPrice: number, date: string) => void;
}

/** 买入/卖出操作输入面板 */
export function OperationPanel({
  stock,
  onExecuteBuy,
  onExecuteSell,
  onExecuteBatchSell,
}: OperationPanelProps) {
  const cfg = stock.config;
  const [buyPrice, setBuyPrice] = useState('');
  const [buyLots, setBuyLots] = useState('');
  const [buyDate, setBuyDate] = useState(todayStr());
  // 卖出: 多选持仓 + 统一卖价 + 日期
  const [selectedPosIds, setSelectedPosIds] = useState<number[]>([]);
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(todayStr());

  // 切换股票时重置输入
  useEffect(() => {
    setBuyPrice('');
    setBuyLots('');
    setSelectedPosIds([]);
    setSellPrice('');
  }, [cfg.stockCode]);

  const handleBuy = () => {
    const p = parseFloat(buyPrice);
    const l = parseInt(buyLots);
    onExecuteBuy(p, l, buyDate);
    setBuyPrice('');
    setBuyLots('');
  };

  /** 切换单个持仓的选中状态 */
  const togglePos = (posId: number) => {
    setSelectedPosIds((prev) =>
      prev.includes(posId) ? prev.filter((id) => id !== posId) : [...prev, posId],
    );
  };

  /** 全选/全不选 */
  const toggleAll = () => {
    if (selectedPosIds.length === sortedPositions.length) {
      setSelectedPosIds([]);
    } else {
      setSelectedPosIds(sortedPositions.map((p) => p.id));
    }
  };

  /** 单笔卖出 (兼容旧的单选逻辑: 仅选 1 笔时走 onExecuteSell 走部分卖出)
   * 多选时走批量卖出, 每笔持仓全部股数一起卖出 */
  const handleSell = () => {
    if (selectedPosIds.length === 0) return;
    const p = parseFloat(sellPrice);
    if (!p || p <= 0) return;

    if (selectedPosIds.length === 1) {
      // 单选: 仍然按完整 lots 卖出 (用户已选了哪笔就全卖)
      const pos = stock.positions.find((x) => x.id === selectedPosIds[0]);
      if (pos) {
        onExecuteSell(pos.id, p, pos.lots, sellDate);
      }
    } else {
      // 多选: 批量卖出, 每笔全部 lots
      onExecuteBatchSell(selectedPosIds, p, sellDate);
    }
    setSelectedPosIds([]);
    setSellPrice('');
  };

  /** 选中首笔时自动填充其目标卖价 (便于参考) */
  useEffect(() => {
    if (selectedPosIds.length === 1) {
      const pos = stock.positions.find((p) => p.id === selectedPosIds[0]);
      if (pos && !sellPrice) {
        setSellPrice(String(pos.targetSellPrice));
      }
    } else if (selectedPosIds.length === 0 && sellPrice) {
      // 清空选择时也清空卖价
      setSellPrice('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPosIds]);

  // 提示信息
  const nextLevel =
    stock.positions.length > 0
      ? Math.max(...stock.positions.map((p) => p.gridLevel)) + 1
      : 1;
  const nextPrice = gridPriceOf(nextLevel, cfg);
  const su = calcSuggestLots(nextPrice, stock);
  // 按新算法计算下一买点的目标卖价 (基于建议手数对应的股数)
  const nextSellPrice = calcSellPrice(nextPrice, su.total * 100);

  const sortedPositions = [...stock.positions].sort(
    (a, b) => a.targetSellPrice - b.targetSellPrice,
  );

  // 选中持仓合并统计
  const selectedPositions = sortedPositions.filter((p) =>
    selectedPosIds.includes(p.id),
  );
  const selectedTotalShares = selectedPositions.reduce((s, p) => s + p.shares, 0);
  const selectedTotalCost = selectedPositions.reduce((s, p) => s + p.buyCost, 0);
  const feeRate = cfg.commissionRate + cfg.stampDutyRate;
  const sellPriceNum = parseFloat(sellPrice) || 0;
  const estimatedSellValue = selectedTotalShares * sellPriceNum;
  const estimatedFees = estimatedSellValue * feeRate;
  const estimatedProfit = estimatedSellValue - estimatedFees - selectedTotalCost;

  return (
    <div className="card" id="op-card">
      <div className="card-title">
        交易操作 <span className="badge">输入价格和手数即可记账</span>
      </div>
      <div className="op-panel grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 买入 */}
        <div
          id="buy-box"
          className="op-box buy-box border border-[#fbeae7] rounded-[8px] p-[14px] bg-[#fef7f6]"
        >
          <h3 className="text-sm mb-[10px] flex items-center gap-1.5 text-[#c97168] font-semibold">
            买入记录
          </h3>
          <div className="op-row flex gap-2 items-end mb-2 flex-wrap">
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">买入价</label>
              <input
                id="buy-price"
                type="number"
                step="0.01"
                placeholder="如 9.91"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[110px] tabular focus:outline-none focus:border-[#3498db]"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
              />
            </div>
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">手数</label>
              <input
                id="buy-lots"
                type="number"
                step="1"
                placeholder="如 5"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[110px] tabular focus:outline-none focus:border-[#3498db]"
                value={buyLots}
                onChange={(e) => setBuyLots(e.target.value)}
              />
            </div>
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">日期</label>
              <input
                id="buy-date"
                type="date"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[110px] tabular focus:outline-none focus:border-[#3498db]"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
              />
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleBuy}>
              买入
            </button>
          </div>
          <div className="op-hint text-[11px] text-[#999] mt-1.5" id="buy-hint">
            建议手数 = floor({cfg.baseBuyAmount}/价格/100) + floor(累计盈利
            {fmt(stock.accumulatedProfit)}/价格/100)
          </div>
        </div>

        {/* 卖出 - 多选批量 */}
        <div
          id="sell-box"
          className="op-box sell-box border border-[#e3f1e7] rounded-[8px] p-[14px] bg-[#f4faf6]"
        >
          <h3 className="text-sm mb-[10px] flex items-center justify-between text-[#5fb374] font-semibold">
            <span>卖出记录 (可多选)</span>
            {sortedPositions.length > 0 && (
              <button
                id="sell-toggle-all"
                type="button"
                onClick={toggleAll}
                className="text-[10px] text-[#5fb374] hover:underline"
              >
                {selectedPosIds.length === sortedPositions.length
                  ? '取消全选'
                  : '全选'}
              </button>
            )}
          </h3>

          {/* 持仓多选列表 */}
          <div
            id="sell-pos-list"
            className="max-h-[120px] overflow-y-auto border border-[#e0e0e0] rounded-[6px] bg-white mb-2"
          >
            {sortedPositions.length === 0 ? (
              <div className="p-2 text-center text-[11px] text-[#ccc]">暂无可卖出持仓</div>
            ) : (
              sortedPositions.map((p) => {
                const checked = selectedPosIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    id={`sell-pos-label-${p.id}`}
                    className={`flex items-center gap-2 px-[8px] py-[5px] cursor-pointer hover:bg-[#f0f7ff] border-b border-[#f0f0f0] last:border-b-0 ${
                      checked ? 'bg-[#e3f1e7]' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`sell-pos-check-${p.id}`}
                      checked={checked}
                      onChange={() => togglePos(p.id)}
                      className="cursor-pointer"
                    />
                    <span className="text-[11px] tabular flex-1">
                      #{p.id} 买{p.buyPrice} → 卖{p.targetSellPrice} ({p.lots}手)
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="op-row flex gap-2 items-end mb-2 flex-wrap">
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">卖出价 (统一)</label>
              <input
                id="sell-price"
                type="number"
                step="0.01"
                placeholder="选持仓后自动填充"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[140px] tabular focus:outline-none focus:border-[#3498db]"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">日期</label>
              <input
                id="sell-date"
                type="date"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[110px] tabular focus:outline-none focus:border-[#3498db]"
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
              />
            </div>
            <button
              id="btn-sell"
              className="btn btn-success btn-sm"
              onClick={handleSell}
              disabled={selectedPosIds.length === 0 || !sellPrice}
            >
              {selectedPosIds.length > 1
                ? `批量卖出 ${selectedPosIds.length}笔`
                : '卖出'}
            </button>
          </div>

          {/* 选中合并预览 */}
          {selectedPosIds.length > 0 && (
            <div
              id="sell-summary"
              className="text-[11px] text-[#5fb374] bg-white/60 rounded px-2 py-1 mt-1 tabular"
            >
              已选 {selectedPosIds.length}笔 · 合并 {selectedTotalShares}股 ·
              预估卖收入 {fmtMoney(estimatedSellValue)} · 预估盈利{' '}
              <span className={estimatedProfit >= 0 ? 'text-[#5fb374]' : 'text-[#c97168]'}>
                {estimatedProfit >= 0 ? '+' : ''}
                {fmtMoney(estimatedProfit)}
              </span>
            </div>
          )}

          <div className="op-hint text-[11px] text-[#999] mt-1.5" id="sell-hint">
            下一个买点: {fmt(nextPrice)}元(层#{nextLevel}) 建议{su.total}手 | 对应卖出:{' '}
            {fmt(nextSellPrice)}元(强迫症: 买.x1/卖.x8)
          </div>
        </div>
      </div>
    </div>
  );
}
