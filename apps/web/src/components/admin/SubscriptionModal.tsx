// apps/web/src/components/admin/SubscriptionModal.tsx
// Used in AdminMembers — manage a member's subscription plan, dates, payment

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { CreditCard, Calendar, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addMonths, addYears } from 'date-fns';

interface Props {
  member: any;
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  { key: 'monthly',       label: 'Monthly',      months: 1,   icon: '📅' },
  { key: 'quarterly',     label: 'Quarterly',    months: 3,   icon: '📆' },
  { key: 'annual',        label: 'Annual',       months: 12,  icon: '🏆' },
  { key: 'pay_as_you_go', label: 'Pay As You Go', months: null, icon: '💳' },
] as const;

export function SubscriptionModal({ member, open, onClose }: Props) {
  const qc = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [plan,       setPlan]       = useState<string>(member?.subscription_plan ?? 'monthly');
  const [startDate,  setStartDate]  = useState(member?.subscription_start ?? today);
  const [endDate,    setEndDate]    = useState(member?.subscription_end ?? '');
  const [amountPaid, setAmountPaid] = useState<string>(String(member?.amount_paid ?? ''));
  const [notes,      setNotes]      = useState(member?.notes ?? '');

  // Auto-calculate end date when plan or start changes
  function handlePlanChange(p: string) {
    setPlan(p);
    const planObj = PLANS.find(pl => pl.key === p);
    if (planObj?.months && startDate) {
      const end = addMonths(new Date(startDate), planObj.months);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }

  function handleStartChange(d: string) {
    setStartDate(d);
    const planObj = PLANS.find(pl => pl.key === plan);
    if (planObj?.months && d) {
      const end = addMonths(new Date(d), planObj.months);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }

  const mut = useMutation({
    mutationFn: () => membershipApi.updateMember(member.id, {
      subscription_plan:   plan,
      subscription_status: 'active',
      subscription_start:  startDate,
      subscription_end:    endDate || undefined,
      amount_paid:         amountPaid ? Number(amountPaid) : 0,
      notes:               notes || undefined,
      status:              'approved', // ensure still approved
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['membership-stats'] });
      toast.success('Subscription updated');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedPlan = PLANS.find(p => p.key === plan);

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
            disabled={mut.isPending}
          >
            <Check size={15} />
            {mut.isPending ? 'Saving...' : 'Save Subscription'}
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
        </div>
        {member?.subscription_plan && (
          <span className="badge-blue capitalize flex-shrink-0 text-xs">
            {member.subscription_plan}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Plan selector */}
        <div>
          <label className="label">Subscription Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {PLANS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePlanChange(p.key)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm
                            text-left transition-all duration-150 ${
                  plan === p.key
                    ? 'border-atom-accent bg-atom-accent/10 text-atom-accent'
                    : 'border-atom-border text-atom-muted hover:border-atom-accent/40 hover:text-atom-text'
                }`}
              >
                <span className="text-base">{p.icon}</span>
                <div>
                  <p className="font-500 leading-none">{p.label}</p>
                  {p.months && (
                    <p className="text-xs opacity-60 mt-0.5">{p.months} month{p.months > 1 ? 's' : ''}</p>
                  )}
                </div>
                {plan === p.key && <Check size={14} className="ml-auto text-atom-accent" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
              <input
                type="date" className="input pl-9 text-sm"
                value={startDate}
                onChange={e => handleStartChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">End Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
              <input
                type="date" className="input pl-9 text-sm"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="label">Amount Paid (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted text-sm font-mono">₹</span>
            <input
              type="number" min={0} className="input pl-8 font-mono text-sm"
              placeholder="0"
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input resize-none h-16 text-sm"
            placeholder="Payment method, reference number, etc."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Summary */}
        {startDate && endDate && (
          <div className="p-3 rounded-xl bg-atom-accent/5 border border-atom-accent/20 text-sm">
            <div className="flex justify-between text-atom-muted mb-1">
              <span>Plan</span>
              <span className="text-atom-text capitalize font-500">{selectedPlan?.label}</span>
            </div>
            <div className="flex justify-between text-atom-muted mb-1">
              <span>Duration</span>
              <span className="text-atom-text font-mono text-xs">
                {startDate} → {endDate}
              </span>
            </div>
            {amountPaid && (
              <div className="flex justify-between text-atom-muted">
                <span>Amount</span>
                <span className="text-atom-accent font-mono font-700">₹{amountPaid}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
