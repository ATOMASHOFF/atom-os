import { create } from 'zustand';
import { ApiError, authApi, setToken, setRefreshToken, clearToken } from '@/lib/api';

function normalizeRole(role: string | undefined): 'super_admin' | 'gym_admin' | 'member' {
  const value = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (value === 'super_admin' || value === 'superadmin') return 'super_admin';
  if (value === 'gym_admin' || value === 'gymadmin' || value === 'admin' || value === 'owner' || value === 'gym_owner') return 'gym_admin';
  if (value === 'member' || value === 'guest' || value === 'user' || value === 'client') return 'member';
  return 'member';
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  gym_id?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  /** Alias so pages can use isLoading */
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (body: { email?: string; phone?: string; password: string; full_name: string }) => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  logout: () => {
    clearToken();
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },

  login: async (identifier, password) => {
    set({ loading: true, isLoading: true });
    try {
      const data = await authApi.login({ identifier, password });
      // Store tokens
      if (data.access_token)  setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      set({
        user: {
          id:        data.user.id,
          email:     data.user.email,
          role:      normalizeRole(data.user.role),
          full_name: data.user.full_name,
          gym_id:    data.user.gym_id,
        },
        isAuthenticated: true,
        loading: false,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      set({ loading: false, isLoading: false });
      throw err;
    }
  },

  signup: async (body) => {
    set({ loading: true, isLoading: true });
    try {
      await authApi.signup(body);
      set({ loading: false, isLoading: false });
    } catch (err) {
      set({ loading: false, isLoading: false });
      throw err;
    }
  },

  fetchMe: async () => {
    set({ loading: true, isLoading: true });
    try {
      const accessToken = localStorage.getItem('atom_token');
      const refreshToken = localStorage.getItem('atom_refresh');

      if (!accessToken && !refreshToken) {
        set({ user: null, isAuthenticated: false, loading: false, isLoading: false, isInitialized: true });
        return;
      }

      if (!accessToken && refreshToken) {
        const refreshed = await authApi.refresh({ refresh_token: refreshToken });
        if (refreshed?.access_token) setToken(refreshed.access_token);
        if (refreshed?.refresh_token) setRefreshToken(refreshed.refresh_token);
      }

      const data = await authApi.me();

      if (data) {
        set({
          user: {
            id:        data.id,
            email:     data.email,
            role:      normalizeRole(data.role),
            full_name: data.full_name,
            gym_id:    data.gym_id,
          },
          isAuthenticated: true,
          loading: false,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        clearToken();
        set({ user: null, isAuthenticated: false, loading: false, isLoading: false, isInitialized: true });
      }
    } catch (err) {
      // Only clear credentials on explicit auth failures.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearToken();
      }
      set({ user: null, isAuthenticated: false, loading: false, isLoading: false, isInitialized: true });
    }
  },
}));

// Selector hooks
export const useUser   = () => useAuthStore((s) => s.user);
export const useRole   = () => useAuthStore((s) => s.user?.role);
export const useIsAuth = () => useAuthStore((s) => !!s.user);
export { useAuthStore };
export default useAuthStore;
