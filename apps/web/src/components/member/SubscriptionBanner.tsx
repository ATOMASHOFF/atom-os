// apps/web/src/components/member/SubscriptionBanner.tsx
// Shows expiry warnings and expired states on member dashboard

import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

interface Props {
  memberships: any[];
}

export function SubscriptionBanner({ memberships }: Props) {
  const approved = memberships.filter(m => m.status === 'approved');
  if (approved.length === 0) return null;

  // Find memberships with subscription data
  const withSub = approved.filter(m => m.subscription_end);
  if (withSub.length === 0) return null;

  // Find the most urgent situation
  const now = new Date();
  const alerts: { type: 'expired' | 'expiring' | 'ok'; gym: string; daysLeft: number }[] = [];

  withSub.forEach(m => {
    const end      = parseISO(m.subscription_end);
    const daysLeft = differenceInDays(end, now);
    const gym      = m.gym?.name ?? 'Gym';

    if (daysLeft < 0)          alerts.push({ type: 'expired',  gym, daysLeft });
    else if (daysLeft <= 7)    alerts.push({ type: 'expiring', gym, daysLeft });
    else                       alerts.push({ type: 'ok',       gym, daysLeft });
  });

  const expired  = alerts.filter(a => a.type === 'expired');
  const expiring = alerts.filter(a => a.type === 'expiring');

  if (expired.length === 0 && expiring.length === 0) return null;

  if (expired.length > 0) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl mb-4
                      bg-atom-danger/10 border border-atom-danger/30">
        <XCircle size={18} className="text-atom-danger flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-display font-700 text-atom-danger text-sm uppercase tracking-wide">
            Subscription Expired
          </p>
          <p className="text-atom-muted text-xs mt-0.5">
            {expired.map(a => a.gym).join(', ')} — contact your gym admin to renew.
          </p>
        </div>
      </div>
    );
  }

  if (expiring.length > 0) {
    const soonest = expiring.sort((a, b) => a.daysLeft - b.daysLeft)[0];
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl mb-4
                      bg-atom-warning/10 border border-atom-warning/30">
        <AlertTriangle size={18} className="text-atom-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-display font-700 text-atom-warning text-sm uppercase tracking-wide">
            Subscription Expiring Soon
          </p>
          <p className="text-atom-muted text-xs mt-0.5">
            {soonest.gym} — {soonest.daysLeft === 0 ? 'expires today' : `${soonest.daysLeft} day${soonest.daysLeft > 1 ? 's' : ''} left`}.
            Contact your gym admin to renew.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// Compact subscription status pill for profile page
export function SubscriptionPill({ membership }: { membership: any }) {
  if (!membership?.subscription_end) {
    return <span className="badge-gray">No plan set</span>;
  }

  const daysLeft = differenceInDays(
    parseISO(membership.subscription_end),
    new Date()
  );

  if (daysLeft < 0)       return <span className="badge-red">Expired</span>;
  if (daysLeft <= 7)      return <span className="badge-yellow">{daysLeft}d left</span>;
  if (daysLeft <= 30)     return <span className="badge-blue">{daysLeft}d left</span>;
  return                         <span className="badge-green">Active</span>;
}
