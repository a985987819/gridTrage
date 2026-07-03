import type {
  StockData,
  Position,
  CompletedTrade,
  BuyPlan,
  SellPlan,
  SuggestLots,
  StockConfig,
} from '../types';
import {
  gridLevelOf,
  forceBuyPrice,
  forceSellPrice,
  gridPriceOf,
  calcSellPrice,
  calcSuggestLots,
} from '../utils/grid';

/**
 * 交易业务逻辑: 买入/卖出/规划计算/编辑/删除等
 */

/** 执行买入, 返回更新后的 stockData 以及提示信息 */
export interface BuyResult {
  stock: StockData;
  toast: { type: 'success' | 'error' | 'warn'; msg: string };
  clearInputs: boolean;
}

export function executeBuy(
  stock: StockData,
  rawPrice: number,
  lots: number,
  date: string,
): BuyResult {
  const cfg = stock.config;
  if (!rawPrice || rawPrice <= 0) {
    return { stock, toast: { type: 'error', msg: '请输入有效买入价' }, clearInputs: false };
  }
  if (!lots || lots <= 0) {
    return { stock, toast: { type: 'error', msg: '请输入有效手数' }, clearInputs: false };
  }

  // 强迫症管理: 买入价固定为 xx.x1
  const price = forceBuyPrice(rawPrice);
  let warnMsg: string | null = null;
  if (price !== rawPrice) {
    warnMsg = `买入价已自动调整: ${rawPrice} → ${price} (强迫症模式)`;
  }

  const shares = lots * 100;
  const buyValue = shares * price;
  const buyCommission = buyValue * cfg.commissionRate;
  const totalCost = buyValue + buyCommission;

  const newStock: StockData = { ...stock };
  newStock.positionIdCounter = stock.positionIdCounter + 1;
  const level = gridLevelOf(price, cfg);
  const pos: Position = {
    id: newStock.positionIdCounter,
    gridLevel: level,
    buyPrice: price,
    buyDate: date,
    lots,
    shares,
    buyCost: totalCost,
    buyCommission,
    targetSellPrice: calcSellPrice(price, cfg),
  };
  newStock.positions = [...stock.positions, pos];

  return {
    stock: newStock,
    toast: {
      type: warnMsg ? 'warn' : 'success',
      msg: warnMsg ?? `买入成功: ${price}元 ${lots}手, 成本${totalCost.toFixed(2)}`,
    },
    clearInputs: true,
  };
}

/** 执行卖出 */
export interface SellResult {
  stock: StockData;
  toast: { type: 'success' | 'error' | 'warn'; msg: string };
  clearInputs: boolean;
}

