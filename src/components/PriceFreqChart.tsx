import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PriceFreq } from '../types';
import { fmt } from '../utils/format';

interface PriceFreqChartProps {
  priceFreq: PriceFreq;
  lastClose: number | null;
}

/**
 * 价格分布频率柱状图 (1元一档)
 * - X 轴: 价格档位 (5-6, 6-7, ...)
 * - Y 轴: 天数
 * - 柱体颜色: 按档位渐变 (低档偏冷色, 高档偏暖色)
 * - 当前价标记线: 输入昨日收盘价后高亮当前所在档位
 */
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

    const labels = pf.bins.map((b) => `${b.from}-${b.to}`);
    const days = pf.bins.map((b) => b.days);
    const total = pf.totalDays;

    // 柱体配色: 按档位从低到高, 冷→暖渐变
    const palette = [
      '#5fb374',
      '#7dc88f',
      '#aab87d',
      '#f5c163',
      '#f0a060',
      '#e88a83',
      '#c97168',
      '#b85c5c',
      '#a04848',
    ];

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

    // 柱体样式: 当前价所在档位高亮 (描边 + 半透明叠加)
    const itemStyles = pf.bins.map((_, i) => {
      const baseColor = palette[i % palette.length];
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
        opacity: 0.65,
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
          const day = p.value as number;
          const pct = total > 0 ? ((day / total) * 100).toFixed(1) : '0.0';
          return `${p.name}元<br/>天数: <b>${day}</b>天<br/>占比: <b>${pct}%</b>`;
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
          rotate: 30,
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
