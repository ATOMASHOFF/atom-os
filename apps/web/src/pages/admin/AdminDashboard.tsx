// apps/web/src/pages/admin/AdminDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { membershipApi, checkinApi } from '@/lib/api';
import { Users, Clock, Activity, AlertCircle, QrCode } from 'lucide-react';
import { useUser } from '@/store/auth';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const user = useUser();

  const { data: statsData } = useQuery({ queryKey: ['membership-stats'], queryFn: membershipApi.stats, refetchInterval: 60_000 });
  const { data: todayData }  = useQuery({ queryKey: ['checkins-today'], queryFn: checkinApi.today,   refetchInterval: 30_000 });
  const { data: reqData }    = useQuery({ queryKey: ['join-requests'],   queryFn: membershipApi.requests });

  const stats    = statsData ?? {};
  const today    = todayData ?? {};
  const requests = reqData?.requests ?? [];

  return (
    <div className="page">
      <div className="mb-8">
        <p className="text-atom-muted text-sm font-mono mb-1">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
        <h1 className="section-title">Gym Dashboard</h1>
        <p className="text-atom-muted text-sm mt-1">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Members', value: stats.active_members,       icon: Users,        color: 'gold'   },
          { label: 'Check-ins Today', value: today.total_checkins,      icon: Activity,     color: 'green'  },
          { label: 'Pending Requests', value: stats.pending_requests,   icon: Clock,        color: 'yellow' },
          { label: 'Expired Subs',     value: stats.expired_subscriptions, icon: AlertCircle, color: 'red'  },
        ].map(({ label, value, icon: Icon, color }) => {
          const colors: Record<string, string> = {
            gold: 'text-atom-gold bg-atom-gold/10', green: 'text-atom-success bg-atom-success/10',
            yellow: 'text-atom-warning bg-atom-warning/10', red: 'text-atom-danger bg-atom-danger/10',
          };
          return (
            <div key={label} className="stat-card">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon size={18} />
              </div>
              <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
              <p className="font-display text-3xl font-800 text-atom-text">{value ?? '—'}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending join requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-700 uppercase tracking-wide">Join Requests</h2>
            <Link to="/admin/members" className="text-atom-gold text-xs hover:underline">View all →</Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-atom-muted text-sm text-center py-8">No pending requests</p>
          ) : requests.slice(0, 5).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 py-3 border-b border-atom-border/50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-atom-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-atom-gold font-display font-700 text-xs">
                  {r.user?.full_name?.[0] ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-atom-text text-sm font-500 truncate">{r.user?.full_name}</p>
                <p className="text-atom-muted text-xs truncate">{r.user?.email}</p>
              </div>
              <Link to="/admin/members"
                className="text-atom-gold text-xs hover:underline flex-shrink-0">
                Review
              </Link>
            </div>
          ))}
        </div>

        {/* Today's check-ins */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-700 uppercase tracking-wide">
              Today's Check-ins
            </h2>
            <span className="badge-green">{today.total_checkins ?? 0} total</span>
          </div>
          {(today.checkins ?? []).length === 0 ? (
            <p className="text-atom-muted text-sm text-center py-8">No check-ins yet today</p>
          ) : (today.checkins ?? []).slice(0, 6).map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-atom-border/50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-atom-success/20 flex items-center justify-center flex-shrink-0">
                <span className="text-atom-success font-display font-700 text-xs">
                  {c.user?.full_name?.[0] ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-atom-text text-sm font-500 truncate">{c.user?.full_name}</p>
              </div>
              <p className="text-atom-muted text-xs flex-shrink-0">
                {format(new Date(c.checked_in_at), 'h:mm a')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* QR CTA */}
      <div className="mt-6 card border-atom-gold/30 bg-atom-gold/5 flex items-center gap-6">
        <div className="w-12 h-12 bg-atom-gold rounded-xl flex items-center justify-center flex-shrink-0">
          <QrCode size={24} className="text-atom-bg" />
        </div>
        <div className="flex-1">
          <p className="font-display font-700 text-atom-text uppercase tracking-wide">QR Check-in Screen</p>
          <p className="text-atom-muted text-sm">Display the rotating QR code on your gym TV or tablet.</p>
        </div>
        <Link to="/admin/qr" className="btn-primary flex-shrink-0">Open QR Screen</Link>
      </div>
    </div>
  );
}
