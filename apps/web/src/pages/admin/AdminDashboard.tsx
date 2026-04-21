// apps/web/src/pages/admin/AdminDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { membershipApi, checkinApi, gymApi } from '@/lib/api';
import { Users, Clock, Activity, AlertCircle, QrCode, Building2, ChevronRight } from 'lucide-react';
import { useUser } from '@/store/auth';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const user     = useUser();
  const navigate = useNavigate();

  const { data: statsData } = useQuery({
    queryKey: ['membership-stats'],
    queryFn: membershipApi.stats,
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const { data: todayData  } = useQuery({
    queryKey: ['checkins-today'],
    queryFn: checkinApi.today,
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const { data: reqData    } = useQuery({
    queryKey: ['admin-join-requests'],
    queryFn: membershipApi.requests,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const { data: gymData    } = useQuery({
    queryKey: ['my-gym'],
    queryFn: gymApi.my,
    enabled: !!user?.gym_id,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const stats    = statsData ?? {} as any;
  const today    = todayData ?? {} as any;
  const requests = reqData?.requests ?? [];
  const gymName  = gymData?.gym?.name ?? 'Your Gym';

  // Stat cards — each navigates with a filter
  const statCards = [
    {
      label: 'Active Members', value: stats.active_members ?? '—',
      icon: Users, color: 'gold',
      onClick: () => navigate('/admin/members', { state: { tab: 'approved' } }),
    },
    {
      label: 'Check-ins Today', value: today.total_checkins ?? '—',
      icon: Activity, color: 'green',
      onClick: () => navigate('/admin/attendance'),
    },
    {
      label: 'Pending Requests', value: stats.pending_requests ?? '—',
      icon: Clock, color: 'yellow',
      onClick: () => navigate('/admin/members', { state: { tab: 'pending' } }),
    },
    {
      label: 'Expired Subs', value: stats.expired_subscriptions ?? '—',
      icon: AlertCircle, color: 'red',
      onClick: () => navigate('/admin/members', { state: { tab: 'all' } }),
    },
  ];

  return (
    <div className="page">
      <div className="mb-8">
        <p className="text-atom-muted text-sm font-mono mb-1">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
        <h1 className="section-title">{gymName}</h1>
        <p className="text-atom-muted text-sm mt-1 flex items-center gap-2">
          <Building2 size={13} />
          <span>Gym Admin · {user?.email}</span>
        </p>
      </div>

      {/* Clickable stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, onClick }) => {
          const colors: Record<string, string> = {
            gold:   'text-atom-accent  bg-atom-accent/10',
            green:  'text-atom-success bg-atom-success/10',
            yellow: 'text-atom-warning bg-atom-warning/10',
            red:    'text-atom-danger  bg-atom-danger/10',
          };
          return (
            <button key={label} onClick={onClick}
              className="stat-card text-left hover:border-atom-accent/40 hover:bg-atom-border/20 transition-all group cursor-pointer">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon size={18} />
              </div>
              <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
              <p className="font-display text-3xl font-800 text-atom-text">{value}</p>
              <p className="text-atom-accent text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View <ChevronRight size={12} />
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending join requests — clickable rows */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-700 uppercase tracking-wide">Join Requests</h2>
            <Link to="/admin/members" state={{ tab: 'pending' }}
              className="text-atom-accent text-xs hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-atom-muted text-sm text-center py-8">No pending requests</p>
          ) : requests.slice(0, 5).map((r: any) => (
            <Link key={r.id} to="/admin/members" state={{ tab: 'pending' }}
              className="flex items-center gap-3 py-3 border-b border-atom-border/50 last:border-0
                         hover:bg-atom-border/20 -mx-2 px-2 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-atom-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-atom-accent font-display font-700 text-xs">
                  {r.user?.full_name?.[0] ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-atom-text text-sm font-500 truncate">{r.user?.full_name}</p>
                <p className="text-atom-muted text-xs truncate">{r.user?.email}</p>
              </div>
              <span className="badge-yellow text-xs">Pending</span>
            </Link>
          ))}
          {requests.length > 0 && (
            <Link to="/admin/members" state={{ tab: 'pending' }}
              className="flex items-center justify-center gap-1 mt-4 text-atom-accent text-xs hover:underline">
              Review {requests.length} request{requests.length > 1 ? 's' : ''} <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {/* Today's check-ins — clickable */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-700 uppercase tracking-wide">Today's Check-ins</h2>
            <Link to="/admin/attendance" className="text-atom-accent text-xs hover:underline flex items-center gap-1">
              Full log <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-atom-success/10 border border-atom-success/20">
            <span className="text-atom-muted text-sm">Total today</span>
            <span className="font-display text-2xl font-800 text-atom-success">{today.total_checkins ?? 0}</span>
          </div>
          {(today.checkins ?? []).length === 0 ? (
            <p className="text-atom-muted text-sm text-center py-4">No check-ins yet today</p>
          ) : (today.checkins ?? []).slice(0, 5).map((c: any, i: number) => (
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
      <Link to="/admin/qr"
        className="mt-6 card border-atom-accent/30 bg-atom-accent/5 flex items-center gap-6
                   hover:border-atom-accent/60 hover:bg-atom-accent/10 transition-all group">
        <div className="w-12 h-12 bg-atom-accent rounded-xl flex items-center justify-center flex-shrink-0">
          <QrCode size={24} className="text-atom-bg" />
        </div>
        <div className="flex-1">
          <p className="font-display font-700 text-atom-text uppercase tracking-wide">QR Check-in Screen</p>
          <p className="text-atom-muted text-sm">Display the rotating QR code on your gym TV or tablet.</p>
        </div>
        <ChevronRight size={20} className="text-atom-accent group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}
