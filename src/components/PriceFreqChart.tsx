import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PriceFreqWindow } from '../types';
import { fmt } from '../utils/format';

interface PriceFreqChartProps {
  windows: PriceFreqWindow[];
  lastClose: number | null;
}

/**
 * 多时间窗口价格分布频率 (0.1元一档)
 * - 三个窗口各自独立一张柱状图 (8年 / 3年 / 1年)
 * - 当前价虚线标注所在档位
 * - 配色: 8年蓝 / 3年金 / 1年红
 */
export function PriceFreqChart({ windows, lastClose }: PriceFreqChartProps) {
  return (
    <div id="price-freq-charts" className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {windows.map((w, i) => (
        <SingleFreqChart
          key={w.label}
          window={w}
          lastClose={lastClose}
          colorIndex={i}
        />
      ))}
    </div>
  );
}

/** 单窗口柱状图 */
function SingleFreqChart({
  window: w,
  lastClose,
  colorIndex,
}: {
  window: PriceFreqWindow;
  lastClose: number | null;
  colorIndex: number;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 三窗口配色 (与折线图时期保持一致: 蓝/金/红)
  const colors = ['#3b82f6', '#f5c163', '#e88a83'];
  const color = colors[colorIndex % colors.length];

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
    if (w.bins.length === 0) return;

    const bins = w.bins;
    const labels = bins.map((b) => `${b.from}`);
    const data = bins.map((b) => b.days);

    // 当前价所在档位
    let activeBinIndex = -1;
    if (lastClose !== null && lastClose > 0) {
      activeBinIndex = bins.findIndex((b) => lastClose >= b.from && lastClose < b.to);
      if (activeBinIndex === -1) {
        const last = bins[bins.length - 1];
        if (lastClose >= last.to) activeBinIndex = bins.length - 1;
        else if (lastClose < bins[0].from) activeBinIndex = 0;
      }
    }

    // 标注当前价的 markLine
    const markLine =
      activeBinIndex >= 0
        ? {
            symbol: 'none' as const,
            animation: false,
            silent: true,
            data: [
              {
                xAxis: activeBinIndex,
                label: {
                  formatter: `当前 ${fmt(lastClose!)}`,
                  color: '#fff',
                  backgroundColor: '#2c3e50',
                  padding: [3, 6],
                  borderRadius: 4,
                  position: 'insideEndTop' as const,
                  fontSize: 10,
                },
                lineStyle: { color: '#2c3e50', width: 2, type: 'dashed' as const },
              },
            ],
          }
        : undefined;

    const option: echarts.EChartsOption = {
      grid: { left: 38, right: 14, top: 30, bottom: 50 },
      title: {
        text: `${w.label} · ${w.totalDays}天`,
        left: 'center',
        top: 4,
        textStyle: { fontSize: 12, fontWeight: 600, color: '#2c3e50' },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const bin = bins[idx];
          const days = bin.days;
          const pct = w.totalDays > 0 ? ((days / w.totalDays) * 100).toFixed(1) : '0.0';
          return `${bin.from}-${bin.to}元<br/>天数: <b>${days}</b> (${pct}%)`;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#bdc3c7' } },
        axisTick: { show: true, length: 4, lineStyle: { color: '#bdc3c7' } },
        axisLabel: {
          fontSize: 9,
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
        nameTextStyle: { color: '#7f8c8d', fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: '#bdc3c7' } },
        axisTick: { show: true, lineStyle: { color: '#bdc3c7' } },
        axisLabel: { color: '#7f8c8d', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(189,195,199,0.3)', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar' as const,
          data,
          barWidth: '90%',
          itemStyle: {
            color,
            borderRadius: [2, 2, 0, 0],
          },
          markLine,
        },
      ],
    };

    chartInstance.current.setOption(option, true);
    chartInstance.current.resize();
  }, [w, lastClose, color]);

  return <div id={`price-freq-chart-${colorIndex}`} ref={chartRef} className="w-full h-[220px]" />;
}
