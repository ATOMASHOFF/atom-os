// apps/web/src/pages/admin/AdminAnnouncements.tsx
// Gym admin can create and manage announcements for their members

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Megaphone, Plus, Trash2, Pin, Eye, EyeOff, RefreshCw, Bell, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const announcementsApi = {
  list: () => api.get<any>('/api/announcements'),
  create: (body: any) => api.post<any>('/api/announcements', body),
  update: (id: string, body: any) => api.patch<any>(`/api/announcements/${id}`, body),
  delete: (id: string) => api.delete<any>(`/api/announcements/${id}`),
};

const TYPE_CONFIG = {
  info:    { label: 'Info',    icon: Info,          color: 'text-atom-info    bg-atom-info/10    border-atom-info/20'    },
  warning: { label: 'Warning', icon: AlertTriangle,  color: 'text-atom-warning bg-atom-warning/10 border-atom-warning/20' },
  success: { label: 'Success', icon: CheckCircle2,   color: 'text-atom-success bg-atom-success/10 border-atom-success/20' },
  urgent:  { label: 'Urgent',  icon: Bell,           color: 'text-atom-danger  bg-atom-danger/10  border-atom-danger/20'  },
};

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info' as keyof typeof TYPE_CONFIG,
    is_pinned: false,
    expires_at: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: announcementsApi.list,
    retry: false,
  });

  const announcements = data?.announcements ?? [];

  const createMut = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setShowCreate(false);
      setForm({ title: '', message: '', type: 'info', is_pinned: false, expires_at: '' });
      toast.success('Announcement created!');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create announcement'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => announcementsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: announcementsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Show a notice if the API route isn't set up yet
  const apiNotSetup = data === undefined && !isLoading;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="section-title">Announcements</h1>
          <p className="text-atom-muted text-sm mt-1">Broadcast messages to your gym members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost px-3 py-2 flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Announcement
          </button>
        </div>
      </div>

      {/* Notice if API not set up */}
      {(apiNotSetup || data?.error) && (
        <div className="card border-atom-warning/30 bg-atom-warning/5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-atom-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-600 text-atom-warning text-sm uppercase tracking-wide">API Route Not Yet Configured</p>
              <p className="text-atom-muted text-xs mt-1">
                The announcements feature requires a new backend route <code className="bg-atom-border px-1 rounded">/api/announcements</code>.
                See the migration SQL and API route instructions below.
              </p>
              <details className="mt-3">
                <summary className="text-atom-accent text-xs cursor-pointer hover:underline">View setup instructions →</summary>
                <pre className="mt-2 p-3 bg-atom-bg rounded-lg text-xs text-atom-muted overflow-auto">
{`-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','urgent')),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym admin manages announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.gyms WHERE id = gym_id AND owner_id = auth.uid())
  );
CREATE POLICY "members read active announcements"
  ON public.announcements FOR SELECT
  USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND EXISTS (
      SELECT 1 FROM public.gym_members
      WHERE gym_id = announcements.gym_id AND user_id = auth.uid() AND status = 'approved'
    )
  );`}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-atom-muted">
          <div className="w-5 h-5 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading announcements...</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-16">
          <Megaphone size={40} className="mx-auto mb-4 text-atom-muted opacity-30" />
          <p className="font-display font-700 uppercase tracking-wide text-sm text-atom-text mb-2">No Announcements Yet</p>
          <p className="text-atom-muted text-sm mb-4">Create your first announcement to notify members.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mx-auto">
            Create Announcement
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Pinned first */}
          {[...announcements].sort((a: any, b: any) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map((ann: any) => {
            const config = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div key={ann.id} className={`card border ${ann.is_pinned ? 'border-atom-accent/40' : ''} ${!ann.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {ann.is_pinned && (
                        <span className="flex items-center gap-1 text-atom-accent text-xs font-display uppercase tracking-wide">
                          <Pin size={10} /> Pinned
                        </span>
                      )}
                      {!ann.is_active && (
                        <span className="badge-gray text-xs">Hidden</span>
                      )}
                      <span className={`badge text-xs ${
                        ann.type === 'urgent' ? 'badge-red' :
                        ann.type === 'warning' ? 'badge-yellow' :
                        ann.type === 'success' ? 'badge-green' : 'badge-blue'
                      }`}>{config.label}</span>
                    </div>
                    <h3 className="font-display font-700 text-atom-text text-base uppercase tracking-wide">{ann.title}</h3>
                    <p className="text-atom-muted text-sm mt-1 leading-relaxed">{ann.message}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-atom-muted">
                      <span>{formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}</span>
                      {ann.expires_at && (
                        <span>· Expires {format(new Date(ann.expires_at), 'd MMM yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleMut.mutate({ id: ann.id, body: { is_pinned: !ann.is_pinned } })}
                      className={`p-2 rounded-lg transition-colors ${ann.is_pinned ? 'text-atom-accent bg-atom-accent/10' : 'text-atom-muted hover:text-atom-accent hover:bg-atom-border'}`}
                      title={ann.is_pinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => toggleMut.mutate({ id: ann.id, body: { is_active: !ann.is_active } })}
                      className="p-2 rounded-lg text-atom-muted hover:text-atom-text hover:bg-atom-border transition-colors"
                      title={ann.is_active ? 'Hide from members' : 'Show to members'}
                    >
                      {ann.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this announcement?')) deleteMut.mutate(ann.id); }}
                      className="p-2 rounded-lg text-atom-muted hover:text-atom-danger hover:bg-atom-danger/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-atom-border">
              <h2 className="font-display text-xl font-700 uppercase tracking-wide">New Announcement</h2>
              <p className="text-atom-muted text-sm mt-1">Will be visible to all approved members of your gym.</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, cfg]) => {
                    const Ic = cfg.icon;
                    return (
                      <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-display uppercase tracking-wide transition-all ${
                          form.type === key ? `${cfg.color} border-current` : 'border-atom-border text-atom-muted hover:border-atom-accent/30'
                        }`}>
                        <Ic size={16} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="Gym closed on Sunday" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input resize-none h-24" placeholder="Detailed message for your members..."
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Expires On (optional)</label>
                  <input type="date" className="input" value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setForm(f => ({ ...f, is_pinned: !f.is_pinned }))}
                      className={`w-10 h-5 rounded-full transition-colors ${form.is_pinned ? 'bg-atom-accent' : 'bg-atom-border'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.is_pinned ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-atom-muted text-sm">Pin to top</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-atom-border flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2"
                disabled={!form.title || !form.message || createMut.isPending}
                onClick={() => createMut.mutate(form)}>
                <Megaphone size={15} />
                {createMut.isPending ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
