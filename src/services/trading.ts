import type {
  StockData,
  Position,
  CompletedTrade,
  GridCycle,
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

export interface BuyResult {
  stock: StockData;
  toast: { type: 'success' | 'error' | 'warn'; msg: string };
  clearInputs: boolean;
}

export interface SellResult {
  stock: StockData;
  toast: { type: 'success' | 'error' | 'warn'; msg: string };
  clearInputs: boolean;
}

export interface GridLevelStat {
  gridLevel: number;
  referenceBuyPrice: number;
  cycles: number;
  closedCycles: number;
  openCycles: number;
  accumulatedProfit: number;
  status: 'holding' | 'closed' | 'waiting';
  latestCycleNumber: number;
}

export interface CapitalPressure {
  deployedCapital: number;
  totalCapital: number;
  deployedRatio: number;
  reserveCapital: number;
  remainingGridSlots: number;
  maxDropLevels: number;
  warningLevel: 'safe' | 'warn' | 'danger';
}

function buildCycleId(level: number, cycleNumber: number, seed: string): string {
  return `L${level}-C${cycleNumber}-${seed}`;
}

function sortByBuyDate<T extends { buyDate: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.buyDate.localeCompare(b.buyDate));
}

function rebuildGridLevelCycleMap(cycles: GridCycle[]): Record<number, number> {
  return cycles.reduce<Record<number, number>>((acc, cycle) => {
    acc[cycle.gridLevel] = Math.max(acc[cycle.gridLevel] ?? 0, cycle.cycleNumber);
    return acc;
  }, {});
}

function relinkCycles(cycles: GridCycle[]): GridCycle[] {
  const byLevel = new Map<number, GridCycle[]>();
  for (const cycle of cycles) {
    const list = byLevel.get(cycle.gridLevel) ?? [];
    list.push(cycle);
    byLevel.set(cycle.gridLevel, list);
  }

  const linked = new Map<string, GridCycle>();
  for (const list of byLevel.values()) {
    const sorted = [...list].sort((a, b) => a.cycleNumber - b.cycleNumber || a.id.localeCompare(b.id));
    sorted.forEach((cycle, index) => {
      linked.set(cycle.id, {
        ...cycle,
        prevCycleId: index > 0 ? sorted[index - 1].id : null,
        nextCycleId: index < sorted.length - 1 ? sorted[index + 1].id : null,
      });
    });
  }

  return cycles.map((cycle) => linked.get(cycle.id) ?? cycle);
}

function normalizeCycleLinks(stock: StockData): StockData {
  const cycles = relinkCycles(stock.cycles ?? []);
  return {
    ...stock,
    cycles,
    gridLevelCycleMap: rebuildGridLevelCycleMap(cycles),
  };
}

export function ensureCycleState(stock: StockData): StockData {
  if (stock.cycles && stock.cycles.length > 0) {
    return normalizeCycleLinks(stock);
  }

  const levelCounts: Record<number, number> = {};
  const cycles: GridCycle[] = [];

  for (const trade of sortByBuyDate(stock.completedTrades)) {
    const cycleNumber = (levelCounts[trade.gridLevel] ?? 0) + 1;
    levelCounts[trade.gridLevel] = cycleNumber;
    cycles.push({
      id: buildCycleId(trade.gridLevel, cycleNumber, `t${trade.tradeId}`),
      cycleNumber,
      gridLevel: trade.gridLevel,
      buyPrice: trade.buyPrice,
      buyDate: trade.buyDate,
      buyLots: trade.buyLots,
      buyShares: trade.buyLots * 100,
      buyCost: trade.buyCost,
      targetSellPrice: trade.sellPrice,
      sellPrice: trade.sellPrice,
      sellDate: trade.sellDate,
      sellValue: trade.sellValue,
      profit: trade.profit,
      accumulatedProfit: trade.accumulatedProfit,
      nextCycleId: null,
      prevCycleId: null,
      positionId: null,
      tradeId: trade.tradeId,
      status: 'closed',
    });
  }

  for (const pos of sortByBuyDate(stock.positions)) {
    const cycleNumber = (levelCounts[pos.gridLevel] ?? 0) + 1;
    levelCounts[pos.gridLevel] = cycleNumber;
    cycles.push({
      id: buildCycleId(pos.gridLevel, cycleNumber, `p${pos.id}`),
      cycleNumber,
      gridLevel: pos.gridLevel,
      buyPrice: pos.buyPrice,
      buyDate: pos.buyDate,
      buyLots: pos.lots,
      buyShares: pos.shares,
      buyCost: pos.buyCost,
      targetSellPrice: pos.targetSellPrice,
      sellPrice: null,
      sellDate: null,
      sellValue: null,
      profit: null,
      accumulatedProfit: null,
      nextCycleId: null,
      prevCycleId: null,
      positionId: pos.id,
      tradeId: null,
      status: 'open',
    });
  }

  return normalizeCycleLinks({
    ...stock,
    cycles,
    gridLevelCycleMap: rebuildGridLevelCycleMap(cycles),
  });
}

