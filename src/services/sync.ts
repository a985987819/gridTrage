import type { AppData, SyncSummary } from '../types';
import { SYNC_DATA_KEY, SYNC_HTTP_URL } from '../constants/presets';
import { buildTodayBuyOrders, buildSellPlan } from './trading';
import { todayStr } from '../utils/format';

/**
 * 文件同步服务: 通过 File System Access API + HTTP 服务器两种通道同步数据
 */

let fileHandle: FileSystemFileHandle | null = null;

/** IndexedDB 包装: 用于持久化 file handle */
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('grid_trading_db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSaveHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'syncFile');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbLoadHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await idbOpen();
    return new Promise((resolve) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get('syncFile');
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbClearHandle(): Promise<void> {
  try {
    const db = await idbOpen();
    return new Promise((resolve) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').delete('syncFile');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/** 通过 File System Access API 写入文件 */
async function writeViaFileHandle(data: SyncSummary): Promise<boolean> {
  if (!fileHandle) return false;
  try {
    const handle = fileHandle as any;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const reqPerm = await handle.requestPermission({ mode: 'readwrite' });
      if (reqPerm !== 'granted') return false;
    }
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch (e) {
    console.warn('File System Access write failed:', e);
    return false;
  }
}

/** 用户选择同步目标文件 */
export async function linkSyncFile(
  onToast: (msg: string, type: 'success' | 'error' | 'warn' | 'info') => void,
  onLabelChange: (label: string, color: 'green' | 'yellow' | 'default') => void,
): Promise<void> {
  // 已有 handle 但权限丢失: 重新授权
  if (fileHandle) {
    try {
      const handle = fileHandle as any;
      const reqPerm = await handle.requestPermission({ mode: 'readwrite' });
      if (reqPerm === 'granted') {
        updateSyncFileLabel(onLabelChange);
        const syncData = localStorage.getItem(SYNC_DATA_KEY);
        if (syncData) {
          await writeViaFileHandle(JSON.parse(syncData));
        }
        onToast('文件授权已恢复，数据已同步', 'success');
        return;
      } else {
        onToast('授权被拒绝，请重新关联文件', 'warn');
      }
    } catch {
      /* fall through */
    }
  }

  if (!(window as any).showSaveFilePicker) {
    onToast('当前浏览器不支持 File System Access API，请使用 Chrome/Edge 86+', 'error');
    return;
  }
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'grid_sync_data.json',
      types: [
        {
          description: 'JSON 同步文件',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    fileHandle = handle as FileSystemFileHandle;
    await idbSaveHandle(fileHandle);

    const syncData = localStorage.getItem(SYNC_DATA_KEY);
    if (syncData) {
      const ok = await writeViaFileHandle(JSON.parse(syncData));
      if (ok) {
        onToast(`已关联文件: ${handle.name}，数据已同步`, 'success');
      } else {
        onToast(`已关联文件: ${handle.name}，但首次写入失败，请检查权限`, 'warn');
      }
    } else {
      onToast(`已关联文件: ${handle.name}`, 'success');
    }
    updateSyncFileLabel(onLabelChange);
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      onToast('关联文件失败: ' + e.message, 'error');
    }
  }
}

/** 启动时从 IndexedDB 恢复 file handle */
export async function restoreFileHandle(
  onLabelChange: (label: string, color: 'green' | 'yellow' | 'default') => void,
): Promise<void> {
  const handle = await idbLoadHandle();
  if (handle) {
    fileHandle = handle;
    try {
      const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        updateSyncFileLabel(onLabelChange);
      } else {
        updateSyncFileLabel(onLabelChange, true);
      }
    } catch {
      updateSyncFileLabel(onLabelChange, true);
    }
  }
}

/** 更新按钮显示状态 */
function updateSyncFileLabel(
  onLabelChange: (label: string, color: 'green' | 'yellow' | 'default') => void,
  needsRegrant = false,
): void {
  if (fileHandle) {
    if (needsRegrant) {
      onLabelChange('重新授权文件', 'yellow');
    } else {
      onLabelChange(`已关联: ${fileHandle.name}`, 'green');
    }
  } else {
    onLabelChange('关联同步文件', 'default');
  }
}

/** 同步数据到本地文件(多通道) */
async function syncToFile(data: SyncSummary): Promise<void> {
  // 通道1: File System Access API
  if (fileHandle) {
    const ok = await writeViaFileHandle(data);
    if (ok) return;
  }
  // 通道2: HTTP 本地服务器
  try {
    await fetch(SYNC_HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    /* 静默失败 */
  }
}

/** 构建同步摘要数据 */
export function buildSyncSummary(appData: AppData): SyncSummary {
  const stock = appData.stocks[appData.currentStockKey];
  const cfg = stock.config;
  const lastClose = stock.lastClosePrice;

  return {
    syncTime: new Date().toISOString(),
    stockKey: appData.currentStockKey,
    stockName: cfg.stockName,
    stockCode: cfg.stockCode,
    config: {
      basePrice: cfg.basePrice,
      gridDrop: cfg.gridDrop,
      gridProfit: cfg.gridProfit,
      baseBuyAmount: cfg.baseBuyAmount,
    },
    lastClosePrice: lastClose,
    availableCapital: Number(stock.availableCapital.toFixed(2)),
    accumulatedProfit: Number(stock.accumulatedProfit.toFixed(2)),
    positionsCount: stock.positions.length,
    completedTradesCount: stock.completedTrades.length,
    positions: stock.positions.map((p) => ({
      id: p.id,
      gridLevel: p.gridLevel,
      buyPrice: p.buyPrice,
      buyDate: p.buyDate,
      lots: p.lots,
      shares: p.shares,
      buyCost: Number(p.buyCost.toFixed(2)),
      targetSellPrice: p.targetSellPrice,
    })),
    todayBuyOrders: lastClose
      ? buildTodayBuyOrders(stock).map((o) => ({
          level: o.level,
          price: o.price,
          lots: o.suggest.total,
          baseLots: o.suggest.base,
          extraLots: o.suggest.extra,
          cost: Number(o.cost.toFixed(2)),
        }))
      : [],
    todaySellOrders: lastClose
      ? buildSellPlan(stock).flatMap((g) =>
          g.positions.map((p) => {
            const sellValue = p.shares * g.sellPrice;
            const fees = sellValue * (cfg.commissionRate + cfg.stampDutyRate);
            const profit = sellValue - fees - p.buyCost;
            return {
              positionId: p.id,
              buyPrice: p.buyPrice,
              targetSellPrice: g.sellPrice,
              lots: p.lots,
              profit: Number(profit.toFixed(2)),
            };
          }),
        )
      : [],
  };
}

/** 自动同步导出: 每次状态变化时调用 */
export async function autoSyncExport(appData: AppData): Promise<void> {
  try {
    const summary = buildSyncSummary(appData);
    localStorage.setItem(SYNC_DATA_KEY, JSON.stringify(summary));
    await syncToFile(summary);
  } catch {
    /* 静默失败 */
  }
}

/** 手动导出同步文件下载 */
export function exportSyncFile(
  onToast: (msg: string, type: 'success' | 'error' | 'warn' | 'info') => void,
): void {
  const syncData = localStorage.getItem(SYNC_DATA_KEY);
  if (!syncData) {
    onToast('暂无同步数据', 'error');
    return;
  }
  const data = JSON.parse(syncData) as SyncSummary;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grid_sync_${data.stockKey}_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  onToast('同步文件已下载', 'success');
}
