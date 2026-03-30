// apps/web/src/components/member/NewMemberWelcome.tsx
// Shown once to newly registered members on their first login.
// Dismisses permanently via localStorage flag.
// Guides them through: workout logging → joining a gym → checking in.

import { useState, useEffect } from 'react';
import { useUser } from '@/store/auth';
import { Dumbbell, QrCode, TrendingUp, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'atom-welcome-seen';

const STEPS = [
  {
    icon: Dumbbell,
    color: 'bg-atom-gold/20 text-atom-gold',
    title: 'Log your workouts',
    desc: 'Track every session — sets, reps, weight. Your progress is always here.',
    to: '/member/workouts',
    cta: 'Go to Workouts',
  },
  {
    icon: TrendingUp,
    color: 'bg-atom-info/20 text-atom-info',
    title: 'Watch your progress',
    desc: 'Charts, streaks, and weekly trends. See yourself improving over time.',
    to: '/member/progress',
    cta: 'See Progress',
  },
  {
    icon: QrCode,
    color: 'bg-atom-success/20 text-atom-success',
    title: 'Join your gym for check-in',
    desc: "Ask your gym for their 6-digit code, request membership, then scan QR every visit.",
    to: '/member/profile',
    cta: 'Join a Gym',
  },
];

export function NewMemberWelcome() {
  const user = useUser();
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);

  useEffect(() => {
    // Only show if they haven't seen it before
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the dashboard loads first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }

  if (!visible) return null;

  const current = STEPS[step];
  const Icon    = current.icon;
  const isLast  = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4
                    bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-sm
                      animate-slide-up shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-atom-gold'
                    : i < step
                    ? 'w-3 bg-atom-gold/40'
                    : 'w-3 bg-atom-border'
                }`}
              />
            ))}
          </div>
          <button
            onClick={dismiss}
            className="text-atom-muted hover:text-atom-text transition-colors p-1 rounded-lg
                       hover:bg-atom-border"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5
                           ${current.color}`}>
            <Icon size={28} />
          </div>

          {step === 0 && (
            <p className="text-atom-muted text-xs font-display uppercase tracking-widest mb-2">
              Welcome, {user?.full_name?.split(' ')[0]}! 🎉
            </p>
          )}

          <h2 className="font-display text-2xl font-800 uppercase tracking-wide text-atom-text mb-3">
            {current.title}
          </h2>
          <p className="text-atom-muted text-sm leading-relaxed mb-6">
            {current.desc}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Link
              to={current.to}
              onClick={dismiss}
              className="flex items-center justify-center gap-2 w-full
                         bg-atom-gold text-atom-bg font-display font-700 uppercase tracking-wide
                         px-6 py-3.5 rounded-xl text-sm hover:bg-atom-gold-dim transition-colors"
            >
              {current.cta}
              <ArrowRight size={16} />
            </Link>

            <button
              onClick={next}
              className="w-full px-6 py-2.5 rounded-xl text-atom-muted text-sm
                         hover:text-atom-text hover:bg-atom-border/50 transition-all"
            >
              {isLast ? 'Got it, go to dashboard' : 'Show me next →'}
            </button>
          </div>
        </div>

        {/* Step count */}
        <div className="px-6 pb-5 text-center">
          <p className="text-atom-muted/50 text-xs font-mono">
            {step + 1} of {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}
