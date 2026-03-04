// src/components/CalendarPicker/index.tsx
import { useState, useEffect } from 'react';
import { Button, Typography, Space, Tooltip } from 'antd';
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
  onDateSelect: (type: 'year' | 'month', date: Date) => void;
  filterType: 'year' | 'month';
  selectedDate: Date;
  onBackToToday: () => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  records,
  onDateSelect,
  filterType,
  selectedDate,
  onBackToToday
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);
  const [recordDateStats, setRecordDateStats] = useState<any>({});

  useEffect(() => {
    setRecordDateStats(getRecordDateStats(records));
  }, [records]);

  const handlePrevYear = () => setCurrentDate(addYears(currentDate, -1));
  const handleNextYear = () => setCurrentDate(addYears(currentDate, 1));
  const handlePrevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // 手动生成当月日历格子（按月显示每日统计）
  const renderCalendarGrid = () => {
    const today = dayjs(currentDate);
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
        onDateSelect(filterType, date.toDate());
      };

      return (
        <Tooltip
          key={day}
          title={hasRecord ? (
            <div style={{ textAlign: 'left' }}>
              <div>买入：{dayStats.count} 笔</div>
              <div>成功：{dayStats.successCount} 笔</div>
              <div>盈利：¥ {dayStats.profit.toFixed(2)}</div>
            </div>
          ) : '无交易记录'}
          placement="top"
        >
          <div
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
            <span style={{ fontSize: '14px' }}>{day}</span>
            {hasRecord && (
              <div style={{ fontSize: '10px', marginTop: '2px', textAlign: 'center' }}>
                <div>买：{dayStats.count}</div>
                <div style={{ color: '#52c41a' }}>成：{dayStats.successCount}</div>
                <div style={{ color: '#fa8c16' }}>¥{dayStats.profit.toFixed(2)}</div>
              </div>
            )}
          </div>
        </Tooltip>
      );
    });

    return [...emptyCells, ...dateCells];
  };

  // 按年查看时显示年份选择
  const renderYearSelector = () => {
    const years = Array.from({ length: 10 }, (_, i) => 2020 + i); // 2020-2029年
    const currentYear = dayjs(currentDate).year();

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '16px' }}>
        {years.map(year => {
          const hasRecord = records.some(record => dayjs(record.timestamp).year() === year);
          const isSelected = year === dayjs(selectedDate).year();

          return (
            <div
              key={year}
              onClick={() => hasRecord && onDateSelect('year', new Date(year, 0, 1))}
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
            ? dayjs(currentDate).format('YYYY年')
            : dayjs(currentDate).format('YYYY年MM月')}
        </Title>
        <Space>
          <Button onClick={handlePrevYear} icon={<LeftOutlined />}>上一年</Button>
          {filterType === 'month' && (
            <Button onClick={handlePrevMonth} icon={<LeftOutlined />}>上月</Button>
          )}
          {filterType === 'month' && (
            <Button onClick={handleNextMonth} icon={<RightOutlined />}>下月</Button>
          )}
          <Button onClick={handleNextYear} icon={<RightOutlined />}>下一年</Button>
          <Button onClick={onBackToToday} icon={<CalendarOutlined />} type="primary">
            回到今日
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
