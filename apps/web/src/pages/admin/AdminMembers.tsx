// apps/web/src/pages/admin/AdminMembers.tsx
// KEY: reads location.state.tab so clicking dashboard cards lands on correct tab
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { membershipApi } from '@/lib/api';
import { Check, X, Search, UserCheck, CreditCard, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { SubscriptionModal } from '@/components/admin/SubscriptionModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Tab = 'pending' | 'approved' | 'all';

export default function AdminMembers() {
  const qc       = useQueryClient();
  const location = useLocation();

  // Read tab from navigation state (e.g., from dashboard card click)
  const [tab, setTab] = useState<Tab>((location.state as any)?.tab ?? 'pending');
  const [search, setSearch]           = useState('');
  const [approveModal, setApproveModal] = useState<any>(null);
  const [subMember, setSubMember]       = useState<any>(null);
  const [addModal, setAddModal]         = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '', email: '', phone: '',
    subscription_plan:  'monthly',
    subscription_start: new Date().toISOString().split('T')[0],
    amount_paid: '', notes: '',
  });

  // Update tab if navigation state changes (e.g., user navigates back then to a different card)
  useEffect(() => {
    if ((location.state as any)?.tab) {
      setTab((location.state as any).tab);
    }
  }, [location.state]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: reqData,      isLoading: reqLoading,      error: reqErr }      = useQuery({
    queryKey: ['admin-join-requests'],
    queryFn:  membershipApi.requests,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 20_000,
  });

  const { data: approvedData, isLoading: approvedLoading, error: approvedErr } = useQuery({
    queryKey: ['admin-members-approved'],
    queryFn:  () => membershipApi.members('approved'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: allData,      isLoading: allLoading,      error: allErr }      = useQuery({
    queryKey: ['admin-members-all'],
    queryFn:  () => membershipApi.members(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const requests     = reqData?.requests      ?? [];
  const approvedList = approvedData?.members  ?? [];
  const allList      = allData?.members       ?? [];

  const currentList =
    tab === 'pending'  ? requests :
    tab === 'approved' ? approvedList : allList;

  const isLoading =
    tab === 'pending'  ? reqLoading :
    tab === 'approved' ? approvedLoading : allLoading;

  const currentErr =
    tab === 'pending'  ? reqErr :
    tab === 'approved' ? approvedErr : allErr;

  const filtered = search
    ? currentList.filter((m: any) => {
        const q = search.toLowerCase();
        return (
          String(m.member_uid ?? '').includes(q) ||
          m.user?.full_name?.toLowerCase().includes(q) ||
          m.user?.email?.toLowerCase().includes(q)     ||
          m.user?.phone?.toLowerCase().includes(q)
        );
      })
    : currentList;

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['admin-join-requests'] });
    qc.invalidateQueries({ queryKey: ['admin-members-approved'] });
    qc.invalidateQueries({ queryKey: ['admin-members-all'] });
    qc.invalidateQueries({ queryKey: ['membership-stats'] });
    qc.invalidateQueries({ queryKey: ['join-requests'] }); // also update dashboard
  }

  const approveMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => membershipApi.updateRequest(id, body),
    onSuccess: (_, vars) => {
      invalidateAll();
      toast.success(vars.body.status === 'approved' ? '✅ Member approved!' : 'Request updated');
      setApproveModal(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => membershipApi.updateMember(id, body),
    onSuccess: () => { invalidateAll(); toast.success('Member updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: (f: typeof addForm) => membershipApi.adminAddMember({
      full_name:         f.full_name.trim(),
      email:             f.email.trim()  || undefined,
      phone:             f.phone.trim()  || undefined,
      subscription_plan: f.subscription_plan,
      subscription_start: f.subscription_start,
      amount_paid:       Number(f.amount_paid) || 0,
      notes:             f.notes.trim() || undefined,
    }),
    onSuccess: (data: any) => {
      invalidateAll();
      setAddModal(false);
      setAddForm({ full_name: '', email: '', phone: '', subscription_plan: 'monthly',
        subscription_start: new Date().toISOString().split('T')[0], amount_paid: '', notes: '' });
      toast.success(data?.message || 'Member added!');
      setTab('approved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add member'),
  });

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="section-title">Members</h1>
          <p className="text-atom-muted text-sm mt-1">
            {requests.length > 0 && <span className="text-atom-warning font-500">{requests.length} pending · </span>}
            {approvedList.length} active · {allList.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={invalidateAll} className="btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 bg-atom-surface border border-atom-border rounded-lg p-1">
          {(['pending', 'approved', 'all'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-display uppercase tracking-wide transition-all ${
                tab === t ? 'bg-atom-accent text-atom-bg font-700' : 'text-atom-muted hover:text-atom-text'
              }`}>
              {t === 'pending' && requests.length > 0 && (
                <span className="mr-1.5 bg-atom-danger text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {requests.length}
                </span>
              )}
              {t}
              {t !== 'pending' && (
                <span className="ml-1.5 text-xs opacity-50">
                  ({t === 'approved' ? approvedList.length : allList.length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
          <input className="input pl-9 w-72" placeholder="Search members or UID..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Error */}
      {currentErr && (
        <div className="flex items-start gap-3 p-4 mb-4 rounded-xl bg-atom-danger/10 border border-atom-danger/20">
          <AlertCircle size={16} className="text-atom-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-atom-text font-500">Failed to load data</p>
            <p className="text-xs text-atom-muted mt-0.5 font-mono">{(currentErr as any)?.message}</p>
            <p className="text-xs text-atom-muted mt-1">Make sure you have a gym assigned in the Super Admin panel.</p>
          </div>
          <button onClick={invalidateAll} className="text-atom-accent text-xs hover:underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-atom-muted text-sm">Loading {tab} members...</span>
          </div>
        ) : !currentErr && filtered.length === 0 ? (
          <div className="text-center py-16 text-atom-muted">
            {tab === 'pending' ? (
              <>
                <UserCheck size={40} className="mx-auto mb-3 text-atom-success opacity-40" />
                <p className="font-display font-600 uppercase tracking-wide text-sm">All Caught Up!</p>
                <p className="text-xs mt-1">No pending requests.</p>
              </>
            ) : search ? (
              <>
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No results for "{search}"</p>
                <button onClick={() => setSearch('')} className="text-atom-accent text-xs mt-2 hover:underline">Clear</button>
              </>
            ) : (
              <>
                <UserPlus size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-display font-600 uppercase tracking-wide text-sm">No Members Yet</p>
                <p className="text-xs mt-1 mb-4">Share your gym code or add members directly.</p>
                <button onClick={() => setAddModal(true)} className="btn-primary text-xs">Add First Member</button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atom-border">
                {['Member', 'Status', tab === 'pending' ? 'Requested' : 'Subscription', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-atom-muted font-display uppercase text-xs tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: any) => (
                <tr key={m.id} className="border-b border-atom-border/40 hover:bg-atom-border/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-atom-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-atom-accent font-display font-700 text-xs">
                          {m.user?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-500 text-atom-text">{m.user?.full_name ?? 'Unknown'}</p>
                        <p className="text-atom-muted text-xs">{m.user?.email ?? m.user?.phone ?? '—'}</p>
                        <p className="text-atom-muted text-[11px] mt-0.5 font-mono">UID #{m.member_uid ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={m.status} /></td>
                  <td className="py-3 px-4 text-xs text-atom-muted">
                    {tab === 'pending'
                      ? format(new Date(m.created_at), 'd MMM yyyy')
                      : m.subscription_plan
                        ? <div>
                            <span className="badge-blue capitalize">{m.subscription_plan.replace(/_/g,' ')}</span>
                            {m.subscription_end && (
                              <p className="mt-0.5">Until {format(new Date(m.subscription_end), 'd MMM yyyy')}</p>
                            )}
                          </div>
                        : <span className="italic opacity-40">No plan</span>
                    }
                  </td>
                  <td className="py-3 px-4">
                    {m.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => setApproveModal(m)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atom-success/20 text-atom-success text-xs hover:bg-atom-success/30">
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => approveMut.mutate({ id: m.id, body: { status: 'rejected' } })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atom-danger/20 text-atom-danger text-xs hover:bg-atom-danger/30">
                          <X size={13} /> Reject
                        </button>
                      </div>
                    ) : m.status === 'approved' ? (
                      <div className="flex gap-3">
                        <button onClick={() => setSubMember(m)}
                          className="flex items-center gap-1.5 text-atom-muted text-xs hover:text-atom-accent transition-colors">
                          <CreditCard size={13} /> Assign Membership
                        </button>
                        <button
                          onClick={() => { if (confirm(`Suspend ${m.user?.full_name}?`)) updateMut.mutate({ id: m.id, body: { status: 'suspended' } }); }}
                          className="flex items-center gap-1.5 text-atom-muted text-xs hover:text-atom-danger transition-colors">
                          <X size={13} /> Suspend
                        </button>
                      </div>
                    ) : m.status === 'suspended' ? (
                      <button onClick={() => updateMut.mutate({ id: m.id, body: { status: 'approved' } })}
                        className="flex items-center gap-1.5 text-atom-muted text-xs hover:text-atom-success transition-colors">
                        <UserCheck size={13} /> Restore
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-md animate-slide-up">
            <div className="p-6 border-b border-atom-border">
              <h2 className="font-display text-xl font-700 uppercase tracking-wide">Approve Member</h2>
              <p className="text-atom-muted text-sm mt-1">{approveModal.user?.full_name}</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-atom-text text-sm leading-relaxed">
                This will approve <span className="font-600">{approveModal.user?.full_name}</span> and move them to active members.
              </p>
              <p className="text-atom-muted text-xs">
                You can assign or change their membership plan from the <span className="font-600">Assign Membership</span> action after approval.
              </p>
            </div>
            <div className="p-6 border-t border-atom-border flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setApproveModal(null)}>Cancel</button>
              <button className="btn-primary" disabled={approveMut.isPending}
                onClick={() => approveMut.mutate({
                  id: approveModal.id,
                  body: { status: 'approved' },
                })}>
                {approveMut.isPending ? 'Approving...' : '✓ Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-lg animate-slide-up my-4">
            <div className="p-6 border-b border-atom-border">
              <h2 className="font-display text-xl font-700 uppercase tracking-wide">Add Member Directly</h2>
              <p className="text-atom-muted text-sm mt-1">Bypasses approval — member becomes active immediately.</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Rahul Sharma" autoFocus
                  value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email *</label>
                  <input type="email" className="input" placeholder="member@example.com"
                    value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                  <p className="text-atom-muted text-xs mt-1">Required for new accounts</p>
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input className="input" placeholder="+91 9876543210"
                    value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Subscription Plan</label>
                <select className="input" value={addForm.subscription_plan}
                  onChange={e => setAddForm(f => ({ ...f, subscription_plan: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="pay_as_you_go">Pay As You Go</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={addForm.subscription_start}
                    onChange={e => setAddForm(f => ({ ...f, subscription_start: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Amount Paid (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted text-sm">₹</span>
                    <input type="number" className="input pl-7" placeholder="0"
                      value={addForm.amount_paid} onChange={e => setAddForm(f => ({ ...f, amount_paid: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input h-16 resize-none" placeholder="Walk-in, referred by..."
                  value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {addMut.isError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-atom-danger/10 border border-atom-danger/20">
                  <AlertCircle size={15} className="text-atom-danger flex-shrink-0 mt-0.5" />
                  <p className="text-atom-danger text-xs">{(addMut.error as any)?.message}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-atom-border flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2"
                disabled={!addForm.full_name.trim() || (!addForm.email.trim() && !addForm.phone.trim()) || addMut.isPending}
                onClick={() => addMut.mutate(addForm)}>
                <UserPlus size={15} />
                {addMut.isPending ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {subMember && (
        <SubscriptionModal member={subMember} open={!!subMember}
          onClose={() => { setSubMember(null); invalidateAll(); }} />
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
