/**
 * 格式化工具函数
 */

/** 数字格式化为指定小数位 */
export function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '--';
  return Number(n).toFixed(d);
}

/** 金额格式化(千分位 + 2 位小数) */
export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '--';
  return Number(n).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 当前日期字符串 YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
