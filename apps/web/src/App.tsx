// apps/web/src/App.tsx
// Changes from previous version:
//   1. Added SuperMembers import and route
//   2. AdminAnnouncements import and route already there
import { useEffect } from 'react';
import { useRef } from 'react';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useUser } from '@/store/auth';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));

const SuperDashboard = lazy(() => import('@/pages/super/SuperDashboard'));
const SuperGyms = lazy(() => import('@/pages/super/SuperGyms'));
const SuperUsers = lazy(() => import('@/pages/super/SuperUsers'));
const SuperMembers = lazy(() => import('@/pages/super/SuperMembers'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminMembers = lazy(() => import('@/pages/admin/AdminMembers'));
const AdminAttendance = lazy(() => import('@/pages/admin/AdminAttendance'));
const AdminQRScreen = lazy(() => import('@/pages/admin/AdminQRScreen'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));
const AdminMembershipPlans = lazy(() => import('@/pages/admin/AdminMembershipPlans'));

const MemberDashboard = lazy(() => import('@/pages/member/MemberDashboard'));
const MemberWorkouts = lazy(() => import('@/pages/member/MemberWorkouts'));
const MemberCheckin = lazy(() => import('@/pages/member/MemberCheckin'));
const MemberProfile = lazy(() => import('@/pages/member/MemberProfile'));
const MemberProgress = lazy(() => import('@/pages/member/MemberProgress'));
const MemberAIPlan = lazy(() => import('@/pages/member/MemberAIPlan'));
const MemberMyMembership = lazy(() => import('@/pages/member/MemberMyMembership'));

import AppLayout from '@/components/layout/AppLayout';
import { InstallBanner, UpdateBanner, OfflineBanner } from '@/components/ui/PWABanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            10_000,
      retry:                2,
      refetchOnWindowFocus: true,
      refetchOnMount:       true,
      refetchOnReconnect:   true,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user     = useUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: string | string[]; children: React.ReactNode }) {
  const user  = useUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!user) return <Navigate to="/unauthorized" replace />;
  const normalizedRole = user?.role === 'admin' ? 'gym_admin' : user?.role;
  if (!normalizedRole || !roles.includes(normalizedRole)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const user = useUser();
  if (!user) return <Navigate to="/login" replace />;
  const normalizedRole = user.role === 'admin' ? 'gym_admin' : user.role;
  if (normalizedRole === 'super_admin') return <Navigate to="/super/dashboard" replace />;
  if (normalizedRole === 'gym_admin')   return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/member/dashboard" replace />;
}

function AppInit() {
  const fetchMe       = useAuthStore((s) => s.fetchMe);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetchMe();
  }, [fetchMe]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-atom-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
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
        <Suspense fallback={
          <div className="min-h-screen bg-atom-bg flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-atom-accent border-t-transparent rounded-full animate-spin" />
              <span className="font-display text-atom-muted text-sm uppercase tracking-widest">Loading page...</span>
            </div>
          </div>
        }>
        <Routes>
          <Route path="/login"  element={<LoginPage  />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/"       element={<RoleRedirect />} />

          {/* Super Admin */}
          <Route path="/super" element={
            <RequireAuth><RequireRole role="super_admin"><AppLayout role="super_admin" /></RequireRole></RequireAuth>
          }>
            <Route path="dashboard" element={<SuperDashboard />} />
            <Route path="gyms"      element={<SuperGyms      />} />
            <Route path="users"     element={<SuperUsers     />} />
            <Route path="members"   element={<SuperMembers   />} />  {/* ← NEW */}
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Gym Admin */}
          <Route path="/admin" element={
            <RequireAuth><RequireRole role="gym_admin"><AppLayout role="gym_admin" /></RequireRole></RequireAuth>
          }>
            <Route path="dashboard"     element={<AdminDashboard     />} />
            <Route path="members"       element={<AdminMembers       />} />
            <Route path="attendance"    element={<AdminAttendance    />} />
            <Route path="qr"            element={<AdminQRScreen      />} />
            <Route path="settings"      element={<AdminSettings      />} />
            <Route path="analytics"     element={<AdminAnalytics     />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="plans"         element={<AdminMembershipPlans />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Member */}
          <Route path="/member" element={
            <RequireAuth><RequireRole role="member"><AppLayout role="member" /></RequireRole></RequireAuth>
          }>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="workouts"  element={<MemberWorkouts  />} />
            <Route path="progress"  element={<MemberProgress  />} />
            <Route path="ai-plan"   element={<MemberAIPlan    />} />
            <Route path="membership" element={<MemberMyMembership />} />
            <Route path="checkin"   element={<MemberCheckin   />} />
            <Route path="profile"   element={<MemberProfile   />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="/unauthorized" element={
            <div className="min-h-screen bg-atom-bg flex items-center justify-center">
              <div className="text-center">
                <p className="font-display text-6xl text-atom-accent font-bold">403</p>
                <p className="text-atom-muted mt-2">Access denied</p>
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
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
          style: { background: '#161616', color: '#F0F0F0', border: '1px solid #2A2A2A', fontFamily: 'DM Sans, sans-serif' },
          success: { iconTheme: { primary: '#EF4444', secondary: '#0D0D0D' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#0D0D0D' } },
        }}
      />
    </QueryClientProvider>
  );
}
