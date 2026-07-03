import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PriceStats, StockConfig } from '../types';
import { fmt } from '../utils/format';
import { gridPriceOf } from '../utils/grid';

interface ZoneChartProps {
  priceStats: PriceStats;
  config: StockConfig;
  lastClose: number | null;
}

/**
 * 价格区间 ECharts 图表 - 坐标轴式
 * 完整展示 min ~ max 的股价范围, 三个区间按真实价格比例显示宽度
 * - 高胜率买区: min ~ median (柔和红)
 * - 中性区:    median ~ p75  (柔和灰)
 * - 高收益卖区: p75 ~ max    (柔和绿)
 * 底部彩色色带 + 上方分位数刻度 + 当前价标记线
 */
export function ZoneChart({ priceStats: ps, config: cfg, lastClose }: ZoneChartProps) {
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

    const minP = ps.min;
    const maxP = ps.max;
    const med = ps.median;
    const p75 = ps.p75;

    // 坐标轴范围: 略向外扩展, 但保证完整显示 min ~ max
    const pad = (maxP - minP) * 0.06;
    const axisMin = Math.floor((minP - pad) * 10) / 10;
    const axisMax = Math.ceil((maxP + pad) * 10) / 10;

    // ====== 网格买点虚线 ======
    const gridLineData: any[] = [];
    for (let lv = 1; lv <= 20; lv++) {
      const price = gridPriceOf(lv, cfg);
      if (price < axisMin) break;
      if (price > axisMax) continue;
      gridLineData.push({
        xAxis: price,
        lineStyle: { color: 'rgba(232,138,131,0.28)', type: 'dashed', width: 1 },
        label: { show: false },
      });
    }

    // ====== 当前价标记线 (置于顶部) ======
    const currentLineData: any[] = [];
    if (lastClose) {
      currentLineData.push({
        xAxis: lastClose,
        label: {
          formatter: '当前 ' + fmt(lastClose),
          color: '#fff',
          backgroundColor: '#2c3e50',
          padding: [3, 8],
          borderRadius: 4,
          position: 'insideEndTop',
          fontSize: 11,
        },
        lineStyle: { color: '#2c3e50', width: 2.5 },
      });
    }

    // ====== 关键分位数标记线 ======
    const keyMarkLines: any[] = [
      [
        {
          xAxis: minP,
        },
        {
          xAxis: minP,
          label: {
            formatter: '最低 ' + fmt(minP),
            color: '#c97168',
            position: 'insideStartTop',
            fontSize: 10,
          },
        },
      ],
      [
        { xAxis: med },
        {
          xAxis: med,
          label: {
            formatter: '中位数 ' + fmt(med),
            color: '#8e44ad',
            position: 'insideEndTop',
            fontSize: 10,
          },
        },
      ],
      [
        { xAxis: p75 },
        {
          xAxis: p75,
          label: {
            formatter: 'P75 ' + fmt(p75),
            color: '#5fb374',
            position: 'insideEndTop',
            fontSize: 10,
          },
        },
      ],
      [
        { xAxis: maxP },
        {
          xAxis: maxP,
          label: {
            formatter: '最高 ' + fmt(maxP),
            color: '#5fb374',
            position: 'insideEndTop',
            fontSize: 10,
          },
        },
      ],
    ];

    const option: echarts.EChartsOption = {
      grid: { left: 40, right: 40, top: 50, bottom: 75 },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          if (p.componentType === 'markArea') {
            return `${p.name}<br/>价格范围: <b>${fmt(p.value.xAxisStart)} ~ ${fmt(
              p.value.xAxisEnd,
            )}</b>`;
          }
          return `价格: <b>${fmt(p.value[0])}</b>`;
        },
      },
      xAxis: {
        type: 'value',
        min: axisMin,
        max: axisMax,
        // 完整坐标轴样式
        axisLine: { show: true, lineStyle: { color: '#bdc3c7', width: 1.5 } },
        axisTick: {
          show: true,
          length: 6,
          lineStyle: { color: '#bdc3c7' },
        },
        axisLabel: {
          formatter: (v: number) => fmt(v),
          fontSize: 11,
          color: '#7f8c8d',
          margin: 12,
        },
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(189,195,199,0.3)', type: 'dashed' },
        },
      },
      yAxis: { show: false, min: 0, max: 1.2 },
      series: [
        // ====== 主色带: 三个区间按真实价格比例显示 ======
        {
          type: 'custom',
          data: [1],
          renderItem: () => ({ type: 'group', children: [] }),
          silent: true,
          markArea: {
            silent: true,
            itemStyle: { borderWidth: 0 },
            label: {
              show: true,
              position: 'inside',
              fontSize: 12,
              fontWeight: 600,
            },
            data: [
              [
                {
                  name: '高胜率买区',
                  xAxis: minP,
                  itemStyle: { color: 'rgba(232,138,131,0.22)' },
                  label: {
                    color: '#c97168',
                    formatter: '高胜率买区\n' + fmt(minP) + ' ~ ' + fmt(med),
                  },
                },
                { xAxis: med },
              ],
              [
                {
                  name: '中性区',
                  xAxis: med,
                  itemStyle: { color: 'rgba(149,165,166,0.14)' },
                  label: {
                    color: '#7f8c8d',
                    formatter: '中性区\n' + fmt(med) + ' ~ ' + fmt(p75),
                  },
                },
                { xAxis: p75 },
              ],
              [
                {
                  name: '高收益卖区',
                  xAxis: p75,
                  itemStyle: { color: 'rgba(125,200,143,0.22)' },
                  label: {
                    color: '#5fb374',
                    formatter: '高收益卖区\n' + fmt(p75) + ' ~ ' + fmt(maxP),
                  },
                },
                { xAxis: maxP },
              ],
            ],
          },
        },
        // ====== 区间分界线 (min / median / p75 / max) ======
        {
          type: 'line',
          data: [
            [minP, 0],
            [minP, 1.05],
          ],
          symbol: 'none',
          lineStyle: { color: 'transparent' },
          markLine: {
            symbol: 'none',
            animation: false,
            silent: true,
            data: keyMarkLines,
          },
        },
        // ====== 网格买点虚线 ======
        {
          type: 'line',
          data: [
            [minP, 0],
            [maxP, 0],
          ],
          symbol: 'none',
          lineStyle: { color: 'transparent' },
          markLine: {
            symbol: 'none',
            animation: false,
            silent: true,
            data: gridLineData,
          },
        },
        // ====== 当前价标记线 ======
        {
          type: 'line',
          data: [
            [minP, 0],
            [maxP, 0],
          ],
          symbol: 'none',
          lineStyle: { color: 'transparent' },
          markLine: {
            symbol: 'triangle',
            symbolSize: 10,
            animation: false,
            silent: true,
            data: currentLineData,
          },
        },
        // ====== 底部彩色坐标轴色带 (辅助识别) ======
        {
          type: 'custom',
          data: [0.05],
          renderItem: (params: any, api: any) => {
            // 在图表底部绘制一条 0.08 高度的色带
            const bandTop = 0.94;
            const bandBottom = 1.0;
            const point1 = api.coord([minP, bandTop]);
            const point2 = api.coord([med, bandBottom]);
            const point3 = api.coord([p75, bandTop]);
            const point4 = api.coord([maxP, bandBottom]);
            return {
              type: 'group',
              children: [
                {
                  type: 'rect',
                  shape: {
                    x: point1[0],
                    y: point1[1],
                    width: point2[0] - point1[0],
                    height: point2[1] - point1[1],
                  },
                  style: { fill: '#e88a83', opacity: 0.7 },
                },
                {
                  type: 'rect',
                  shape: {
                    x: point2[0],
                    y: point1[1],
                    width: point3[0] - point2[0],
                    height: point2[1] - point1[1],
                  },
                  style: { fill: '#95a5a6', opacity: 0.5 },
                },
                {
                  type: 'rect',
                  shape: {
                    x: point3[0],
                    y: point1[1],
                    width: point4[0] - point3[0],
                    height: point2[1] - point1[1],
                  },
                  style: { fill: '#7dc88f', opacity: 0.7 },
                },
              ],
            };
          },
          silent: true,
          z: 2,
        },
      ],
    };

    chartInstance.current.setOption(option, true);
    chartInstance.current.resize();
  }, [ps, cfg, lastClose]);

  return <div id="zone-chart" ref={chartRef} className="w-full h-[280px]" />;
}