function refreshProfitSeries(stock: StockData): StockData {
  let accumulatedProfit = 0;
  const completedTrades = stock.completedTrades.map((trade) => {
    accumulatedProfit += trade.profit;
    return { ...trade, accumulatedProfit: Number(accumulatedProfit.toFixed(2)) };
  });

  const cycleProfitMap = new Map<number, number>();
  for (const trade of completedTrades) {
    cycleProfitMap.set(trade.tradeId, trade.accumulatedProfit);
  }

  const cycles = stock.cycles.map((cycle) => {
    if (cycle.tradeId === null) return cycle;
    return {
      ...cycle,
      accumulatedProfit: cycleProfitMap.get(cycle.tradeId) ?? cycle.accumulatedProfit,
    };
  });

  return {
    ...stock,
    completedTrades,
    cycles,
    accumulatedProfit: Number(accumulatedProfit.toFixed(2)),
  };
}

function findOpenCycleIndex(cycles: GridCycle[], positionId: number): number {
  return cycles.findIndex((cycle) => cycle.positionId === positionId && cycle.status === 'open');
}

export function executeBuy(
  rawStock: StockData,
  rawPrice: number,
  lots: number,
  date: string,
): BuyResult {
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  if (!rawPrice || rawPrice <= 0) {
    return { stock: rawStock, toast: { type: 'error', msg: '请输入有效买入价' }, clearInputs: false };
  }
  if (!lots || lots <= 0) {
    return { stock: rawStock, toast: { type: 'error', msg: '请输入有效手数' }, clearInputs: false };
  }

  const price = forceBuyPrice(rawPrice);
  let warnMsg: string | null = null;
  if (price !== rawPrice) {
    warnMsg = `买入价已自动调整: ${rawPrice} -> ${price} (.x1 规则)`;
  }

  const shares = lots * 100;
  const buyValue = shares * price;
  const buyCommission = buyValue * cfg.commissionRate;
  const totalCost = Number((buyValue + buyCommission).toFixed(2));
  const level = gridLevelOf(price, cfg);
  const positionId = stock.positionIdCounter + 1;
  const cycleNumber = (stock.gridLevelCycleMap[level] ?? 0) + 1;
  const previousCycle = [...stock.cycles]
    .filter((cycle) => cycle.gridLevel === level)
    .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

  const position: Position = {
    id: positionId,
    gridLevel: level,
    buyPrice: price,
    buyDate: date,
    lots,
    shares,
    buyCost: totalCost,
    buyCommission: Number(buyCommission.toFixed(2)),
    targetSellPrice: calcSellPrice(price, shares),
  };

  const cycle: GridCycle = {
    id: buildCycleId(level, cycleNumber, `p${positionId}`),
    cycleNumber,
    gridLevel: level,
    buyPrice: price,
    buyDate: date,
    buyLots: lots,
    buyShares: shares,
    buyCost: totalCost,
    targetSellPrice: position.targetSellPrice,
    sellPrice: null,
    sellDate: null,
    sellValue: null,
    profit: null,
    accumulatedProfit: null,
    prevCycleId: previousCycle?.id ?? null,
    nextCycleId: null,
    positionId,
    tradeId: null,
    status: 'open',
  };

  const nextStock = normalizeCycleLinks({
    ...stock,
    positionIdCounter: positionId,
    positions: [...stock.positions, position],
    cycles: [...stock.cycles, cycle],
    gridLevelCycleMap: {
      ...stock.gridLevelCycleMap,
      [level]: cycleNumber,
    },
  });

  return {
    stock: nextStock,
    toast: {
      type: warnMsg ? 'warn' : 'success',
      msg: warnMsg ?? `买入成功: ${price}元 ${lots}手, 成本 ${totalCost.toFixed(2)}`,
    },
    clearInputs: true,
  };
}