export function executeSell(
  stock: StockData,
  posId: number,
  sellPrice: number,
  sellLots: number,
  date: string,
): SellResult {
  const cfg = stock.config;
  if (!posId) {
    return { stock, toast: { type: 'error', msg: '请选择要卖出的持仓' }, clearInputs: false };
  }
  if (!sellPrice || sellPrice <= 0) {
    return { stock, toast: { type: 'error', msg: '请输入有效卖出价' }, clearInputs: false };
  }
  if (!sellLots || sellLots <= 0) {
    return { stock, toast: { type: 'error', msg: '请输入有效手数' }, clearInputs: false };
  }

  // 强迫症管理: 卖出价固定为 xx.x8
  const finalSellPrice = forceSellPrice(sellPrice);
  let warnMsg: string | null = null;
  if (finalSellPrice !== sellPrice) {
    warnMsg = `卖出价已自动调整: ${sellPrice} → ${finalSellPrice} (强迫症模式)`;
  }

  const pos = stock.positions.find((p) => p.id === posId);
  if (!pos) {
    return { stock, toast: { type: 'error', msg: '持仓不存在' }, clearInputs: false };
  }
  if (sellLots > pos.lots) {
    return {
      stock,
      toast: { type: 'error', msg: `手数超过持仓(${pos.lots}手)` },
      clearInputs: false,
    };
  }

  const sellShares = sellLots * 100;
  const sellValue = sellShares * finalSellPrice;
  const sellCommission = sellValue * cfg.commissionRate;
  const stampDuty = sellValue * cfg.stampDutyRate;
  const netProceeds = sellValue - sellCommission - stampDuty;
  const costRatio = sellLots / pos.lots;
  const allocatedBuyCost = pos.buyCost * costRatio;
  const profit = netProceeds - allocatedBuyCost;

  const newStock: StockData = {
    ...stock,
    positions: [...stock.positions],
    completedTrades: [...stock.completedTrades],
  };
  newStock.tradeCounter = stock.tradeCounter + 1;
  newStock.accumulatedProfit = Number((stock.accumulatedProfit + profit).toFixed(2));

  const trade: CompletedTrade = {
    tradeId: newStock.tradeCounter,
    gridLevel: pos.gridLevel,
    buyPrice: pos.buyPrice,
    buyDate: pos.buyDate,
    buyLots: sellLots,
    buyCost: Number(allocatedBuyCost.toFixed(2)),
    buyCommission: Number((pos.buyCommission * costRatio).toFixed(2)),
    sellPrice: finalSellPrice,
    sellDate: date,
    sellValue: Number(sellValue.toFixed(2)),
    sellCommission: Number(sellCommission.toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    netProceeds: Number(netProceeds.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    accumulatedProfit: newStock.accumulatedProfit,
    holdDays: Math.round((new Date(date).getTime() - new Date(pos.buyDate).getTime()) / 86400000),
    linkedPositionId: pos.id,
  };
  newStock.completedTrades.push(trade);

  if (sellLots === pos.lots) {
    newStock.positions = newStock.positions.filter((p) => p.id !== posId);
  } else {
    newStock.positions = newStock.positions.map((p) => {
      if (p.id !== posId) return p;
      return {
        ...p,
        lots: p.lots - sellLots,
        shares: (p.lots - sellLots) * 100,
        buyCost: p.buyCost * (1 - costRatio),
        buyCommission: p.buyCommission * (1 - costRatio),
      };
    });
  }

  return {
    stock: newStock,
    toast: {
      type: warnMsg ? 'warn' : 'success',
      msg: warnMsg ?? `卖出成功: ${sellPrice}元 ${sellLots}手, 盈利${profit.toFixed(2)}`,
    },
    clearInputs: true,
  };
}

/** 计算自动规划买入列表 */
export function buildBuyPlan(stock: StockData): BuyPlan[] {
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  let maxLevel = 0;
  stock.positions.forEach((p) => {
    if (p.gridLevel > maxLevel) maxLevel = p.gridLevel;
  });
  const plans: BuyPlan[] = [];
  for (let i = 1; i <= 30 && plans.length < 5; i++) {
    const level = maxLevel + i;
    const price = gridPriceOf(level, cfg);
    if (price <= 0) break;
    // ±10% 限制: 买入价不低于收盘价 * 0.9
    if (lastClose && price < lastClose * 0.9) break;
    const suggest: SuggestLots = calcSuggestLots(price, stock);
    const cost = suggest.total * 100 * price * (1 + cfg.commissionRate);
    plans.push({ level, price, suggest, cost });
  }
  return plans;
}

/** 计算自动规划卖出列表 */
export function buildSellPlan(stock: StockData): SellPlan[] {
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  const sorted = [...stock.positions].sort((a, b) => a.targetSellPrice - b.targetSellPrice);
  return sorted
    .filter((p) => {
      // ±10% 限制: 卖出价不高于收盘价 * 1.1
      if (lastClose && p.targetSellPrice > lastClose * 1.1) return false;
      return true;
    })
    .slice(0, 5)
    .map((p) => {
      const sellValue = p.shares * p.targetSellPrice;
      const sellComm = sellValue * cfg.commissionRate;
      const stamp = sellValue * cfg.stampDutyRate;
      const net = sellValue - sellComm - stamp;
      const profit = net - p.buyCost;
      return { pos: p, profit };
    });
}

/** 计算今日买入挂单 (基于昨日收盘价) */
export function buildTodayBuyOrders(stock: StockData): BuyPlan[] {
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  if (!lastClose) return [];

  const maxLevel =
    stock.positions.length > 0
      ? Math.max(...stock.positions.map((p) => p.gridLevel))
      : 0;
  const orders: BuyPlan[] = [];
  // 从当前价开始向下找网格层
  let level = Math.ceil((cfg.basePrice - lastClose) / cfg.gridDrop);
  if (level < 1) level = 1;

  // 避开已有持仓的层级
  const occupiedLevels = new Set(stock.positions.map((p) => p.gridLevel));

  for (let i = 0; i < 30 && orders.length < 5; i++) {
    const lv = level + i;
    const price = gridPriceOf(lv, cfg);
    if (price <= 0) break;
    if (price >= lastClose) continue; // 买点必须在当前价下方
    // ±10% 限制
    if (price < lastClose * 0.9) break;
    if (occupiedLevels.has(lv)) continue;
    const suggest = calcSuggestLots(price, stock);
    const cost = suggest.total * 100 * price * (1 + cfg.commissionRate);
    orders.push({ level: lv, price, suggest, cost });
  }
  return orders;
}

/** 计算今日卖出挂单 */
export function buildTodaySellOrders(stock: StockData): SellPlan[] {
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  if (!lastClose) return [];

  const orders: SellPlan[] = [];
  const positions = [...stock.positions].sort((a, b) => a.targetSellPrice - b.targetSellPrice);
  for (const p of positions) {
    if (p.targetSellPrice > lastClose) {
      // ±10% 限制
      if (p.targetSellPrice > lastClose * 1.1) continue;
      const sellValue = p.shares * p.targetSellPrice;
      const sellComm = sellValue * cfg.commissionRate;
      const stamp = sellValue * cfg.stampDutyRate;
      const net = sellValue - sellComm - stamp;
      const profit = net - p.buyCost;
      orders.push({ pos: p, profit });
    }
  }
  return orders.slice(0, 5);
}

/** 删除持仓 */
export function deletePosition(stock: StockData, id: number): StockData {
  return {
    ...stock,
    positions: stock.positions.filter((p) => p.id !== id),
    _editingPosId: undefined,
  };
}

/** 保存持仓编辑 */
export function savePositionEdit(
  stock: StockData,
  id: number,
  data: {
    buyPrice: number;
    buyDate: string;
    lots: number;
    buyCost: number;
    sellPrice: number;
  },
): { stock: StockData; toast: { type: 'success' | 'error'; msg: string } } {
  const cfg = stock.config;
  if (!data.buyPrice || !data.lots || data.lots <= 0) {
    return { stock, toast: { type: 'error', msg: '请输入有效数据' } };
  }
  const newPositions = stock.positions.map((p) => {
    if (p.id !== id) return p;
    return {
      ...p,
      buyPrice: forceBuyPrice(data.buyPrice),
      buyDate: data.buyDate,
      lots: data.lots,
      shares: data.lots * 100,
      buyCost: data.buyCost,
      buyCommission: (data.buyCost * cfg.commissionRate) / (1 + cfg.commissionRate),
      targetSellPrice: forceSellPrice(data.sellPrice),
      gridLevel: gridLevelOf(forceBuyPrice(data.buyPrice), cfg),
    };
  });
  return {
    stock: { ...stock, positions: newPositions, _editingPosId: undefined },
    toast: { type: 'success', msg: '持仓已更新' },
  };
}

/** 删除已完成交易 */
export function deleteTrade(stock: StockData, tradeId: number): StockData {
  const newStock: StockData = {
    ...stock,
    completedTrades: stock.completedTrades.filter((t) => t.tradeId !== tradeId),
    _editingTradeId: undefined,
  };
  recalcAccumulatedProfit(newStock);
  return newStock;
}

/** 保存交易编辑 */
export function saveTradeEdit(
  stock: StockData,
  tradeId: number,
  data: {
    buyPrice: number;
    buyDate: string;
    lots: number;
    buyCost: number;
    sellPrice: number;
    sellDate: string;
    netProceeds: number;
  },
): { stock: StockData; toast: { type: 'success' | 'error'; msg: string } } {
  const cfg = stock.config;
  const newTrades = stock.completedTrades.map((t) => {
    if (t.tradeId !== tradeId) return t;
    const newBuyPrice = forceBuyPrice(data.buyPrice);
    const newSellPrice = forceSellPrice(data.sellPrice);
    return {
      ...t,
      buyPrice: newBuyPrice,
      buyDate: data.buyDate,
      buyLots: data.lots,
      buyCost: data.buyCost,
      sellPrice: newSellPrice,
      sellDate: data.sellDate,
      netProceeds: data.netProceeds,
      sellCommission: (data.netProceeds * cfg.commissionRate) / (1 + cfg.commissionRate),
      stampDuty: newSellPrice * data.lots * 100 * cfg.stampDutyRate,
      profit: data.netProceeds - data.buyCost,
      gridLevel: gridLevelOf(newBuyPrice, cfg),
      holdDays: Math.round(
        (new Date(data.sellDate).getTime() - new Date(data.buyDate).getTime()) / 86400000,
      ),
    } as CompletedTrade;
  });
  const newStock: StockData = {
    ...stock,
    completedTrades: newTrades,
    _editingTradeId: undefined,
  };
  recalcAccumulatedProfit(newStock);
  return { stock: newStock, toast: { type: 'success', msg: '交易已更新' } };
}

/** 重新计算累计盈利 */
export function recalcAccumulatedProfit(stock: StockData): void {
  let acc = 0;
  stock.completedTrades.forEach((t) => {
    acc += t.profit;
    t.accumulatedProfit = Number(acc.toFixed(2));
  });
  stock.accumulatedProfit = Number(acc.toFixed(2));
}

/** 保存配置 */
export function saveStockConfig(
  stock: StockData,
  newConfig: StockConfig,
): StockData {
  const newStock: StockData = { ...stock, config: newConfig };
  // 仅在没有持仓和已完成交易时重置可用资金
  if (stock.positions.length === 0 && stock.completedTrades.length === 0) {
    newStock.availableCapital = newConfig.startCapital;
  }
  return newStock;
}
