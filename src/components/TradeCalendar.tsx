import { useState, useMemo } from 'react';
import type { StockData } from '../types';
import { buildCalendarData, getTradeYearRange } from '../utils/trade-stats';
import { fmtMoney } from '../utils/format';

interface TradeCalendarProps {
  stock: StockData;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 交易日历视图 — 月视图，每日买卖摘要 */
export function TradeCalendar({ stock }: TradeCalendarProps) {
  const yearRange = getTradeYearRange(stock);
  const today = new Date();
  const [viewYear, setViewYear] = useState(yearRange.current);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calData = useMemo(
    () => buildCalendarData(stock, viewYear, viewMonth),
    [stock, viewYear, viewMonth],
  );

  // 第一天是周几 (0=周日)
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();

  // 获取选中日期的明细
  const selectedDay = calData.days.find((d) => d.date === selectedDate);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDate(null);
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() + 1 === viewMonth &&
    today.getDate() === day;

  return (
    <div className="card" id="trade-calendar">
      <div className="card-title">
        交易日历
        <div className="flex gap-2 items-center">
          <button className="btn btn-sm btn-outline" onClick={prevMonth}>
            ◀
          </button>
          <select
            value={viewYear}
            onChange={(e) => {
              setViewYear(parseInt(e.target.value, 10));
              setSelectedDate(null);
            }}
            className="input-base text-xs w-[80px]"
          >
            {Array.from(
              { length: yearRange.max - yearRange.min + 2 },
              (_, i) => yearRange.min + i,
            ).map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <select
            value={viewMonth}
            onChange={(e) => {
              setViewMonth(parseInt(e.target.value, 10));
              setSelectedDate(null);
            }}
            className="input-base text-xs w-[60px]"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
          <button className="btn btn-sm btn-outline" onClick={nextMonth}>
            ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 日历网格 */}
        <div>
          {/* 星期头 */}
          <div className="grid grid-cols-7 gap-[2px] mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-semibold text-[#95a5a6] py-1"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-[2px]">
            {/* 填充上个月的空白 */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {calData.days.map((d) => {
              const isActive = selectedDate === d.date;
              const isTd = isToday(d.dayOfMonth);

              let bgClass = 'bg-[#f8f9fa]';
              if (isActive) bgClass = 'bg-[#3498db] text-white';
              else if (isTd) bgClass = 'ring-2 ring-[#3498db] bg-[#f8f9fa]';

              return (
                <div
                  key={d.date}
                  className={`${bgClass} rounded-[4px] p-[2px] cursor-pointer hover:bg-[#eef6fc] min-h-[48px] flex flex-col text-[10px] ${isActive ? 'text-white' : 'text-[#555]'}`}
                  onClick={() =>
                    setSelectedDate(isActive ? null : d.date)
                  }
                  title={d.date}
                >
                  <span
                    className={`font-semibold text-[11px] ${isActive ? 'text-white' : isTd ? 'text-[#3498db]' : ''}`}
                  >
                    {d.dayOfMonth}
                  </span>
                  {d.buyCount > 0 && (
                    <span className="text-[#3498db] leading-tight">
                      买{d.buyCount}/{d.buyShares}
                    </span>
                  )}
                  {d.sellCount > 0 && (
                    <span className="text-[#e88a83] leading-tight">
                      卖{d.sellCount}/{d.sellShares}
                    </span>
                  )}
                  {d.profit !== 0 && (
                    <span
                      className={`leading-tight ${d.profit >= 0 ? 'text-[#5fb374]' : 'text-[#e88a83]'}`}
                    >
                      {d.profit >= 0 ? '+' : ''}
                      {fmtMoney(d.profit)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 当日明细 */}
        <div>
          <h4 className="text-sm font-semibold text-[#2c3e50] mb-3">
            {selectedDay ? selectedDay.date : '点击日期查看明细'}
          </h4>
          {selectedDay && selectedDay.hasActivity ? (
            <div className="space-y-3">
              {selectedDay.buyCount > 0 && (
                <div className="bg-[#eef6fc] rounded-[6px] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#3498db]" />
                    <span className="text-xs font-semibold text-[#3498db]">买入</span>
                    <span className="text-xs text-[#666]">
                      {selectedDay.buyCount}次, 共{selectedDay.buyShares}股
                    </span>
                  </div>
                  {/* 列出当天的买入明细 */}
                  {stock.positions
                    .filter((p) => p.buyDate === selectedDay.date)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="text-[11px] text-[#555] flex justify-between ml-4"
                      >
                        <span>
                          {p.buyPrice}元 {p.lots}手
                        </span>
                        <span>成本{fmtMoney(p.buyCost)}</span>
                      </div>
                    ))}
                </div>
              )}

              {selectedDay.sellCount > 0 && (
                <div className="bg-[#fdf0ef] rounded-[6px] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#e88a83]" />
                    <span className="text-xs font-semibold text-[#e88a83]">卖出</span>
                    <span className="text-xs text-[#666]">
                      {selectedDay.sellCount}次, 共{selectedDay.sellShares}股
                    </span>
                  </div>
                  {stock.completedTrades
                    .filter((t) => t.sellDate === selectedDay.date)
                    .map((t) => (
                      <div
                        key={t.tradeId}
                        className="text-[11px] text-[#555] flex justify-between ml-4"
                      >
                        <span>
                          {t.sellPrice}元 {t.buyLots}手
                        </span>
                        <span
                          className={
                            t.profit >= 0 ? 'text-[#5fb374]' : 'text-[#e88a83]'
                          }
                        >
                          {t.profit >= 0 ? '+' : ''}
                          {fmtMoney(t.profit)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {selectedDay.profit !== 0 && (
                <div className="bg-[#e8f5e9] rounded-[6px] p-3 text-center">
                  <span className="text-xs text-[#5fb374] font-semibold">
                    当日实现盈利: {selectedDay.profit >= 0 ? '+' : ''}
                    {fmtMoney(selectedDay.profit)}
                  </span>
                </div>
              )}
            </div>
          ) : selectedDay ? (
            <p className="text-sm text-[#95a5a6]">当日无交易记录</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
