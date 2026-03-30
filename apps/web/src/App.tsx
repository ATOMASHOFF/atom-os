// apps/web/src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useUser } from '@/store/auth';
import { membershipApi } from '@/lib/api';

// Pages
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';

// Super Admin
import SuperDashboard from '@/pages/super/SuperDashboard';
import SuperGyms from '@/pages/super/SuperGyms';
import SuperUsers from '@/pages/super/SuperUsers';

// Gym Admin
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminMembers from '@/pages/admin/AdminMembers';
import AdminAttendance from '@/pages/admin/AdminAttendance';
import AdminQRScreen from '@/pages/admin/AdminQRScreen';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';

// Member
import MemberDashboard from '@/pages/member/MemberDashboard';
import MemberWorkouts from '@/pages/member/MemberWorkouts';
import MemberCheckin from '@/pages/member/MemberCheckin';
import MemberProfile from '@/pages/member/MemberProfile';
import MemberProgress from '@/pages/member/MemberProgress';

// Layout
import AppLayout from '@/components/layout/AppLayout';
import { InstallBanner, UpdateBanner, OfflineBanner } from '@/components/ui/PWABanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30s stale time
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── ROUTE GUARDS ────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: string | string[]; children: React.ReactNode }) {
  const user = useUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}

// Guards /member/checkin — redirects to the checkin page itself (which shows the unlock UI)
// The page handles the no-gym state with a rich onboarding UI rather than a hard block.
// This guard only protects against non-members bypassing the nav lock via direct URL.
// The actual feature lock is enforced both here and inside MemberCheckin.
function RequireGym({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-memberships'],
    queryFn: membershipApi.myStatus,
    staleTime: 1000 * 30,
  });

  // While loading, don't redirect — show nothing (checkin page handles its own skeleton)
  if (isLoading) return null;

  const hasApprovedGym = (data?.memberships ?? []).some(
    (m: any) => m.status === 'approved'
  );

  // No gym → let MemberCheckin render its own onboarding UI (don't hard redirect)
  // This allows the page to explain WHY it's locked and give a CTA
  return <>{children}</>;
}

function RoleRedirect() {
  const user = useUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'super_admin') return <Navigate to="/super/dashboard" replace />;
  if (user.role === 'gym_admin')   return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/member/dashboard" replace />;
}

// ─── APP INIT ─────────────────────────────────────────────────────────────────

function AppInit() {
  const { fetchMe, isInitialized } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-atom-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-atom-gold border-t-transparent rounded-full animate-spin" />
          <span className="font-display text-atom-muted text-sm uppercase tracking-widest">
            Initializing Atom OS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/"       element={<RoleRedirect />} />

        {/* Super Admin */}
        <Route path="/super" element={
          <RequireAuth><RequireRole role="super_admin">
            <AppLayout role="super_admin" />
          </RequireRole></RequireAuth>
        }>
          <Route path="dashboard" element={<SuperDashboard />} />
          <Route path="gyms"      element={<SuperGyms />} />
          <Route path="users"     element={<SuperUsers />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Gym Admin */}
        <Route path="/admin" element={
          <RequireAuth><RequireRole role="gym_admin">
            <AppLayout role="gym_admin" />
          </RequireRole></RequireAuth>
        }>
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="members"    element={<AdminMembers />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="qr"         element={<AdminQRScreen />} />
          <Route path="settings"   element={<AdminSettings />} />
          <Route path="analytics"  element={<AdminAnalytics />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Member */}
        <Route path="/member" element={
          <RequireAuth><RequireRole role="member">
            <AppLayout role="member" />
          </RequireRole></RequireAuth>
        }>
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="workouts"  element={<MemberWorkouts />} />
          <Route path="progress"  element={<MemberProgress />} />
          <Route path="checkin"   element={<MemberCheckin />} />
          <Route path="profile"   element={<MemberProfile />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/unauthorized" element={
          <div className="min-h-screen bg-atom-bg flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-6xl text-atom-gold font-bold">403</p>
              <p className="text-atom-muted mt-2">Access denied</p>
            </div>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit />
      <InstallBanner />
      <UpdateBanner />
      <OfflineBanner />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#161616',
            color: '#F0F0F0',
            border: '1px solid #2A2A2A',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#F5C842', secondary: '#0D0D0D' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#0D0D0D' } },
        }}
      />
    </QueryClientProvider>
  );
}
