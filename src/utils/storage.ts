// src/utils/storage.ts
import { TradeRecord, StockNameList } from '../types';
import { formatDate } from './dateUtils';

// 本地存储键名
const STORAGE_KEYS = {
  TRADE_RECORDS: 'tradeRecords',
  STOCK_NAMES: 'stockNames'
};

// 初始化默认数据
const DEFAULT_STOCK_NAMES: StockNameList = ['柳工', '三一重工', '安道麦A', '奥佳华'];

// 获取交易记录
export const getTradeRecords = (): TradeRecord[] => {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRADE_RECORDS) || '[]');
    // 数据格式兼容：补充缺失字段
    return records.map((record: Partial<TradeRecord>) => ({
      id: record.id || Date.now(),
      stockName: record.stockName || '',
      date: record.date || formatDate(new Date()),
      timestamp: record.timestamp || new Date(record.date || Date.now()).getTime(),
      buyPrice: record.buyPrice || '0.00',
      buyAmount: record.buyAmount || 500,
      targetPrice: record.targetPrice || '0.00',
      expectedProfit: record.expectedProfit || '0.00',
      status: record.status || '未完成',
      completeDate: record.completeDate || ''
    }));
  } catch (error) {
    console.error('获取交易记录失败:', error);
    return [];
  }
};

// 其他方法保持不变...
export const saveTradeRecords = (records: TradeRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRADE_RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('保存交易记录失败:', error);
  }
};

export const getStockNames = (): StockNameList => {
  try {
    const names = JSON.parse(localStorage.getItem(STORAGE_KEYS.STOCK_NAMES) || '[]');
    return Array.isArray(names) && names.length ? names : DEFAULT_STOCK_NAMES;
  } catch (error) {
    console.error('获取股票名称失败:', error);
    return DEFAULT_STOCK_NAMES;
  }
};

export const saveStockNames = (names: StockNameList): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STOCK_NAMES, JSON.stringify(names));
  } catch (error) {
    console.error('保存股票名称失败:', error);
  }
};

export const addStockName = (name: string): boolean => {
  if (!name.trim()) return false;

  const names = getStockNames();
  if (names.includes(name.trim())) return false;

  names.push(name.trim());
  saveStockNames(names);
  return true;
};
