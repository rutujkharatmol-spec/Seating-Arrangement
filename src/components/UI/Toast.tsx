import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastKind = 'success' | 'info' | 'error';

const STYLES: Record<ToastKind, { wrap: string; icon: React.ReactNode }> = {
  success: {
    wrap: 'border-emerald-500 bg-white text-slate-900',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
  },
  info: {
    wrap: 'border-blue-500 bg-white text-slate-900',
    icon: <Info className="w-4 h-4 text-blue-600 shrink-0" />,
  },
  error: {
    wrap: 'border-amber-500 bg-amber-50 text-amber-950',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
  },
};

interface ToastProps {
  toast: { message: string; kind: ToastKind } | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;
  const style = STYLES[toast.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold max-w-[90vw] ${style.wrap}`}
    >
      {style.icon}
      <span className="leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="ml-1 text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
