import { create } from 'zustand';
import { authApi, setToken, setRefreshToken, clearToken } from '@/lib/api';

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
      const normalizeRole = (role: string | undefined) => role === 'admin' ? 'gym_admin' : (role ?? 'member');
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
    set({ loading: true });
    try {
      const token = localStorage.getItem('atom_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, loading: false, isInitialized: true });
        return;
      }

      const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        clearToken();
        set({ user: null, isAuthenticated: false, loading: false, isInitialized: true });
        return;
      }

      const json = await response.json();
      const data = json.data;
      const normalizeRole = (role: string | undefined) => role === 'admin' ? 'gym_admin' : (role ?? 'member');

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
          isInitialized: true,
        });
      } else {
        clearToken();
        set({ user: null, isAuthenticated: false, loading: false, isInitialized: true });
      }
    } catch {
      clearToken();
      set({ user: null, isAuthenticated: false, loading: false, isInitialized: true });
    }
  },
}));

// Selector hooks
export const useUser   = () => useAuthStore((s) => s.user);
export const useRole   = () => useAuthStore((s) => s.user?.role);
export const useIsAuth = () => useAuthStore((s) => !!s.user);
export { useAuthStore };
export default useAuthStore;
