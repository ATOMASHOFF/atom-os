// apps/web/src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login     = useAuthStore((s) => s.login);
  const isLoading  = useAuthStore((s) => s.isLoading);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const from = (location.state as any)?.from?.pathname;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(identifier, password);
      toast.success('Welcome back!');
      // Role redirect handled by RoleRedirect component
      navigate(from || '/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen bg-atom-bg flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-atom-surface border-r border-atom-border
                      flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #EF4444 0, #EF4444 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-atom-accent rounded-2xl flex items-center justify-center mx-auto mb-8
                          shadow-[0_0_60px_rgba(239,68,68,0.3)]">
            <span className="font-display font-800 text-atom-bg text-4xl">A</span>
          </div>
          <h1 className="font-display text-6xl font-800 uppercase tracking-tight text-atom-text mb-4">
            Atom OS
          </h1>
          <p className="text-atom-muted text-lg max-w-xs leading-relaxed">
            The complete gym management and fitness tracking platform.
          </p>
          <div className="mt-12 flex flex-col gap-3 text-left">
            {['QR Check-in System', 'Member Management', 'Workout Tracking', 'Real-time Analytics'].map(f => (
              <div key={f} className="flex items-center gap-3 text-atom-muted">
                <Zap size={14} className="text-atom-accent flex-shrink-0" />
                <span className="text-sm font-body">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-700 uppercase tracking-wide text-atom-text">
              Sign In
            </h2>
            <p className="text-atom-muted text-sm mt-1">
              Don't have an account?{' '}
              <Link to="/signup" className="text-atom-accent hover:underline">
                Create one
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">Email or Phone</label>
              <input
                type="text"
                className="input"
                placeholder="you@example.com or +919876543210"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

            <button type="submit" className="btn-primary w-full mt-2" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-atom-bg border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
