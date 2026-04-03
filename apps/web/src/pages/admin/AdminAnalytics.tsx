// apps/web/src/pages/admin/AdminAnalytics.tsx
// Gym-level analytics: daily check-ins trend, member growth, peak hours

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkinApi, membershipApi } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Activity, Users, TrendingUp, Clock } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { SkeletonCard } from '@/components/ui/Skeleton';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-atom-surface border border-atom-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-atom-muted text-xs mb-1">{label}</p>
      <p className="text-atom-accent text-sm font-mono font-500">{payload[0]?.value}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState<14 | 30 | 60>(14);

  const { data: todayData } = useQuery({
    queryKey: ['checkins-today'],
    queryFn: checkinApi.today,
    refetchInterval: 30_000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['membership-stats'],
    queryFn: membershipApi.stats,
  });

  const { data: allCheckinsData, isLoading: checkinsLoading } = useQuery({
    queryKey: ['all-gym-checkins', days],
    queryFn: () => checkinApi.gym({ page: 1 } as any),
    select: (d: any) => (d.checkins ?? []) as any[],
  });

  const { data: membersData } = useQuery({
    queryKey: ['members-approved'],
    queryFn: () => membershipApi.members('approved'),
    select: (d: any) => (d.members ?? []) as any[],
  });

  const checkins = allCheckinsData ?? [];
  const members  = membersData    ?? [];
  const stats    = (statsData     ?? {}) as any;

  const dailyData  = buildDailyData(checkins, days);
  const hourlyData = buildHourlyData(checkins);
  const memberGrowthData = buildMemberGrowthData(members);

  const isLoading = statsLoading || checkinsLoading;

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="section-title">Analytics</h1>
        <p className="text-atom-muted text-sm mt-1">Your gym performance overview</p>
      </div>

      {/* KPI row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Check-ins Today', value: todayData?.total_checkins ?? 0,  icon: Activity,   color: 'green'  },
            { label: 'Active Members',  value: stats.active_members      ?? 0,  icon: Users,      color: 'gold'   },
            { label: 'Pending',         value: stats.pending_requests    ?? 0,  icon: Clock,      color: 'yellow' },
            { label: 'Expired Subs',    value: stats.expired_subscriptions ?? 0,icon: TrendingUp, color: 'red'    },
          ].map(({ label, value, icon: Icon, color }) => {
            const cls: Record<string, string> = {
              gold: 'text-atom-accent bg-atom-accent/10', green: 'text-atom-success bg-atom-success/10',
              yellow: 'text-atom-warning bg-atom-warning/10', red: 'text-atom-danger bg-atom-danger/10',
            };
            return (
              <div key={label} className="stat-card">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${cls[color]}`}>
                  <Icon size={18} />
                </div>
                <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
                <p className="font-display text-3xl font-800 text-atom-text">{value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily check-ins trend */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-base font-700 uppercase tracking-wide">
              Daily Check-ins
            </h2>
            <p className="text-atom-muted text-xs mt-0.5">Attendance trend</p>
          </div>
          <div className="flex gap-1 bg-atom-bg border border-atom-border rounded-lg p-0.5">
            {([14, 30, 60] as const).map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-md text-xs font-display uppercase tracking-wide transition-all ${
                  days === d ? 'bg-atom-accent text-atom-bg font-700' : 'text-atom-muted hover:text-atom-text'
                }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }}
              axisLine={false} tickLine={false} interval={Math.floor(days / 7)} />
            <YAxis allowDecimals={false}
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="checkins" stroke="#22C55E" strokeWidth={2}
              fill="url(#greenGrad)" dot={false}
              activeDot={{ r: 4, fill: '#22C55E', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peak hours */}
        <div className="card">
          <h2 className="font-display text-base font-700 uppercase tracking-wide mb-1">
            Peak Hours
          </h2>
          <p className="text-atom-muted text-xs mb-5">When members check in most</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false}
                tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="checkins" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member growth */}
        <div className="card">
          <h2 className="font-display text-base font-700 uppercase tracking-wide mb-1">
            Member Growth
          </h2>
          <p className="text-atom-muted text-xs mb-5">New members per month (last 6)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={memberGrowthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false}
                tick={{ fill: '#888', fontSize: 10, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="new_members" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Data helpers ─────────────────────────────────────────────────────────────

function buildDailyData(checkins: any[], daysBack: number) {
  const end   = new Date();
  const start = subDays(end, daysBack - 1);
  const days  = eachDayOfInterval({ start, end });

  return days.map(d => {
    const key = format(d, 'yyyy-MM-dd');
    const count = checkins.filter(c =>
      format(new Date(c.checked_in_at), 'yyyy-MM-dd') === key
    ).length;
    return { date: format(d, 'MMM d'), checkins: count };
  });
}

function buildHourlyData(checkins: any[]) {
  const buckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i % 2 === 0 ? `${i}:00` : '',
    checkins: 0,
  }));
  checkins.forEach(c => {
    const h = new Date(c.checked_in_at).getHours();
    buckets[h].checkins++;
  });
  return buckets;
}

function buildMemberGrowthData(members: any[]) {
  const months: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[format(d, 'MMM yy')] = 0;
  }
  members.forEach(m => {
    const key = format(new Date(m.joined_at), 'MMM yy');
    if (key in months) months[key]++;
  });
  return Object.entries(months).map(([month, new_members]) => ({ month, new_members }));
}
