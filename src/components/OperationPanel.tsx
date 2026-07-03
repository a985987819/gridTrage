import { useState, useEffect } from 'react';
import type { StockData } from '../types';
import { fmt, fmtMoney, todayStr } from '../utils/format';
import { calcSuggestLots, calcSellPrice, gridPriceOf } from '../utils/grid';

interface OperationPanelProps {
  stock: StockData;
  onExecuteBuy: (price: number, lots: number, date: string) => void;
  onExecuteSell: (posId: number, price: number, lots: number, date: string) => void;
}

/** 买入/卖出操作输入面板 */
export function OperationPanel({ stock, onExecuteBuy, onExecuteSell }: OperationPanelProps) {
  const cfg = stock.config;
  const [buyPrice, setBuyPrice] = useState('');
  const [buyLots, setBuyLots] = useState('');
  const [buyDate, setBuyDate] = useState(todayStr());
  const [sellPosId, setSellPosId] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellLots, setSellLots] = useState('');
  const [sellDate, setSellDate] = useState(todayStr());

  // 选择持仓时自动填充卖出价和手数
  useEffect(() => {
    if (!sellPosId) return;
    const pos = stock.positions.find((p) => p.id === sellPosId);
    if (pos) {
      setSellPrice(String(pos.targetSellPrice));
      setSellLots(String(pos.lots));
    }
  }, [sellPosId, stock.positions]);

  // 当切换股票时重置输入
  useEffect(() => {
    setBuyPrice('');
    setBuyLots('');
    setSellPosId('');
    setSellPrice('');
    setSellLots('');
  }, [cfg.stockCode]);

  const handleBuy = () => {
    const p = parseFloat(buyPrice);
    const l = parseInt(buyLots);
    onExecuteBuy(p, l, buyDate);
    setBuyPrice('');
    setBuyLots('');
  };

  const handleSell = () => {
    if (!sellPosId) return;
    const p = parseFloat(sellPrice);
    const l = parseInt(sellLots);
    onExecuteSell(sellPosId as number, p, l, sellDate);
    setSellPrice('');
    setSellLots('');
    setSellPosId('');
  };

  // 提示信息
  const nextLevel =
    stock.positions.length > 0
      ? Math.max(...stock.positions.map((p) => p.gridLevel)) + 1
      : 1;
  const nextPrice = gridPriceOf(nextLevel, cfg);
  const su = calcSuggestLots(nextPrice, stock);
  const nextSellPrice = calcSellPrice(nextPrice, cfg);

  const sortedPositions = [...stock.positions].sort(
    (a, b) => a.targetSellPrice - b.targetSellPrice,
  );

  return (
    <div className="card">
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

        {/* 卖出 */}
        <div
          id="sell-box"
          className="op-box sell-box border border-[#e3f1e7] rounded-[8px] p-[14px] bg-[#f4faf6]"
        >
          <h3 className="text-sm mb-[10px] flex items-center gap-1.5 text-[#5fb374] font-semibold">
            卖出记录
          </h3>
          <div className="op-row flex gap-2 items-end mb-2 flex-wrap">
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">选择持仓</label>
              <select
                id="sell-position-select"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[200px] tabular focus:outline-none focus:border-[#3498db]"
                value={sellPosId}
                onChange={(e) =>
                  setSellPosId(e.target.value ? parseInt(e.target.value) : '')
                }
              >
                <option value="">--选择持仓--</option>
                {sortedPositions.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} 买{p.buyPrice} → 卖{p.targetSellPrice} ({p.lots}手)
                  </option>
                ))}
              </select>
            </div>
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">卖出价</label>
              <input
                id="sell-price"
                type="number"
                step="0.01"
                placeholder="自动填充"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[110px] tabular focus:outline-none focus:border-[#3498db]"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
            <div className="field flex flex-col gap-[3px]">
              <label className="text-[10px] text-[#999]">手数</label>
              <input
                id="sell-lots"
                type="number"
                step="1"
                placeholder="自动填充"
                className="px-[10px] py-[7px] border border-[#ddd] rounded-[6px] text-[13px] w-[110px] tabular focus:outline-none focus:border-[#3498db]"
                value={sellLots}
                onChange={(e) => setSellLots(e.target.value)}
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
            <button className="btn btn-success btn-sm" onClick={handleSell}>
              卖出
            </button>
          </div>
          <div className="op-hint text-[11px] text-[#999] mt-1.5" id="sell-hint">
            下一个买点: {fmt(nextPrice)}元(层#{nextLevel}) 建议{su.total}手 | 对应卖出:{' '}
            {fmt(nextSellPrice)}元(强迫症: 买.x1/卖.x8)
          </div>
        </div>
      </div>
    </div>
  );
}
