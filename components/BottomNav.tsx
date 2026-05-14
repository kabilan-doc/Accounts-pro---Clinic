'use client';

import Link from 'next/link';
import { Home, PlusCircle, FileText, BarChart3, History, LogOut } from 'lucide-react';

const TABS = [
  { href: '/dashboard',  label: 'Home',    icon: Home },
  { href: '/entry',      label: 'Entry',   icon: PlusCircle },
  { href: '/history',    label: 'Ledger',  icon: FileText },
  { href: '/analytics',  label: 'Charts',  icon: BarChart3 },
  { href: '/historical', label: 'FY',      icon: History },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/60 px-2 pb-safe shadow-2xl shadow-slate-300/30 xl:hidden"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        {TABS.map(tab => {
          const isActive = active === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all duration-300"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-300/40 scale-105'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon className="h-4 w-4" />
              </span>
              <span className={`text-[10px] font-semibold transition-colors duration-300 ${
                isActive ? 'text-brand-700' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all duration-300"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-rose-400 transition-all duration-300 hover:bg-rose-50 hover:text-rose-500">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-[10px] font-semibold text-rose-400">Logout</span>
        </button>
      </div>
    </nav>
  );
}
