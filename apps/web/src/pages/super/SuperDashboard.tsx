// apps/web/src/pages/super/SuperDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Building2, Users, Activity, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useUser } from '@/store/auth';

export default function SuperDashboard() {
  const user = useUser();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
    refetchInterval: 30_000,
  });
  const { data: gymsData } = useQuery({
    queryKey: ['admin-gyms'],
    queryFn: adminApi.gyms,
  });

  const gyms = gymsData?.gyms ?? [];

  return (
    <div className="page">
      {/* Header */}
      <div className="mb-8">
        <p className="text-atom-muted text-sm font-mono mb-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="section-title">
          Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-atom-muted text-sm mt-1">Platform overview — Atom OS Super Admin</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Gyms"
          value={stats?.total_gyms ?? '—'}
          sub={`${stats?.active_gyms ?? 0} active`}
          icon={Building2}
          color="gold"
          loading={isLoading}
        />
        <StatCard
          label="Total Members"
          value={stats?.total_members ?? '—'}
          sub={`${stats?.new_members_this_month ?? 0} new this month`}
          icon={Users}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          label="Check-ins Today"
          value={stats?.total_checkins_today ?? '—'}
          sub="Across all gyms"
          icon={Activity}
          color="green"
          loading={isLoading}
        />
        <StatCard
          label="Pending Requests"
          value={stats?.pending_membership_requests ?? '—'}
          sub="Awaiting approval"
          icon={Clock}
          color="yellow"
          loading={isLoading}
        />
      </div>

      {/* Gyms Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-700 uppercase tracking-wide">All Gyms</h2>
          <a href="/super/gyms" className="text-atom-gold text-sm hover:underline">Manage →</a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atom-border">
                {['Gym', 'Code', 'City', 'Members', 'Today', 'Status'].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-atom-muted font-display uppercase text-xs tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gyms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-atom-muted">
                    No gyms registered yet
                  </td>
                </tr>
              ) : gyms.map((gym: any) => (
                <tr key={gym.id} className="border-b border-atom-border/50 hover:bg-atom-border/20 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-500 text-atom-text">{gym.name}</p>
                    <p className="text-atom-muted text-xs">{gym.owner?.email}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-atom-gold bg-atom-gold/10 px-2 py-0.5 rounded text-xs">
                      {gym.gym_code}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-atom-muted">{gym.city || '—'}</td>
                  <td className="py-3 px-3 text-atom-text">{gym.total_members}</td>
                  <td className="py-3 px-3 text-atom-text">{gym.checkins_today}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={gym.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, loading }: any) {
  const colors: Record<string, string> = {
    gold:   'text-atom-gold bg-atom-gold/10',
    blue:   'text-atom-info bg-atom-info/10',
    green:  'text-atom-success bg-atom-success/10',
    yellow: 'text-atom-warning bg-atom-warning/10',
  };
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
      <p className="font-display text-3xl font-800 text-atom-text">
        {loading ? <span className="opacity-30">—</span> : value}
      </p>
      <p className="text-atom-muted text-xs mt-1">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'badge-green',
    trial:     'badge-yellow',
    inactive:  'badge-gray',
    suspended: 'badge-red',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
