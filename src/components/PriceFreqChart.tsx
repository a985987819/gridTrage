import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PriceFreq } from '../types';
import { fmt } from '../utils/format';

interface PriceFreqChartProps {
  priceFreq: PriceFreq;
  lastClose: number | null;
}

/**
 * 价格分布频率柱状图 (0.1元一档)
 * - X 轴: 价格档位下界 (5.6, 5.7, ...)
 * - Y 轴: 天数
 * - 柱体颜色: 按价格档位连续渐变 (低价绿色 → 中价金色 → 高价红色)
 * - 当前价标记线: 输入昨日收盘价后高亮当前所在档位
 */

/** 在两个 hex 颜色间线性插值, t ∈ [0,1] */
function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** 按位置 t ∈ [0,1] 返回绿→金→红渐变色 */
function gradientColor(t: number): string {
  if (t < 0.5) return lerpColor('#7dc88f', '#f5c163', t * 2);
  return lerpColor('#f5c163', '#e88a83', (t - 0.5) * 2);
}

export function PriceFreqChart({ priceFreq: pf, lastClose }: PriceFreqChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !chartRef.current) return;

    const labels = pf.bins.map((b) => `${b.from}`);
    const days = pf.bins.map((b) => b.days);
    const total = pf.totalDays;
    const binCount = pf.bins.length;

    // 找出当前价所在档位
    let activeBinIndex = -1;
    if (lastClose !== null && lastClose > 0) {
      activeBinIndex = pf.bins.findIndex((b) => lastClose >= b.from && lastClose < b.to);
      // 处理恰好等于上界的情况
      if (activeBinIndex === -1) {
        const last = pf.bins[pf.bins.length - 1];
        if (lastClose >= last.to) activeBinIndex = pf.bins.length - 1;
        else if (lastClose < pf.bins[0].from) activeBinIndex = 0;
      }
    }

    // 柱体样式: 按价格档位连续渐变 (绿→金→红), 当前价档位高亮描边
    const itemStyles = pf.bins.map((_, i) => {
      const t = binCount > 1 ? i / (binCount - 1) : 0;
      const baseColor = gradientColor(t);
      if (i === activeBinIndex) {
        return {
          color: baseColor,
          borderColor: '#2c3e50',
          borderWidth: 2,
          borderRadius: [4, 4, 0, 0] as [number, number, number, number],
        };
      }
      return {
        color: baseColor,
        opacity: 0.75,
        borderRadius: [4, 4, 0, 0] as [number, number, number, number],
      };
    });

    // 当前价 markLine (基于 x 轴类目下标)
    const markLines: any[] = [];
    if (activeBinIndex >= 0) {
      markLines.push({
        xAxis: activeBinIndex,
        label: {
          formatter: `当前 ${fmt(lastClose!)}元`,
          color: '#fff',
          backgroundColor: '#2c3e50',
          padding: [3, 8],
          borderRadius: 4,
          position: 'insideEndTop',
          fontSize: 11,
        },
        lineStyle: { color: '#2c3e50', width: 2, type: 'dashed' },
      });
    }

    const option: echarts.EChartsOption = {
      grid: { left: 45, right: 30, top: 35, bottom: 50 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = params[0];
          if (!p) return '';
          const idx = p.dataIndex;
          const bin = pf.bins[idx];
          const day = p.value as number;
          const pct = total > 0 ? ((day / total) * 100).toFixed(1) : '0.0';
          return `${bin.from}-${bin.to}元<br/>天数: <b>${day}</b>天<br/>占比: <b>${pct}%</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#bdc3c7' } },
        axisTick: { show: true, length: 5, lineStyle: { color: '#bdc3c7' } },
        axisLabel: {
          fontSize: 11,
          color: '#7f8c8d',
          rotate: 45,
          interval: (index: number, value: string) => {
            // 只显示整数元标签 (6.0, 7.0, ...) 避免过密
            const num = parseFloat(value);
            return Number.isInteger(num);
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '天数',
        nameTextStyle: { color: '#7f8c8d', fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: '#bdc3c7' } },
        axisTick: { show: true, lineStyle: { color: '#bdc3c7' } },
        axisLabel: { color: '#7f8c8d', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(189,195,199,0.3)', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: days.map((v, i) => ({ value: v, itemStyle: itemStyles[i] })),
          barWidth: '70%',
          markLine: {
            symbol: 'none',
            animation: false,
            silent: true,
            data: markLines,
          },
        },
      ],
    };

    chartInstance.current.setOption(option, true);
    chartInstance.current.resize();
  }, [pf, lastClose]);

  return <div id="price-freq-chart" ref={chartRef} className="w-full h-[260px]" />;
}
