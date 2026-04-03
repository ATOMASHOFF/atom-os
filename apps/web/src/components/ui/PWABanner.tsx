// apps/web/src/components/ui/PWABanner.tsx
// Install prompt + update available + offline indicator

import { useInstallPrompt, useServiceWorker, useOnlineStatus } from '@/hooks/usePWA';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80
                    bg-atom-surface border border-atom-accent/40 rounded-2xl shadow-xl
                    p-4 flex items-start gap-3 z-40 animate-slide-up">
      <div className="w-10 h-10 bg-atom-accent rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="font-display font-800 text-atom-bg text-lg">A</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-700 text-atom-text text-sm uppercase tracking-wide">
          Install Atom OS
        </p>
        <p className="text-atom-muted text-xs mt-0.5 leading-relaxed">
          Add to your home screen for the best experience. Works offline.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={install}
            className="flex-1 bg-atom-accent text-atom-bg text-xs font-display font-700
                       uppercase tracking-wide px-3 py-2 rounded-lg
                       hover:bg-atom-accent-dim transition-colors flex items-center justify-center gap-1.5"
          >
            <Download size={12} /> Install
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-2 rounded-lg text-atom-muted hover:text-atom-text
                       hover:bg-atom-border transition-colors text-xs"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="text-atom-muted hover:text-atom-text transition-colors flex-shrink-0 -mt-0.5"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker();
  if (!updateAvailable) return null;

  return (
    <div className="fixed top-16 md:top-4 left-4 right-4 md:left-auto md:right-4 md:w-72
                    bg-atom-info/20 border border-atom-info/40 rounded-xl
                    p-3 flex items-center gap-3 z-40 animate-slide-up">
      <RefreshCw size={16} className="text-atom-info flex-shrink-0" />
      <p className="flex-1 text-atom-text text-sm">New version available</p>
      <button
        onClick={applyUpdate}
        className="text-atom-info text-xs font-display font-700 uppercase tracking-wide
                   hover:underline flex-shrink-0"
      >
        Update
      </button>
    </div>
  );
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-14 md:top-0 left-0 right-0 z-50
                    bg-atom-warning/90 backdrop-blur text-atom-bg
                    flex items-center justify-center gap-2 py-2 text-sm font-display font-700
                    uppercase tracking-wide">
      <WifiOff size={14} />
      You are offline — some features may be unavailable
    </div>
  );
}
