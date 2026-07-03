import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppData, ToastType } from './types';
import { STOCK_PRESETS } from './constants/presets';
import { loadState, saveState, createFreshStockData } from './services/storage';
import {
  executeBuy,
  executeSell,
  executeBatchSell,
  linkPositionsToSell,
  deletePosition,
  savePositionEdit,
  deleteTrade,
  saveTradeEdit,
  saveStockConfig,
} from './services/trading';
import {
  autoSyncExport,
  restoreFileHandle,
  linkSyncFile,
  exportSyncFile,
} from './services/sync';
import { parseExcelFile, importExcelToAppData } from './services/excelImport';
import { todayStr } from './utils/format';

import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { StockSwitcher } from './components/StockSwitcher';
import { Header } from './components/Header';
import { ConfigPanel } from './components/ConfigPanel';
import { OverviewGrid } from './components/OverviewGrid';
import { ZoneAnalysis } from './components/ZoneAnalysis';
import { OperationPanel } from './components/OperationPanel';
import { PlanGrid } from './components/PlanGrid';
import { PositionsTable } from './components/PositionsTable';
import { TradesTable } from './components/TradesTable';

/** 应用根组件: 状态管理 + 视图编排 */
export default function App() {
  const [appData, setAppData] = useState<AppData>(() => loadState());
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
  const [syncFileLabel, setSyncFileLabel] = useState('关联同步文件');
  const [syncFileColor, setSyncFileColor] = useState<'green' | 'yellow' | 'default'>(
    'default',
  );
  // Excel 导入用的隐藏 file input
  const excelInputRef = useRef<HTMLInputElement>(null);
  // 卖单 hover 时高亮的关联买单ID集合
  const [highlightedPosIds, setHighlightedPosIds] = useState<number[]>([]);

  // 暴露给 window 以便调试
  useEffect(() => {
    (window as any).appData = appData;
  }, [appData]);

  // 当前股票
  const stock = appData.stocks[appData.currentStockKey];

  /** 自动同步导出 (依赖变化时触发) */
  const syncTimer = useRef<number | null>(null);
  useEffect(() => {
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      autoSyncExport(appData);
    }, 200);
    return () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [appData]);

  // 启动时恢复文件同步 handle
  useEffect(() => {
    restoreFileHandle((label, color) => {
      setSyncFileLabel(label);
      setSyncFileColor(color);
    });
  }, []);

  /** 更新当前股票数据 */
  const updateCurrentStock = useCallback(
    (updater: (prev: typeof stock) => typeof stock) => {
      setAppData((prev) => {
        const newStock = updater(prev.stocks[prev.currentStockKey]);
        const newData = {
          ...prev,
          stocks: { ...prev.stocks, [prev.currentStockKey]: newStock },
        };
        saveState(newData);
        return newData;
      });
    },
    [],
  );

  /** 显示 Toast */
  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    setToast({ msg, type, visible: true });
  }, []);

  /** 关闭 Toast */
  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  /** 显示 Modal */
  const showModal = useCallback((title: string, text: string, callback?: () => void) => {
    setModal({ title, text, visible: true, callback });
  }, []);

  /** 关闭 Modal */
  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, visible: false, callback: undefined }));
  }, []);

  /** Modal 确认 */
  const onModalConfirm = useCallback(() => {
    if (modal.callback) modal.callback();
    closeModal();
  }, [modal, closeModal]);

  // ===== 业务回调 =====

  /** 切换股票 */
  const switchStock = (key: string) => {
    if (appData.currentStockKey === key) return;
    setAppData((prev) => {
      const newData = { ...prev, currentStockKey: key };
      saveState(newData);
      return newData;
    });
    showToast(`已切换到 ${STOCK_PRESETS[key].stockName}`, 'info');
  };

  /** 执行买入 */
  const handleExecuteBuy = (price: number, lots: number, date: string) => {
    const result = executeBuy(stock, price, lots, date);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, result.toast.type === 'warn' ? 'warn' : 'success');
  };

  /** 执行卖出 */
  const handleExecuteSell = (
    posId: number,
    price: number,
    lots: number,
    date: string,
  ) => {
    const result = executeSell(stock, posId, price, lots, date);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, result.toast.type === 'warn' ? 'warn' : 'success');
  };

  /** 快速买入 (来自规划/今日挂单) */
  const quickBuy = (price: number, lots: number) => {
    handleExecuteBuy(price, lots, todayStr());
  };

  /** 快速卖出 */
  const quickSell = (posId: number) => {
    const pos = stock.positions.find((p) => p.id === posId);
    if (!pos) return;
    handleExecuteSell(posId, pos.targetSellPrice, pos.lots, todayStr());
  };

  /** 设置昨日收盘价 */
  const setLastClose = (val: number | null) => {
    updateCurrentStock((prev) => ({ ...prev, lastClosePrice: val }));
    if (val) showToast(`已设置昨日收盘价: ${val}`, 'success');
  };

  /** 高亮卖单规划项 */
  const highlightSellPlan = (posId: number) => {
    const el = document.getElementById(`sell-plan-item-${posId}`);
    if (el) {
      el.classList.remove('tr-flash');
      void el.offsetWidth;
      el.classList.add('tr-flash');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /** 卖单 hover: 高亮关联的买入项 */
  const handleHoverSell = (posIds: number[]) => {
    setHighlightedPosIds(posIds);
  };

  /** 卖单 hover 结束: 清除高亮 */
  const handleHoverSellEnd = () => {
    setHighlightedPosIds([]);
  };

  /** 关联买单到卖价 (支持多选, 数量/盈利合并) */
  const handleLinkSell = (sellPrice: number, positionIds: number[]) => {
    updateCurrentStock((prev) => linkPositionsToSell(prev, sellPrice, positionIds));
    showToast(
      `已关联 ${positionIds.length} 笔买单到 ${sellPrice.toFixed(2)}元卖价`,
      'success',
    );
  };

  /** 批量卖出: 一次性卖出此卖价关联的全部持仓 */
  const handleBatchSell = (posIds: number[], sellPrice: number) => {
    const result = executeBatchSell(stock, posIds, sellPrice, todayStr());
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, 'success');
  };

  /** 切换配置面板显示 */
  const toggleConfig = () => setConfigVisible((v) => !v);

  /** 保存配置 */
  const handleSaveConfig = (newConfig: typeof stock.config) => {
    updateCurrentStock((prev) => saveStockConfig(prev, newConfig));
    // 同步覆盖预设
    STOCK_PRESETS[appData.currentStockKey] = {
      ...STOCK_PRESETS[appData.currentStockKey],
      ...newConfig,
    };
    setConfigVisible(false);
    showToast('参数已保存并覆盖预设', 'success');
  };

  /** 载入预设 */
  const loadPreset = () => {
    const key = appData.currentStockKey;
    updateCurrentStock(() => createFreshStockData(key));
    showToast(`已载入${STOCK_PRESETS[key].stockName}预设参数`, 'success');
  };

  /** 重置当前股票 */
  const confirmReset = () => {
    const name = STOCK_PRESETS[appData.currentStockKey].stockName;
    showModal(
      '重置确认',
      `将清空 ${name} 的所有交易记录和持仓, 恢复初始状态。确定继续吗?`,
      () => {
        const key = appData.currentStockKey;
        updateCurrentStock(() => createFreshStockData(key));
        showToast(`${name} 已重置`, 'success');
      },
    );
  };

  /** 触发 Excel 文件选择 */
  const handleImportExcel = () => {
    excelInputRef.current?.click();
  };

  /** 处理 Excel 文件选中 */
  const handleExcelFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // 清空 input 以便重复选择同一文件
    e.target.value = '';
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        showToast('Excel 文件为空或无有效数据', 'warn');
        return;
      }
      showModal(
        '导入 Excel 确认',
        `检测到 ${rows.length} 条记录。导入将替换匹配股票的全部数据(持仓+已完成交易), 是否继续?`,
        async () => {
          try {
            const { data: newData, summary } = importExcelToAppData(appData, rows);
            setAppData(newData);
            saveState(newData);

            const parts: string[] = [
              `成功导入 ${summary.imported} 条`,
              `跳过 ${summary.skipped} 条`,
            ];
            if (summary.stocksUpdated.length > 0) {
              parts.push(`更新股票: ${summary.stocksUpdated.join(', ')}`);
            }
            if (summary.skippedStocks.length > 0) {
              parts.push(`未识别股票: ${summary.skippedStocks.join(', ')}`);
            }
            showToast(parts.join(' | '), summary.imported > 0 ? 'success' : 'warn');
          } catch (err) {
            console.error(err);
            showToast('导入失败: ' + (err as Error).message, 'error');
          }
        },
      );
    } catch (err) {
      console.error(err);
      showToast('解析 Excel 失败: ' + (err as Error).message, 'error');
    }
  };

  /** 导出全部数据 */
  const exportData = () => {
    const data = JSON.stringify(appData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid_trading_${appData.currentStockKey}_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出', 'success');
  };

  /** 关联同步文件 */
  const handleLinkSyncFile = () => {
    linkSyncFile(
      (msg, type) => showToast(msg, type),
      (label, color) => {
        setSyncFileLabel(label);
        setSyncFileColor(color);
      },
    );
  };

  /** 删除持仓 */
  const handleDeletePosition = (id: number) => {
    showModal('删除确认', `确定删除持仓 #${id} 吗? 此操作不可撤销。`, () => {
      updateCurrentStock((prev) => deletePosition(prev, id));
      showToast('持仓已删除', 'success');
    });
  };

  /** 保存持仓编辑 */
  const handleSavePosEdit = (
    id: number,
    data: {
      buyPrice: number;
      buyDate: string;
      lots: number;
      buyCost: number;
      sellPrice: number;
    },
  ) => {
    const result = savePositionEdit(stock, id, data);
    if (result.toast.type === 'error') {
      showToast(result.toast.msg, 'error');
      return;
    }
    updateCurrentStock(() => result.stock);
    showToast(result.toast.msg, 'success');
  };

  /** 删除交易 */
  const handleDeleteTrade = (id: number) => {
    showModal('删除确认', `确定删除交易 #${id} 吗? 此操作不可撤销。`, () => {
      updateCurrentStock((prev) => deleteTrade(prev, id));
      showToast('交易已删除', 'success');
    });
  };

  /** 保存交易编辑 */
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
    <div className="app-root max-w-[1300px] mx-auto p-4">
      <input
        id="excel-file-input"
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleExcelFileChange}
      />
      <StockSwitcher appData={appData} onSwitch={switchStock} />
      <Header
        config={stock.config}
        syncFileLabel={syncFileLabel}
        syncFileColor={syncFileColor}
        onToggleConfig={toggleConfig}
        onLinkSyncFile={handleLinkSyncFile}
        onExportSyncFile={() => exportSyncFile(showToast)}
        onExportData={exportData}
        onConfirmReset={confirmReset}
        onImportExcel={handleImportExcel}
      />
      <ConfigPanel
        config={stock.config}
        visible={configVisible}
        onSave={handleSaveConfig}
        onLoadPreset={loadPreset}
      />
      <div className="mb-4">
        <OverviewGrid stock={stock} />
      </div>
      <ZoneAnalysis stock={stock} onLastCloseChange={setLastClose} />
      <OperationPanel
        stock={stock}
        onExecuteBuy={handleExecuteBuy}
        onExecuteSell={handleExecuteSell}
      />
      <PlanGrid
        stock={stock}
        onQuickBuy={quickBuy}
        onHoverSell={handleHoverSell}
        onHoverSellEnd={handleHoverSellEnd}
        onLinkSell={handleLinkSell}
        onBatchSell={handleBatchSell}
      />
      <PositionsTable
        stock={stock}
        onQuickSell={quickSell}
        onHighlightSellPlan={highlightSellPlan}
        highlightedPosIds={highlightedPosIds}
        onStartEdit={(id) =>
          updateCurrentStock((prev) => ({ ...prev, _editingPosId: id }))
        }
        onCancelEdit={() =>
          updateCurrentStock((prev) => ({ ...prev, _editingPosId: undefined }))
        }
        onSaveEdit={handleSavePosEdit}
        onDelete={handleDeletePosition}
      />
      <TradesTable
        stock={stock}
        onStartEdit={(id) =>
          updateCurrentStock((prev) => ({ ...prev, _editingTradeId: id }))
        }
        onCancelEdit={() =>
          updateCurrentStock((prev) => ({ ...prev, _editingTradeId: undefined }))
        }
        onSaveEdit={handleSaveTradeEdit}
        onDelete={handleDeleteTrade}
      />

      <Toast
        message={toast.msg}
        type={toast.type}
        visible={toast.visible}
        onClose={closeToast}
      />
      <Modal
        title={modal.title}
        text={modal.text}
        visible={modal.visible}
        onConfirm={onModalConfirm}
        onCancel={closeModal}
      />
    </div>
  );
}
