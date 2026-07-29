import type { AppData } from '../types';

/**
 * IndexedDB 冗余备份存储
 *
 * 三层存储架构:
 *   第1层: localStorage (主存储, 热数据) — 读/写最快
 *   第2层: IndexedDB  (冗余备份, 冷数据) — localStorage 损坏时自动恢复
 *   第3层: JSON/Excel 文件导出 (用户手动/定期) — 跨设备、归档
 *
 * IndexedDB 数据库:
 *   - grid_trading_app
 *     - snapshots: key = timestamp, value = AppData
 *
 * 策略:
 *   - 每次 saveState 同步写入 IndexedDB 一份副本
 *   - 保留最近 5 个版本快照 (可手动回滚)
 *   - loadState 时: 先读 localStorage → 损坏/为空 → 从 IndexedDB 恢复
 */

const DB_NAME = 'grid_trading_app';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 5;

/** 快照条目 */
interface SnapshotEntry {
  id: number; // timestamp 作为 key
  data: AppData;
  createdAt: string;
}

/** 打开/初始化数据库 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 保存一份快照到 IndexedDB */
export async function saveSnapshot(data: AppData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const now = Date.now();
    const entry: SnapshotEntry = {
      id: now,
      data,
      createdAt: new Date(now).toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // 清理旧快照: 只保留最近 MAX_SNAPSHOTS 个
    const allKeys = await new Promise<number[]>((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result as number[]);
      req.onerror = () => reject(req.error);
    });

    if (allKeys.length > MAX_SNAPSHOTS) {
      allKeys.sort((a, b) => b - a); // 降序
      const toDelete = allKeys.slice(MAX_SNAPSHOTS);
      for (const key of toDelete) {
        store.delete(key);
      }
    }

    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      console.warn('[IDB-Storage] 快照写入失败:', tx.error);
    };
  } catch (e) {
    console.warn('[IDB-Storage] 保存快照异常:', e);
    // 静默失败: IndexedDB 不可用时不影响主流程
  }
}

/** 从 IndexedDB 加载最新快照 (用于恢复) */
export async function loadSnapshot(): Promise<AppData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const result = await new Promise<AppData | null>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const entries = req.result as SnapshotEntry[];
        if (entries.length === 0) {
          resolve(null);
          return;
        }
        // 按时间降序取最新的
        entries.sort((a, b) => b.id - a.id);
        resolve(entries[0].data);
      };
      req.onerror = () => reject(req.error);
    });

    db.close();
    return result;
  } catch (e) {
    console.warn('[IDB-Storage] 加载快照异常:', e);
    return null;
  }
}

/** 获取所有快照列表 (用于手动回滚) */
export async function getSnapshots(): Promise<Omit<SnapshotEntry, 'data'>[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const result = await new Promise<Omit<SnapshotEntry, 'data'>[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const entries = req.result as SnapshotEntry[];
        resolve(
          entries
            .map(({ id, createdAt }) => ({ id, createdAt }))
            .sort((a, b) => b.id - a.id),
        );
      };
      req.onerror = () => reject(req.error);
    });

    db.close();
    return result;
  } catch {
    return [];
  }
}

/** 验证 AppData 结构完整性 (浅层校验) */
export function validateAppData(data: unknown): data is AppData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.currentStockKey !== 'string') return false;
  if (!d.stocks || typeof d.stocks !== 'object') return false;
  // 至少有一个股票
  const stocks = d.stocks as Record<string, unknown>;
  const keys = Object.keys(stocks);
  if (keys.length === 0) return false;
  // 检查第一个股票是否有必要字段
  const first = stocks[keys[0]] as Record<string, unknown> | undefined;
  if (!first || !first.config || !Array.isArray(first.positions) || !Array.isArray(first.completedTrades)) {
    return false;
  }
  return true;
}
