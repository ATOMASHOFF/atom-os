// apps/web/src/hooks/usePWA.ts
// Registers the service worker and manages the install prompt

import { useState, useEffect } from 'react';

// ── SERVICE WORKER REGISTRATION ───────────────────────────────────────────────
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdates = () => {
      if (registration) {
        registration.update().catch(err =>
          console.warn('[PWA] Update check failed:', err)
        );
      }
    };

    navigator.serviceWorker
      .register('/sw.js', {
        updateViaCache: 'none'
      })
      .then(reg => {
        registration = reg;
        console.log('[PWA] Service worker registered:', reg.scope);

        // Detect when a new SW is waiting to activate
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        // Check for updates every 15 minutes
        const intervalId = setInterval(checkForUpdates, 15 * 60 * 1000);

        // Check for updates when tab becomes visible
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates();
          }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibility);
        };
      })
      .catch(err => console.warn('[PWA] SW registration failed:', err));
  }, []);

  function applyUpdate() {
    navigator.serviceWorker.controller?.postMessage('SKIP_WAITING');
    window.location.reload();
  }

  return { updateAvailable, applyUpdate };
}

// ── INSTALL PROMPT ────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    if (localStorage.getItem('pwa-install-dismissed') === 'true') {
      setIsDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setPrompt(null);
    }
    return outcome === 'accepted';
  }

  function dismiss() {
    setIsDismissed(true);
    setPrompt(null);
    localStorage.setItem('pwa-install-dismissed', 'true');
  }

  const canInstall = !!prompt && !isInstalled && !isDismissed;
  return { canInstall, isInstalled, install, dismiss };
}

// ── ONLINE STATUS ─────────────────────────────────────────────────────────────
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
