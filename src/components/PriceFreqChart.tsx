import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PriceFreqWindow } from '../types';
import { fmt } from '../utils/format';

interface PriceFreqChartProps {
  windows: PriceFreqWindow[];
  lastClose: number | null;
}

/**
 * 多时间窗口价格分布频率对比 (0.1元一档)
 * - 三条折线: 过去8年 / 过去3年 / 过去1年
 * - 通过 legend 切换显示, 直观对比价格中枢迁移
 * - 当前价标记线: 输入昨日收盘价后标注当前所在档位
 */
export function PriceFreqChart({ windows, lastClose }: PriceFreqChartProps) {
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
    if (windows.length === 0) return;

    // 以第一个窗口的档位为 X 轴 (各窗口档位一致)
    const baseBins = windows[0].bins;
    const labels = baseBins.map((b) => `${b.from}`);

    // 找出当前价所在档位
    let activeBinIndex = -1;
    if (lastClose !== null && lastClose > 0) {
      activeBinIndex = baseBins.findIndex((b) => lastClose >= b.from && lastClose < b.to);
      if (activeBinIndex === -1) {
        const last = baseBins[baseBins.length - 1];
        if (lastClose >= last.to) activeBinIndex = baseBins.length - 1;
        else if (lastClose < baseBins[0].from) activeBinIndex = 0;
      }
    }

    // 三条折线配色
    const colors = ['#3b82f6', '#f5c163', '#e88a83'];

    const series = windows.map((w, i) => {
      const data = baseBins.map((_, idx) => {
        const bin = w.bins[idx];
        return bin ? bin.days : 0;
      });
      const isLast = i === windows.length - 1;
      return {
        name: w.label,
        type: 'line',
        smooth: true,
        symbol: 'none',
        data,
        lineStyle: { width: 2, color: colors[i % colors.length] },
        itemStyle: { color: colors[i % colors.length] },
        areaStyle: { opacity: 0.08 },
        // 仅最后一条 series 携带当前价 markLine
        markLine: isLast
          ? {
              symbol: 'none',
              animation: false,
              silent: true,
              data:
                activeBinIndex >= 0
                  ? [
                      {
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
                      },
                    ]
                  : [],
            }
          : undefined,
      };
    });

    const option: echarts.EChartsOption = {
      grid: { left: 45, right: 30, top: 40, bottom: 55 },
      legend: {
        top: 4,
        textStyle: { color: '#7f8c8d', fontSize: 11 },
        itemWidth: 14,
        itemHeight: 8,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const bin = baseBins[idx];
          const lines = params.map((p: any) => {
            const w = windows.find((w) => w.label === p.seriesName);
            const total = w ? w.totalDays : 1;
            const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0';
            return `${p.marker}${p.seriesName}: <b>${p.value}</b>天 (${pct}%)`;
          });
          return `${bin.from}-${bin.to}元<br/>${lines.join('<br/>')}`;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#bdc3c7' } },
        axisTick: { show: true, length: 5, lineStyle: { color: '#bdc3c7' } },
        axisLabel: {
          fontSize: 10,
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
      series: series as any,
    };

    chartInstance.current.setOption(option, true);
    chartInstance.current.resize();
  }, [windows, lastClose]);

  return <div id="price-freq-chart" ref={chartRef} className="w-full h-[320px]" />;
}
