// apps/web/src/pages/super/SuperGyms.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gymApi } from '@/lib/api';
import { Plus, X, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperGyms() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', state: '', phone: '', email: '', qr_rotation_interval_s: 180 });

  const { data, isLoading } = useQuery({ queryKey: ['admin-gyms'], queryFn: gymApi.list });
  const gyms = data?.gyms ?? [];

  const createMut = useMutation({
    mutationFn: (body: any) => gymApi.create(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-gyms'] });
      toast.success(`Gym created! Code: ${data.gym.gym_code}`);
      setShowCreate(false);
      setForm({ name: '', city: '', state: '', phone: '', email: '', qr_rotation_interval_s: 180 });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => gymApi.setStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-gyms'] }); toast.success('Status updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Gyms</h1>
          <p className="text-atom-muted text-sm mt-1">{gyms.length} gyms registered</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Gym
        </button>
      </div>

      {/* Gym cards */}
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-atom-surface/50" />
          ))
        ) : gyms.map((gym: any) => (
          <div key={gym.id} className="card flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-atom-accent/10 border border-atom-accent/20
                            flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-atom-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <p className="font-display font-700 text-atom-text uppercase tracking-wide">
                  {gym.name}
                </p>
                <span className="font-mono text-atom-accent bg-atom-accent/10 px-2 py-0.5 rounded text-xs">
                  {gym.gym_code}
                </span>
                <StatusBadge status={gym.status} />
              </div>
              <p className="text-atom-muted text-sm">
                {[gym.city, gym.state].filter(Boolean).join(', ') || 'No location'}
                {' · '}Admin: {gym.owner?.email || 'Unassigned'}
              </p>
            </div>

            <div className="flex items-center gap-6 text-center flex-shrink-0">
              <div>
                <p className="font-display text-xl font-700 text-atom-text">{gym.total_members}</p>
                <p className="text-atom-muted text-xs">Members</p>
              </div>
              <div>
                <p className="font-display text-xl font-700 text-atom-text">{gym.total_checkins}</p>
                <p className="text-atom-muted text-xs">Check-ins</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {gym.status !== 'suspended' ? (
                <button
                  onClick={() => statusMut.mutate({ id: gym.id, status: 'suspended' })}
                  className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 hover:border-atom-danger hover:text-atom-danger"
                >
                  <ToggleRight size={14} /> Suspend
                </button>
              ) : (
                <button
                  onClick={() => statusMut.mutate({ id: gym.id, status: 'active' })}
                  className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"
                >
                  <ToggleLeft size={14} /> Activate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Gym Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-atom-border">
              <h2 className="font-display text-xl font-700 uppercase tracking-wide">New Gym</h2>
              <button onClick={() => setShowCreate(false)} className="text-atom-muted hover:text-atom-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="label">Gym Name *</label>
                <input className="input" placeholder="Atom Fitness North Delhi"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City</label>
                  <input className="input" placeholder="Delhi"
                    value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="label">State</label>
                  <input className="input" placeholder="Delhi"
                    value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+91 98xxxxxxxx"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="gym@example.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">QR Rotation Interval (seconds)</label>
                <input type="number" className="input" min={10} max={3600}
                  value={form.qr_rotation_interval_s}
                  onChange={e => setForm(f => ({ ...f, qr_rotation_interval_s: Number(e.target.value) }))} />
                <p className="text-atom-muted text-xs mt-1">
                  How often the check-in QR rotates. Default: 180s (3 min)
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-atom-border flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!form.name || createMut.isPending}
                onClick={() => createMut.mutate(form)}
              >
                {createMut.isPending ? 'Creating...' : 'Create Gym'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { active: 'badge-green', trial: 'badge-yellow', inactive: 'badge-gray', suspended: 'badge-red' };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}
