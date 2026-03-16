// src/components/CalendarPicker/index.tsx
import { useState, useEffect } from 'react';
import { Button, Typography, Space } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { TradeRecord } from '../../types';
import {
  getRecordDateStats,
  addYears,
  addMonths,
  formatDate
} from '../../utils/dateUtils';

const { Title } = Typography;

interface CalendarPickerProps {
  records: TradeRecord[];
  onDateSelect: (type: 'year' | 'month' | 'week', date: Date) => void;
  filterType: 'year' | 'month' | 'week';
  selectedDate: Date;
  onBackToToday: () => void;
  currentDate?: Date;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  records,
  onDateSelect,
  filterType,
  selectedDate,
  onBackToToday,
  currentDate = new Date(),
}) => {
  const [displayDate, setDisplayDate] = useState<Date>(currentDate);
  const [recordDateStats, setRecordDateStats] = useState<any>({});

  useEffect(() => {
    setRecordDateStats(getRecordDateStats(records));
  }, [records]);

  // 监听父组件 currentDate 变化，实时同步视图
  useEffect(() => {
    setDisplayDate(currentDate);
  }, [currentDate]);

  // 原有导航逻辑保留（上一年/下一年/上月/下月）
  const handlePrevYear = () => setDisplayDate(addYears(displayDate, -1));
  const handleNextYear = () => setDisplayDate(addYears(displayDate, 1));
  const handlePrevMonth = () => setDisplayDate(addMonths(displayDate, -1));
  const handleNextMonth = () => setDisplayDate(addMonths(displayDate, 1));

  // 切换过滤类型
  const handleFilterChange = (type: 'year' | 'month' | 'week', date: Date) => {
    onDateSelect(type, date);
  };

  // 手动生成当月日历格子（按月显示每日统计）
  const renderCalendarGrid = () => {
    const today = dayjs(displayDate); // 改用 displayDate
    const year = today.year();
    const month = today.month();
    const firstDayOfMonth = today.startOf('month');
    const daysInMonth = today.daysInMonth();
    const firstDayWeekday = firstDayOfMonth.day() || 7;

    // 前面的空白格子
    const emptyCells = Array(firstDayWeekday - 1).fill(null);
    // 当月的日期格子
    const dateCells = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = dayjs(`${year}-${month + 1}-${day}`);
      const dateStr = formatDate(date.toDate());
      const dayStats = recordDateStats[dateStr];
      const hasRecord = !!dayStats;
      const isSelected = date.isSame(dayjs(selectedDate), filterType === 'year' ? 'year' : 'day');

      // 日历格子点击事件
      const handleClick = () => {
        if (!hasRecord && filterType === 'month') return;
        handleFilterChange(filterType, date.toDate());
      };

      return (
        <div
          key={day}
          onClick={handleClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            aspectRatio: '1 / 1',
            backgroundColor: isSelected ? '#1890ff' : hasRecord ? '#eff6ff' : '#f9fafb',
            color: isSelected ? '#fff' : '#333',
            borderRadius: '4px',
            cursor: hasRecord || filterType === 'year' ? 'pointer' : 'not-allowed',
            padding: '4px'
          }}
        >
          <span style={{ fontSize: '25px' }}>{day}</span>
          {hasRecord && (
            <div style={{ fontSize: '10px', marginTop: '2px', textAlign: 'center' }}>
              <div>买：{dayStats.count}</div>
              <div style={{ color: '#52c41a' }}>成：{dayStats.successCount}</div>
              <div style={{ color: '#fa8c16' }}>¥{Number(dayStats.profit).toFixed(2)}</div>
              {/* 新增：完成进度 */}
              <div style={{ color: '#1890ff' }}>
                进度：{Math.round((dayStats.totalCompletedAmount / dayStats.totalBuyAmount) * 100)}%
              </div>
            </div>
          )}
        </div>
      );
    });

    return [...emptyCells, ...dateCells];
  };

  // 按年查看时显示年份选择
  const renderYearSelector = () => {
    const startYear = 2020;
    const currentYear = dayjs(displayDate).year();
    // 获取记录中的最早和最晚年份，以此为基础调整年份范围
    const recordYears = records.map(r => dayjs(r.timestamp).year());
    const minYear = recordYears.length > 0 ? Math.min(...recordYears) : startYear;
    const maxYear = recordYears.length > 0 ? Math.max(...recordYears) : currentYear;

    // 创建年份列表，包括记录中存在的年份及前后各2年的扩展
    const years = Array.from(
      { length: Math.max(maxYear - minYear + 5, 10) },
      (_, i) => minYear + i - 2
    ).filter(year => year >= 2020); // 限制最小年份为2020

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '16px' }}>
        {years.map(year => {
          const hasRecord = records.some(record => dayjs(record.timestamp).year() === year);
          const isSelected = year === dayjs(selectedDate).year();

          return (
            <div
              key={year}
              onClick={() => hasRecord && handleFilterChange('year', new Date(year, 0, 1))}
              style={{
                padding: '16px',
                textAlign: 'center',
                backgroundColor: isSelected ? '#1890ff' : hasRecord ? '#eff6ff' : '#f9fafb',
                color: isSelected ? '#fff' : '#333',
                borderRadius: '4px',
                cursor: hasRecord ? 'pointer' : 'not-allowed',
                fontWeight: isSelected ? 'bold' : 'normal'
              }}
            >
              {year}年
              {hasRecord && (
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  有交易记录
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {filterType === 'year'
            ? dayjs(displayDate).format('YYYY年')
            : filterType === 'month'
            ? dayjs(displayDate).format('YYYY年MM月')
            : filterType === 'week'
            ? `${dayjs(displayDate).startOf('week').format('MM月DD日')} - ${dayjs(displayDate).endOf('week').format('MM月DD日')}`
            : dayjs(displayDate).format('YYYY年MM月')}
        </Title>
        <Space>
          {filterType !== 'custom' && (
            <>
              <Button onClick={handlePrevYear} icon={<LeftOutlined />}>上一年</Button>
              {filterType === 'month' && (
                <Button onClick={handlePrevMonth} icon={<LeftOutlined />}>上月</Button>
              )}
              {filterType === 'month' && (
                <Button onClick={handleNextMonth} icon={<RightOutlined />}>下月</Button>
              )}
              <Button onClick={handleNextYear} icon={<RightOutlined />}>下一年</Button>
            </>
          )}
          <Button
            onClick={onBackToToday}
            icon={<CalendarOutlined />}
            type="primary"
          >
            回到今日
          </Button>
        </Space>
      </div>

      {/* 过滤类型切换按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            type={filterType === 'week' ? 'primary' : 'default'}
            onClick={() => handleFilterChange('week', new Date())}
          >
            本周
          </Button>
          <Button
            type={filterType === 'month' ? 'primary' : 'default'}
            onClick={() => handleFilterChange('month', new Date())}
          >
            本月
          </Button>
          <Button
            type={filterType === 'year' ? 'primary' : 'default'}
            onClick={() => handleFilterChange('year', new Date())}
          >
            今年
          </Button>
        </Space>
      </div>

      {/* 按年查看显示年份选择器，按月查看显示日历 */}
      {filterType === 'year'
        ? renderYearSelector()
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {['日', '一', '二', '三', '四', '五', '六'].map(weekday => (
              <div
                key={weekday}
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  padding: '8px 0',
                  color: '#666'
                }}
              >
                {weekday}
              </div>
            ))}
            {renderCalendarGrid()}
          </div>
        )
      }
    </div>
  );
};

export default CalendarPicker;