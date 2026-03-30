// apps/web/src/components/ui/Confirm.tsx
// Usage: const { confirm, ConfirmDialog } = useConfirm()
//        await confirm({ title: '...', message: '...', danger: true })

import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const ConfirmDialog = () => {
    if (!state?.open) return null;
    const { title, message, confirmLabel = 'Confirm', danger } = state.options;
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
        <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-sm animate-slide-up">
          <div className="p-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              danger ? 'bg-atom-danger/20' : 'bg-atom-warning/20'
            }`}>
              <AlertTriangle size={22} className={danger ? 'text-atom-danger' : 'text-atom-warning'} />
            </div>
            <h3 className="font-display font-700 uppercase tracking-wide text-atom-text mb-2">
              {title}
            </h3>
            <p className="text-atom-muted text-sm leading-relaxed">{message}</p>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button className="btn-ghost flex-1" onClick={() => handleClose(false)}>
              Cancel
            </button>
            <button
              className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => handleClose(true)}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { confirm, ConfirmDialog };
}