export function executeSell(
  rawStock: StockData,
  posId: number,
  sellPrice: number,
  sellLots: number,
  date: string,
): SellResult {
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  if (!posId) {
    return { stock: rawStock, toast: { type: 'error', msg: '请选择要卖出的持仓' }, clearInputs: false };
  }
  if (!sellPrice || sellPrice <= 0) {
    return { stock: rawStock, toast: { type: 'error', msg: '请输入有效卖出价' }, clearInputs: false };
  }
  if (!sellLots || sellLots <= 0) {
    return { stock: rawStock, toast: { type: 'error', msg: '请输入有效手数' }, clearInputs: false };
  }

  const finalSellPrice = forceSellPrice(sellPrice);
  let warnMsg: string | null = null;
  if (finalSellPrice !== sellPrice) {
    warnMsg = `卖出价已自动调整: ${sellPrice} -> ${finalSellPrice} (.x8 规则)`;
  }

  const position = stock.positions.find((item) => item.id === posId);
  if (!position) {
    return { stock: rawStock, toast: { type: 'error', msg: '持仓不存在' }, clearInputs: false };
  }
  if (sellLots > position.lots) {
    return {
      stock: rawStock,
      toast: { type: 'error', msg: `卖出手数超过持仓(${position.lots}手)` },
      clearInputs: false,
    };
  }

  const sellShares = sellLots * 100;
  const sellValue = sellShares * finalSellPrice;
  const sellCommission = sellValue * cfg.commissionRate;
  const stampDuty = sellValue * cfg.stampDutyRate;
  const netProceeds = sellValue - sellCommission - stampDuty;
  const costRatio = sellLots / position.lots;
  const allocatedBuyCost = Number((position.buyCost * costRatio).toFixed(2));
  const allocatedBuyCommission = Number((position.buyCommission * costRatio).toFixed(2));
  const profit = Number((netProceeds - allocatedBuyCost).toFixed(2));
  const tradeId = stock.tradeCounter + 1;
  const holdDays = Math.round((new Date(date).getTime() - new Date(position.buyDate).getTime()) / 86400000);

  const trade: CompletedTrade = {
    tradeId,
    gridLevel: position.gridLevel,
    buyPrice: position.buyPrice,
    buyDate: position.buyDate,
    buyLots: sellLots,
    buyCost: allocatedBuyCost,
    buyCommission: allocatedBuyCommission,
    sellPrice: finalSellPrice,
    sellDate: date,
    sellValue: Number(sellValue.toFixed(2)),
    sellCommission: Number(sellCommission.toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    netProceeds: Number(netProceeds.toFixed(2)),
    profit,
    accumulatedProfit: 0,
    holdDays,
    linkedPositionId: position.id,
  };

  let positions = [...stock.positions];
  let cycles = [...stock.cycles];
  const cycleIndex = findOpenCycleIndex(cycles, position.id);
  const sourceCycle = cycleIndex >= 0 ? cycles[cycleIndex] : null;

  if (sellLots === position.lots) {
    positions = positions.filter((item) => item.id !== posId);
    if (sourceCycle) {
      cycles[cycleIndex] = {
        ...sourceCycle,
        buyLots: sellLots,
        buyShares: sellShares,
        buyCost: allocatedBuyCost,
        sellPrice: finalSellPrice,
        sellDate: date,
        sellValue: Number(sellValue.toFixed(2)),
        profit,
        tradeId,
        positionId: null,
        status: 'closed',
      };
    }
  } else {
    const remainingLots = position.lots - sellLots;
    const remainingShares = remainingLots * 100;
    const remainingBuyCost = Number((position.buyCost - allocatedBuyCost).toFixed(2));
    const remainingBuyCommission = Number((position.buyCommission - allocatedBuyCommission).toFixed(2));

    positions = positions.map((item) =>
      item.id !== posId
        ? item
        : {
            ...item,
            lots: remainingLots,
            shares: remainingShares,
            buyCost: remainingBuyCost,
            buyCommission: remainingBuyCommission,
            targetSellPrice: calcSellPrice(item.buyPrice, remainingShares),
          },
    );

    if (sourceCycle) {
      cycles[cycleIndex] = {
        ...sourceCycle,
        buyLots: sellLots,
        buyShares: sellShares,
        buyCost: allocatedBuyCost,
        sellPrice: finalSellPrice,
        sellDate: date,
        sellValue: Number(sellValue.toFixed(2)),
        profit,
        tradeId,
        positionId: null,
        status: 'closed',
      };

      cycles.push({
        ...sourceCycle,
        id: `${sourceCycle.id}-rest`,
        buyLots: remainingLots,
        buyShares: remainingShares,
        buyCost: remainingBuyCost,
        targetSellPrice: calcSellPrice(sourceCycle.buyPrice, remainingShares),
        sellPrice: null,
        sellDate: null,
        sellValue: null,
        profit: null,
        accumulatedProfit: null,
        positionId: position.id,
        tradeId: null,
        status: 'open',
      });
    }
  }

  const nextStock = refreshProfitSeries(
    normalizeCycleLinks({
      ...stock,
      positions,
      cycles,
      tradeCounter: tradeId,
      completedTrades: [...stock.completedTrades, trade],
    }),
  );

  return {
    stock: nextStock,
    toast: {
      type: warnMsg ? 'warn' : 'success',
      msg: warnMsg ?? `卖出成功: ${finalSellPrice}元 ${sellLots}手, 盈利 ${profit.toFixed(2)}`,
    },
    clearInputs: true,
  };
}

export function buildBuyPlan(rawStock: StockData): BuyPlan[] {
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  let maxLevel = 0;
  stock.positions.forEach((position) => {
    if (position.gridLevel > maxLevel) maxLevel = position.gridLevel;
  });

  const plans: BuyPlan[] = [];
  for (let i = 1; i <= 30 && plans.length < 5; i++) {
    const level = maxLevel + i;
    const price = gridPriceOf(level, cfg);
    if (price <= 0) break;
    if (lastClose && price < lastClose * 0.9) break;
    const suggest: SuggestLots = calcSuggestLots(price, stock);
    const cost = suggest.total * 100 * price * (1 + cfg.commissionRate);
    plans.push({ level, price, suggest, cost });
  }
  return plans;
}

export function buildSellPlan(rawStock: StockData): SellPlan[] {
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  const feeRate = cfg.commissionRate + cfg.stampDutyRate;
  const groups = new Map<number, Position[]>();

  for (const position of stock.positions) {
    const key = Number(position.targetSellPrice.toFixed(2));
    const list = groups.get(key) ?? [];
    list.push(position);
    groups.set(key, list);
  }

  const plans: SellPlan[] = [];
  for (const [sellPrice, positions] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (lastClose && sellPrice > lastClose * 1.1) continue;
    const totalShares = positions.reduce((sum, position) => sum + position.shares, 0);
    const totalCost = positions.reduce((sum, position) => sum + position.buyCost, 0);
    const totalSellValue = totalShares * sellPrice;
    const totalFees = totalSellValue * feeRate;
    const totalProfit = totalSellValue - totalFees - totalCost;
    plans.push({
      sellPrice,
      positions: [...positions].sort((a, b) => a.id - b.id),
      totalShares,
      totalCost,
      totalSellValue,
      totalFees,
      totalProfit,
    });
    if (plans.length >= 5) break;
  }
  return plans;
}

export function buildTodayBuyOrders(rawStock: StockData): BuyPlan[] {
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;
  if (!lastClose) return [];

  const maxLevel = stock.positions.length > 0 ? Math.max(...stock.positions.map((p) => p.gridLevel)) : 0;
  const occupiedLevels = new Set(stock.positions.map((p) => p.gridLevel));
  const orders: BuyPlan[] = [];
  let level = Math.ceil((cfg.basePrice - lastClose) / cfg.gridDrop);
  if (level < 1) level = 1;

  for (let i = 0; i < 30 && orders.length < 5; i++) {
    const currentLevel = level + i;
    const price = gridPriceOf(currentLevel, cfg);
    if (price <= 0) break;
    if (price >= lastClose) continue;
    if (price < lastClose * 0.9) break;
    if (occupiedLevels.has(currentLevel)) continue;
    const suggest = calcSuggestLots(price, stock);
    const cost = suggest.total * 100 * price * (1 + cfg.commissionRate);
    orders.push({ level: currentLevel, price, suggest, cost });
  }
  return orders;
}

export function linkPositionsToSell(rawStock: StockData, sellPrice: number, positionIds: number[]): StockData {
  const stock = ensureCycleState(rawStock);
  const newSellPrice = forceSellPrice(sellPrice);
  const idSet = new Set(positionIds);
  const positions = stock.positions.map((position) => {
    if (idSet.has(position.id)) {
      return { ...position, targetSellPrice: newSellPrice };
    }
    if (Math.abs(position.targetSellPrice - newSellPrice) < 0.001) {
      return { ...position, targetSellPrice: calcSellPrice(position.buyPrice, position.shares) };
    }
    return position;
  });

  const cycles = stock.cycles.map((cycle) => {
    if (cycle.positionId === null) return cycle;
    if (idSet.has(cycle.positionId)) {
      return { ...cycle, targetSellPrice: newSellPrice };
    }
    if (Math.abs(cycle.targetSellPrice - newSellPrice) < 0.001) {
      return { ...cycle, targetSellPrice: calcSellPrice(cycle.buyPrice, cycle.buyShares) };
    }
    return cycle;
  });

  return {
    ...stock,
    positions,
    cycles,
    _editingPosId: undefined,
  };
}

export function executeBatchSell(
  stock: StockData,
  posIds: number[],
  sellPrice: number,
  date: string,
): { stock: StockData; toast: { type: 'success' | 'error' | 'warn'; msg: string } } {
  if (posIds.length === 0) {
    return { stock, toast: { type: 'error', msg: '没有可卖出的持仓' } };
  }

  let current = ensureCycleState(stock);
  let totalProfit = 0;
  let count = 0;
  for (const id of posIds) {
    const position = current.positions.find((item) => item.id === id);
    if (!position) continue;
    const result = executeSell(current, id, sellPrice, position.lots, date);
    if (result.toast.type === 'error') continue;
    current = result.stock;
    const lastTrade = current.completedTrades[current.completedTrades.length - 1];
    if (lastTrade) totalProfit += lastTrade.profit;
    count++;
  }

  if (count === 0) {
    return { stock, toast: { type: 'error', msg: '批量卖出失败' } };
  }

  return {
    stock: current,
    toast: {
      type: 'success',
      msg: `批量卖出 ${count}笔 @ ${sellPrice}元, 盈利 ${totalProfit.toFixed(2)}`,
    },
  };
}

export function deletePosition(rawStock: StockData, id: number): StockData {
  const stock = ensureCycleState(rawStock);
  return normalizeCycleLinks({
    ...stock,
    positions: stock.positions.filter((position) => position.id !== id),
    cycles: stock.cycles.filter((cycle) => cycle.positionId !== id),
    _editingPosId: undefined,
  });
}

export function savePositionEdit(
  rawStock: StockData,
  id: number,
  data: {
    buyPrice: number;
    buyDate: string;
    lots: number;
    buyCost: number;
    sellPrice: number;
  },
): { stock: StockData; toast: { type: 'success' | 'error'; msg: string } } {
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  if (!data.buyPrice || !data.lots || data.lots <= 0) {
    return { stock: rawStock, toast: { type: 'error', msg: '请输入有效数据' } };
  }

  const buyPrice = forceBuyPrice(data.buyPrice);
  const targetSellPrice = forceSellPrice(data.sellPrice);
  const gridLevel = gridLevelOf(buyPrice, cfg);
  const shares = data.lots * 100;
  const buyCommission = (data.buyCost * cfg.commissionRate) / (1 + cfg.commissionRate);

  const positions = stock.positions.map((position) =>
    position.id !== id
      ? position
      : {
          ...position,
          buyPrice,
          buyDate: data.buyDate,
          lots: data.lots,
          shares,
          buyCost: data.buyCost,
          buyCommission,
          targetSellPrice,
          gridLevel,
        },
  );

  const cycles = stock.cycles.map((cycle) =>
    cycle.positionId !== id
      ? cycle
      : {
          ...cycle,
          buyPrice,
          buyDate: data.buyDate,
          buyLots: data.lots,
          buyShares: shares,
          buyCost: data.buyCost,
          targetSellPrice,
          gridLevel,
        },
  );

  return {
    stock: normalizeCycleLinks({ ...stock, positions, cycles, _editingPosId: undefined }),
    toast: { type: 'success', msg: '持仓已更新' },
  };
}

export function deleteTrade(rawStock: StockData, tradeId: number): StockData {
  const stock = ensureCycleState(rawStock);
  return refreshProfitSeries(
    normalizeCycleLinks({
      ...stock,
      completedTrades: stock.completedTrades.filter((trade) => trade.tradeId !== tradeId),
      cycles: stock.cycles.filter((cycle) => cycle.tradeId !== tradeId),
      _editingTradeId: undefined,
    }),
  );
}

export function saveTradeEdit(
  rawStock: StockData,
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
  const stock = ensureCycleState(rawStock);
  const cfg = stock.config;
  const buyPrice = forceBuyPrice(data.buyPrice);
  const finalSellPrice = forceSellPrice(data.sellPrice);
  const sellShares = data.lots * 100;
  const sellValue = finalSellPrice * sellShares;

  const completedTrades = stock.completedTrades.map((trade) => {
    if (trade.tradeId !== tradeId) return trade;
    return {
      ...trade,
      buyPrice,
      buyDate: data.buyDate,
      buyLots: data.lots,
      buyCost: data.buyCost,
      sellPrice: finalSellPrice,
      sellDate: data.sellDate,
      sellValue: Number(sellValue.toFixed(2)),
      netProceeds: data.netProceeds,
      sellCommission: Number((sellValue * cfg.commissionRate).toFixed(2)),
      stampDuty: Number((sellValue * cfg.stampDutyRate).toFixed(2)),
      profit: Number((data.netProceeds - data.buyCost).toFixed(2)),
      gridLevel: gridLevelOf(buyPrice, cfg),
      holdDays: Math.round((new Date(data.sellDate).getTime() - new Date(data.buyDate).getTime()) / 86400000),
    };
  });

  const cycles = stock.cycles.map((cycle) => {
    if (cycle.tradeId !== tradeId) return cycle;
    return {
      ...cycle,
      gridLevel: gridLevelOf(buyPrice, cfg),
      buyPrice,
      buyDate: data.buyDate,
      buyLots: data.lots,
      buyShares: sellShares,
      buyCost: data.buyCost,
      targetSellPrice: finalSellPrice,
      sellPrice: finalSellPrice,
      sellDate: data.sellDate,
      sellValue: Number(sellValue.toFixed(2)),
      profit: Number((data.netProceeds - data.buyCost).toFixed(2)),
    };
  });

  return {
    stock: refreshProfitSeries(
      normalizeCycleLinks({
        ...stock,
        completedTrades,
        cycles,
        _editingTradeId: undefined,
      }),
    ),
    toast: { type: 'success', msg: '交易已更新' },
  };
}

export function recalcAccumulatedProfit(rawStock: StockData): StockData {
  return refreshProfitSeries(ensureCycleState(rawStock));
}

export function saveStockConfig(rawStock: StockData, newConfig: StockConfig): StockData {
  const stock = ensureCycleState(rawStock);
  const nextStock: StockData = { ...stock, config: newConfig };
  if (stock.positions.length === 0 && stock.completedTrades.length === 0) {
    nextStock.availableCapital = newConfig.startCapital;
  }
  return nextStock;
}

export function buildGridLevelStats(rawStock: StockData): GridLevelStat[] {
  const stock = ensureCycleState(rawStock);
  const grouped = new Map<number, GridCycle[]>();
  for (const cycle of stock.cycles) {
    const list = grouped.get(cycle.gridLevel) ?? [];
    list.push(cycle);
    grouped.set(cycle.gridLevel, list);
  }

  return [...grouped.entries()]
    .map(([gridLevel, cycles]) => {
      const sorted = [...cycles].sort((a, b) => a.cycleNumber - b.cycleNumber);
      const closedCycles = sorted.filter((cycle) => cycle.status === 'closed').length;
      const openCycles = sorted.filter((cycle) => cycle.status === 'open').length;
      const accumulatedProfit = sorted.reduce((sum, cycle) => sum + (cycle.profit ?? 0), 0);
      const status: GridLevelStat['status'] = openCycles > 0 ? 'holding' : closedCycles > 0 ? 'closed' : 'waiting';
      return {
        gridLevel,
        referenceBuyPrice: sorted[sorted.length - 1]?.buyPrice ?? 0,
        cycles: sorted.length,
        closedCycles,
        openCycles,
        accumulatedProfit,
        status,
        latestCycleNumber: sorted[sorted.length - 1]?.cycleNumber ?? 0,
      };
    })
    .sort((a, b) => a.gridLevel - b.gridLevel);
}

export function buildCapitalPressure(rawStock: StockData): CapitalPressure {
  const stock = ensureCycleState(rawStock);
  const deployedCapital = stock.positions.reduce((sum, position) => sum + position.buyCost, 0);
  const totalCapital = stock.config.startCapital;
  const reserveCapital = Math.max(0, totalCapital - deployedCapital);
  const deployedRatio = totalCapital > 0 ? deployedCapital / totalCapital : 0;
  const remainingGridSlots =
    stock.config.baseBuyAmount > 0 ? Math.floor(reserveCapital / stock.config.baseBuyAmount) : 0;
  const maxDropLevels =
    stock.config.gridDrop > 0 ? Math.floor(reserveCapital / Math.max(stock.config.baseBuyAmount, 1)) : 0;

  let warningLevel: CapitalPressure['warningLevel'] = 'safe';
  if (deployedRatio > 0.9) warningLevel = 'danger';
  else if (deployedRatio > 0.7) warningLevel = 'warn';

  return {
    deployedCapital: Number(deployedCapital.toFixed(2)),
    totalCapital,
    deployedRatio,
    reserveCapital: Number(reserveCapital.toFixed(2)),
    remainingGridSlots,
    maxDropLevels,
    warningLevel,
  };
}
