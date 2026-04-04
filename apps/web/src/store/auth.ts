// apps/web/src/store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, setToken, setRefreshToken, clearToken } from '@/lib/api';
import type { UserRole } from '@atom-os/shared';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  gym_id?: string;
  memberships?: any[];
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: { email?: string; phone?: string; password: string; full_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login({ identifier, password });
          setToken(data.access_token);
          setRefreshToken(data.refresh_token);
          set({ user: data.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        try {
          await authApi.signup(data);
          set({ isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await authApi.logout(); } catch { }
        clearToken();
        set({ user: null });
        window.location.href = '/login';
      },

      fetchMe: async () => {
        const token = localStorage.getItem('atom_token');
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const data = await authApi.me();
          set({ user: data, isInitialized: true });
        } catch {
          clearToken();
          set({ user: null, isInitialized: true });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'atom-auth',
      partialize: (state) => ({ user: state.user }), // Only persist user (not loading states)
    }
  )
);

// Selector hooks
export const useUser = () => useAuthStore(s => s.user);
export const useRole = () => useAuthStore(s => s.user?.role);
export const useIsAuth = () => useAuthStore(s => !!s.user);
