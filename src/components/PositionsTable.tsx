import { useState } from 'react';
import type { StockData, Position } from '../types';
import { fmt, fmtMoney } from '../utils/format';

interface PositionsTableProps {
  stock: StockData;
  onQuickSell: (posId: number) => void;
  onHighlightSellPlan: (posId: number) => void;
  highlightedPosIds: number[];
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
    },
  ) => void;
  onDelete: (id: number) => void;
}

/** 当前持仓明细表(可编辑) */
export function PositionsTable({
  stock,
  onQuickSell,
  onHighlightSellPlan,
  highlightedPosIds,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: PositionsTableProps) {
  const cfg = stock.config;
  const sorted = [...stock.positions].sort(
    (a, b) => a.targetSellPrice - b.targetSellPrice,
  );
  const highlightSet = new Set(highlightedPosIds);

  return (
    <div className="card" id="positions-card">
      <div className="card-title">
        当前持仓明细{' '}
        <span className="badge" id="positions-count-badge">
          {stock.positions.length}笔
        </span>
      </div>
      <div className="note tip">
        悬停上方卖单可高亮关联买单 | 单击持仓行高亮对应卖单 | 双击任意行进入编辑模式
      </div>
      <div className="table-wrap" id="positions-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>持仓ID</th>
              <th>网格层</th>
              <th>买入价</th>
              <th>买入日期</th>
              <th>手数</th>
              <th>股数</th>
              <th>买入成本</th>
              <th>买佣金</th>
              <th>目标卖价</th>
              <th>预期卖收入</th>
              <th>预期盈利</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="positions-tbody">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-row p-[30px] text-center text-[#ccc]">
                  暂无持仓
                </td>
              </tr>
            ) : (
              sorted.map((p) => {
                const sellValue = p.shares * p.targetSellPrice;
                const net = sellValue - sellValue * (cfg.commissionRate + cfg.stampDutyRate);
                const profit = net - p.buyCost;
                const editing = stock._editingPosId === p.id;
                const highlighted = highlightSet.has(p.id);
                return (
                  <PositionRow
                    key={p.id}
                    pos={p}
                    net={net}
                    profit={profit}
                    editing={editing}
                    highlighted={highlighted}
                    onQuickSell={onQuickSell}
                    onHighlightSellPlan={onHighlightSellPlan}
                    onStartEdit={onStartEdit}
                    onCancelEdit={onCancelEdit}
                    onSaveEdit={onSaveEdit}
                    onDelete={onDelete}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PositionRowProps {
  pos: Position;
  net: number;
  profit: number;
  editing: boolean;
  highlighted: boolean;
  onQuickSell: (posId: number) => void;
  onHighlightSellPlan: (posId: number) => void;
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
    },
  ) => void;
  onDelete: (id: number) => void;
}

function PositionRow({
  pos,
  net,
  profit,
  editing,
  highlighted,
  onQuickSell,
  onHighlightSellPlan,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: PositionRowProps) {
  if (editing) {
    return (
      <EditablePositionRow
        pos={pos}
        net={net}
        profit={profit}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
      />
    );
  }
  return (
    <tr
      className={`pos-row hover:bg-[#f0f7ff] cursor-pointer ${
        highlighted ? 'pos-row-highlighted bg-[#fff3cd]' : ''
      }`}
      id={`pos-row-${pos.id}`}
      onClick={() => onHighlightSellPlan(pos.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit(pos.id);
      }}
      title="单击高亮对应卖单 · 双击进入编辑"
    >
      <td>#{pos.id}</td>
      <td className="td-level">#{pos.gridLevel}</td>
      <td className="td-buy">{fmt(pos.buyPrice)}</td>
      <td>{pos.buyDate}</td>
      <td>{pos.lots}</td>
      <td>{pos.shares}</td>
      <td>{fmtMoney(pos.buyCost)}</td>
      <td>{fmt(pos.buyCommission)}</td>
      <td className="td-sell">{fmt(pos.targetSellPrice)}</td>
      <td>{fmtMoney(net)}</td>
      <td className={profit >= 0 ? 'td-profit-pos' : 'td-profit-neg'}>
        {profit >= 0 ? '+' : ''}
        {fmtMoney(profit)}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button
          className="btn btn-success btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onQuickSell(pos.id);
          }}
        >
          卖出
        </button>
        <button
          className="btn btn-edit btn-sm ml-1"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(pos.id);
          }}
        >
          编辑
        </button>
        <button
          className="btn btn-delete btn-sm ml-1"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(pos.id);
          }}
        >
          删除
        </button>
      </td>
    </tr>
  );
}

interface EditablePositionRowProps {
  pos: Position;
  net: number;
  profit: number;
  onCancelEdit: () => void;
  onSaveEdit: (
    id: number,
    data: {
      buyPrice: number;
      buyDate: string;
      lots: number;
      buyCost: number;
      sellPrice: number;
    },
  ) => void;
}

function EditablePositionRow({
  pos,
  net,
  profit,
  onCancelEdit,
  onSaveEdit,
}: EditablePositionRowProps) {
  const [buyPrice, setBuyPrice] = useState(pos.buyPrice);
  const [buyDate, setBuyDate] = useState(pos.buyDate);
  const [lots, setLots] = useState(pos.lots);
  const [buyCost, setBuyCost] = useState(pos.buyCost);
  const [sellPrice, setSellPrice] = useState(pos.targetSellPrice);

  return (
    <tr className="pos-row row-editing bg-[#fffde6]" id={`pos-row-${pos.id}`}>
      <td>#{pos.id}</td>
      <td className="td-level">#{pos.gridLevel}</td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-pos-buyPrice-${pos.id}`}
          value={buyPrice}
          onChange={(e) => setBuyPrice(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="date"
          id={`edit-pos-buyDate-${pos.id}`}
          value={buyDate}
          onChange={(e) => setBuyDate(e.target.value)}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>
        <input
          type="number"
          step="1"
          id={`edit-pos-lots-${pos.id}`}
          value={lots}
          onChange={(e) => setLots(parseInt(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>{lots * 100}</td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-pos-buyCost-${pos.id}`}
          value={buyCost.toFixed(2)}
          onChange={(e) => setBuyCost(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>{fmt(pos.buyCommission)}</td>
      <td>
        <input
          type="number"
          step="0.01"
          id={`edit-pos-sellPrice-${pos.id}`}
          value={sellPrice}
          onChange={(e) => setSellPrice(parseFloat(e.target.value))}
          className="editing border border-[#f39c12] bg-white"
        />
      </td>
      <td>{fmtMoney(net)}</td>
      <td className={profit >= 0 ? 'td-profit-pos' : 'td-profit-neg'}>
        {profit >= 0 ? '+' : ''}
        {fmtMoney(profit)}
      </td>
      <td>
        <button
          className="btn btn-save btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onSaveEdit(pos.id, { buyPrice, buyDate, lots, buyCost, sellPrice });
          }}
        >
          保存
        </button>
        <button
          className="btn btn-cancel-edit btn-sm ml-1"
          onClick={(e) => {
            e.stopPropagation();
            onCancelEdit();
          }}
        >
          取消
        </button>
      </td>
    </tr>
  );
}
