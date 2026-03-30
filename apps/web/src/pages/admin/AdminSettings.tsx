// apps/web/src/pages/admin/AdminSettings.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gymApi, qrApi } from '@/lib/api';
import { useUser } from '@/store/auth';
import { Save, Copy, Check, QrCode, Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const user = useUser();
  const qc   = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: gymData, isLoading } = useQuery({
    queryKey: ['my-gym'],
    queryFn: () => user?.gym_id ? gymApi.get(user.gym_id) : Promise.reject('No gym'),
    enabled: !!user?.gym_id,
  });

  const gym = gymData?.gym;

  const [form, setForm] = useState({
    name: '', description: '', address: '',
    city: '', state: '', pincode: '', phone: '', email: '',
  });
  const [qrInterval, setQrInterval] = useState(180);

  useEffect(() => {
    if (!gym) return;
    setForm({
      name:        gym.name        ?? '',
      description: gym.description ?? '',
      address:     gym.address     ?? '',
      city:        gym.city        ?? '',
      state:       gym.state       ?? '',
      pincode:     gym.pincode     ?? '',
      phone:       gym.phone       ?? '',
      email:       gym.email       ?? '',
    });
    setQrInterval(gym.qr_rotation_interval_s ?? 180);
  }, [gym]);

  const updateMut = useMutation({
    mutationFn: (body: any) => gymApi.update(user!.gym_id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-gym'] });
      toast.success('Settings saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const qrConfigMut = useMutation({
    mutationFn: (s: number) => qrApi.updateConfig(s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-gym'] });
      qc.invalidateQueries({ queryKey: ['qr-config'] });
      toast.success('QR interval updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  function copyCode() {
    navigator.clipboard.writeText(gym?.gym_code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Gym code copied!');
  }

  if (isLoading) return (
    <div className="page flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-atom-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="page max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title">Gym Settings</h1>
        <p className="text-atom-muted text-sm mt-1">Manage your gym profile and configuration</p>
      </div>

      {/* ── GYM CODE CARD ── */}
      <div className="card border-atom-gold/30 bg-atom-gold/5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-atom-gold rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 size={22} className="text-atom-bg" />
          </div>
          <div className="flex-1">
            <p className="text-atom-muted text-xs font-display uppercase tracking-widest mb-1">
              Your Gym Code
            </p>
            <p className="font-mono text-3xl font-800 text-atom-gold tracking-widest">
              {gym?.gym_code ?? '——'}
            </p>
            <p className="text-atom-muted text-xs mt-1">
              Share this code with members so they can request to join
            </p>
          </div>
          <button
            onClick={copyCode}
            className="btn-ghost px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0"
          >
            {copied ? <Check size={15} className="text-atom-success" /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="gold-line my-4" />

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Total Members', value: gym?.total_members ?? 0 },
            { label: 'Total Check-ins', value: gym?.total_checkins ?? 0 },
            { label: 'Status', value: gym?.status ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="font-display text-xl font-800 text-atom-text capitalize">{value}</p>
              <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── GYM PROFILE ── */}
      <div className="card mb-6">
        <h2 className="font-display text-base font-700 uppercase tracking-wide mb-5">
          Gym Profile
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Gym Name *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none h-20"
              placeholder="Tell members about your gym..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="Delhi" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" placeholder="Delhi" value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Address</label>
              <input className="input" placeholder="Street address" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" placeholder="110001" value={form.pincode}
                onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 98xxxxxxxx" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="gym@example.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              className="btn-primary flex items-center gap-2"
              disabled={updateMut.isPending || !form.name}
              onClick={() => updateMut.mutate(form)}
            >
              <Save size={15} />
              {updateMut.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* ── QR CONFIG ── */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-atom-gold/10 rounded-lg flex items-center justify-center">
            <QrCode size={18} className="text-atom-gold" />
          </div>
          <div>
            <h2 className="font-display text-base font-700 uppercase tracking-wide">
              QR Rotation Settings
            </h2>
            <p className="text-atom-muted text-xs">
              How often the check-in QR code refreshes
            </p>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { label: '30s',  value: 30  },
            { label: '1min', value: 60  },
            { label: '2min', value: 120 },
            { label: '3min', value: 180 },
            { label: '5min', value: 300 },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setQrInterval(value)}
              className={`px-4 py-2 rounded-lg text-sm font-display uppercase tracking-wide transition-all ${
                qrInterval === value
                  ? 'bg-atom-gold text-atom-bg font-700'
                  : 'border border-atom-border text-atom-muted hover:border-atom-gold hover:text-atom-gold'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="number" min={10} max={3600}
              className="input w-24 py-2 text-sm font-mono"
              placeholder="sec"
              value={qrInterval}
              onChange={e => setQrInterval(Number(e.target.value))}
            />
            <span className="text-atom-muted text-xs">seconds</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-atom-muted text-xs">
            Current: <span className="text-atom-text font-mono">
              {gym?.qr_rotation_interval_s ?? 180}s
            </span>
            {' '}— shorter = more secure, longer = fewer interruptions
          </p>
          <button
            className="btn-primary flex items-center gap-2 text-sm"
            disabled={qrConfigMut.isPending || qrInterval < 10}
            onClick={() => qrConfigMut.mutate(qrInterval)}
          >
            <RefreshCw size={14} />
            {qrConfigMut.isPending ? 'Updating...' : 'Update Interval'}
          </button>
        </div>
      </div>
    </div>
  );
}
