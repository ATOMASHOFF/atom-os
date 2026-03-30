// apps/web/src/components/ui/Modal.tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export function Modal({ open, onClose, title, children, maxWidth = 'md', footer }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-atom-surface border border-atom-border rounded-2xl w-full ${widths[maxWidth]} animate-slide-up`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-atom-border">
          <h3 className="font-display font-700 uppercase tracking-wide text-atom-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-atom-muted hover:text-atom-text transition-colors p-1 rounded-lg hover:bg-atom-border"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-5 flex gap-3 justify-end border-t border-atom-border pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
