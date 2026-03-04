// src/utils/dataHandler.ts
import { TradeRecord } from '../types';
import * as XLSX from 'xlsx';

// 配置项（可根据实际需求修改）
const CONFIG = {
  // localStorage 存储键
  STORAGE_KEY: 'tradeRecords',
  // 默认基础数据文件路径（放在 public 目录下）
  DEFAULT_JSON_PATH: '/default-trade-data.json',
  // 去重的唯一标识字段
  UNIQUE_KEY: 'id' as keyof TradeRecord
};
// ========== 新增：导出 Excel ==========
export const exportRecordsToExcel = () => {
  const records = getLocalStorageRecords();
  if (records.length === 0) {
    alert('暂无交易记录可导出！');
    return;
  }

  // 构建 Excel 表头（可自己改字段顺序）
  const excelData = records.map(item => ({
    'ID': item.id,
    '股票名称': item.stockName,
    '交易日期': item.date,
    '买入价': item.buyPrice,
    '买入数量': item.buyAmount,
    '目标价': item.targetPrice,
    '预计盈利': item.expectedProfit,
    '状态': item.status,
    '完成日期': item.completeDate || ''
  }));

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '交易记录');

  // 下载
  XLSX.writeFile(wb, `交易记录_${new Date().getTime()}.xlsx`);
  alert('Excel 导出成功！');
};
/**
 * 从 localStorage 获取交易记录（确保返回数组）
 */
export const getLocalStorageRecords = (): TradeRecord[] => {
  const rawData = localStorage.getItem(CONFIG.STORAGE_KEY);
  return rawData ? JSON.parse(rawData) : [];
};

/**
 * 数据去重（基于唯一标识，保留最后出现的记录）
 * @param data 待去重的记录数组
 * @returns 去重后的数组
 */
export const deduplicateRecords = (data: TradeRecord[]): TradeRecord[] => {
  if (!Array.isArray(data) || data.length === 0) return [];

  const uniqueMap = new Map<string | number, TradeRecord>();
  data.forEach(item => {
    const uniqueValue = item[CONFIG.UNIQUE_KEY];
    if (uniqueValue !== undefined && uniqueValue !== null) {
      uniqueMap.set(uniqueValue, item); // 重复项会覆盖，保留最后一条
    }
  });

  return Array.from(uniqueMap.values());
};

/**
 * 保存记录到 localStorage（自动去重）
 * @param records 待保存的记录数组
 */
export const saveRecordsToLocalStorage = (records: TradeRecord[]): void => {
  const deduplicated = deduplicateRecords(records);
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(deduplicated));
};

/**
 * 导出记录为 JSON 文件
 */
export const exportRecordsToJSON = (): void => {
  const records = getLocalStorageRecords();
  if (records.length === 0) {
    alert('暂无交易记录可导出！');
    return;
  }

  // 生成格式化的 JSON 字符串（便于阅读）
  const jsonStr = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // 创建下载链接
  const a = document.createElement('a');
  a.href = url;
  // 文件名带时间戳，方便识别
  a.download = `交易记录_${new Date().getTime()}.json`;
  document.body.appendChild(a);
  a.click();

  // 清理资源
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert('交易记录导出成功！');
};

/**
 * 导入 JSON 文件并合并去重
 * @param file 上传的 JSON 文件
 */
export const importRecordsFromJSON = async (file: File): Promise<boolean> => {
  try {
    // 校验文件类型
    if (!file.name.endsWith('.json')) {
      alert('请上传 JSON 格式的文件！');
      return false;
    }

    // 读取文件内容
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });

    // 解析 JSON
    const importedRecords = JSON.parse(fileContent) as TradeRecord[];
    if (!Array.isArray(importedRecords)) {
      alert('导入的文件内容必须是数组格式！');
      return false;
    }

    // 获取现有数据并合并去重
    const currentRecords = getLocalStorageRecords();
    const mergedRecords = deduplicateRecords([...currentRecords, ...importedRecords]);

    // 保存到 localStorage
    saveRecordsToLocalStorage(mergedRecords);

    alert(`导入成功！共导入 ${importedRecords.length} 条记录，去重后总记录数：${mergedRecords.length}`);
    return true;
  } catch (error) {
    console.error('导入失败：', error);
    alert(`导入失败：${(error as Error).message}`);
    return false;
  }
};

/**
 * 加载默认基础数据（public 目录下的 default-trade-data.json）
 */
export const loadDefaultRecords = async (): Promise<boolean> => {
  try {
    // 先检查本地是否已有数据，有则不加载
    const currentRecords = getLocalStorageRecords();
    if (currentRecords.length > 0) {
      console.log('本地已有数据，跳过默认基础数据加载');
      return true;
    }

    // 请求默认 JSON 文件（public 目录下）
    const response = await fetch(CONFIG.DEFAULT_JSON_PATH);
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }

    const defaultRecords = await response.json() as TradeRecord[];
    if (!Array.isArray(defaultRecords)) {
      throw new Error('默认数据格式错误，必须是数组');
    }

    // 去重后保存
    saveRecordsToLocalStorage(defaultRecords);
    alert('默认基础数据加载成功！');
    return true;
  } catch (error) {
    console.error('加载默认数据失败：', error);
    alert(`加载默认基础数据失败：${(error as Error).message}`);
    return false;
  }
};
