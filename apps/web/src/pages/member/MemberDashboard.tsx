// apps/web/src/pages/member/MemberDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { checkinApi, workoutApi } from '@/lib/api';
import { ScanLine, Dumbbell, Calendar, CheckCircle2, Clock, Lock } from 'lucide-react';
import { useUser } from '@/store/auth';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { SubscriptionBanner } from '@/components/member/SubscriptionBanner';
import { NewMemberWelcome } from '@/components/member/NewMemberWelcome';
import { useMyMemberships } from '@/hooks/useMembership';

export default function MemberDashboard() {
  const user = useUser();

  const { data: memberships = [] } = useMyMemberships();

  const { data: checkinsData } = useQuery({
    queryKey: ['my-checkins'],
    queryFn: () => checkinApi.my(1),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: workoutStats } = useQuery({
    queryKey: ['workout-stats'],
    queryFn: workoutApi.stats,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: recentWorkouts } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutApi.list({ limit: 3 }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const approvedGyms  = memberships.filter((m: any) => m.status === 'approved');
  const pendingGyms   = memberships.filter((m: any) => m.status === 'pending');
  const recentCheckins = checkinsData?.checkins ?? [];
  const logs          = recentWorkouts?.logs ?? [];

  const hasApprovedGym = approvedGyms.length > 0;

  return (
    <div className="page">
      {/* First-time onboarding overlay */}
      <NewMemberWelcome />

      {/* Header */}
      <div className="mb-8">
        <p className="text-atom-muted text-sm font-mono mb-1">
          {format(new Date(), 'EEEE, d MMMM')}
        </p>
        <h1 className="section-title">
          Hey, {user?.full_name?.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Subscription expiry warnings */}
      <SubscriptionBanner memberships={memberships} />

      {/* CHECK IN / GYM STATUS BANNER */}
      {hasApprovedGym ? (
        /* ── Approved: full gold check-in CTA ── */
        <Link to="/member/checkin"
          className="flex items-center gap-5 p-6 mb-6 rounded-2xl
                     bg-atom-accent text-atom-bg font-display
                     hover:bg-atom-accent-dim transition-all duration-200 group
                     shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <div className="w-14 h-14 bg-atom-bg/20 rounded-xl flex items-center justify-center flex-shrink-0
                          group-hover:bg-atom-bg/30 transition-colors">
            <ScanLine size={28} />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-800 uppercase tracking-wide">Check In Now</p>
            <p className="text-atom-bg/70 text-sm mt-0.5">
              Tap to scan your gym's QR code
            </p>
          </div>
          <div className="text-3xl font-800 opacity-40 group-hover:opacity-60 transition-opacity">→</div>
        </Link>

      ) : pendingGyms.length > 0 ? (
        /* ── Pending: waiting for approval ── */
        <div className="flex items-center gap-4 p-5 mb-6 rounded-2xl
                        bg-atom-warning/10 border border-atom-warning/30">
          <Clock size={20} className="text-atom-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="font-display font-700 text-atom-warning text-sm uppercase tracking-wide">
              Membership Pending
            </p>
            <p className="text-atom-muted text-xs mt-0.5">
              Your request to join{' '}
              <span className="text-atom-text font-500">{pendingGyms[0].gym?.name}</span>{' '}
              is awaiting admin approval. Check-in unlocks once approved.
            </p>
          </div>
        </div>

      ) : (
        /* ── New member: join gym prompt ── */
        <Link to="/member/profile"
          className="flex items-center gap-4 p-5 mb-6 rounded-2xl
                     bg-atom-surface border border-dashed border-atom-accent/30
                     hover:border-atom-accent/60 hover:bg-atom-accent/5 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-atom-accent/10 border border-atom-accent/20
                          flex items-center justify-center flex-shrink-0 group-hover:bg-atom-accent/20 transition-colors">
            <Lock size={20} className="text-atom-accent" />
          </div>
          <div className="flex-1">
            <p className="font-display font-700 text-atom-text text-sm uppercase tracking-wide">
              Unlock Check-in
            </p>
            <p className="text-atom-muted text-xs mt-0.5">
              Join a gym with your 6-digit gym code → get approved → scan QR
            </p>
          </div>
          <span className="text-atom-accent text-sm font-display font-700 uppercase tracking-wide
                           group-hover:translate-x-1 transition-transform flex-shrink-0">
            Join →
          </span>
        </Link>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Workouts', value: workoutStats?.total_workouts ?? '—', icon: Dumbbell,    color: 'text-atom-accent  bg-atom-accent/10'    },
          { label: 'This Week',      value: workoutStats?.workouts_this_week ?? '—', icon: Calendar, color: 'text-atom-info  bg-atom-info/10'    },
          { label: 'Check-ins',      value: checkinsData?.total ?? '—', icon: CheckCircle2,          color: 'text-atom-success bg-atom-success/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
            <p className="font-display text-2xl font-800 text-atom-text">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-700 uppercase tracking-wide">Recent Check-ins</h2>
            <Link to="/member/checkin" className="text-atom-accent text-xs hover:underline">History →</Link>
          </div>
          {recentCheckins.length === 0 ? (
            <p className="text-atom-muted text-sm text-center py-8">No check-ins yet</p>
          ) : recentCheckins.slice(0, 5).map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-atom-border/40 last:border-0">
              <div className="w-2 h-2 rounded-full bg-atom-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-atom-text text-sm font-500 truncate">
                  {c.gym?.name ?? 'Gym'}
                </p>
                <p className="text-atom-muted text-xs">
                  {format(new Date(c.checked_in_at), 'EEE, d MMM · h:mm a')}
                </p>
              </div>
              <span className="text-atom-muted text-xs flex-shrink-0">
                {formatDistanceToNow(new Date(c.checked_in_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Workouts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-700 uppercase tracking-wide">Recent Workouts</h2>
            <Link to="/member/workouts" className="text-atom-accent text-xs hover:underline">All →</Link>
          </div>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-atom-muted text-sm mb-3">No workouts logged yet</p>
              <Link to="/member/workouts" className="btn-primary text-xs px-4 py-2">
                Log First Workout
              </Link>
            </div>
          ) : logs.map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 py-2.5 border-b border-atom-border/40 last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                log.is_completed ? 'bg-atom-accent' : 'bg-atom-border'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-atom-text text-sm font-500 truncate">
                  {log.title || 'Workout'}
                </p>
                <p className="text-atom-muted text-xs">
                  {format(new Date(log.workout_date), 'EEE, d MMM')}
                  {log.duration_min ? ` · ${log.duration_min}min` : ''}
                </p>
              </div>
              {log.is_completed
                ? <CheckCircle2 size={14} className="text-atom-accent flex-shrink-0" />
                : <span className="badge-gray text-xs">Draft</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Gym memberships */}
      {memberships.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-display text-base font-700 uppercase tracking-wide mb-4">My Gyms</h2>
          <div className="flex flex-col gap-3">
            {memberships.map((m: any) => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-atom-bg border border-atom-border/50">
                <div className="w-10 h-10 rounded-lg bg-atom-accent/10 border border-atom-accent/20
                                flex items-center justify-center text-atom-accent font-display font-700 text-sm flex-shrink-0">
                  {m.gym?.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-500 text-atom-text text-sm truncate">{m.gym?.name}</p>
                  <p className="text-atom-muted text-xs">{m.gym?.city}</p>
                </div>
                <MembershipStatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MembershipStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-green', pending: 'badge-yellow',
    rejected: 'badge-red',  suspended: 'badge-gray',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}
