import { useEffect } from 'react';
import type { ToastType } from '../types';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onClose: () => void;
}

/** Toast 提示组件 */
export function Toast({ message, type, visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => onClose(), 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  const bgClass =
    type === 'success'
      ? 'bg-[#5fb374]'
      : type === 'error'
        ? 'bg-[#c97168]'
        : type === 'warn'
          ? 'bg-[#f39c12]'
          : 'bg-[#2c3e50]';

  return (
    <div
      id="toast-container"
      className={`fixed top-5 right-5 text-white px-5 py-3 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)] z-[1000] text-[13px] transition-all duration-300 ${bgClass} ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[100px]'
      }`}
    >
      {message}
    </div>
  );
}
