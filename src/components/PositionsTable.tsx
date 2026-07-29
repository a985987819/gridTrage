import { useState } from 'react';
import type { StockData, Position } from '../types';
import { fmt, fmtMoney } from '../utils/format';

interface PositionsTableProps {
  stock: StockData;
  onQuickSell: (posId: number) => void;
  onHighlightSellPlan: (posId: number) => void;
  highlightedPosIds: number[];
  /** hover 持仓行: 高亮同卖价的全部关联买单 */
  onHoverPosition: (posIds: number[]) => void;
  onHoverPositionEnd: () => void;
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
  onHoverPosition,
  onHoverPositionEnd,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: PositionsTableProps) {
  const cfg = stock.config;

  // 排序状态: 默认按买入日期倒序 (最新在前)
  // sortKey: 'buyDate' | 'buyPrice' | 'targetSellPrice'
  // sortDir: 'asc' | 'desc'
  const [sortKey, setSortKey] = useState<'buyDate' | 'buyPrice' | 'targetSellPrice'>('buyDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: 'buyDate' | 'buyPrice' | 'targetSellPrice') => {
    if (sortKey === key) {
      // 同列: 切换方向
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      // 新列: buyDate 默认 desc (最新在前), 价格列默认 asc (低到高)
      setSortKey(key);
      setSortDir(key === 'buyDate' ? 'desc' : 'asc');
    }
  };

  const sorted = [...stock.positions].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'buyDate') {
      cmp = a.buyDate.localeCompare(b.buyDate);
      // 日期相同则按 id 升序保持稳定
      if (cmp === 0) cmp = a.id - b.id;
    } else if (sortKey === 'buyPrice') {
      cmp = a.buyPrice - b.buyPrice;
      if (cmp === 0) cmp = a.id - b.id;
    } else {
      cmp = a.targetSellPrice - b.targetSellPrice;
      if (cmp === 0) cmp = a.id - b.id;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const highlightSet = new Set(highlightedPosIds);

  // 按目标卖价分组, 用于 hover 时查找关联买单 (基于全部持仓, 与排序无关)
  const sellPriceGroup = new Map<number, Position[]>();
  for (const p of stock.positions) {
    const key = Number(p.targetSellPrice.toFixed(2));
    if (!sellPriceGroup.has(key)) sellPriceGroup.set(key, []);
    sellPriceGroup.get(key)!.push(p);
  }

  // 排序列头样式与图标
  const renderSortHeader = (
    label: string,
    key: 'buyDate' | 'buyPrice' | 'targetSellPrice',
    id: string,
  ) => {
    const active = sortKey === key;
    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return (
      <th
        id={id}
        className={`sortable-th ${active ? 'sort-active' : ''}`}
        onClick={() => handleSort(key)}
        title={`点击按${label}排序`}
      >
        {label}
        <span className="sort-arrow">{arrow}</span>
      </th>
    );
  };

  return (
    <div className="card" id="positions-card">
      <div className="card-title">
        当前持仓明细{' '}
        <span className="badge" id="positions-count-badge">
          {stock.positions.length}笔
        </span>
      </div>
      <div className="note tip">
        默认按买入日期倒序 | 点击"买入价/买入日期/目标卖价"表头切换排序 | 悬停高亮同卖价关联买单 | 双击行进入编辑
      </div>
      <div className="table-wrap" id="positions-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>持仓ID</th>
              <th>网格层</th>
              {renderSortHeader('买入价', 'buyPrice', 'th-buyPrice')}
              {renderSortHeader('买入日期', 'buyDate', 'th-buyDate')}
              <th>手数</th>
              <th>股数</th>
              <th>买入成本</th>
              <th>买佣金</th>
              {renderSortHeader('目标卖价', 'targetSellPrice', 'th-targetSellPrice')}
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
                // 同卖价的关联买单 (用于 hover tooltip 显示)
                const sellPriceKey = Number(p.targetSellPrice.toFixed(2));
                const linkedPositions = sellPriceGroup.get(sellPriceKey) ?? [p];
                return (
                  <PositionRow
                    key={p.id}
                    pos={p}
                    net={net}
                    profit={profit}
                    editing={editing}
                    highlighted={highlighted}
                    linkedPositions={linkedPositions}
                    onQuickSell={onQuickSell}
                    onHighlightSellPlan={onHighlightSellPlan}
                    onHoverPosition={onHoverPosition}
                    onHoverPositionEnd={onHoverPositionEnd}
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
  /** 同卖价的全部关联买单 (含自己) */
  linkedPositions: Position[];
  onQuickSell: (posId: number) => void;
  onHighlightSellPlan: (posId: number) => void;
  onHoverPosition: (posIds: number[]) => void;
  onHoverPositionEnd: () => void;
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
  linkedPositions,
  onQuickSell,
  onHighlightSellPlan,
  onHoverPosition,
  onHoverPositionEnd,
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

  // 构造 hover tooltip 文本: 显示卖价 + 关联买单列表
  const isLinked = linkedPositions.length > 1;
  const tooltipLines: string[] = [];
  tooltipLines.push(`目标卖价: ${fmt(pos.targetSellPrice)} 元`);
  if (isLinked) {
    tooltipLines.push(`关联 ${linkedPositions.length} 笔买单:`);
    linkedPositions.forEach((lp) => {
      tooltipLines.push(
        `  #${lp.id} 买${fmt(lp.buyPrice)} · ${lp.lots}手 · ${lp.shares}股`,
      );
    });
    const totalShares = linkedPositions.reduce((s, p) => s + p.shares, 0);
    tooltipLines.push(`合并总股数: ${totalShares}`);
  } else {
    tooltipLines.push(`(独立卖单, 未与其他买单关联)`);
  }
  const tooltipText = tooltipLines.join('\n');

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
      onMouseEnter={() => onHoverPosition(linkedPositions.map((p) => p.id))}
      onMouseLeave={onHoverPositionEnd}
      title={tooltipText}
    >
      <td>#{pos.id}</td>
      <td className="td-level">#{pos.gridLevel}</td>
      <td className="td-buy">{fmt(pos.buyPrice)}</td>
      <td>{pos.buyDate}</td>
      <td>{pos.lots}</td>
      <td>{pos.shares}</td>
      <td>{fmtMoney(pos.buyCost)}</td>
      <td>{fmt(pos.buyCommission)}</td>
      <td className="td-sell">
        {fmt(pos.targetSellPrice)}
        {isLinked && (
          <span
            className="ml-1 inline-block px-[4px] py-[1px] rounded-[3px] text-[9px] bg-[#f39c12] text-white align-middle"
            title={`关联${linkedPositions.length}笔`}
          >
            关{linkedPositions.length}
          </span>
        )}
      </td>
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
          onChange={(e) => setLots(parseInt(e.target.value, 10))}
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
