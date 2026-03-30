// apps/web/src/components/ui/EmptyState.tsx
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-atom-border/50 flex items-center justify-center mb-4">
        <Icon size={24} className="text-atom-muted opacity-60" />
      </div>
      <p className="font-display font-700 uppercase tracking-wide text-atom-text text-sm mb-1">
        {title}
      </p>
      {description && (
        <p className="text-atom-muted text-sm max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary text-sm mt-5">
          {action.label}
        </button>
      )}
    </div>
  );
}
