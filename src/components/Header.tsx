import type { StockConfig } from '../types';

interface HeaderProps {
  config: StockConfig;
  syncFileLabel: string;
  syncFileColor: 'green' | 'yellow' | 'default';
  showBackupReminder: boolean;
  onToggleConfig: () => void;
  onLinkSyncFile: () => void;
  onExportSyncFile: () => void;
  onExportData: () => void;
  onExportExcel: () => void;
  onConfirmReset: () => void;
  onImportExcel: () => void;
}

/** 顶部标题与操作按钮 */
export function Header({
  config,
  syncFileLabel,
  syncFileColor,
  showBackupReminder,
  onToggleConfig,
  onLinkSyncFile,
  onExportSyncFile,
  onExportData,
  onExportExcel,
  onConfirmReset,
  onImportExcel,
}: HeaderProps) {
  const syncBg =
    syncFileColor === 'green'
      ? 'rgba(40,167,69,0.3)'
      : syncFileColor === 'yellow'
        ? 'rgba(255,193,7,0.3)'
        : 'rgba(255,255,255,0.15)';

  return (
    <div
      id="app-header"
      className="bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] text-white px-7 py-5 rounded-[12px] mb-4 flex justify-between items-center flex-wrap gap-3"
    >
      <div>
        <h1 id="app-title" className="text-xl">
          网格交易记账工具
          {showBackupReminder && (
            <span className="ml-2 inline-block bg-[#f39c12] text-white text-xs px-2 py-0.5 rounded-full align-middle font-normal">
              请备份
            </span>
          )}
        </h1>
        <div id="header-sub" className="header-sub text-xs opacity-70 mt-1">
          {config.stockName}({config.stockCode}) | 基准价: {config.basePrice} | 网格:{' '}
          {config.gridDrop}买 / {config.gridProfit}卖 | 底仓: {config.baseShares}股
        </div>
      </div>
      <div className="header-actions flex gap-2">
        <button
          id="btn-toggle-config"
          onClick={onToggleConfig}
          className="bg-white/15 text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
        >
          参数设置
        </button>
        <button
          id="btn-link-file"
          onClick={onLinkSyncFile}
          className="text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
          style={{ background: syncBg }}
        >
          {syncFileLabel}
        </button>
        <button
          id="btn-export-orders"
          onClick={onExportSyncFile}
          className="bg-white/15 text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
        >
          导出挂单
        </button>
        <button
          id="btn-import-excel"
          onClick={onImportExcel}
          className="bg-white/15 text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
        >
          导入Excel
        </button>
        <button
          id="btn-export-excel"
          onClick={onExportExcel}
          className="bg-white/15 text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
        >
          导出Excel
        </button>
        <button
          id="btn-export"
          onClick={onExportData}
          className="bg-white/15 text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
        >
          导出数据
        </button>
        <button
          id="btn-reset"
          onClick={onConfirmReset}
          className="bg-white/15 text-white border border-white/20 px-[14px] py-1.5 rounded-[6px] cursor-pointer text-xs hover:bg-white/25"
        >
          重置当前股票
        </button>
      </div>
    </div>
  );
}
