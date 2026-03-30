// apps/web/src/components/ui/ErrorBoundary.tsx
// Catches React render errors so a single component crash
// doesn't take down the whole app.

import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  // If provided, shown instead of default error UI
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now().toString(36).toUpperCase()}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  reset() {
    this.setState({ hasError: false, error: null, errorId: '' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-atom-danger/20 border border-atom-danger/30
                          flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={28} className="text-atom-danger" />
          </div>

          <h2 className="font-display text-xl font-700 uppercase tracking-wide text-atom-text mb-2">
            Something went wrong
          </h2>
          <p className="text-atom-muted text-sm leading-relaxed mb-1">
            This part of the app ran into a problem.
          </p>
          <p className="text-atom-muted/60 text-xs font-mono mb-6">
            {this.state.errorId}
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left bg-atom-bg border border-atom-border rounded-lg
                            p-3 text-xs text-atom-danger/80 font-mono overflow-auto
                            max-h-32 mb-5 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.reset()}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={15} />
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-ghost"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ── Page-level wrapper (use around each route) ────────────────────────────────
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

// ── Inline error for smaller components ──────────────────────────────────────
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-atom-danger/10 border border-atom-danger/20">
      <AlertTriangle size={16} className="text-atom-danger flex-shrink-0" />
      <p className="text-atom-text text-sm flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-atom-danger text-xs hover:underline flex-shrink-0 flex items-center gap-1"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
