// ============================================================
// 同步身份 — PIN → SHA-256 → user_id，本机记忆
// 不同 PIN 派生不同 user_id → 云端不同行 → 数据互相隔离
// 与 asset-planner 共用同一 Supabase 项目/表，user_id 加 grid: 前缀隔离
// ============================================================

const PIN_KEY = 'grid-trading-sync-pin';
const UID_KEY = 'grid-trading-sync-uid';

export function getPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function getSyncUserId(): string {
  return localStorage.getItem(UID_KEY) || '';
}

export function hasIdentity(): boolean {
  return Boolean(getSyncUserId());
}

// 本地数据按身份分命名空间：无 PIN → 原 key（兼容旧数据），有 PIN → `${base}:${uid}`
export function storageKey(base: string): string {
  const uid = getSyncUserId();
  return uid ? `${base}:${uid}` : base;
}

// PIN 的 SHA-256 十六进制哈希，加 grid: 前缀与 asset-planner 隔离
export async function deriveUserId(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`grid:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `grid:${hex}`;
}

// 设置身份：派生 user_id 并持久化 PIN + uid
export async function setSyncIdentity(pin: string): Promise<string> {
  const uid = await deriveUserId(pin);
  localStorage.setItem(PIN_KEY, pin);
  localStorage.setItem(UID_KEY, uid);
  return uid;
}

export function clearSyncIdentity(): void {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(UID_KEY);
}
