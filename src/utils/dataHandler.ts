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
 * 导入 Excel 文件并合并去重
 * @param file 上传的 Excel 文件
 */
export const importRecordsFromExcel = async (file: File): Promise<boolean> => {
  try {
    // 校验文件类型
    if (!file.name.match(/\.xlsx$|\.xls$/)) {
      alert('请上传 Excel 格式的文件！');
      return false;
    }

    // 读取文件内容
    const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });

    // 解析 Excel
    const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (!Array.isArray(jsonData)) {
      alert('Excel 解析失败，内容必须是列表格式！');
      return false;
    }

    // 转换数据格式
    const importedRecords: TradeRecord[] = jsonData.map((row, index) => {
      // 处理日期
      let dateStr = '';
      if (row['日期'] instanceof Date) {
        // 如果是 Date 对象，转为 YYYY-MM-DD
        const d = row['日期'];
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (typeof row['日期'] === 'string') {
        // 尝试解析字符串日期 (2026/1/28 -> 2026-01-28)
        dateStr = row['日期'].replace(/\//g, '-');
      } else {
        // 默认当天
        dateStr = new Date().toISOString().split('T')[0];
      }

      // 处理完成日期
      let completeDateStr = '';
      if (row['卖出日期']) {
        if (row['卖出日期'] instanceof Date) {
          const d = row['卖出日期'];
          completeDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof row['卖出日期'] === 'string') {
          completeDateStr = row['卖出日期'].replace(/\//g, '-');
        }
      }

      // 状态判断：如果有卖出日期或 "完成" 字段为 1，则为已完成
      const isCompleted = completeDateStr !== '' || row['完成'] == 1;

      return {
        id: row['ID'] || Date.now() + index + Math.random(), // 优先使用 ID 字段，否则生成唯一 ID
        stockName: row['股票'] || row['股票名称'] || '未知股票',
        date: dateStr,
        timestamp: new Date(dateStr).getTime(),
        buyPrice: String(row['买入价'] || 0),
        buyAmount: Number(row['买入份额'] || row['买入数量'] || 0),
        targetPrice: String(row['目标售价'] || row['目标价'] || 0),
        expectedProfit: String(row['预期盈利'] || 0),
        status: isCompleted ? '已完成' : '未完成',
        completeDate: completeDateStr,
        completedAmount: Number(row['实现份数'] || row['completedAmount'] || (isCompleted ? (row['买入份额'] || row['买入数量']) : 0)),
        nextPurchasePrice: row['nextPurchasePrice'],
        nextExpectedShares: row['nextExpectedShares']
      };
    });

    // 获取现有数据并合并去重
    const currentRecords = getLocalStorageRecords();
    const mergedRecords = deduplicateRecords([...currentRecords, ...importedRecords]);

    // 保存到 localStorage
    saveRecordsToLocalStorage(mergedRecords);

    alert(`导入成功！共解析 ${importedRecords.length} 条记录，去重后总记录数：${mergedRecords.length}`);
    return true;
  } catch (error) {
    console.error('Excel 导入失败：', error);
    alert(`Excel 导入失败：${(error as Error).message}`);
    return false;
  }
};


/**
 * 初始化数据（为旧数据补充 completedAmount 和其他新字段）
 */
export const initRecordData = (records: TradeRecord[]): TradeRecord[] => {
  return records.map(record => ({
    ...record,
    completedAmount: record.completedAmount ?? (record.status === '已完成' ? record.buyAmount : 0),
    nextPurchasePrice: record.nextPurchasePrice,
    nextExpectedShares: record.nextExpectedShares
  }));
};

/**
 * 从 localStorage 获取交易记录（确保返回数组）
 */
export const getLocalStorageRecords = (): TradeRecord[] => {
  const rawData = localStorage.getItem(CONFIG.STORAGE_KEY);
  const rawRecords = rawData ? JSON.parse(rawData) : [];
  return initRecordData(rawRecords);
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
    // 为旧数据补充 completedAmount 字段（兼容）
    const normalizedItem = {
      ...item,
      completedAmount: item.completedAmount ?? (item.status === '已完成' ? item.buyAmount : 0),
      nextPurchasePrice: item.nextPurchasePrice,
      nextExpectedShares: item.nextExpectedShares
    };
    const uniqueValue = normalizedItem[CONFIG.UNIQUE_KEY];
    if (uniqueValue !== undefined && uniqueValue !== null) {
      uniqueMap.set(uniqueValue, normalizedItem);
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
    const currentRecords = getLocalStorageRecords();
    if (currentRecords.length > 0) {
      console.log('本地已有数据，跳过默认基础数据加载');
      return true;
    }

    const response = await fetch(CONFIG.DEFAULT_JSON_PATH);
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }

    const defaultRecords = await response.json() as TradeRecord[];
    if (!Array.isArray(defaultRecords)) {
      throw new Error('默认数据格式错误，必须是数组');
    }

    // 补充 completedAmount 字段
    const normalizedRecords = initRecordData(defaultRecords);
    saveRecordsToLocalStorage(normalizedRecords);
    alert('默认基础数据加载成功！');
    return true;
  } catch (error) {
    console.error('加载默认数据失败：', error);
    alert(`加载默认基础数据失败：${(error as Error).message}`);
    return false;
  }
};
