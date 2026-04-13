// apps/web/src/pages/super/SuperDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Building2, Users, Activity, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { useUser } from '@/store/auth';
import { Link, useNavigate } from 'react-router-dom';

export default function SuperDashboard() {
  const user     = useUser();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  adminApi.stats,
    refetchInterval: 30_000,
  });
  const { data: gymsData, isLoading: gymsLoading } = useQuery({
    queryKey: ['admin-gyms'],
    queryFn:  adminApi.gyms,
  });

  const gyms = gymsData?.gyms ?? [];

  const statCards = [
    { label: 'Total Gyms',    value: stats?.total_gyms ?? '—',    sub: `${stats?.active_gyms ?? 0} active`,   icon: Building2,  color: 'gold',   to: '/super/gyms'    },
    { label: 'Total Members', value: stats?.total_members ?? '—', sub: `${stats?.new_members_this_month ?? 0} new this month`, icon: Users, color: 'blue', to: '/super/members' },
    { label: 'Check-ins Today', value: stats?.total_checkins_today ?? '—', sub: 'Across all gyms', icon: Activity, color: 'green', to: '/super/gyms' },
    { label: 'Pending Requests', value: stats?.pending_membership_requests ?? '—', sub: 'Awaiting approval', icon: Clock, color: 'yellow', to: '/super/members' },
  ];

  return (
    <div className="page">
      <div className="mb-8">
        <p className="text-atom-muted text-sm font-mono mb-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="section-title">Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-atom-muted text-sm mt-1">Platform overview — Atom OS Super Admin</p>
      </div>

      {/* Clickable KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, color, to }) => {
          const colors: Record<string, string> = {
            gold:   'text-atom-accent  bg-atom-accent/10',
            blue:   'text-atom-info    bg-atom-info/10',
            green:  'text-atom-success bg-atom-success/10',
            yellow: 'text-atom-warning bg-atom-warning/10',
          };
          return (
            <Link key={label} to={to}
              className="stat-card hover:border-atom-accent/40 hover:bg-atom-border/20 transition-all group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon size={18} />
              </div>
              <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
              <p className="font-display text-3xl font-800 text-atom-text">
                {statsLoading ? <span className="opacity-30">—</span> : value}
              </p>
              <p className="text-atom-muted text-xs mt-1">{sub}</p>
              <p className="text-atom-accent text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View <ChevronRight size={12} />
              </p>
            </Link>
          );
        })}
      </div>

      {/* Gyms Table — clickable rows */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-700 uppercase tracking-wide">All Gyms</h2>
          <Link to="/super/gyms" className="text-atom-accent text-sm hover:underline flex items-center gap-1">
            Manage all <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {gymsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-atom-muted">
              <div className="w-5 h-5 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading gyms...</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-atom-border">
                  {['Gym', 'Code', 'Location', 'Members', 'Today', 'Pending', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-atom-muted font-display uppercase text-xs tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gyms.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-atom-muted">No gyms registered yet</td></tr>
                ) : gyms.map((gym: any) => (
                  <tr key={gym.id}
                    onClick={() => navigate('/super/gyms')}
                    className="border-b border-atom-border/50 hover:bg-atom-border/20 transition-colors cursor-pointer">
                    <td className="py-3 px-3">
                      <p className="font-500 text-atom-text">{gym.name}</p>
                      <p className="text-atom-muted text-xs">{gym.owner?.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-atom-accent bg-atom-accent/10 px-2 py-0.5 rounded text-xs">{gym.gym_code}</span>
                    </td>
                    <td className="py-3 px-3 text-atom-muted">{[gym.city, gym.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="py-3 px-3 text-atom-text font-mono">{gym.total_members}</td>
                    <td className="py-3 px-3 text-atom-text font-mono">{gym.checkins_today ?? 0}</td>
                    <td className="py-3 px-3">
                      {gym.pending_requests > 0
                        ? <span className="badge-yellow">{gym.pending_requests}</span>
                        : <span className="text-atom-muted text-xs">—</span>
                      }
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={gym.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Link to="/super/members"
          className="card flex items-center gap-4 hover:border-atom-accent/40 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-atom-info/10 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-atom-info" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-700 uppercase tracking-wide text-sm">All Members</p>
            <p className="text-atom-muted text-xs">View members across all gyms</p>
          </div>
          <ChevronRight size={16} className="text-atom-muted group-hover:text-atom-accent group-hover:translate-x-1 transition-all" />
        </Link>
        <Link to="/super/gyms"
          className="card flex items-center gap-4 hover:border-atom-accent/40 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-atom-accent/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} className="text-atom-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-700 uppercase tracking-wide text-sm">Manage Gyms</p>
            <p className="text-atom-muted text-xs">Create, suspend, assign admins</p>
          </div>
          <ChevronRight size={16} className="text-atom-muted group-hover:text-atom-accent group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { active: 'badge-green', trial: 'badge-yellow', inactive: 'badge-gray', suspended: 'badge-red' };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
