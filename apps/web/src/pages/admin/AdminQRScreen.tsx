// apps/web/src/pages/admin/AdminQRScreen.tsx
// The centrepiece feature. Displays live rotating QR on gym screen.
// Auto-polls /api/qr/current every (interval-5)s to stay ahead of expiry.

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { qrApi } from '@/lib/api';
import { RefreshCw, Maximize2, Settings, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

function formatInterval(seconds: number): string {
  if (seconds >= 2592000) return `${Math.floor(seconds / 2592000)}mo`;
  if (seconds >= 604800) return `${Math.floor(seconds / 604800)}wk`;
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
  return `${seconds}s`;
}

export default function AdminQRScreen() {
  const [fullscreen, setFullscreen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [newInterval, setNewInterval] = useState(180);

  // Fetch current QR — auto-rotates server side if expired
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['qr-current'],
    queryFn: qrApi.current,
    refetchInterval: 10_000, // Poll every 10s
    refetchIntervalInBackground: true,
  });

  // Fetch config for interval display
  const { data: configData, refetch: refetchConfig } = useQuery({
    queryKey: ['qr-config'],
    queryFn: qrApi.getConfig,
  });

  const interval = configData?.qr_rotation_interval_s ?? 180;

  // Force rotate
  const rotateMut = useMutation({
    mutationFn: qrApi.rotate,
    onSuccess: () => { refetch(); toast.success('QR rotated'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Config update
  const configMut = useMutation({
    mutationFn: (s: number) => qrApi.updateConfig(s),
    onSuccess: () => { refetchConfig(); setShowSettings(false); toast.success('Interval updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Countdown timer based on expires_at
  useEffect(() => {
    if (!data?.expires_at) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) refetch();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.expires_at, refetch]);

  const pct = interval > 0 ? (secondsLeft / interval) * 100 : 0;
  const isExpiring = secondsLeft <= 10;

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50' : ''} bg-atom-bg flex flex-col`}
      style={{ minHeight: fullscreen ? '100vh' : 'calc(100vh - 0px)' }}>

      {/* ── HEADER ── */}
      {!fullscreen && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-atom-border">
          <div>
            <h1 className="section-title text-xl">QR Check-in Screen</h1>
            <p className="text-atom-muted text-xs mt-0.5">
              Display this on your gym TV or tablet. Members scan to check in.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm"
            >
              <Settings size={15} /> Settings
            </button>
            <button
              onClick={() => rotateMut.mutate()}
              disabled={rotateMut.isPending}
              className="btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm"
            >
              <RefreshCw size={15} className={rotateMut.isPending ? 'animate-spin' : ''} />
              Rotate Now
            </button>
            <button
              onClick={() => setFullscreen(true)}
              className="btn-primary px-3 py-2 flex items-center gap-1.5 text-sm"
            >
              <Maximize2 size={15} /> Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── QR DISPLAY ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">

        {/* Gym branding */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-atom-accent rounded flex items-center justify-center">
              <span className="font-display font-800 text-atom-bg text-xs">A</span>
            </div>
            <span className="font-display font-700 text-atom-text uppercase tracking-widest text-sm">
              Atom OS
            </span>
          </div>
          <p className="font-display text-3xl font-800 uppercase tracking-wide text-atom-text">
            Scan to Check In
          </p>
          <p className="text-atom-muted text-sm mt-1">Open Atom OS app → Check In → Scan this code</p>
        </div>

        {/* QR Code */}
        <div className={`relative p-6 rounded-2xl border-2 transition-all duration-500 ${isExpiring
          ? 'border-atom-warning animate-pulse-accent bg-atom-warning/5'
          : 'border-atom-accent/40 bg-atom-surface'
          }`}>
          {isLoading ? (
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center gap-3 text-atom-danger">
              <WifiOff size={32} />
              <p className="text-sm">Failed to load QR</p>
              <button onClick={() => refetch()} className="btn-ghost text-xs px-3 py-1.5">Retry</button>
            </div>
          ) : data?.qr_data_url ? (
            <img
              src={data.qr_data_url}
              alt="Check-in QR Code"
              className="w-64 h-64 rounded-lg"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : null}

          {/* Expiry overlay when very close */}
          {isExpiring && secondsLeft > 0 && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
              <div className="text-center">
                <p className="font-display text-5xl font-800 text-atom-warning">{secondsLeft}</p>
                <p className="text-atom-warning text-sm">Refreshing soon...</p>
              </div>
            </div>
          )}
        </div>

        {/* Countdown ring + timer */}
        <div className="flex flex-col items-center gap-3">
          {/* Progress bar */}
          <div className="w-64 h-1.5 bg-atom-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isExpiring ? 'bg-atom-warning' : 'bg-atom-accent'
                }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-atom-success text-xs">
            <Wifi size={12} />
            <span>Live — auto-updates</span>
          </div>
        </div>

        {/* Exit fullscreen */}
        {fullscreen && (
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 text-atom-muted hover:text-atom-text btn-ghost px-3 py-2 text-xs"
          >
            Exit Fullscreen
          </button>
        )}
      </div>

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-sm animate-slide-up">
            <div className="p-5 border-b border-atom-border flex items-center justify-between">
              <h3 className="font-display font-700 uppercase tracking-wide">QR Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-atom-muted hover:text-atom-text">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="label">Rotation Interval (seconds)</label>
                <input
                  type="number" min={10} max={2592000}
                  className="input"
                  value={newInterval}
                  onChange={e => setNewInterval(Number(e.target.value))}
                />
                <p className="text-atom-muted text-xs mt-1.5">
                  Current: {interval}s ({formatInterval(interval)})
                  · Min: 10s · Max: 30 days
                </p>
                {/* Quick presets */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[180, 300, 900, 3600, 86400, 604800, 2592000].map(v => (
                    <button
                      key={v}
                      onClick={() => setNewInterval(v)}
                      className={`px-2 py-1 rounded text-xs font-mono transition-all ${newInterval === v
                        ? 'bg-atom-accent/20 text-atom-accent border border-atom-accent/40'
                        : 'bg-atom-surface border border-atom-border text-atom-muted hover:border-atom-accent/30'
                        }`}
                    >
                      {formatInterval(v)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setShowSettings(false)}>Cancel</button>
                <button
                  className="btn-primary flex-1"
                  disabled={configMut.isPending || newInterval < 10}
                  onClick={() => configMut.mutate(newInterval)}
                >
                  {configMut.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
