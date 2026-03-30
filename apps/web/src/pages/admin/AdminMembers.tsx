// apps/web/src/pages/admin/AdminMembers.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { Check, X, ChevronDown, Search, UserCheck, CreditCard } from 'lucide-react';
import { SubscriptionModal } from '@/components/admin/SubscriptionModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Tab = 'pending' | 'approved' | 'all';

export default function AdminMembers() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [approveModal, setApproveModal] = useState<any>(null);
  const [subMember,    setSubMember]    = useState<any>(null);
  const [approveForm, setApproveForm] = useState({
    plan: 'monthly', notes: '', amount_paid: '',
    subscription_start: new Date().toISOString().split('T')[0],
  });

  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['join-requests'],
    queryFn: membershipApi.requests,
    refetchInterval: 15_000,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', tab === 'all' ? undefined : tab],
    queryFn: () => membershipApi.members(tab === 'all' ? undefined : tab === 'approved' ? 'approved' : undefined),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      membershipApi.updateRequest(id, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['join-requests'] });
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['membership-stats'] });
      toast.success(vars.body.status === 'approved' ? '✅ Member approved!' : 'Request rejected');
      setApproveModal(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requests = reqData?.requests ?? [];
  const members  = membersData?.members ?? [];

  const filtered = (tab === 'pending' ? requests : members).filter((m: any) => {
    if (!search) return true;
    const name  = m.user?.full_name?.toLowerCase() ?? '';
    const email = m.user?.email?.toLowerCase() ?? '';
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const isLoading = tab === 'pending' ? reqLoading : membersLoading;

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="section-title">Members</h1>
        <p className="text-atom-muted text-sm mt-1">
          {requests.length} pending · {membersData?.members?.filter((m: any) => m.status === 'approved').length ?? 0} active
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 bg-atom-surface border border-atom-border rounded-lg p-1">
          {(['pending', 'approved', 'all'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-display uppercase tracking-wide transition-all ${
                tab === t
                  ? 'bg-atom-gold text-atom-bg'
                  : 'text-atom-muted hover:text-atom-text'
              }`}
            >
              {t === 'pending' && requests.length > 0 && (
                <span className="mr-1.5 bg-atom-danger text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {requests.length}
                </span>
              )}
              {t}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
          <input
            className="input pl-9 w-64"
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atom-border">
              {['Member', 'Status', tab === 'pending' ? 'Requested' : 'Plan', 'Actions'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-atom-muted font-display uppercase text-xs tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="py-4 px-4">
                    <div className="h-4 bg-atom-border/50 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-atom-muted">
                  {tab === 'pending' ? (
                    <div className="flex flex-col items-center gap-2">
                      <UserCheck size={32} className="text-atom-success opacity-50" />
                      <p>No pending requests 🎉</p>
                    </div>
                  ) : 'No members found'}
                </td>
              </tr>
            ) : filtered.map((m: any) => (
              <tr key={m.id} className="border-b border-atom-border/40 hover:bg-atom-border/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-atom-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-atom-gold font-display font-700 text-xs">
                        {m.user?.full_name?.[0] ?? '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-500 text-atom-text">{m.user?.full_name}</p>
                      <p className="text-atom-muted text-xs">{m.user?.email}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4">
                  <StatusBadge status={m.status} />
                </td>

                <td className="py-3 px-4 text-atom-muted text-xs">
                  {tab === 'pending'
                    ? format(new Date(m.created_at), 'd MMM yyyy')
                    : m.subscription_plan
                      ? <span className="badge-blue">{m.subscription_plan}</span>
                      : <span className="text-atom-muted">—</span>
                  }
                </td>

                <td className="py-3 px-4">
                  {m.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setApproveModal(m); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atom-success/20
                                   text-atom-success text-xs hover:bg-atom-success/30 transition-colors"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => approveMut.mutate({ id: m.id, body: { status: 'rejected' } })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atom-danger/20
                                   text-atom-danger text-xs hover:bg-atom-danger/30 transition-colors"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  ) : m.status === 'approved' ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSubMember(m)}
                        className="flex items-center gap-1.5 text-atom-muted text-xs hover:text-atom-gold transition-colors"
                      >
                        <CreditCard size={13} /> Subscription
                      </button>
                      <button
                        onClick={() => approveMut.mutate({ id: m.id, body: { status: 'suspended' } })}
                        className="flex items-center gap-1.5 text-atom-muted text-xs hover:text-atom-danger transition-colors"
                      >
                        <X size={13} /> Suspend
                      </button>
                    </div>
                  ) : m.status === 'suspended' ? (
                    <button
                      onClick={() => approveMut.mutate({ id: m.id, body: { status: 'approved' } })}
                      className="flex items-center gap-1.5 text-atom-muted text-xs hover:text-atom-success transition-colors"
                    >
                      <UserCheck size={13} /> Restore
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-md animate-slide-up">
            <div className="p-6 border-b border-atom-border">
              <h2 className="font-display text-xl font-700 uppercase tracking-wide">Approve Member</h2>
              <p className="text-atom-muted text-sm mt-1">
                {approveModal.user?.full_name} — {approveModal.user?.email}
              </p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="label">Subscription Plan</label>
                <select className="input" value={approveForm.plan}
                  onChange={e => setApproveForm(f => ({ ...f, plan: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="pay_as_you_go">Pay As You Go</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={approveForm.subscription_start}
                    onChange={e => setApproveForm(f => ({ ...f, subscription_start: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Amount Paid (₹)</label>
                  <input type="number" className="input" placeholder="0"
                    value={approveForm.amount_paid}
                    onChange={e => setApproveForm(f => ({ ...f, amount_paid: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input h-20 resize-none" placeholder="Internal notes..."
                  value={approveForm.notes}
                  onChange={e => setApproveForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="p-6 border-t border-atom-border flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setApproveModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate({
                  id: approveModal.id,
                  body: {
                    status: 'approved',
                    subscription_plan: approveForm.plan,
                    subscription_start: approveForm.subscription_start,
                    amount_paid: Number(approveForm.amount_paid) || 0,
                    notes: approveForm.notes || undefined,
                  },
                })}
              >
                {approveMut.isPending ? 'Approving...' : '✓ Approve Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {subMember && (
        <SubscriptionModal
          member={subMember}
          open={!!subMember}
          onClose={() => setSubMember(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-yellow', approved: 'badge-green',
    rejected: 'badge-red',  suspended: 'badge-gray',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}
