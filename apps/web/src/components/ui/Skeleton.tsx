// apps/web/src/components/ui/Skeleton.tsx
// Reusable skeleton loading states

import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-atom-border/60 rounded-lg',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-3">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-atom-border/40">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      <div className="flex gap-4 pb-3 border-b border-atom-border mb-1">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-atom-border/40">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={clsx('h-4 flex-1', j === 0 && 'flex-[2]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
