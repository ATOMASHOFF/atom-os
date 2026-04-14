// apps/web/src/pages/super/SuperUsers.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Shield, Trash2 } from 'lucide-react';
import { useUser } from '@/store/auth';
import toast from 'react-hot-toast';

export default function SuperUsers() {
  const qc = useQueryClient();
  const currentUser = useUser();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => adminApi.users({ search: search || undefined, role: roleFilter || undefined }),
    placeholderData: prev => prev,
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Role updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const users = data?.users ?? [];

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="section-title">Users</h1>
        <p className="text-atom-muted text-sm mt-1">{data?.total ?? 0} total users</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-atom-muted" />
          <input
            className="input pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="gym_admin">Gym Admin</option>
          <option value="member">Member</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-atom-border">
              {['User', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left py-3 px-3 text-atom-muted font-display uppercase text-xs tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="py-4 px-3">
                  <div className="h-4 bg-atom-border rounded animate-pulse" />
                </td></tr>
              ))
            ) : users.map((u: any) => (
              <tr key={u.id} className="border-b border-atom-border/50 hover:bg-atom-border/20">
                <td className="py-3 px-3">
                  <p className="font-500 text-atom-text">{u.full_name}</p>
                  <p className="text-atom-muted text-xs">{u.email}</p>
                </td>
                <td className="py-3 px-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="py-3 px-3 text-atom-muted text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {u.role !== 'super_admin' && (
                      <button
                        onClick={() => {
                          const next = u.role === 'member' ? 'gym_admin' : 'member';
                          if (confirm(`Change ${u.full_name} to ${next}?`)) {
                            roleMut.mutate({ id: u.id, role: next });
                          }
                        }}
                        className="text-xs flex items-center gap-1.5 text-atom-muted hover:text-atom-accent transition-colors"
                      >
                        <Shield size={13} />
                        Toggle Role
                      </button>
                    )}

                    {u.role !== 'super_admin' && u.id !== currentUser?.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${u.full_name || u.email}? This action cannot be undone.`)) {
                            deleteMut.mutate(u.id);
                          }
                        }}
                        className="text-xs flex items-center gap-1.5 text-atom-muted hover:text-atom-danger transition-colors"
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 size={13} />
                        Delete User
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = { super_admin: 'badge-red', gym_admin: 'badge-yellow', member: 'badge-blue' };
  const labels: Record<string, string> = { super_admin: 'Super Admin', gym_admin: 'Gym Admin', member: 'Member' };
  return <span className={map[role] ?? 'badge-gray'}>{labels[role] ?? role}</span>;
}
