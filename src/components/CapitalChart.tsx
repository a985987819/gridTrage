import { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import type { StockData } from '../types';
import {
  buildCapitalCurve,
  aggregateCapitalCurve,
  type AggregateMode,
} from '../utils/trade-stats';
import { fmtMoney } from '../utils/format';

interface CapitalChartProps {
  stock: StockData;
}

/** 资金曲线图 — ECharts 双线折线图: 累计投入 + 累计盈利 */
export function CapitalChart({ stock }: CapitalChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mode, setMode] = useState<AggregateMode>('daily');

  const points = useMemo(() => buildCapitalCurve(stock), [stock]);
  const aggregated = useMemo(
    () => aggregateCapitalCurve(points, mode),
    [points, mode],
  );

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current || chartInstance.current.isDisposed()) return;
    if (aggregated.length === 0) {
      chartInstance.current.setOption({
        title: { text: '暂无交易数据', left: 'center', top: 'center', textStyle: { color: '#95a5a6', fontSize: 14 } },
      }, true);
      return;
    }

    const dates = aggregated.map((p) => p.date);
    const invested = aggregated.map((p) => p.cumulativeInvested);
    const profit = aggregated.map((p) => p.cumulativeProfit);

    const option: echarts.EChartsOption = {
      grid: { left: 60, right: 20, top: 40, bottom: 50 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          let html = `<b>${params[0].axisValue}</b><br/>`;
          for (const p of params) {
            html += `${p.marker} ${p.seriesName}: ${fmtMoney(p.value)}<br/>`;
          }
          return html;
        },
      },
      legend: {
        data: ['累计投入', '累计盈利'],
        top: 8,
        textStyle: { fontSize: 12, color: '#555' },
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontSize: 10,
          color: '#7f8c8d',
          rotate: mode === 'daily' ? 45 : 0,
          interval: mode === 'daily' ? Math.max(1, Math.floor(dates.length / 10)) - 1 : 0,
        },
        axisLine: { lineStyle: { color: '#bdc3c7' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        nameTextStyle: { fontSize: 10, color: '#7f8c8d' },
        axisLabel: {
          fontSize: 10,
          color: '#7f8c8d',
          formatter: (v: number) => {
            if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
            return `${v}`;
          },
        },
        splitLine: { lineStyle: { color: 'rgba(189,195,199,0.3)', type: 'dashed' } },
      },
      series: [
        {
          name: '累计投入',
          type: 'line',
          data: invested,
          smooth: true,
          lineStyle: { color: '#3498db', width: 2 },
          itemStyle: { color: '#3498db' },
          symbol: 'none',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(52, 152, 219, 0.15)' },
              { offset: 1, color: 'rgba(52, 152, 219, 0.02)' },
            ]),
          },
        },
        {
          name: '累计盈利',
          type: 'line',
          data: profit,
          smooth: true,
          lineStyle: { color: '#5fb374', width: 2 },
          itemStyle: { color: '#5fb374' },
          symbol: 'none',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(95, 179, 116, 0.15)' },
              { offset: 1, color: 'rgba(95, 179, 116, 0.02)' },
            ]),
          },
        },
      ],
    };

    chartInstance.current.setOption(option, true);
    chartInstance.current.resize();
  }, [aggregated, mode]);

  return (
    <div className="card" id="capital-chart">
      <div className="card-title">
        资金曲线
        <div className="flex gap-1">
          {(['daily', 'weekly', 'monthly'] as AggregateMode[]).map((m) => (
            <button
              key={m}
              className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-outline'} text-xs`}
              onClick={() => setMode(m)}
            >
              {{ daily: '日', weekly: '周', monthly: '月' }[m]}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartRef} className="w-full h-[280px]" />
    </div>
  );
}
