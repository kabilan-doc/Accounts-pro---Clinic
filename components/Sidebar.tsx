'use client';

import Link from 'next/link';
import { Home, PlusCircle, FileText, BarChart3, ShieldCheck, ClipboardList, History, BookOpen, LogOut } from 'lucide-react';

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

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

  return (
    <aside className="hidden w-72 shrink-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:block">
      {/* Clinic branding */}
      <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Dr. Kabilan's</p>
        <p className="mt-0.5 text-lg font-bold leading-tight">Clinic Accounts</p>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Menu</p>
        <nav className="space-y-0.5">
          {items.map(item => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="mt-4 border-t border-white/20 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-all duration-150 hover:bg-red-600 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 transition-colors text-red-300 group-hover:text-white" />
          Logout
        </button>
      </div>
    </aside>
  );
}
