'use client';

import Link from 'next/link';
import { Home, PlusCircle, FileText, BarChart3, ShieldCheck, ClipboardList, History, BookOpen, LogOut } from 'lucide-react';

export function Sidebar({ active }: { active: string }) {
  const items = [
    { href: '/dashboard',  label: 'Dashboard',   icon: Home },
    { href: '/entry',      label: 'New Entry',    icon: PlusCircle },
    { href: '/history',    label: 'History',      icon: FileText },
    { href: '/analytics',  label: 'Analytics',    icon: BarChart3 },
    { href: '/historical', label: 'FY Analytics', icon: History },
    { href: '/accounts',   label: 'Accounts',     icon: BookOpen },
    { href: '/audit',      label: 'Audit',        icon: ClipboardList },
    { href: '/admin',      label: 'Admin',        icon: ShieldCheck }
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Clinic branding */}
      <div className="rounded-t-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-4 text-white shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Dr. Kabilan's</p>
        <p className="mt-0.5 text-lg font-bold leading-tight">Clinic Accounts</p>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Menu</p>
        <nav className="space-y-0.5">
          {items.map(item => {
            const isActive = active === item.href;
            const isAdmin = item.href === '/admin';
            return (
              <div key={item.href} className={isAdmin ? 'flex items-center gap-1' : ''}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isAdmin ? 'flex-1' : 'w-full'
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {item.label}
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Logout"
                    className="flex items-center justify-center rounded-xl p-2.5 bg-red-500 text-white transition-all duration-150 hover:bg-red-600"
                  >
                    <LogOut className="h-[18px] w-[18px] shrink-0" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
