// apps/web/src/pages/super/SuperMembers.tsx
// Super admin view of ALL members across ALL gyms, with filters

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Users, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function SuperMembers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gymFilter, setGymFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: gymsData } = useQuery({
    queryKey: ['admin-gyms'],
    queryFn: adminApi.gyms,
    staleTime: 60_000,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['super-members', page, search, gymFilter, statusFilter],
    queryFn: () => adminApi.members({
      page,
      limit: 50,
      gym_id: gymFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
    }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const members = (data as any)?.members ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / 50);
  const gyms = gymsData?.gyms ?? [];

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="section-title">All Members</h1>
          <p className="text-atom-muted text-sm mt-1">
            {total > 0 ? `${total} members across all gyms` : 'Platform-wide member overview'}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
          <input className="input pl-9" placeholder="Search by name, email, phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Gym filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted pointer-events-none" />
          <select className="input pl-9 pr-4 w-52" value={gymFilter}
            onChange={e => { setGymFilter(e.target.value); setPage(1); }}>
            <option value="">All Gyms</option>
            {gyms.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name} ({g.gym_code})</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <select className="input w-44" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* Clear filters */}
        {(search || gymFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setGymFilter(''); setStatusFilter(''); setPage(1); }}
            className="btn-ghost text-sm px-4">
            Clear filters
          </button>
        )}
      </div>

      {/* Stats row */}
      {!gymFilter && !statusFilter && !search && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', count: total, color: 'text-atom-text' },
            { label: 'Approved', count: gymsData ? null : null, color: 'text-atom-success' },
            { label: 'Pending', count: null, color: 'text-atom-warning' },
            { label: 'Suspended', count: null, color: 'text-atom-muted' },
          ].map(({ label, count, color }) => (
            <div key={label} className="card py-4 text-center">
              <p className={`font-display text-2xl font-800 ${color}`}>
                {count !== null ? count : '—'}
              </p>
              <p className="text-atom-muted text-xs font-display uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-atom-muted">
            <div className="w-6 h-6 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading members...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-atom-muted">
            <p className="text-atom-danger text-sm mb-2">Failed to load members</p>
            <p className="text-xs font-mono">{(error as any)?.message}</p>
            <button onClick={() => refetch()} className="btn-ghost text-xs mt-4">Retry</button>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-atom-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-display font-600 uppercase tracking-wide text-sm">No Members Found</p>
            {(search || gymFilter || statusFilter) && (
              <button onClick={() => { setSearch(''); setGymFilter(''); setStatusFilter(''); }}
                className="text-atom-accent text-xs mt-2 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-atom-border">
                  {['Member', 'Gym', 'Status', 'Subscription', 'Joined'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-atom-muted font-display uppercase text-xs tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => (
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
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-atom-text font-500">{m.gym?.name ?? '—'}</p>
                      <p className="text-atom-muted text-xs">{m.gym?.city ?? ''}</p>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={m.status} /></td>
                    <td className="py-3 px-4 text-xs text-atom-muted">
                      {m.subscription_plan
                        ? <div>
                          <span className="badge-blue capitalize">{m.subscription_plan.replace(/_/g, ' ')}</span>
                          {m.subscription_end && (
                            <p className="mt-0.5">Until {format(new Date(m.subscription_end), 'd MMM yyyy')}</p>
                          )}
                        </div>
                        : <span className="italic opacity-40">—</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-atom-muted text-xs">
                      {m.joined_at ? format(new Date(m.joined_at), 'd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-atom-border px-2">
                <p className="text-atom-muted text-xs">
                  Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"
                    disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-atom-muted text-xs px-2 py-1.5">
                    Page {page} of {totalPages}
                  </span>
                  <button className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"
                    disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-yellow', approved: 'badge-green',
    rejected: 'badge-red', suspended: 'badge-gray',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}
