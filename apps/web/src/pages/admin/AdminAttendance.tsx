// apps/web/src/pages/admin/AdminAttendance.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkinApi } from '@/lib/api';
import { Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['gym-checkins', date, page],
    queryFn: () => checkinApi.gym({ date, page }),
    placeholderData: prev => prev,
  });

  const checkins = data?.checkins ?? [];
  const total    = data?.total ?? 0;
  const pages    = Math.ceil(total / 50);

  return (
    <div className="page">
      <div className="mb-6">
        <h1 className="section-title">Attendance</h1>
        <p className="text-atom-muted text-sm mt-1">Track daily member check-ins</p>
      </div>

      {/* Date picker + count */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
          <input
            type="date"
            className="input pl-9 w-48"
            value={date}
            onChange={e => { setDate(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-atom-success" />
          <span className="font-display font-700 text-atom-text text-lg">{total}</span>
          <span className="text-atom-muted text-sm">check-ins</span>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atom-border">
              {['Member', 'Check-in Time', 'Date'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-atom-muted font-display uppercase text-xs tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={3} className="py-4 px-4">
                  <div className="h-4 bg-atom-border/50 rounded animate-pulse" />
                </td></tr>
              ))
            ) : checkins.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-16 text-atom-muted">
                  <Activity size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No check-ins on {format(new Date(date + 'T00:00:00'), 'd MMMM yyyy')}</p>
                </td>
              </tr>
            ) : checkins.map((c: any) => (
              <tr key={c.id} className="border-b border-atom-border/40 hover:bg-atom-border/20 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-atom-success/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-atom-success font-display font-700 text-xs">
                        {c.user?.full_name?.[0] ?? '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-500 text-atom-text">{c.user?.full_name ?? 'Unknown'}</p>
                      <p className="text-atom-muted text-xs">{c.user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-atom-accent">
                    {format(new Date(c.checked_in_at), 'h:mm:ss a')}
                  </span>
                </td>
                <td className="py-3 px-4 text-atom-muted text-xs">
                  {format(new Date(c.checked_in_at), 'EEE, d MMM yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-atom-border">
            <p className="text-atom-muted text-xs">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                className="btn-ghost text-xs px-3 py-1.5"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >← Prev</button>
              <button
                className="btn-ghost text-xs px-3 py-1.5"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
