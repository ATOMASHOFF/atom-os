// apps/web/src/pages/member/MemberProfile.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, membershipApi } from '@/lib/api';
import { useAuthStore, useUser } from '@/store/auth';
import { LogOut, Check, Clock, X, User, Activity, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SubscriptionPill } from '@/components/member/SubscriptionBanner';

type Tab = 'profile' | 'fitness' | 'memberships';

export default function MemberProfile() {
  const qc = useQueryClient();
  const user = useUser();
  const { logout, setUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [editMode, setEditMode] = useState(false);
  const [gymCode, setGymCode] = useState('');
  const [form, setForm] = useState({
    full_name: '', phone: '', height_cm: '', weight_kg: '', date_of_birth: '', gender: '',
    fitness_goal: '', activity_level: '', body_fat_pct: '', injuries: '',
    emergency_contact_name: '', emergency_contact_phone: '',
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.me,
  });

  useEffect(() => {
    if (!profileData) return;
    const d = profileData as any;
    setForm({
      full_name:              d.full_name ?? '',
      phone:                  d.phone ?? '',
      height_cm:              d.height_cm ?? '',
      weight_kg:              d.weight_kg ?? '',
      date_of_birth:          d.date_of_birth ?? '',
      gender:                 d.gender ?? '',
      fitness_goal:           d.fitness_goal ?? '',
      activity_level:         d.activity_level ?? '',
      body_fat_pct:           d.body_fat_pct ?? '',
      injuries:               d.injuries ?? '',
      emergency_contact_name: d.emergency_contact_name ?? '',
      emergency_contact_phone:d.emergency_contact_phone ?? '',
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
      qc.invalidateQueries({ queryKey: ['my-memberships'] }); // Fixed duplicate invalidation bug
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
    if (form.fitness_goal)  payload.fitness_goal  = form.fitness_goal;
    if (form.activity_level)payload.activity_level= form.activity_level;
    if (form.body_fat_pct)  payload.body_fat_pct  = Number(form.body_fat_pct);
    if (form.injuries)      payload.injuries      = form.injuries;
    if (form.emergency_contact_name) payload.emergency_contact_name = form.emergency_contact_name;
    if (form.emergency_contact_phone) payload.emergency_contact_phone = form.emergency_contact_phone;
    updateMut.mutate(payload);
  }

  const tabs: { id: Tab, label: string, icon: any }[] = [
    { id: 'profile', label: 'Basics', icon: User },
    { id: 'fitness', label: 'Fitness', icon: Activity },
    { id: 'memberships', label: 'Gyms', icon: Building2 },
  ];

  return (
    <div className="page max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">My Profile</h1>
        <button onClick={logout} className="btn-ghost text-atom-danger hover:bg-atom-danger/10 flex items-center gap-2">
          <LogOut size={16} /> Sign out
        </button>
      </div>

      {/* Hero Header */}
      <div className="card mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-atom-accent/20 border border-atom-accent/30
                          flex items-center justify-center text-atom-accent font-display font-800 text-3xl shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-display text-2xl font-700 text-atom-text">{profile?.full_name}</p>
            <p className="text-atom-muted text-sm">{profile?.email}</p>
            <span className="badge-blue text-xs mt-1 inline-block text-center mr-2">Member</span>
            {form.phone && <span className="text-atom-muted text-xs inline-block">📱 {form.phone}</span>}
          </div>
        </div>
        {activeTab !== 'memberships' && (
          <button onClick={() => setEditMode(!editMode)} className="btn-ghost shrink-0 self-start sm:self-center">
            {editMode ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 mb-6 border-b border-atom-border pb-1 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setEditMode(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 font-display text-sm tracking-wide uppercase whitespace-nowrap transition-all border-b-2 ${
                isActive ? 'text-atom-accent border-atom-accent font-700' : 'text-atom-muted border-transparent hover:text-atom-text'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div className="card animate-fade-in text-sm">
          {editMode ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Full Name</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" placeholder="+91 98xxxxxxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="label">Height (cm)</label><input type="number" className="input font-mono" placeholder="175" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} /></div>
                <div><label className="label">Weight (kg)</label><input type="number" className="input font-mono" placeholder="70" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} /></div>
                <div><label className="label">Date of Birth</label><input type="date" className="input" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="accent-line my-2" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="label">Emergency Contact Name</label><input className="input" value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} /></div>
                <div><label className="label">Emergency Contact Phone</label><input className="input" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-ghost flex-1" onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn-primary flex-1" disabled={updateMut.isPending} onClick={handleSave}>{updateMut.isPending ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
              <InfoData label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : '—'} />
              <InfoData label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : '—'} />
              <InfoData label="Gender" value={profile?.gender ?? '—'} />
              <InfoData label="Date of Birth" value={profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : '—'} />
              <InfoData label="Member since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : '—'} />
              <InfoData label="Phone" value={profile?.phone ? profile.phone : '—'} />
              <div className="col-span-full">
                <p className="text-atom-muted text-xs font-display uppercase tracking-widest mb-2 border-b border-atom-border pb-1">Emergency Contact</p>
                <p className="text-atom-text">
                  {profile?.emergency_contact_name 
                    ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || 'No phone provided'})`
                    : '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FITNESS TAB ── */}
      {activeTab === 'fitness' && (
        <div className="card animate-fade-in text-sm">
          {editMode ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Fitness Goal</label>
                  <select className="input" value={form.fitness_goal} onChange={e => setForm(f => ({ ...f, fitness_goal: e.target.value }))}>
                    <option value="">Select a goal</option>
                    <option value="muscle_gain">Build Muscle</option>
                    <option value="fat_loss">Lose Fat</option>
                    <option value="strength">Increase Strength</option>
                    <option value="endurance">Improve Endurance</option>
                    <option value="general_fitness">General Fitness</option>
                  </select>
                </div>
                <div>
                  <label className="label">Activity Level</label>
                  <select className="input" value={form.activity_level} onChange={e => setForm(f => ({ ...f, activity_level: e.target.value }))}>
                    <option value="">Select level</option>
                    <option value="sedentary">Sedentary (Little or no exercise)</option>
                    <option value="light">Lightly active (1-3 days/week)</option>
                    <option value="moderate">Moderately active (3-5 days/week)</option>
                    <option value="active">Active (6-7 days/week)</option>
                    <option value="very_active">Very active (Physical job + training)</option>
                  </select>
                </div>
                <div><label className="label">Body Fat % (optional)</label><input type="number" className="input font-mono" placeholder="15" value={form.body_fat_pct} onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))} /></div>
              </div>
              <div><label className="label">Past Injuries or Medical Conditions</label><textarea className="input h-20 resize-none" placeholder="E.g., lower back pain, knee surgery in 2020..." value={form.injuries} onChange={e => setForm(f => ({ ...f, injuries: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button className="btn-ghost flex-1" onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn-primary flex-1" disabled={updateMut.isPending} onClick={handleSave}>{updateMut.isPending ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <InfoData label="Primary Goal" value={formatGoal(profile?.fitness_goal) ?? '—'} />
              <InfoData label="Activity Level" value={formatActivity(profile?.activity_level) ?? '—'} />
              <InfoData label="Estimated Body Fat" value={profile?.body_fat_pct ? `${profile.body_fat_pct}%` : '—'} />
              <div className="col-span-full">
                <p className="text-atom-muted text-xs font-display uppercase tracking-widest mb-1">Health Notes / Injuries</p>
                <p className="text-atom-text">{profile?.injuries || 'None reported.'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEMBERSHIPS TAB ── */}
      {activeTab === 'memberships' && (
        <div className="animate-fade-in flex flex-col gap-6">
          <div className="card border-atom-accent border bg-atom-accent/5">
            <h3 className="font-display font-700 uppercase tracking-wide text-atom-text mb-1">Join a Gym</h3>
            <p className="text-atom-muted text-sm mb-4">Enter your gym's 6-character code.</p>
            <div className="flex gap-3">
              <input
                className="input flex-1 font-mono uppercase tracking-widest text-center text-lg max-w-[200px]"
                placeholder="GYM001" maxLength={6}
                value={gymCode} onChange={e => setGymCode(e.target.value.toUpperCase())}
              />
              <button
                className="btn-primary px-6"
                disabled={gymCode.length < 6 || joinMut.isPending}
                onClick={() => joinMut.mutate()}
              >
                {joinMut.isPending ? '...' : 'Send Request'}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-display font-700 uppercase tracking-wide text-base mb-4">My Gyms</h3>
            {memberships.length === 0 ? (
              <p className="text-atom-muted text-center py-6 text-sm">You haven't joined any gyms yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {memberships.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-xl border border-atom-border bg-atom-surface">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-display font-700 text-lg uppercase">{m.gym?.name}</p>
                        <p className="text-atom-muted text-sm">{m.gym?.city}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    {m.status === 'approved' && <SubscriptionPill membership={m} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoData({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-atom-muted text-xs font-display uppercase tracking-widest mb-1">{label}</p>
      <p className="text-atom-text capitalize">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', suspended: 'badge-gray',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

function formatGoal(val?: string) {
  const map: Record<string, string> = {
    muscle_gain: 'Build Muscle', fat_loss: 'Lose Fat', strength: 'Increase Strength', endurance: 'Improve Endurance', general_fitness: 'General Fitness',
  };
  return val ? map[val] : null;
}

function formatActivity(val?: string) {
  const map: Record<string, string> = {
    sedentary: 'Sedentary', light: 'Lightly Active', moderate: 'Moderately Active', active: 'Very Active', very_active: 'Extremely Active',
  };
  return val ? map[val] : null;
}
