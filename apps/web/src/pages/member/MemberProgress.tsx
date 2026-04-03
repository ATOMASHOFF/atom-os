// apps/web/src/pages/member/MemberProgress.tsx
// Workout analytics: weekly volume chart, check-in frequency, personal records

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workoutApi, checkinApi } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { TrendingUp, Dumbbell, Activity, Award, Calendar } from 'lucide-react';
import { format, subDays, startOfWeek, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { SkeletonCard } from '@/components/ui/Skeleton';

// ── Custom tooltip for charts ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-atom-surface border border-atom-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-atom-muted text-xs mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-atom-accent text-sm font-mono font-500">
          {p.value}{unit}
        </p>
      ))}
    </div>
  );
}

export default function MemberProgress() {
  const [range, setRange] = useState<8 | 12 | 16>(8);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['workouts-all'],
    queryFn: () => workoutApi.list({ limit: 200 } as any),
    select: (d: any) => (d.logs ?? []) as any[],
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['workout-stats'],
    queryFn: workoutApi.stats,
  });

  const { data: checkinsData } = useQuery({
    queryKey: ['my-checkins-all'],
    queryFn: () => checkinApi.my(1),
    select: (d: any) => (d.checkins ?? []) as any[],
  });

  const logs     = logsData     ?? [];
  const checkins = checkinsData ?? [];

  // ── Weekly workout volume (sessions per week) ────────────────────────────
  const weeklyData = buildWeeklyData(logs, range);

  // ── Check-in streak ──────────────────────────────────────────────────────
  const streak = calcCheckinStreak(checkins);

  // ── Workouts by day of week ──────────────────────────────────────────────
  const byDayData = buildByDayData(logs);

  // ── Monthly breakdown ────────────────────────────────────────────────────
  const monthlyData = buildMonthlyData(logs);

  const isLoading = logsLoading || statsLoading;

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="section-title">Progress</h1>
        <p className="text-atom-muted text-sm mt-1">Your fitness analytics</p>
      </div>

      {/* ── TOP STATS ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Dumbbell}   color="gold"
            label="Total Sessions"
            value={(stats as any)?.total_workouts ?? 0}
            sub="All time"
          />
          <StatCard
            icon={TrendingUp} color="green"
            label="This Month"
            value={(stats as any)?.workouts_this_month ?? 0}
            sub={format(new Date(), 'MMMM')}
          />
          <StatCard
            icon={Calendar}   color="blue"
            label="This Week"
            value={(stats as any)?.workouts_this_week ?? 0}
            sub="Last 7 days"
          />
          <StatCard
            icon={Award}      color="yellow"
            label="Gym Streak"
            value={streak}
            sub={streak === 1 ? 'day' : 'consecutive days'}
          />
        </div>
      )}

      {/* ── WEEKLY VOLUME CHART ── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-base font-700 uppercase tracking-wide">
              Weekly Sessions
            </h2>
            <p className="text-atom-muted text-xs mt-0.5">Workouts completed per week</p>
          </div>
          <div className="flex gap-1 bg-atom-bg border border-atom-border rounded-lg p-0.5">
            {([8, 12, 16] as const).map(w => (
              <button
                key={w}
                onClick={() => setRange(w)}
                className={`px-3 py-1 rounded-md text-xs font-display uppercase tracking-wide transition-all ${
                  range === w
                    ? 'bg-atom-accent text-atom-bg font-700'
                    : 'text-atom-muted hover:text-atom-text'
                }`}
              >
                {w}w
              </button>
            ))}
          </div>
        </div>

        {weeklyData.length === 0 ? (
          <EmptyChart message="Log some workouts to see your weekly trend" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis
                dataKey="week" tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<ChartTooltip unit=" sessions" />} />
              <Area
                type="monotone" dataKey="sessions"
                stroke="#EF4444" strokeWidth={2}
                fill="url(#goldGrad)"
                dot={{ fill: '#EF4444', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#EF4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* ── BY DAY OF WEEK ── */}
        <div className="card">
          <h2 className="font-display text-base font-700 uppercase tracking-wide mb-1">
            Favourite Days
          </h2>
          <p className="text-atom-muted text-xs mb-5">Which days you train most</p>
          {byDayData.every(d => d.count === 0) ? (
            <EmptyChart message="No data yet" height={150} />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={byDayData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip unit=" sessions" />} />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── MONTHLY TREND ── */}
        <div className="card">
          <h2 className="font-display text-base font-700 uppercase tracking-wide mb-1">
            Monthly Trend
          </h2>
          <p className="text-atom-muted text-xs mb-5">Sessions per month (last 6)</p>
          {monthlyData.every(d => d.sessions === 0) ? (
            <EmptyChart message="No data yet" height={150} />
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'DM Sans' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip unit=" sessions" />} />
                <Line
                  type="monotone" dataKey="sessions"
                  stroke="#22C55E" strokeWidth={2.5}
                  dot={{ fill: '#22C55E', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#22C55E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── RECENT ACTIVITY LOG ── */}
      <div className="card">
        <h2 className="font-display text-base font-700 uppercase tracking-wide mb-4">
          Recent Sessions
        </h2>
        {logs.length === 0 ? (
          <p className="text-atom-muted text-sm text-center py-8">No workouts logged yet</p>
        ) : (
          <div className="flex flex-col gap-0">
            {logs.slice(0, 10).map((log: any, i: number) => (
              <div
                key={log.id}
                className="flex items-center gap-4 py-3 border-b border-atom-border/40 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-atom-accent/10 flex items-center justify-center
                                text-atom-accent font-mono text-xs font-700 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-500 text-atom-text text-sm truncate">
                    {log.title || 'Workout'}
                  </p>
                  <p className="text-atom-muted text-xs">
                    {format(new Date(log.workout_date), 'EEE, d MMM yyyy')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {log.duration_min && (
                    <p className="text-atom-muted text-xs font-mono">{log.duration_min}min</p>
                  )}
                  <span className={log.is_completed ? 'badge-green' : 'badge-gray'}>
                    {log.is_completed ? 'Done' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, color, label, value, sub }: any) {
  const colors: Record<string, string> = {
    gold:   'text-atom-accent    bg-atom-accent/10',
    green:  'text-atom-success bg-atom-success/10',
    blue:   'text-atom-info    bg-atom-info/10',
    yellow: 'text-atom-warning bg-atom-warning/10',
  };
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
      <p className="font-display text-3xl font-800 text-atom-text">{value}</p>
      <p className="text-atom-muted text-xs mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyChart({ message, height = 200 }: { message: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-atom-muted text-sm"
      style={{ height }}
    >
      {message}
    </div>
  );
}

function buildWeeklyData(logs: any[], weeksBack: number) {
  const now   = new Date();
  const start = subDays(now, weeksBack * 7);
  const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });

  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const count = logs.filter(l => {
      const d = new Date(l.workout_date);
      return d >= weekStart && d <= weekEnd && l.is_completed;
    }).length;
    return {
      week: format(weekStart, 'MMM d'),
      sessions: count,
    };
  });
}

function buildByDayData(logs: any[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  logs.forEach(l => {
    if (!l.is_completed) return;
    const dow = new Date(l.workout_date).getDay(); // 0=Sun
    const idx = dow === 0 ? 6 : dow - 1;          // shift to Mon=0
    counts[idx]++;
  });
  return days.map((day, i) => ({ day, count: counts[i] }));
}

function buildMonthlyData(logs: any[]) {
  const months: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[format(d, 'MMM yy')] = 0;
  }
  logs.forEach(l => {
    if (!l.is_completed) return;
    const key = format(new Date(l.workout_date), 'MMM yy');
    if (key in months) months[key]++;
  });
  return Object.entries(months).map(([month, sessions]) => ({ month, sessions }));
}

function calcCheckinStreak(checkins: any[]): number {
  if (!checkins.length) return 0;
  const dates = [...new Set(
    checkins.map(c => format(new Date(c.checked_in_at), 'yyyy-MM-dd'))
  )].sort().reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diff <= 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}
