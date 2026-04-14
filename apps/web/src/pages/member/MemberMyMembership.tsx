import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, parseISO } from 'date-fns';
import { membershipApi, subscriptionsApi } from '@/lib/api';

export default function MemberMyMembership() {
  const { data: membershipsData } = useQuery({
    queryKey: ['my-memberships'],
    queryFn: membershipApi.myStatus,
  });

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: subscriptionsApi.me,
  });

  const approvedGyms = (membershipsData?.memberships ?? []).filter((m: any) => m.status === 'approved');
  const active = subscriptionData?.active;

  if (approvedGyms.length === 0) {
    return null;
  }

  const rows = subscriptionData?.subscriptions ?? [];
  const daysRemaining = active?.end_date ? differenceInDays(parseISO(active.end_date), new Date()) : null;

  const statusBadgeClass =
    !active ? 'badge-gray'
    : active.status === 'expired' ? 'badge-red'
    : daysRemaining !== null && daysRemaining <= 7 ? 'badge-yellow'
    : 'badge-green';

  const statusText =
    !active ? 'No active plan'
    : active.status === 'expired' ? 'Expired'
    : daysRemaining !== null && daysRemaining <= 7 ? `Expiring in ${Math.max(daysRemaining, 0)}d`
    : 'Active';

  return (
    <div className="page max-w-3xl">
      <div className="mb-6">
        <h1 className="section-title">My Membership</h1>
        <p className="text-atom-muted text-sm mt-1">See your current plan and renewal timeline.</p>
      </div>

      {!active ? (
        <div className="card text-center py-12">
          <p className="font-display font-700 uppercase tracking-wide text-atom-text">No Active Membership</p>
          <p className="text-atom-muted text-sm mt-2">No active membership. Contact admin.</p>
        </div>
      ) : (
        <div className="card mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-atom-muted text-xs uppercase tracking-widest font-display">Current Plan</p>
              <h2 className="font-display text-2xl font-800 uppercase tracking-wide mt-1">{active.plan?.name ?? 'Membership Plan'}</h2>
            </div>
            <span className={statusBadgeClass}>{statusText}</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-atom-bg border border-atom-border">
              <p className="text-atom-muted text-xs uppercase tracking-widest font-display">Start Date</p>
              <p className="text-atom-text mt-1">{format(new Date(active.start_date), 'd MMM yyyy')}</p>
            </div>
            <div className="p-3 rounded-xl bg-atom-bg border border-atom-border">
              <p className="text-atom-muted text-xs uppercase tracking-widest font-display">End Date</p>
              <p className="text-atom-text mt-1">{format(new Date(active.end_date), 'd MMM yyyy')}</p>
            </div>
            <div className="p-3 rounded-xl bg-atom-bg border border-atom-border">
              <p className="text-atom-muted text-xs uppercase tracking-widest font-display">Days Remaining</p>
              <p className="text-atom-text mt-1">{daysRemaining !== null ? Math.max(daysRemaining, 0) : '-'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h3 className="font-display font-700 uppercase tracking-wide mb-4">History</h3>
        {isLoading ? (
          <p className="text-atom-muted text-sm py-6">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-atom-muted text-sm py-6">No subscriptions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atom-border">
                {['Plan', 'Start', 'End', 'Status', 'Payment'].map((h) => (
                  <th key={h} className="text-left py-3 px-2 text-atom-muted font-display uppercase text-xs tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id} className="border-b border-atom-border/40">
                  <td className="py-3 px-2 text-atom-text">{row.plan?.name ?? 'Plan'}</td>
                  <td className="py-3 px-2 text-atom-muted">{format(new Date(row.start_date), 'd MMM yyyy')}</td>
                  <td className="py-3 px-2 text-atom-muted">{format(new Date(row.end_date), 'd MMM yyyy')}</td>
                  <td className="py-3 px-2">
                    <span className={row.status === 'active' ? 'badge-green' : row.status === 'expired' ? 'badge-red' : 'badge-gray'}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={row.payment_status === 'paid' ? 'badge-blue' : row.payment_status === 'pending' ? 'badge-yellow' : 'badge-red'}>
                      {row.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
