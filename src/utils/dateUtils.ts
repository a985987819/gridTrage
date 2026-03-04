// src/utils/dateUtils.ts
import dayjs from 'dayjs';
import { TradeRecord, DateStat, StatData, ChartData } from '../types';

// 获取带交易记录的日期统计（新增：按日统计买入/成功次数+盈利）
export const getRecordDateStats = (records: TradeRecord[]): DateStat & {
  [key: string]: {
    count: number,
    successCount: number,
    profit: number
  } | number
} => {
  const dateStats: {
    [key: string]: {
      count: number,
      successCount: number,
      profit: number
    }
  } = {};

  records.forEach(record => {
    const date = record.date;
    if (!dateStats[date]) {
      dateStats[date] = { count: 0, successCount: 0, profit: 0 };
    }

    // 总买入次数
    dateStats[date].count++;

    // 成功完成次数 + 盈利
    if (record.status === '已完成') {
      dateStats[date].successCount++;
      dateStats[date].profit += parseFloat(record.expectedProfit);
    }
  });

  return dateStats;
};

// 筛选指定时间范围的记录（修复按年筛选逻辑）
export const filterRecordsByDate = (
  records: TradeRecord[],
  filterType: 'year' | 'month',
  targetDate: Date
): TradeRecord[] => {
  return records.filter(record => {
    const recordDate = dayjs(record.timestamp);
    const target = dayjs(targetDate);

    switch (filterType) {
      case 'year':
        // 修复：按年筛选 - 匹配年份
        return recordDate.year() === target.year();
      case 'month':
        // 按月筛选 - 匹配年+月
        return recordDate.year() === target.year() && recordDate.month() === target.month();
      default:
        return true;
    }
  });
};

// 计算基础统计数据
export const calculateStats = (records: TradeRecord[]): StatData => {
  let profit = 0;
  let totalCount = records.length;
  let completedCount = 0;
  let uncompletedCount = 0;

  records.forEach(record => {
    if (record.status === '已完成') {
      profit += parseFloat(record.expectedProfit);
      completedCount++;
    } else {
      uncompletedCount++;
    }
  });

  return {
    profit: profit.toFixed(2),
    totalCount,
    completedCount,
    uncompletedCount
  };
};

// 新增：按年统计数据
export const calculateYearlyStats = (records: TradeRecord[]): {
  buyCount: number,
  successCount: number,
  profit: string
} => {
  let buyCount = 0;
  let successCount = 0;
  let profit = 0;

  records.forEach(record => {
    buyCount++;
    if (record.status === '已完成') {
      successCount++;
      profit += parseFloat(record.expectedProfit);
    }
  });

  return {
    buyCount,
    successCount,
    profit: profit.toFixed(2)
  };
};

// 按日期分组统计图表数据
export const getChartData = (records: TradeRecord[]): ChartData => {
  const dateMap: {
    [key: string]: { profit: number; count: number; successCount: number }
  } = {};

  records.forEach(record => {
    const date = record.date;
    if (!dateMap[date]) {
      dateMap[date] = { profit: 0, count: 0, successCount: 0 };
    }
    dateMap[date].count++;
    if (record.status === '已完成') {
      dateMap[date].successCount++;
      dateMap[date].profit += parseFloat(record.expectedProfit);
    }
  });

  // 排序日期
  const dates = Object.keys(dateMap).sort((a, b) =>
    dayjs(a).valueOf() - dayjs(b).valueOf()
  );

  return {
    dates,
    profitData: dates.map(date => parseFloat(dateMap[date].profit.toFixed(2))),
    countData: dates.map(date => dateMap[date].count),
    successCountData: dates.map(date => dateMap[date].successCount) // 新增：成功次数
  };
};

// 日期格式化
export const formatDate = (date: Date | string | number, formatStr = 'YYYY-MM-DD') => {
  return dayjs(date).format(formatStr);
};

// 其他工具函数
export const isSameYear = (date1: Date | string | number, date2: Date | string | number) => {
  return dayjs(date1).isSame(dayjs(date2), 'year');
};

export const isSameMonth = (date1: Date | string | number, date2: Date | string | number) => {
  return dayjs(date1).isSame(dayjs(date2), 'month');
};

export const isSameDay = (date1: Date | string | number, date2: Date | string | number) => {
  return dayjs(date1).isSame(dayjs(date2), 'day');
};

export const addYears = (date: Date | string | number, years: number) => {
  return dayjs(date).add(years, 'year').toDate();
};

export const addMonths = (date: Date | string | number, months: number) => {
  return dayjs(date).add(months, 'month').toDate();
};

export const getDaysInMonth = (date: Date | string | number) => {
  return dayjs(date).daysInMonth();
};

export const startOfMonth = (date: Date | string | number) => {
  return dayjs(date).startOf('month').toDate();
};

export const endOfMonth = (date: Date | string | number) => {
  return dayjs(date).endOf('month').toDate();
};
