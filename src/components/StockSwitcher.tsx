import type { AppData } from '../types';
import { STOCK_PRESETS } from '../constants/presets';
import { fmt } from '../utils/format';

interface StockSwitcherProps {
  appData: AppData;
  onSwitch: (key: string) => void;
}

/** 股票切换 Tab */
export function StockSwitcher({ appData, onSwitch }: StockSwitcherProps) {
  const keys = Object.keys(appData.stocks);
  return (
    <div id="stock-switcher" className="flex gap-[10px] mb-4 flex-wrap">
      {keys.map((key) => {
        const s = appData.stocks[key];
        const cfg = s.config;
        const active = key === appData.currentStockKey;
        const profit = s.accumulatedProfit;
        const hasData = s.completedTrades.length > 0 || s.positions.length > 0;
        return (
          <div
            key={key}
            id={`tab-${key}`}
            data-key={key}
            onClick={() => onSwitch(key)}
            className={`stock-tab relative bg-white rounded-[10px] px-5 py-[14px] cursor-pointer border-2 border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-200 flex items-center gap-[10px] flex-1 max-w-[320px] hover:border-[#d0d0d0] hover:-translate-y-px ${
              active ? '!border-[#3498db] bg-gradient-to-br from-[#ebf5fb] to-white' : ''
            }`}
          >
            <span className="tab-name text-base font-bold">{cfg.stockName}</span>
            <span className="tab-code text-xs text-[#999]">{cfg.stockCode}</span>
            <span
              className={`tab-info text-[11px] ${
                active ? 'bg-[#3498db] text-white' : 'bg-[#ebf5fb] text-[#3498db]'
              } px-2 py-[2px] rounded-[10px] ml-auto`}
            >
              {cfg.gridDrop}买 / {cfg.gridProfit}卖
            </span>
            {hasData && (
              <span
                className={`tab-profit absolute top-[-6px] right-[-6px] ${
                  profit < 0 ? 'bg-[#c97168]' : 'bg-[#5fb374]'
                } text-white text-[10px] px-[6px] py-px rounded-[8px] font-semibold`}
              >
                {profit >= 0 ? '+' : ''}
                {fmt(profit, 0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
