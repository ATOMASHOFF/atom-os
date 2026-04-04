// apps/web/src/lib/api.ts
// Typed API client. Uses stored JWT for every request.
// All API calls go through this — never direct fetch() in components.
/// <reference types="vite/client" />

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

function getToken(): string | null {
  return localStorage.getItem('atom_token');
}

export function setToken(token: string): void {
  localStorage.setItem('atom_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('atom_token');
  localStorage.removeItem('atom_refresh');
}

export function setRefreshToken(token: string): void {
  localStorage.setItem('atom_refresh', token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('atom_refresh');
}

// Core fetch wrapper
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshed = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setToken(data.data.access_token);
        setRefreshToken(data.data.refresh_token);
        // Retry original request
        return request<T>(path, options);
      }
    }
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error || 'Request failed', res.status, json.code);
  return json.data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP method helpers
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (body: { email?: string; phone?: string; password: string; full_name: string }) =>
    api.post<{ message: string; session: { access_token: string; refresh_token: string } | null }>('/api/auth/signup', body),
  login: (body: { identifier: string; password: string }) =>
    api.post<{ user: any; access_token: string; refresh_token: string }>('/api/auth/login', body),
  me: () => api.get<any>('/api/auth/me'),
  updateProfile: (body: any) => api.patch<any>('/api/auth/me', body),
  logout: () => api.post('/api/auth/logout'),
};

// ─── SUPER ADMIN ──────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get<any>('/api/admin/stats'),
  gyms: () => api.get<any>('/api/admin/gyms'),
  users: (params?: { page?: number; role?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api.get<any>(`/api/admin/users${q ? `?${q}` : ''}`);
  },
  updateUserRole: (id: string, role: string) =>
    api.patch<any>(`/api/admin/users/${id}/role`, { role }),
};

// ─── GYMS ─────────────────────────────────────────────────────────────────────
export const gymApi = {
  list: () => api.get<any>('/api/gyms'),
  get: (id: string) => api.get<any>(`/api/gyms/${id}`),
  my: () => api.get<any>('/api/gyms/my'),          // gym_admin: fetch own gym
  create: (body: any) => api.post<any>('/api/gyms', body),
  update: (id: string, body: any) => api.patch<any>(`/api/gyms/${id}`, body),
  setStatus: (id: string, status: string) => api.patch<any>(`/api/gyms/${id}/status`, { status }),
  assignAdmin: (id: string, user_id: string) =>
    api.post<any>(`/api/gyms/${id}/assign-admin`, { user_id }),
};

// ─── MEMBERSHIP ───────────────────────────────────────────────────────────────
export const membershipApi = {
  browseGyms: () => api.get<any>('/api/membership/gyms'),
  join: (gym_code: string) => api.post<any>('/api/membership/join', { gym_code }),
  myStatus: () => api.get<any>('/api/membership/status'),
  requests: () => api.get<any>('/api/membership/requests'),
  updateRequest: (id: string, body: any) => api.patch<any>(`/api/membership/requests/${id}`, body),
  members: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return api.get<any>(`/api/membership/members${q}`);
  },
  updateMember: (id: string, body: any) => api.patch<any>(`/api/membership/members/${id}`, body),
  stats: () => api.get<any>('/api/membership/stats'),
};

// ─── QR ───────────────────────────────────────────────────────────────────────
export const qrApi = {
  current: () => api.get<any>('/api/qr/current'),
  rotate: () => api.post<any>('/api/qr/rotate'),
  getConfig: () => api.get<any>('/api/qr/config'),
  updateConfig: (qr_rotation_interval_s: number) =>
    api.patch<any>('/api/qr/config', { qr_rotation_interval_s }),
};

// ─── CHECKINS ─────────────────────────────────────────────────────────────────
export const checkinApi = {
  scan: (token: string) => api.post<any>('/api/checkins/scan', { token }),
  my: (page = 1) => api.get<any>(`/api/checkins/my?page=${page}`),
  gym: (params?: { date?: string; page?: number }) => {
    const q = new URLSearchParams(params as any).toString();
    return api.get<any>(`/api/checkins/gym${q ? `?${q}` : ''}`);
  },
  today: () => api.get<any>('/api/checkins/today'),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  generatePlan: (body: {
    goal: string;
    days_per_week: number;
    experience_level: string;
    equipment: string[];
    focus_areas?: string[];
    notes?: string;
  }) => api.post<any>('/api/ai/generate-plan', body),
};

// ─── WORKOUTS ─────────────────────────────────────────────────────────────────
export const workoutApi = {
  list: (params?: { page?: number; month?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return api.get<any>(`/api/workouts${q ? `?${q}` : ''}`);
  },
  create: (body: any) => api.post<any>('/api/workouts', body),
  get: (id: string) => api.get<any>(`/api/workouts/${id}`),
  update: (id: string, body: any) => api.patch<any>(`/api/workouts/${id}`, body),
  delete: (id: string) => api.delete<any>(`/api/workouts/${id}`),
  addSet: (logId: string, body: any) => api.post<any>(`/api/workouts/${logId}/sets`, body),
  deleteSet: (logId: string, setId: string) =>
    api.delete<any>(`/api/workouts/${logId}/sets/${setId}`),
  exercises: () => api.get<any>('/api/workouts/exercises'),
  createExercise: (body: any) => api.post<any>('/api/workouts/exercises', body),
  stats: () => api.get<any>('/api/workouts/stats/summary'),
};
