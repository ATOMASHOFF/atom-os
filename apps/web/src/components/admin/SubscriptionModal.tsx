// apps/web/src/components/admin/SubscriptionModal.tsx
// Used in AdminMembers — assign membership plan to a member.

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansApi, subscriptionsApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  member: any;
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ member, open, onClose }: Props) {
  const qc = useQueryClient();
  const targetMemberId = member?.user_id ?? member?.user?.id;

  const [planId, setPlanId] = useState<string>('');

  const { data: plansData, isLoading: plansLoading } = useQuery<any>({
    queryKey: ['admin-membership-plans'],
    queryFn: () => plansApi.list(),
    enabled: open,
  });

  const activePlans = useMemo(() => (plansData?.plans ?? []).filter((p: any) => p.is_active), [plansData]);

  useEffect(() => {
    if (!open) return;
    if (!planId && activePlans.length > 0) {
      setPlanId(activePlans[0].id);
    }
  }, [open, planId, activePlans]);

  const mut = useMutation({
    mutationFn: () => {
      if (!targetMemberId) {
        throw new Error('Member ID is missing. Please refresh and try again.');
      }

      return subscriptionsApi.assign({
        member_id: targetMemberId,
        plan_id: planId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-members-approved'] });
      qc.invalidateQueries({ queryKey: ['admin-members-all'] });
      qc.invalidateQueries({ queryKey: ['admin-membership-plans'] });
      if (targetMemberId) qc.invalidateQueries({ queryKey: ['member-subscriptions', targetMemberId] });
      qc.invalidateQueries({ queryKey: ['membership-stats'] });
      toast.success('Membership assigned');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedPlan = activePlans.find((p: any) => p.id === planId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Subscription"
      maxWidth="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !planId}
          >
            <Check size={15} />
            {mut.isPending ? 'Assigning...' : 'Assign Membership'}
          </button>
        </>
      }
    >
      {/* Member info */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-atom-bg border border-atom-border mb-5">
        <div className="w-9 h-9 rounded-full bg-atom-accent/20 border border-atom-accent/30
                        flex items-center justify-center text-atom-accent font-display font-700 text-sm flex-shrink-0">
          {member?.user?.full_name?.[0] ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="font-500 text-atom-text text-sm truncate">{member?.user?.full_name}</p>
          <p className="text-atom-muted text-xs truncate">{member?.user?.email}</p>
          <p className="text-atom-muted text-[11px] font-mono mt-0.5">UID #{member?.member_uid ?? '—'}</p>
        </div>
        <span className="badge-blue capitalize flex-shrink-0 text-xs">{member?.status}</span>
      </div>

      <div className="flex flex-col gap-4">
        {/* Plan selector */}
        <div>
          <label className="label">Select Plan</label>
          <select
            className="input"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            disabled={plansLoading || activePlans.length === 0}
          >
            {activePlans.length === 0 && <option value="">No active plans available</option>}
            {activePlans.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.duration_days}d - Rs {Number(p.price).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        {selectedPlan && (
          <div className="p-3 rounded-xl bg-atom-accent/5 border border-atom-accent/20 text-sm">
            <div className="flex justify-between text-atom-muted mb-1">
              <span>Plan</span>
              <span className="text-atom-text capitalize font-500">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between text-atom-muted mb-1">
              <span>Duration</span>
              <span className="text-atom-text font-mono text-xs">{selectedPlan.duration_days} days</span>
            </div>
            <div className="flex justify-between text-atom-muted">
              <span>Price</span>
              <span className="text-atom-accent font-mono font-700">Rs {Number(selectedPlan.price).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
