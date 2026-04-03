// apps/web/src/pages/member/MemberCheckin.tsx
// Uses html5-qrcode to access device camera and scan QR codes.
// On successful scan, calls POST /api/checkins/scan with the token UUID.

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkinApi, membershipApi } from '@/lib/api';
import { ScanLine, CheckCircle2, XCircle, Camera, Lock, ArrowRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Link } from 'react-router-dom';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function MemberCheckin() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<{ message: string; gym?: string } | null>(null);
  const [scanError, setScanError]   = useState<string | null>(null);
  const [scanning,  setScanning]    = useState(false);
  const scannerRef  = useRef<Html5QrcodeScanner | null>(null);
  const mountedRef  = useRef(false);

  const { data: membershipData } = useQuery({
    queryKey: ['my-memberships'],
    queryFn: membershipApi.myStatus,
  });

  const { data: checkinsData, refetch: refetchCheckins } = useQuery({
    queryKey: ['my-checkins'],
    queryFn: () => checkinApi.my(1),
  });

  const approvedGyms = (membershipData?.memberships ?? []).filter((m: any) => m.status === 'approved');
  const checkins     = checkinsData?.checkins ?? [];

  function startScanner() {
    setScanning(true);
    setScanState('scanning');
    setScanResult(null);
    setScanError(null);
  }

  useEffect(() => {
    if (!scanning) return;

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      if (!document.getElementById('qr-reader')) return;

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          // Pause scanner
          scanner.pause(true);

          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(decodedText)) {
            setScanState('error');
            setScanError('Invalid QR code. Please scan your gym\'s Atom OS check-in code.');
            setScanning(false);
            return;
          }

          try {
            setScanState('scanning'); // Keep scanning UI while validating
            const result = await checkinApi.scan(decodedText);
            setScanResult({ message: result.message, gym: result.checkin?.gym?.name });
            setScanState('success');
            refetchCheckins();
          } catch (err: any) {
            setScanState('error');
            setScanError(err.message || 'Check-in failed');
          } finally {
            setScanning(false);
          }
        },
        (error) => {
          // Ignore scan errors (camera noise) — only log real failures
        }
      );

      scannerRef.current = scanner;
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  if (approvedGyms.length === 0) {
    const pendingGyms = (membershipData?.memberships ?? []).filter((m: any) => m.status === 'pending');
    const hasPending  = pendingGyms.length > 0;

    return (
      <div className="page max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="section-title">Check In</h1>
          <p className="text-atom-muted text-sm mt-1">QR attendance at your gym</p>
        </div>

        {/* Lock card */}
        <div className="card border-atom-border/80 mb-6 text-center py-10">
          <div className="w-20 h-20 rounded-2xl bg-atom-border/40 flex items-center justify-center
                          mx-auto mb-5 relative">
            <ScanLine size={32} className="text-atom-muted/40" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full
                            bg-atom-surface border-2 border-atom-border
                            flex items-center justify-center">
              <Lock size={14} className="text-atom-muted" />
            </div>
          </div>

          <h2 className="font-display text-xl font-700 uppercase tracking-wide text-atom-text mb-2">
            Check-in Locked
          </h2>

          {hasPending ? (
            <>
              <p className="text-atom-muted text-sm max-w-xs mx-auto leading-relaxed mb-2">
                Your request to join{' '}
                <span className="text-atom-text font-500">{pendingGyms[0].gym?.name}</span>{' '}
                is waiting for approval.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-atom-warning animate-pulse" />
                <span className="text-atom-warning text-xs font-display uppercase tracking-widest">
                  Pending admin approval
                </span>
              </div>
            </>
          ) : (
            <p className="text-atom-muted text-sm max-w-xs mx-auto leading-relaxed">
              Join a gym to unlock QR check-in. Once your gym admin approves you,
              this screen activates automatically.
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="card mb-6">
          <p className="text-atom-muted text-xs font-display uppercase tracking-widest mb-4">
            How to unlock check-in
          </p>
          <div className="flex flex-col gap-4">
            {[
              {
                step: '1',
                title: 'Get your gym code',
                desc: 'Ask your gym admin for the 6-character gym code.',
                done: false,
              },
              {
                step: '2',
                title: 'Join from Profile',
                desc: 'Go to Profile → Join a Gym → enter the code.',
                done: false,
              },
              {
                step: '3',
                title: 'Wait for approval',
                desc: 'Your gym admin will approve your membership request.',
                done: hasPending,
              },
              {
                step: '4',
                title: 'Check in!',
                desc: 'Scan the QR code at your gym. Done.',
                done: false,
              },
            ].map(({ step, title, desc, done }) => (
              <div key={step} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                                 font-display font-700 text-xs mt-0.5 ${
                  done
                    ? 'bg-atom-success/20 text-atom-success'
                    : 'bg-atom-border text-atom-muted'
                }`}>
                  {done ? '✓' : step}
                </div>
                <div>
                  <p className={`text-sm font-500 ${done ? 'text-atom-success' : 'text-atom-text'}`}>
                    {title}
                  </p>
                  <p className="text-atom-muted text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!hasPending && (
          <Link
            to="/member/profile"
            className="flex items-center justify-between w-full p-5 rounded-2xl
                       bg-atom-accent text-atom-bg font-display font-700 uppercase tracking-wide
                       hover:bg-atom-accent-dim transition-all group"
          >
            <span>Join a Gym Now</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="page max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="section-title">Check In</h1>
        <p className="text-atom-muted text-sm mt-1">
          Scan the QR code displayed at your gym
        </p>
      </div>

      {/* Scanner area */}
      <div className="card mb-6 overflow-hidden p-0">
        {!scanning && scanState === 'idle' && (
          <div className="flex flex-col items-center justify-center p-10 gap-5">
            <div className="w-20 h-20 rounded-2xl bg-atom-accent/10 border-2 border-dashed border-atom-accent/40
                            flex items-center justify-center">
              <Camera size={32} className="text-atom-accent" />
            </div>
            <div className="text-center">
              <p className="font-display font-700 text-atom-text uppercase tracking-wide mb-1">
                Ready to Check In
              </p>
              <p className="text-atom-muted text-sm">
                Tap the button below to open your camera and scan the gym's QR code.
              </p>
            </div>
            <button onClick={startScanner} className="btn-primary flex items-center gap-2 w-full justify-center">
              <ScanLine size={18} />
              Open Scanner
            </button>
          </div>
        )}

        {scanning && (
          <div className="p-4">
            <p className="text-center text-atom-muted text-sm mb-3 font-display uppercase tracking-wide">
              Point camera at gym QR code
            </p>
            <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
            <button
              onClick={() => { setScanning(false); setScanState('idle'); }}
              className="btn-ghost w-full mt-3 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {scanState === 'success' && scanResult && (
          <div className="flex flex-col items-center p-10 gap-4 animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-atom-success/20 border-2 border-atom-success/40
                            flex items-center justify-center">
              <CheckCircle2 size={36} className="text-atom-success" />
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-800 text-atom-success uppercase tracking-wide">
                Checked In!
              </p>
              <p className="text-atom-muted text-sm mt-1">{scanResult.message}</p>
              {scanResult.gym && (
                <p className="font-500 text-atom-text text-sm mt-1">{scanResult.gym}</p>
              )}
            </div>
            <button onClick={() => setScanState('idle')} className="btn-ghost text-sm w-full">
              Done
            </button>
          </div>
        )}

        {scanState === 'error' && (
          <div className="flex flex-col items-center p-10 gap-4 animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-atom-danger/20 border-2 border-atom-danger/30
                            flex items-center justify-center">
              <XCircle size={36} className="text-atom-danger" />
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-800 text-atom-danger uppercase tracking-wide">
                Check-in Failed
              </p>
              <p className="text-atom-muted text-sm mt-1">{scanError}</p>
            </div>
            <button onClick={startScanner} className="btn-primary text-sm w-full">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* My active gyms */}
      <div className="card mb-6">
        <h3 className="font-display text-sm font-700 uppercase tracking-widest text-atom-muted mb-3">
          My Active Gyms
        </h3>
        {approvedGyms.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-atom-border/40 last:border-0">
            <div className="w-2 h-2 rounded-full bg-atom-success flex-shrink-0" />
            <div className="flex-1">
              <p className="text-atom-text text-sm font-500">{m.gym?.name}</p>
              <p className="text-atom-muted text-xs">{m.gym?.city}</p>
            </div>
            <span className="badge-green text-xs">Active</span>
          </div>
        ))}
      </div>

      {/* Check-in history */}
      <div className="card">
        <h3 className="font-display text-sm font-700 uppercase tracking-widest text-atom-muted mb-3">
          Recent Check-ins
        </h3>
        {checkins.length === 0 ? (
          <p className="text-atom-muted text-sm text-center py-6">No check-ins yet</p>
        ) : checkins.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-atom-border/40 last:border-0">
            <CheckCircle2 size={14} className="text-atom-accent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-atom-text text-sm truncate">{c.gym?.name}</p>
              <p className="text-atom-muted text-xs">
                {format(new Date(c.checked_in_at), 'EEE d MMM, h:mm a')}
              </p>
            </div>
            <span className="text-atom-muted text-xs flex-shrink-0">
              {formatDistanceToNow(new Date(c.checked_in_at), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
