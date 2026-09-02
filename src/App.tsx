import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData, SyncStatus, ToastType } from './types';
import { STOCK_PRESETS } from './constants/presets';
import {
  createFreshStockData,
  loadState,
  migrateLegacyDataToIdentity,
  recordBackupTime,
  saveState,
  shouldRemindBackup,
} from './services/storage';
import {
  deactivateSync,
  getSyncStatus,
  initSync,
  injectSyncHooks,
  onSyncStatusChange,
  pullNow,
  schedulePush,
} from './services/cloudSync';
import { clearSyncIdentity, getSyncUserId, setSyncIdentity } from './services/syncIdentity';
import {
  deletePosition,
  deleteTrade,
  executeBatchSell,
  executeBuy,
  executeSell,
  linkPositionsToSell,
  savePositionEdit,
  saveStockConfig,
  saveTradeEdit,
} from './services/trading';
import { exportSyncFile } from './services/sync';
import { importExcelToAppData, parseExcelFile } from './services/excelImport';
import { exportAppDataToExcel } from './services/excelExport';
import { todayStr } from './utils/format';
import { CapitalChart } from './components/CapitalChart';
import { ConfigPanel } from './components/ConfigPanel';
import { GridLevelStats } from './components/GridLevelStats';
import { Header } from './components/Header';
import { Modal } from './components/Modal';
import { MonthlyStats } from './components/MonthlyStats';
import { OperationPanel } from './components/OperationPanel';
import { OverviewGrid } from './components/OverviewGrid';
import { PendingSellSummary } from './components/PendingSellSummary';
import { PlanGrid } from './components/PlanGrid';
import { PositionsTable } from './components/PositionsTable';
import { StockSwitcher } from './components/StockSwitcher';
import { SyncPanel } from './components/SyncPanel';
import { Toast } from './components/Toast';
import { TradeCalendar } from './components/TradeCalendar';
import { TradesTable } from './components/TradesTable';
import { UnifiedTradeTable } from './components/UnifiedTradeTable';
import { ZoneAnalysis } from './components/ZoneAnalysis';

