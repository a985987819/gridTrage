import { useState } from 'react';
import type { StockConfig } from '../types';

interface ConfigPanelProps {
  config: StockConfig;
  visible: boolean;
  onSave: (newConfig: StockConfig) => void;
  onLoadPreset: () => void;
}

/** 交易参数配置面板(默认折叠) */
export function ConfigPanel({ config, visible, onSave, onLoadPreset }: ConfigPanelProps) {
  const [form, setForm] = useState<StockConfig>(config);

  // 当 config 变化时同步到 form
  if (visible && form !== config && form.stockName !== config.stockName) {
    // 仅在 config 真正变化时同步
    setForm(config);
  }

  const update = <K extends keyof StockConfig>(key: K, value: StockConfig[K]) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = () => {
    onSave({
      ...form,
      priceStats: config.priceStats, // 保留价格统计
    });
  };

  if (!visible) return null;

  return (
    <div id="config-card" className="card">
      <div className="card-title">
        交易参数配置 <span className="badge">修改后点击保存</span>
      </div>
      <div className="grid gap-[10px] grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <ConfigField label="基准价(起始收盘价)">
          <input
            id="cfg-base-price"
            type="number"
            step="0.01"
            className="input-base w-full"
            value={form.basePrice}
            onChange={(e) => update('basePrice', parseFloat(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="股票名称">
          <input
            id="cfg-stock-name"
            type="text"
            className="input-base w-full"
            value={form.stockName}
            onChange={(e) => update('stockName', e.target.value)}
          />
        </ConfigField>
        <ConfigField label="股票代码">
          <input
            id="cfg-stock-code"
            type="text"
            className="input-base w-full"
            value={form.stockCode}
            onChange={(e) => update('stockCode', e.target.value)}
          />
        </ConfigField>
        <ConfigField label="底仓股数">
          <input
            id="cfg-base-shares"
            type="number"
            step="100"
            className="input-base w-full"
            value={form.baseShares}
            onChange={(e) => update('baseShares', parseInt(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="初始额外资金">
          <input
            id="cfg-start-capital"
            type="number"
            step="1000"
            className="input-base w-full"
            value={form.startCapital}
            onChange={(e) => update('startCapital', parseFloat(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="网格间距(买入)">
          <input
            id="cfg-grid-drop"
            type="number"
            step="0.01"
            className="input-base w-full"
            value={form.gridDrop}
            onChange={(e) => update('gridDrop', parseFloat(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="网格利润(卖出)">
          <input
            id="cfg-grid-profit"
            type="number"
            step="0.01"
            className="input-base w-full"
            value={form.gridProfit}
            onChange={(e) => update('gridProfit', parseFloat(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="基础买入金额">
          <input
            id="cfg-base-buy-amount"
            type="number"
            step="100"
            className="input-base w-full"
            value={form.baseBuyAmount}
            onChange={(e) => update('baseBuyAmount', parseFloat(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="佣金费率(万一填0.0001)">
          <input
            id="cfg-commission"
            type="number"
            step="0.0001"
            className="input-base w-full"
            value={form.commissionRate}
            onChange={(e) => update('commissionRate', parseFloat(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="印花税率(卖出)">
          <input
            id="cfg-stamp-duty"
            type="number"
            step="0.0001"
            className="input-base w-full"
            value={form.stampDutyRate}
            onChange={(e) => update('stampDutyRate', parseFloat(e.target.value))}
          />
        </ConfigField>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn btn-primary" onClick={handleSave}>
          保存参数
        </button>
        <button className="btn btn-outline" onClick={onLoadPreset}>
          载入当前股票预设
        </button>
      </div>
    </div>
  );
}

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="config-field flex flex-col gap-1">
      <label className="text-[11px] text-[#95a5a6]">{label}</label>
      {children}
    </div>
  );
}
