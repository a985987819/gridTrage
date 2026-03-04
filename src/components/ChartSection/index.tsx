import { useEffect, useRef } from 'react';
import { Card } from 'antd';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { TradeRecord } from '../../types';
import { getChartData } from '../../utils/dateUtils';

interface ChartSectionProps {
  records: TradeRecord[];
}

const ChartSection: React.FC<ChartSectionProps> = ({ records }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化ECharts实例
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 更新图表数据
    const updateChart = () => {
      const { dates, profitData, countData } = getChartData(records);

      const option: EChartsOption = {
        title: {
          text: '股票网格交易营收统计',
          left: 'center',
          textStyle: { fontSize: 16, fontWeight: 500 }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        legend: { data: ['已实现营收 (元)', '交易次数'], top: 30 },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates
        },
        yAxis: [
          {
            type: 'value',
            name: '营收 (元)',
            position: 'left',
            axisLine: { lineStyle: { color: '#52c41a' } },
          },
          {
            type: 'value',
            name: '次数',
            position: 'right',
            axisLine: { lineStyle: { color: '#1890ff' } },
          }
        ],
        series: [
          {
            name: '已实现营收 (元)',
            type: 'bar',
            yAxisIndex: 0,
            data: profitData,
            itemStyle: { color: '#ef5c53' }
          },
          {
            name: '交易次数',
            type: 'line',
            yAxisIndex: 1,
            data: countData,
            itemStyle: { color: '#1890ff' },
            lineStyle: { width: 2 },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      };

      chartInstance.current?.setOption(option);
    };

    updateChart();

    // 响应窗口大小变化
    const resizeHandler = () => chartInstance.current?.resize();
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, [records]);

  // 组件卸载时销毁图表
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <Card title="交易数据分析" style={{ marginBottom: 24 }}>
      <div
        ref={chartRef}
        style={{ width: '100%', height: 400 }}
      />
    </Card>
  );
};

export default ChartSection;