type ViewMode = 'unified' | 'positions' | 'completed';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => loadState());
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [configVisible, setConfigVisible] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
    msg: '',
    type: 'info',
    visible: false,
  });
  const [modal, setModal] = useState<{
    title: string;
    text: string;
    visible: boolean;
    callback?: () => void;
  }>({ title: '', text: '', visible: false });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncPanelVisible, setSyncPanelVisible] = useState(false);
  const [highlightedPosIds, setHighlightedPosIds] = useState<number[]>([]);
  const [showBackupReminder, setShowBackupReminder] = useState(shouldRemindBackup());
  const excelInputRef = useRef<HTMLInputElement>(null);
  const appDataRef = useRef(appData);
  appDataRef.current = appData;

  useEffect(() => {
    (window as Window & { appData?: AppData }).appData = appData;
  }, [appData]);

  const stock = appData.stocks[appData.currentStockKey];

  useEffect(() => {
    injectSyncHooks({
      getAppData: () => appDataRef.current,
      applyRemote: (remote) => {
        setAppData(remote);
        saveState(remote);
      },
    });
    const cleanupSync = initSync();
    const unsub = onSyncStatusChange(setSyncStatus);
    setSyncStatus(getSyncStatus());
    return () => {
      unsub();
      cleanupSync();
    };
  }, []);

  useEffect(() => {
    schedulePush();
  }, [appData]);

  const updateCurrentStock = useCallback((updater: (prev: typeof stock) => typeof stock) => {
    setAppData((prev) => {
      const newStock = updater(prev.stocks[prev.currentStockKey]);
      const newData = { ...prev, stocks: { ...prev.stocks, [prev.currentStockKey]: newStock } };
      saveState(newData);
      return newData;
    });
  }, []);

  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    setToast({ msg, type, visible: true });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showModal = useCallback((title: string, text: string, callback?: () => void) => {
    setModal({ title, text, visible: true, callback });
  }, []);

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, visible: false, callback: undefined }));
  }, []);

  const onModalConfirm = useCallback(() => {
    modal.callback?.();
    closeModal();
  }, [modal, closeModal]);

  const switchStock = (key: string) => {
    if (appData.currentStockKey === key) return;
    setAppData((prev) => {
      const newData = { ...prev, currentStockKey: key };
      saveState(newData);
      return newData;
    });
    showToast(`已切换到 ${STOCK_PRESETS[key].stockName}`, 'info');
  };

  const handleExecuteBuy = (price: number, lots: number, date: string) => {
    const result = executeBuy(stock, price, lots, date);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, result.toast.type === 'warn' ? 'warn' : 'success');
  };

  const handleExecuteSell = (posId: number, price: number, lots: number, date: string) => {
    const result = executeSell(stock, posId, price, lots, date);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, result.toast.type === 'warn' ? 'warn' : 'success');
  };

  const quickBuy = (price: number, lots: number) => {
    handleExecuteBuy(price, lots, todayStr());
  };

  const quickSell = (posId: number) => {
    const pos = stock.positions.find((item) => item.id === posId);
    if (!pos) return;
    handleExecuteSell(posId, pos.targetSellPrice, pos.lots, todayStr());
  };

  const setLastClose = (val: number | null) => {
    updateCurrentStock((prev) => ({ ...prev, lastClosePrice: val }));
    if (val) showToast(`已设置 2026-07-29 收盘价: ${val}`, 'success');
  };

  const highlightSellPlan = (posId: number) => {
    const el = document.getElementById(`sell-plan-item-${posId}`);
    if (el) {
      el.classList.remove('tr-flash');
      void el.offsetWidth;
      el.classList.add('tr-flash');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleLinkSell = (sellPrice: number, positionIds: number[]) => {
    updateCurrentStock((prev) => linkPositionsToSell(prev, sellPrice, positionIds));
    showToast(`已关联 ${positionIds.length} 笔持仓到 ${sellPrice.toFixed(2)} 元卖价`, 'success');
  };

  const handleBatchSell = (posIds: number[], sellPrice: number) => {
    const result = executeBatchSell(stock, posIds, sellPrice, todayStr());
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, 'success');
  };

  const handleBatchSellFromOp = (posIds: number[], sellPrice: number, date: string) => {
    const result = executeBatchSell(stock, posIds, sellPrice, date);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, 'success');
  };

  const handleExportExcel = () => {
    exportAppDataToExcel(appData, showToast);
    recordBackupTime();
    setShowBackupReminder(false);
  };

  const handleEnableIdentity = async (pin: string) => {
    await setSyncIdentity(pin);
    migrateLegacyDataToIdentity(getSyncUserId());
    window.location.reload();
  };

  const handleClearIdentity = () => {
    clearSyncIdentity();
    deactivateSync();
    window.location.reload();
  };

  const handleSyncNow = () => {
    void pullNow();
  };

  const handleSaveConfig = (newConfig: typeof stock.config) => {
    updateCurrentStock((prev) => saveStockConfig(prev, newConfig));
    setConfigVisible(false);
    showToast('参数已保存', 'success');
  };

  const loadPreset = () => {
    const key = appData.currentStockKey;
    updateCurrentStock(() => createFreshStockData(key));
    showToast(`已加载 ${STOCK_PRESETS[key].stockName} 预设参数`, 'success');
  };

  const confirmReset = () => {
    const name = STOCK_PRESETS[appData.currentStockKey].stockName;
    showModal('重置确认', `将清空 ${name} 的全部交易记录和持仓，恢复初始状态。是否继续？`, () => {
      const key = appData.currentStockKey;
      updateCurrentStock(() => createFreshStockData(key));
      showToast(`${name} 已重置`, 'success');
    });
  };

  const handleImportExcel = () => {
    excelInputRef.current?.click();
  };

  const handleExcelFile = async (file: File) => {
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel');
    if (!isExcel) {
      showToast('仅支持 .xlsx / .xls 文件', 'warn');
      return;
    }

    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        showToast('Excel 文件为空或无有效数据', 'warn');
        return;
      }
      showModal(
        '导入 Excel 确认',
        `检测到 ${rows.length} 条记录。导入会覆盖匹配股票的持仓与已完成交易，并自动识别档位周期，是否继续？`,
        () => {
          try {
            const { data: newData, summary } = importExcelToAppData(appDataRef.current, rows);
            setAppData(newData);
            saveState(newData);

            const parts = [`成功导入 ${summary.imported} 条`, `跳过 ${summary.skipped} 条`];
            if (summary.stocksUpdated.length > 0) parts.push(`更新股票: ${summary.stocksUpdated.join(', ')}`);
            if (summary.skippedStocks.length > 0) parts.push(`未识别股票: ${summary.skippedStocks.join(', ')}`);
            showToast(parts.join(' | '), summary.imported > 0 ? 'success' : 'warn');
          } catch (err) {
            console.error(err);
            showToast(`导入失败: ${(err as Error).message}`, 'error');
          }
        },
      );
    } catch (err) {
      console.error(err);
      showToast(`解析 Excel 失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    handleExcelFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleExcelFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const exportData = () => {
    const data = JSON.stringify(appData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid_trading_${appData.currentStockKey}_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordBackupTime();
    setShowBackupReminder(false);
    showToast('数据已导出', 'success');
  };

  const handleDeletePosition = (id: number) => {
    showModal('删除确认', `确定删除持仓 #${id} 吗？此操作不可撤销。`, () => {
      updateCurrentStock((prev) => deletePosition(prev, id));
      showToast('持仓已删除', 'success');
    });
  };

  const handleSavePosEdit = (
    id: number,
    data: { buyPrice: number; buyDate: string; lots: number; buyCost: number; sellPrice: number },
  ) => {
    const result = savePositionEdit(stock, id, data);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, 'success');
  };

  const handleDeleteTrade = (id: number) => {
    showModal('删除确认', `确定删除交易 #${id} 吗？此操作不可撤销。`, () => {
      updateCurrentStock((prev) => deleteTrade(prev, id));
      showToast('交易已删除', 'success');
    });
  };

  const handleSaveTradeEdit = (
    id: number,
    data: {
      buyPrice: number;
      buyDate: string;
      lots: number;
      buyCost: number;
      sellPrice: number;
      sellDate: string;
      netProceeds: number;
    },
  ) => {
    const result = saveTradeEdit(stock, id, data);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, 'success');
  };

  return (
    <div className="app-root relative mx-auto max-w-[1380px] p-4" id="app-root" onDrop={handleDrop} onDragOver={handleDragOver}>
      <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFileChange} />
      <StockSwitcher appData={appData} onSwitch={switchStock} />
      <Header
        config={stock.config}
        syncStatus={syncStatus}
        showBackupReminder={showBackupReminder}
        onToggleConfig={() => setConfigVisible((prev) => !prev)}
        onOpenSyncPanel={() => setSyncPanelVisible(true)}
        onExportSyncFile={() => exportSyncFile(appData, showToast)}
        onExportData={exportData}
        onExportExcel={handleExportExcel}
        onConfirmReset={confirmReset}
        onImportExcel={handleImportExcel}
      />
      <ConfigPanel config={stock.config} visible={configVisible} onSave={handleSaveConfig} onLoadPreset={loadPreset} />

      <div className="mb-4">
        <OverviewGrid stock={stock} />
      </div>

      <PlanGrid
        stock={stock}
        onQuickBuy={quickBuy}
        onHoverSell={(posIds) => setHighlightedPosIds(posIds)}
        onHoverSellEnd={() => setHighlightedPosIds([])}
        onLinkSell={handleLinkSell}
        onBatchSell={handleBatchSell}
      />

      <GridLevelStats stock={stock} />
      <MonthlyStats stock={stock} />
      <CapitalChart stock={stock} />
      <ZoneAnalysis stock={stock} onLastCloseChange={setLastClose} />
      <PendingSellSummary stock={stock} />
      <OperationPanel
        stock={stock}
        onExecuteBuy={handleExecuteBuy}
        onExecuteSell={handleExecuteSell}
        onExecuteBatchSell={handleBatchSellFromOp}
      />
      <TradeCalendar stock={stock} />

      <div className="card">
        <div className="card-title">
          交易明细视图
          <div className="flex gap-2">
            {([
              ['unified', '统一视图'],
              ['positions', '持仓明细'],
              ['completed', '已完成交易'],
            ] as Array<[ViewMode, string]>).map(([mode, label]) => (
              <button
                key={mode}
                className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setViewMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'unified' && <UnifiedTradeTable stock={stock} />}
        {viewMode === 'positions' && (
          <PositionsTable
            stock={stock}
            onQuickSell={quickSell}
            onHighlightSellPlan={highlightSellPlan}
            highlightedPosIds={highlightedPosIds}
            onHoverPosition={(posIds) => setHighlightedPosIds(posIds)}
            onHoverPositionEnd={() => setHighlightedPosIds([])}
            onStartEdit={(id) => updateCurrentStock((prev) => ({ ...prev, _editingPosId: id }))}
            onCancelEdit={() => updateCurrentStock((prev) => ({ ...prev, _editingPosId: undefined }))}
            onSaveEdit={handleSavePosEdit}
            onDelete={handleDeletePosition}
          />
        )}
        {viewMode === 'completed' && (
          <TradesTable
            stock={stock}
            onStartEdit={(id) => updateCurrentStock((prev) => ({ ...prev, _editingTradeId: id }))}
            onCancelEdit={() => updateCurrentStock((prev) => ({ ...prev, _editingTradeId: undefined }))}
            onSaveEdit={handleSaveTradeEdit}
            onDelete={handleDeleteTrade}
          />
        )}
      </div>

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} onClose={closeToast} />
      <Modal title={modal.title} text={modal.text} visible={modal.visible} onConfirm={onModalConfirm} onCancel={closeModal} />
      <SyncPanel
        visible={syncPanelVisible}
        onClose={() => setSyncPanelVisible(false)}
        syncStatus={syncStatus}
        onEnableIdentity={handleEnableIdentity}
        onClearIdentity={handleClearIdentity}
        onSyncNow={handleSyncNow}
      />
    </div>
  );
}
