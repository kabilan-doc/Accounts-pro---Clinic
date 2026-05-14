'use client';

import Link from 'next/link';
import {
  Home, PlusCircle, FileText, BarChart3, ShieldCheck,
  ClipboardList, History, BookOpen, LogOut, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: Home },
  { href: '/entry',      label: 'New Entry',    icon: PlusCircle },
  { href: '/history',    label: 'History',      icon: FileText },
  { href: '/analytics',  label: 'Analytics',    icon: BarChart3 },
  { href: '/historical', label: 'FY Analytics', icon: History },
  { href: '/accounts',   label: 'Accounts',     icon: BookOpen },
  { href: '/audit',      label: 'Audit',        icon: ClipboardList },
  { href: '/admin',      label: 'Admin',        icon: ShieldCheck },
];

export function Sidebar({ active }: { active: string }) {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside
      className="hidden xl:flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}
    >
      {/* ── Brand Header ── */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {/* DK Badge */}
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-md shadow-brand-300/40 shrink-0">
            <span className="text-white font-bold text-sm tracking-tight select-none">DK</span>
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 shadow-sm">
              <Activity className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 leading-none">Dr. Kabilan&apos;s</p>
            <p className="mt-0.5 text-[15px] font-bold text-slate-900 leading-tight">Clinic Accounts</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Navigation
        </p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-800 hover:translate-x-0.5'
                }`}
                style={isActive ? {
                  boxShadow: '0 0 0 1px #dbeafe, 0 4px 12px -2px rgba(37,99,235,0.12)'
                } : undefined}
              >
                {/* Pill indicator */}
                {isActive && (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand-600 shadow-sm shadow-brand-300" />
                )}
                <item.icon
                  className={`h-[17px] w-[17px] shrink-0 transition-all duration-300 ${
                    isActive
                      ? 'text-brand-600'
                      : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'
                  }`}
                />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Sign Out ── */}
      <div className="px-3 py-3 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 transition-all duration-300 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-[17px] w-[17px] shrink-0 transition-all duration-300 group-hover:scale-110" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
