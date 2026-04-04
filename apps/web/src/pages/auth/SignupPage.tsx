import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', phone: '', password: '', full_name: '' });
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email && !form.phone) {
      toast.error('Enter your email or phone number');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await signup({
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
        full_name: form.full_name,
      });
      localStorage.removeItem('atom-welcome-seen');
      toast.success('Account created! Sign in to get started.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    }
  }

  return (
    <div className="min-h-screen bg-atom-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-atom-accent rounded-lg flex items-center justify-center">
            <span className="font-display font-800 text-atom-bg text-sm">A</span>
          </div>
          <span className="font-display font-700 text-atom-text uppercase tracking-widest text-sm">
            Atom OS
          </span>
        </div>

        <div className="mb-8">
          <h2 className="font-display text-3xl font-700 uppercase tracking-wide text-atom-text">
            Create Account
          </h2>
          <p className="text-atom-muted text-sm mt-1">
            Already have an account?{' '}
            <Link to="/login" className="text-atom-accent hover:underline">Sign in</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="label">Full Name *</label>
            <input
              className="input"
              placeholder="Ashish Kumar"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              className="input"
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <p className="text-atom-muted text-xs mt-1">Enter phone, email, or both</p>
          </div>

          <div>
            <label className="label">Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-12"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-atom-muted hover:text-atom-text"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-atom-bg border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}