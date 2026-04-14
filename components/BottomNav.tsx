'use client';

import Link from 'next/link';
import { Home, PlusCircle, FileText, BarChart3, History, LogOut } from 'lucide-react';

export function BottomNav({ active }: { active: string }) {
  const tabs = [
    { href: '/dashboard',  label: 'Home',    icon: Home },
    { href: '/entry',      label: 'Entry',   icon: PlusCircle },
    { href: '/history',    label: 'Ledger',  icon: FileText },
    { href: '/analytics',  label: 'Charts',  icon: BarChart3 },
    { href: '/historical', label: 'FY',      icon: History }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-safe shadow-lg backdrop-blur-sm sm:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        {tabs.map(tab => {
          const isActive = active === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400'
              }`}>
                <tab.icon className="h-4 w-4" />
              </span>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-700' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}
          className="flex flex-1 flex-col items-center gap-0.5 py-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-red-400">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="text-[10px] font-medium text-red-400">Logout</span>
        </button>
      </div>
    </nav>
  );
}
