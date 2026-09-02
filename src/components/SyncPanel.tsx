import { useEffect, useRef, useState } from 'react';
import type { SyncStatus } from '../types';
import { isSupabaseConfigured } from '../services/supabase';
import { getSyncUserId } from '../services/syncIdentity';

interface SyncPanelProps {
  visible: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onEnableIdentity: (pin: string) => Promise<void>;
  onClearIdentity: () => void;
  onSyncNow: () => void;
}

const STATUS_META: Record<SyncStatus, { label: string; color: string }> = {
  idle: { label: '未同步', color: '#95a5a6' },
  syncing: { label: '同步中…', color: '#3498db' },
  synced: { label: '已同步', color: '#7dc88f' },
  error: { label: '同步出错', color: '#e88a83' },
  offline: { label: '离线', color: '#f39c12' },
};

/** 云同步身份设置面板 (自包含弹窗) */
export function SyncPanel({
  visible,
  onClose,
  syncStatus,
  onEnableIdentity,
  onClearIdentity,
  onSyncNow,
}: SyncPanelProps) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const uid = getSyncUserId();
  const configured = isSupabaseConfigured();
  const status = STATUS_META[syncStatus];

  useEffect(() => {
    if (!visible) return;
    previousFocus.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => inputRef.current?.focus());
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const handleEnable = async () => {
    const trimmed = pin.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onEnableIdentity(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-panel-title"
    >
      <div
        className="bg-white rounded-[10px] p-6 max-w-[420px] w-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="sync-panel-title" className="text-base font-semibold mb-3">
          云同步
        </h3>

        {!configured && (
          <div className="text-[13px] text-[#c0392b] bg-[#fdecea] border border-[#f5c6cb] rounded-[6px] px-3 py-2 mb-3">
            未配置 Supabase。请在项目根目录 .env 中设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY 后重启开发服务器。
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[13px] text-[#666]">
            {uid ? `身份: ${uid.slice(0, 13)}…` : '未设置同步身份'}
          </span>
          <span className="text-[11px] text-white px-2 py-[2px] rounded-[10px]" style={{ background: status.color }}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
            placeholder="输入同步 PIN（多设备共用同一 PIN）"
            className="input-base flex-1"
            autoComplete="off"
          />
          <button className="btn btn-primary" onClick={handleEnable} disabled={busy || !configured}>
            {uid ? '切换身份' : '启用'}
          </button>
        </div>

        <div className="flex gap-2 justify-end">
          <button className="btn btn-outline" onClick={onSyncNow} disabled={!uid || !configured}>
            立即同步
          </button>
          {uid && (
            <button className="btn btn-danger" onClick={onClearIdentity}>
              清除身份
            </button>
          )}
          <button className="btn btn-outline" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
