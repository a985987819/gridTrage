import { useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  text: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 通用确认弹窗 (支持 Escape 关闭 + 基础焦点管理) */
export function Modal({ title, text, visible, onConfirm, onCancel }: ModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!visible) return;

    // 保存当前焦点
    previousFocus.current = document.activeElement as HTMLElement;

    // 聚焦确认按钮
    requestAnimationFrame(() => {
      confirmRef.current?.focus();
    });

    // Escape 关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      // 焦点 trap: Tab/Shift+Tab 在确认和取消按钮之间循环
      if (e.key === 'Tab') {
        const focusable = [confirmRef.current, cancelRef.current].filter(Boolean) as HTMLElement[];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 恢复焦点
      previousFocus.current?.focus();
    };
  }, [visible, onCancel]);

  if (!visible) return null;
  return (
    <div
      id="modal-mask"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        id="modal-box"
        className="bg-white rounded-[10px] p-6 max-w-[380px] w-[90%]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" className="text-base font-semibold mb-3">
          {title}
        </h3>
        <p id="modal-text" className="text-[13px] text-[#666] mb-4">
          {text}
        </p>
        <div id="modal-actions" className="flex gap-2 justify-end">
          <button
            id="modal-cancel-btn"
            ref={cancelRef}
            className="btn btn-outline"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            id="modal-confirm-btn"
            ref={confirmRef}
            className="btn btn-danger"
            onClick={onConfirm}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
