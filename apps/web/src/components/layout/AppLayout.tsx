// apps/web/src/components/layout/AppLayout.tsx
// Change from previous: Added { to: '/super/members', icon: Users2, label: 'Members' }
// to the super_admin NAV array

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useUser } from '@/store/auth';
import {
  LayoutDashboard, Users, QrCode, Dumbbell, Activity,
  Building2, LogOut, ChevronRight, User, ScanLine, Settings,
  Menu, X, TrendingUp, Lock, Sparkles, Megaphone, UsersRound,
} from 'lucide-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import toast from 'react-hot-toast';

type Role = 'super_admin' | 'gym_admin' | 'member';

const NAV: Record<Role, { to: string; icon: React.ElementType; label: string }[]> = {
  super_admin: [
    { to: '/super/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/super/gyms',      icon: Building2,       label: 'Gyms'      },
    { to: '/super/members',   icon: UsersRound,      label: 'Members'   },  // ← NEW
    { to: '/super/users',     icon: Users,           label: 'Users'     },
  ],
  gym_admin: [
    { to: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/admin/members',        icon: Users,           label: 'Members'       },
    { to: '/admin/attendance',     icon: Activity,        label: 'Attendance'    },
    { to: '/admin/analytics',      icon: TrendingUp,      label: 'Analytics'     },
    { to: '/admin/qr',             icon: QrCode,          label: 'QR Screen'     },
    { to: '/admin/announcements',  icon: Megaphone,       label: 'Announcements' },
    { to: '/admin/settings',       icon: Settings,        label: 'Settings'      },
  ],
  member: [
    { to: '/member/dashboard', icon: LayoutDashboard, label: 'Home'      },
    { to: '/member/workouts',  icon: Dumbbell,        label: 'Workouts'  },
    { to: '/member/ai-plan',   icon: Sparkles,        label: 'AI Coach'  },
    { to: '/member/progress',  icon: TrendingUp,      label: 'Progress'  },
    { to: '/member/checkin',   icon: ScanLine,        label: 'Check In'  },
    { to: '/member/profile',   icon: User,            label: 'Profile'   },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  gym_admin:   'Gym Admin',
  member:      'Member',
};

function Avatar({ name }: { name?: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-atom-accent/20 border border-atom-accent/30
                    flex items-center justify-center text-atom-accent font-display font-700 text-xs flex-shrink-0">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function AppLayout({ role }: { role: Role }) {
  const user     = useUser();
  const logout   = useAuthStore((s) => s.logout);
  const navigate   = useNavigate();
  const items      = NAV[role];
  const [drawer, setDrawer] = useState(false);

  const { data: membershipData } = useQuery({
    queryKey: ['my-memberships'],
    queryFn:  membershipApi.myStatus,
    enabled:  role === 'member',
    staleTime: 30_000,
  });
  const hasApprovedGym = role === 'member'
    ? (membershipData?.memberships ?? []).some((m: any) => m.status === 'approved')
    : true;

  const navLink = ({ to, icon: Icon, label }: typeof items[0], onClick?: () => void) => {
    const isCheckinLocked = to === '/member/checkin' && !hasApprovedGym;

    if (isCheckinLocked) {
      return (
        <button key={to}
          onClick={() => { onClick?.(); toast('Join a gym first to unlock Check In', { icon: '🔒' }); navigate('/member/profile'); }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-atom-muted/50
                     cursor-pointer hover:bg-atom-border/20 transition-all w-full text-left">
          <Lock size={17} className="text-atom-muted/40" />
          <span className="flex-1">{label}</span>
          <span className="text-[10px] font-mono text-atom-muted/40 uppercase tracking-widest">Join gym</span>
        </button>
      );
    }

    return (
      <NavLink key={to} to={to} onClick={onClick}
        className={({ isActive }) => clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-150',
          isActive
            ? 'bg-atom-accent/10 text-atom-accent border border-atom-accent/20 font-500'
            : 'text-atom-muted hover:text-atom-text hover:bg-atom-border/40'
        )}>
        {({ isActive }) => (
          <>
            <Icon size={17} className={isActive ? 'text-atom-accent' : ''} />
            <span className="flex-1">{label}</span>
            {isActive && <ChevronRight size={13} className="text-atom-accent" />}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-atom-bg">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 w-64
                        bg-atom-surface border-r border-atom-border z-30">
        <div className="p-6 border-b border-atom-border flex items-center gap-3">
          <div className="w-8 h-8 bg-atom-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-display font-800 text-atom-bg text-sm">A</span>
          </div>
          <div>
            <p className="font-display font-700 text-atom-text uppercase tracking-widest text-sm">Atom OS</p>
            <p className="text-atom-muted text-xs font-mono">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {items.map(item => navLink(item))}
        </nav>
        <div className="p-4 border-t border-atom-border">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <Avatar name={(user as any)?.full_name} />
            <div className="min-w-0">
              <p className="text-atom-text text-sm font-500 truncate">{(user as any)?.full_name}</p>
              <p className="text-atom-muted text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm
                       text-atom-muted hover:text-atom-danger hover:bg-atom-danger/10 transition-all">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-atom-surface/95 backdrop-blur
                         border-b border-atom-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-atom-accent rounded-md flex items-center justify-center">
            <span className="font-display font-800 text-atom-bg text-xs">A</span>
          </div>
          <span className="font-display font-700 text-atom-text uppercase tracking-widest text-sm">Atom OS</span>
        </div>
        <button onClick={() => setDrawer(true)}
          className="p-2 text-atom-muted hover:text-atom-text rounded-lg hover:bg-atom-border transition-colors">
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/60 animate-fade-in" onClick={() => setDrawer(false)} />
          <div className="w-72 bg-atom-surface border-l border-atom-border flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-atom-border">
              <div className="flex items-center gap-3">
                <Avatar name={(user as any)?.full_name} />
                <div className="min-w-0">
                  <p className="text-atom-text text-sm font-500 truncate">{(user as any)?.full_name}</p>
                  <p className="text-atom-muted text-xs">{ROLE_LABEL[role]}</p>
                </div>
              </div>
              <button onClick={() => setDrawer(false)}
                className="text-atom-muted hover:text-atom-text p-1.5 rounded-lg hover:bg-atom-border">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
              {items.map(item => navLink(item, () => setDrawer(false)))}
            </nav>
            <div className="p-4 border-t border-atom-border">
              <button onClick={() => { logout(); setDrawer(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm
                           text-atom-muted hover:text-atom-danger hover:bg-atom-danger/10 transition-all">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar — only show first 5 items max to avoid crowding */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30
                      bg-atom-surface/95 backdrop-blur border-t border-atom-border grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, 1fr)` }}>
        {items.slice(0, 6).map(({ to, icon: Icon, label }) => {
          const isCheckin       = to === '/member/checkin';
          const isCheckinLocked = isCheckin && !hasApprovedGym;

          if (isCheckinLocked) {
            return (
              <button key={to}
                onClick={() => { toast('Join a gym first', { icon: '🔒' }); navigate('/member/profile'); }}
                className="flex flex-col items-center justify-center py-2 gap-0.5 text-atom-muted/40 transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-4 mb-0.5 bg-atom-border/60 relative">
                  <Icon size={20} className="opacity-40" />
                  <Lock size={10} className="absolute bottom-1.5 right-1.5 text-atom-muted/60" />
                </div>
                <span className="text-[10px] font-display uppercase tracking-wide leading-none opacity-50">{label}</span>
              </button>
            );
          }

          return (
            <NavLink key={to} to={to}
              className={({ isActive }) => clsx(
                'flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all',
                isActive ? 'text-atom-accent' : 'text-atom-muted'
              )}>
              {({ isActive }) => (
                <>
                  {isCheckin ? (
                    <div className={clsx(
                      'w-12 h-12 rounded-2xl flex items-center justify-center -mt-4 mb-0.5',
                      'shadow-[0_-4px_20px_rgba(239,68,68,0.3)] transition-all',
                      isActive ? 'bg-atom-accent' : 'bg-atom-accent/85'
                    )}>
                      <Icon size={20} className="text-atom-bg" />
                    </div>
                  ) : (
                    <div className="relative">
                      <Icon size={20} />
                      {isActive && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-atom-accent" />}
                    </div>
                  )}
                  <span className="text-[10px] font-display uppercase tracking-wide leading-none">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
