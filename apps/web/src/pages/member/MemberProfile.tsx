// apps/web/src/pages/member/MemberProfile.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, membershipApi } from '@/lib/api';
import { useAuthStore, useUser } from '@/store/auth';
import { LogOut, Check, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { SubscriptionPill } from '@/components/member/SubscriptionBanner';

export default function MemberProfile() {
  const qc = useQueryClient();
  const user = useUser();
  const { logout, setUser } = useAuthStore();

  const [editMode, setEditMode] = useState(false);
  const [gymCode, setGymCode] = useState('');
  const [form, setForm] = useState({
    full_name:    user?.full_name ?? '',
    phone:        '',
    height_cm:    '',
    weight_kg:    '',
    date_of_birth:'',
    gender:       '',
  });

  // TanStack Query v5: no onSuccess in useQuery — use useEffect instead
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.me,
  });

  useEffect(() => {
    if (!profileData) return;
    const d = profileData as any;
    setForm({
      full_name:     d.full_name     ?? '',
      phone:         d.phone         ?? '',
      height_cm:     d.height_cm     ?? '',
      weight_kg:     d.weight_kg     ?? '',
      date_of_birth: d.date_of_birth ?? '',
      gender:        d.gender        ?? '',
    });
  }, [profileData]);

  const { data: membershipData } = useQuery({
    queryKey: ['my-memberships'],
    queryFn: membershipApi.myStatus,
  });

  const updateMut = useMutation({
    mutationFn: (body: any) => authApi.updateProfile(body),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      setUser({ ...user!, full_name: d.full_name });
      setEditMode(false);
      toast.success('Profile updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const joinMut = useMutation({
    mutationFn: () => membershipApi.join(gymCode.toUpperCase()),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['my-memberships'] });
      qc.invalidateQueries({ queryKey: ['my-memberships'] }); // also refresh AppLayout
      setGymCode('');
      toast.success(d.message);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const memberships = membershipData?.memberships ?? [];
  const profile = (profileData ?? user) as any;

  function handleSave() {
    const payload: any = { full_name: form.full_name };
    if (form.phone)         payload.phone         = form.phone;
    if (form.height_cm)     payload.height_cm     = Number(form.height_cm);
    if (form.weight_kg)     payload.weight_kg     = Number(form.weight_kg);
    if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
    if (form.gender)        payload.gender        = form.gender;
    updateMut.mutate(payload);
  }

  return (
    <div className="page max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="section-title">Profile</h1>
      </div>

      {/* ── PROFILE CARD ── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-atom-accent/20 border border-atom-accent/30
                            flex items-center justify-center text-atom-accent font-display font-800 text-2xl">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-display text-xl font-700 text-atom-text">{profile?.full_name}</p>
              <p className="text-atom-muted text-sm">{profile?.email}</p>
              <span className="badge-blue text-xs mt-1">Member</span>
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className={editMode ? 'btn-ghost text-sm' : 'btn-ghost text-sm'}
          >
            {editMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {editMode ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="+91 98xxxxxxxx" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input type="number" className="input font-mono" placeholder="175" value={form.height_cm}
                  onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input type="number" className="input font-mono" placeholder="70" value={form.weight_kg}
                  onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input" value={form.date_of_birth}
                  onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button className="btn-ghost flex-1" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={updateMut.isPending} onClick={handleSave}>
                {updateMut.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              { label: 'Height', value: profile?.height_cm ? `${profile.height_cm} cm` : '—' },
              { label: 'Weight', value: profile?.weight_kg ? `${profile.weight_kg} kg` : '—' },
              { label: 'Gender', value: profile?.gender ?? '—' },
              { label: 'Member since', value: profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-IN')
                : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-atom-muted text-xs font-display uppercase tracking-widest">{label}</p>
                <p className="text-atom-text capitalize">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── JOIN A GYM ── */}
      <div className="card mb-6">
        <h3 className="font-display font-700 uppercase tracking-wide text-atom-text mb-1">
          Join a Gym
        </h3>
        <p className="text-atom-muted text-sm mb-4">
          Enter the 6-character code from your gym to submit a membership request.
        </p>
        <div className="flex gap-3">
          <input
            className="input flex-1 font-mono uppercase tracking-widest text-center text-lg"
            placeholder="GYM001"
            maxLength={6}
            value={gymCode}
            onChange={e => setGymCode(e.target.value.toUpperCase())}
          />
          <button
            className="btn-primary px-6"
            disabled={gymCode.length < 6 || joinMut.isPending}
            onClick={() => joinMut.mutate()}
          >
            {joinMut.isPending ? '...' : 'Join'}
          </button>
        </div>
      </div>

      {/* ── MY GYMS ── */}
      {memberships.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-display font-700 uppercase tracking-wide text-atom-text mb-4">
            My Gyms
          </h3>
          <div className="flex flex-col gap-3">
            {memberships.map((m: any) => (
              <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-atom-bg border border-atom-border/50">
                <div className="w-10 h-10 rounded-lg bg-atom-accent/10 border border-atom-accent/20
                                flex items-center justify-center text-atom-accent font-display font-700 flex-shrink-0">
                  {m.gym?.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-500 text-atom-text truncate">{m.gym?.name}</p>
                  <p className="text-atom-muted text-xs">{m.gym?.city}</p>
                </div>
                <StatusBadge status={m.status} />
                <SubscriptionPill membership={m} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DANGER ZONE ── */}
      <div className="card border-atom-danger/20">
        <h3 className="font-display font-700 uppercase tracking-wide text-atom-danger mb-3 text-sm">
          Account
        </h3>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-atom-muted hover:text-atom-danger text-sm transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    approved:  <Check size={11} />,
    pending:   <Clock size={11} />,
    rejected:  <X size={11} />,
    suspended: <X size={11} />,
  };
  const classes: Record<string, string> = {
    approved: 'badge-green', pending: 'badge-yellow',
    rejected: 'badge-red',  suspended: 'badge-gray',
  };
  return (
    <span className={`${classes[status] ?? 'badge-gray'} flex items-center gap-1`}>
      {icons[status]} {status}
    </span>
  );
}
