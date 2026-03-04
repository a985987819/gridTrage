// src/utils/dateConfig.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ConfigProvider } from 'antd';
import dayjsGenerateConfig from 'rc-picker/lib/generate/dayjs';
import 'dayjs/locale/zh-cn';

// 启用 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('zh-cn');

// 配置 AntD 使用 dayjs 作为日期处理库
export const dateConfig = {
  dateGenerateConfig: dayjsGenerateConfig,
  locale: dayjs.locale('zh-cn'),
};

// 导出常用的 dayjs 工具函数
export const formatDate = (date: Date | string | number, formatStr = 'YYYY-MM-DD') => {
  return dayjs(date).format(formatStr);
};

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
