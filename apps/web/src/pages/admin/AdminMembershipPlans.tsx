import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '@/lib/api';
import { Plus, Pencil, Power, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type PlanForm = {
  name: string;
  duration_days: string;
  price: string;
  description: string;
  is_active: boolean;
};

const initialForm: PlanForm = {
  name: '',
  duration_days: '30',
  price: '0',
  description: '',
  is_active: true,
};

export default function AdminMembershipPlans() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<PlanForm>(initialForm);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['admin-membership-plans'],
    queryFn: () => plansApi.list(),
  });

  const plans = data?.plans ?? [];

  const activeCount = useMemo(() => plans.filter((p: any) => p.is_active).length, [plans]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-membership-plans'] });
  };

  const createMut = useMutation({
    mutationFn: () => plansApi.create({
      name: form.name.trim(),
      duration_days: Number(form.duration_days),
      price: Number(form.price),
      description: form.description.trim() || undefined,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Plan created');
      setOpen(false);
      setForm(initialForm);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => plansApi.update(editing.id, {
      name: form.name.trim(),
      duration_days: Number(form.duration_days),
      price: Number(form.price),
      description: form.description.trim() || undefined,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success('Plan updated');
      setOpen(false);
      setEditing(null);
      setForm(initialForm);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => plansApi.deactivate(id),
    onSuccess: () => {
      toast.success('Plan deactivated');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  }

  function openEdit(plan: any) {
    setEditing(plan);
    setForm({
      name: plan.name,
      duration_days: String(plan.duration_days),
      price: String(plan.price),
      description: plan.description ?? '',
      is_active: !!plan.is_active,
    });
    setOpen(true);
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (Number(form.duration_days) < 1) {
      toast.error('Duration must be at least 1 day');
      return;
    }
    if (Number(form.price) < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    if (editing) updateMut.mutate();
    else createMut.mutate();
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Membership Plans</h1>
          <p className="text-atom-muted text-sm mt-1">
            {plans.length} total plans · {activeCount} active
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Plan
        </button>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-atom-muted">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-atom-muted">No plans yet. Create your first plan.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atom-border">
                {['Name', 'Duration', 'Price', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-atom-muted font-display uppercase text-xs tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map((plan: any) => (
                <tr key={plan.id} className="border-b border-atom-border/40">
                  <td className="py-3 px-4">
                    <p className="text-atom-text font-500">{plan.name}</p>
                    {plan.description && <p className="text-atom-muted text-xs mt-1">{plan.description}</p>}
                  </td>
                  <td className="py-3 px-4 text-atom-muted">{plan.duration_days} days</td>
                  <td className="py-3 px-4 text-atom-text font-mono">Rs {Number(plan.price).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={plan.is_active ? 'badge-green' : 'badge-gray'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(plan)} className="text-atom-muted hover:text-atom-accent text-xs flex items-center gap-1">
                        <Pencil size={13} /> Edit
                      </button>
                      {plan.is_active ? (
                        <button
                          onClick={() => deactivateMut.mutate(plan.id)}
                          className="text-atom-muted hover:text-atom-warning text-xs flex items-center gap-1"
                        >
                          <Power size={13} /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => plansApi.update(plan.id, { is_active: true }).then(() => { toast.success('Plan activated'); invalidate(); }).catch((e) => toast.error(e.message))}
                          className="text-atom-muted hover:text-atom-success text-xs flex items-center gap-1"
                        >
                          <Power size={13} /> Activate
                        </button>
                      )}
                      <button
                        onClick={() => deactivateMut.mutate(plan.id)}
                        className="text-atom-muted hover:text-atom-danger text-xs flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Soft Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-atom-border">
              <h2 className="font-display text-xl font-700 uppercase tracking-wide">
                {editing ? 'Edit Plan' : 'Create Plan'}
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="label">Plan Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={form.duration_days}
                    onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Price</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  className="input min-h-[90px] resize-none"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-atom-text">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active plan
              </label>
            </div>
            <div className="p-6 border-t border-atom-border flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? 'Saving...' : (editing ? 'Save Changes' : 'Create Plan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
