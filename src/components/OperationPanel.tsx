import { useEffect, useState } from 'react';
import type { StockData } from '../types';
import { fmtMoney, todayStr } from '../utils/format';
import { calcSellPrice, calcSuggestLots, gridPriceOf } from '../utils/grid';

interface OperationPanelProps {
  stock: StockData;
  onExecuteBuy: (price: number, lots: number, date: string) => void;
  onExecuteSell: (posId: number, price: number, lots: number, date: string) => void;
  onExecuteBatchSell: (posIds: number[], sellPrice: number, date: string) => void;
}

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
  const [selectedPosIds, setSelectedPosIds] = useState<number[]>([]);
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(todayStr());

  useEffect(() => {
    setBuyPrice('');
    setBuyLots('');
    setSelectedPosIds([]);
    setSellPrice('');
  }, [cfg.stockCode]);

  const handleBuy = () => {
    onExecuteBuy(parseFloat(buyPrice), parseInt(buyLots, 10), buyDate);
    setBuyPrice('');
    setBuyLots('');
  };

  const togglePos = (posId: number) => {
    setSelectedPosIds((prev) => (prev.includes(posId) ? prev.filter((id) => id !== posId) : [...prev, posId]));
  };

  const toggleAll = () => {
    if (selectedPosIds.length === sortedPositions.length) setSelectedPosIds([]);
    else setSelectedPosIds(sortedPositions.map((position) => position.id));
  };

  const handleSell = () => {
    const price = parseFloat(sellPrice);
    if (!price || selectedPosIds.length === 0) return;
    if (selectedPosIds.length === 1) {
      const position = stock.positions.find((item) => item.id === selectedPosIds[0]);
      if (position) onExecuteSell(position.id, price, position.lots, sellDate);
    } else {
      onExecuteBatchSell(selectedPosIds, price, sellDate);
    }
    setSelectedPosIds([]);
    setSellPrice('');
  };

  useEffect(() => {
    if (selectedPosIds.length === 1) {
      const position = stock.positions.find((item) => item.id === selectedPosIds[0]);
      if (position && !sellPrice) setSellPrice(String(position.targetSellPrice));
    } else if (selectedPosIds.length === 0) {
      setSellPrice('');
    }
  }, [selectedPosIds, sellPrice, stock.positions]);

  const nextLevel = stock.positions.length > 0 ? Math.max(...stock.positions.map((p) => p.gridLevel)) + 1 : 1;
  const nextPrice = gridPriceOf(nextLevel, cfg);
  const suggestedLots = calcSuggestLots(nextPrice, stock);
  const nextSellPrice = calcSellPrice(nextPrice, suggestedLots.total * 100);
  const sortedPositions = [...stock.positions].sort((a, b) => a.targetSellPrice - b.targetSellPrice);
  const selectedPositions = sortedPositions.filter((position) => selectedPosIds.includes(position.id));
  const selectedTotalShares = selectedPositions.reduce((sum, position) => sum + position.shares, 0);
  const selectedTotalCost = selectedPositions.reduce((sum, position) => sum + position.buyCost, 0);
  const sellPriceNum = parseFloat(sellPrice) || 0;
  const estimatedSellValue = selectedTotalShares * sellPriceNum;
  const estimatedFees = estimatedSellValue * (cfg.commissionRate + cfg.stampDutyRate);
  const estimatedProfit = estimatedSellValue - estimatedFees - selectedTotalCost;
  const buyPriceNum = parseFloat(buyPrice) || 0;
  const buyLotsNum = parseInt(buyLots, 10) || 0;
  const buyShares = buyLotsNum * 100;
  const buyTargetSellPrice = buyShares > 0 && buyPriceNum > 0 ? calcSellPrice(buyPriceNum, buyShares) : 0;
  const rebuyLots = buyPriceNum > 0 && buyTargetSellPrice > 0 ? buyLotsNum + 1 : 0;

  return (
    <div className="card" id="op-card">
      <div className="card-title">
        交易操作
        <span className="badge">明确展示买入 {'->'} 卖出 {'->'} 再买回链条</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[10px] border border-[#f4d4d1] bg-[#fff8f7] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[#c97168]">买入记录</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#999]">买入价</label>
              <input type="number" step="0.01" className="input-base w-[110px]" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#999]">手数</label>
              <input type="number" step="1" className="input-base w-[110px]" value={buyLots} onChange={(e) => setBuyLots(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#999]">日期</label>
              <input type="date" className="input-base w-[130px]" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} />
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleBuy}>
              买入
            </button>
          </div>

          <div className="mt-3 rounded-[10px] bg-white px-3 py-3 text-[12px] text-[#7c5c56] shadow-[inset_0_0_0_1px_rgba(232,138,131,0.12)]">
            {buyPriceNum > 0 && buyLotsNum > 0 ? (
              <>
                <div>本次买入 {buyLotsNum} 手（{buyShares} 股），目标卖出价 {buyTargetSellPrice.toFixed(2)}。</div>
                <div className="mt-1">如果该笔顺利卖出，下一轮按同档位回补时可朝 {rebuyLots} 手的方向滚动。</div>
              </>
            ) : (
              <div>输入买入价和手数后，这里会直接展示“份数+1”对应的目标卖价链条。</div>
            )}
          </div>

          <div className="mt-3 text-[11px] text-[#9a6a63]">
            下一候选档位 #{nextLevel} @ {nextPrice.toFixed(2)}，建议 {suggestedLots.total} 手，自动卖价 {nextSellPrice.toFixed(2)}。
          </div>
        </div>

        <div className="rounded-[10px] border border-[#d6eadc] bg-[#f8fdf9] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#5fb374]">卖出记录</h3>
            {sortedPositions.length > 0 && (
              <button className="text-[11px] text-[#5fb374] hover:underline" onClick={toggleAll}>
                {selectedPosIds.length === sortedPositions.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>

          <div className="mb-3 max-h-[140px] overflow-y-auto rounded-[8px] border border-[#e4efe7] bg-white">
            {sortedPositions.length === 0 ? (
              <div className="p-3 text-center text-[12px] text-[#bcc6bf]">暂无可卖持仓</div>
            ) : (
              sortedPositions.map((position) => (
                <label
                  key={position.id}
                  className={`flex cursor-pointer items-center gap-2 border-b border-[#edf4ef] px-3 py-2 text-[12px] last:border-b-0 ${
                    selectedPosIds.includes(position.id) ? 'bg-[#eef9f1]' : 'bg-white'
                  }`}
                >
                  <input type="checkbox" checked={selectedPosIds.includes(position.id)} onChange={() => togglePos(position.id)} />
                  <span className="flex-1">
                    #{position.id} 买 {position.buyPrice.toFixed(2)} {'->'} 卖 {position.targetSellPrice.toFixed(2)} ({position.lots}手)
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#999]">统一卖价</label>
              <input type="number" step="0.01" className="input-base w-[130px]" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#999]">日期</label>
              <input type="date" className="input-base w-[130px]" value={sellDate} onChange={(e) => setSellDate(e.target.value)} />
            </div>
            <button className="btn btn-success btn-sm" onClick={handleSell} disabled={selectedPosIds.length === 0 || !sellPrice}>
              {selectedPosIds.length > 1 ? `批量卖出 ${selectedPosIds.length} 笔` : '卖出'}
            </button>
          </div>

          <div className="mt-3 rounded-[10px] bg-white px-3 py-3 text-[12px] text-[#4d6e59] shadow-[inset_0_0_0_1px_rgba(95,179,116,0.14)]">
            {selectedPosIds.length > 0 ? (
              <>
                <div>已选 {selectedPosIds.length} 笔，合计 {selectedTotalShares} 股，预计卖出 {fmtMoney(estimatedSellValue)}。</div>
                <div className="mt-1">
                  预计盈利
                  <span className={estimatedProfit >= 0 ? ' td-profit-pos' : ' td-profit-neg'}>
                    {estimatedProfit >= 0 ? '+' : ''}
                    {fmtMoney(estimatedProfit)}
                  </span>
                  ，这部分利润会继续推高下一轮可买手数。
                </div>
              </>
            ) : (
              <div>选中持仓后，这里会直接显示统一卖出后的资金回流和下一轮再买能力。</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
