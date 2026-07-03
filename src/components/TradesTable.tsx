import { useState } from 'react';
import type { StockData, CompletedTrade } from '../types';
import { fmt, fmtMoney } from '../utils/format';

interface TradesTableProps {
  stock: StockData;
  onStartEdit: (id: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (
    id: number,
    data: {
      buyPrice: number;
      buyDate: string;
      lots: number;
      buyCost: number;
      sellPrice: number;
      sellDate: string;
      netProceeds: number;
    },
  ) => void;
  onDelete: (id: number) => void;
}

/** 已完成交易明细表(可编辑) */
export function TradesTable({
  stock,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: TradesTableProps) {
  return (
    <div className="card">
      <div className="card-title">
        已完成交易明细{' '}
        <span className="badge" id="trades-count-badge">
          {stock.completedTrades.length}笔
        </span>
      </div>
      <div className="note tip">点击编辑可修改交易数据</div>
      <div className="table-wrap" id="trades-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>网格层</th>
              <th>买入价</th>
              <th>买入日</th>
              <th>手数</th>
              <th>买入成本</th>
              <th>卖出价</th>
              <th>卖出日</th>
              <th>卖收入</th>
              <th>佣金</th>
              <th>印花税</th>
              <th>盈利</th>
              <th>持仓天数</th>
              <th>累计盈利</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="trades-tbody">
            {stock.completedTrades.length === 0 ? (
              <tr>
                <td colSpan={15} className="empty-row p-[30px] text-center text-[#ccc]">
                  暂无已完成交易
                </td>
              </tr>
            ) : (
              stock.completedTrades.map((t) => {
                const editing = stock._editingTradeId === t.tradeId;
                if (editing) {
                  return (
                    <EditableTradeRow
                      key={t.tradeId}
                      trade={t}
                      onCancelEdit={onCancelEdit}
                      onSaveEdit={onSaveEdit}
                    />
                  );
                }
                return (
                  <tr key={t.tradeId}>
                    <td>{t.tradeId}</td>
                    <td className="td-level">#{t.gridLevel}</td>
                    <td className="td-buy">{fmt(t.buyPrice)}</td>
                    <td>{t.buyDate}</td>
                    <td>{t.buyLots}</td>
                    <td>{fmtMoney(t.buyCost)}</td>
                    <td className="td-sell">{fmt(t.sellPrice)}</td>
                    <td>{t.sellDate}</td>
                    <td>{fmtMoney(t.netProceeds)}</td>
                    <td>{fmt(t.sellCommission)}</td>
                    <td>{fmt(t.stampDuty)}</td>
                    <td className={t.profit >= 0 ? 'td-profit-pos' : 'td-profit-neg'}>
                      {t.profit >= 0 ? '+' : ''}
                      {fmtMoney(t.profit)}
                    </td>
                    <td>{t.holdDays}天</td>
                    <td>{fmtMoney(t.accumulatedProfit)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-edit btn-sm"
                        onClick={() => onStartEdit(t.tradeId)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-delete btn-sm ml-1"
                        onClick={() => onDelete(t.tradeId)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EditableTradeRowProps {
  trade: CompletedTrade;
  onCancelEdit: () => void;
  onSaveEdit: (
    id: number,
    data: {
      buyPrice: number;
      buyDate: string;
      lots: number;
      buyCost: number;
      sellPrice: number;
      sellDate: string;
      netProceeds: number;
    },
  ) => void;
}

function EditableTradeRow({ trade: t, onCancelEdit, onSaveEdit }: EditableTradeRowProps) {
  const [buyPrice, setBuyPrice] = useState(t.buyPrice);
  const [buyDate, setBuyDate] = useState(t.buyDate);
  const [lots, setLots] = useState(t.buyLots);
  const [buyCost, setBuyCost] = useState(t.buyCost);
  const [sellPrice, setSellPrice] = useState(t.sellPrice);
  const [sellDate, setSellDate] = useState(t.sellDate);
  const [netProceeds, setNetProceeds] = useState(t.netProceeds);

  return (
    <tr className="row-editing bg-[#fffde6]">
      <td>{t.tradeId}</td>
      <td className="td-level">#{t.gridLevel}</td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-trade-buyPrice-${t.tradeId}`}
          value={buyPrice}
          onChange={(e) => setBuyPrice(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="date"
          id={`edit-trade-buyDate-${t.tradeId}`}
          value={buyDate}
          onChange={(e) => setBuyDate(e.target.value)}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="number"
          step="1"
          id={`edit-trade-lots-${t.tradeId}`}
          value={lots}
          onChange={(e) => setLots(parseInt(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-trade-buyCost-${t.tradeId}`}
          value={buyCost.toFixed(2)}
          onChange={(e) => setBuyCost(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-trade-sellPrice-${t.tradeId}`}
          value={sellPrice}
          onChange={(e) => setSellPrice(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="date"
          id={`edit-trade-sellDate-${t.tradeId}`}
          value={sellDate}
          onChange={(e) => setSellDate(e.target.value)}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-trade-netProceeds-${t.tradeId}`}
          value={netProceeds.toFixed(2)}
          onChange={(e) => setNetProceeds(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>{fmt(t.sellCommission)}</td>
      <td>{fmt(t.stampDuty)}</td>
      <td className={t.profit >= 0 ? 'td-profit-pos' : 'td-profit-neg'}>
        {t.profit >= 0 ? '+' : ''}
        {fmtMoney(t.profit)}
      </td>
      <td>{t.holdDays}天</td>
      <td>{fmtMoney(t.accumulatedProfit)}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button
          className="btn btn-save btn-sm"
          onClick={() =>
            onSaveEdit(t.tradeId, {
              buyPrice,
              buyDate,
              lots,
              buyCost,
              sellPrice,
              sellDate,
              netProceeds,
            })
          }
        >
          保存
        </button>
        <button
          className="btn btn-cancel-edit btn-sm ml-1"
          onClick={onCancelEdit}
        >
          取消
        </button>
      </td>
    </tr>
  );
}
