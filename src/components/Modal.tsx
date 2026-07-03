interface ModalProps {
  title: string;
  text: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 通用确认弹窗 */
export function Modal({ title, text, visible, onConfirm, onCancel }: ModalProps) {
  if (!visible) return null;
  return (
    <div
      id="modal-mask"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]"
      onClick={onCancel}
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
          <button id="modal-cancel-btn" className="btn btn-outline" onClick={onCancel}>
            取消
          </button>
          <button id="modal-confirm-btn" className="btn btn-danger" onClick={onConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
