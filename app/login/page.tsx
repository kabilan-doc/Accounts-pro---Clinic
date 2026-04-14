'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Delete } from 'lucide-react';
import { DotMap } from '@/components/ui/travel-connect-signin-1';
import { format } from 'date-fns';

interface ProfileOption {
  id: string;
  full_name: string;
  role: 'admin' | 'staff';
}

export default function LoginPage() {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.ok ? r.json() : { profiles: [] })
      .then(d => setProfiles(d.profiles || []))
      .catch(() => {});
  }, []);

  const keypad = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  const handleKey = (val: string) => {
    if (val === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (val === '') return;
    if (pin.length >= 4) return;
    setPin(p => p + val);
  };

  const handleSubmit = async () => {
    setError('');
    if (!selectedProfile) { setError('Select your name.'); return; }
    if (pin.length !== 4) { setError('Enter your 4-digit PIN.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: selectedProfile.id, pin }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result?.message || 'Login failed.'); setPin(''); }
      else { window.location.href = '/dashboard'; }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) handleSubmit();
  }, [pin]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl overflow-hidden rounded-2xl flex bg-white shadow-xl"
      >
        {/* Left — animated dot map */}
        <div className="hidden md:block w-1/2 relative overflow-hidden border-r border-gray-100" style={{ minHeight: 560 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100">
            <DotMap />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mb-5"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="text-2xl font-bold text-white">K</span>
                </div>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                className="text-3xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600"
              >
                Clinic Accounts
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="text-sm text-center text-gray-500 max-w-xs"
              >
                Dr. Kabilan's Clinic — Staff Portal
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="mt-6 text-xs text-gray-400"
              >
                {format(new Date(), 'EEEE, d MMMM yyyy')}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Right — PIN login */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center bg-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome back</h1>
              <p className="text-gray-500 mt-1 text-sm">Select your name and enter your PIN</p>
            </div>

            {/* Profile selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <span className={selectedProfile ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                  {selectedProfile?.full_name || 'Select your name…'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                >
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => { setSelectedProfile(p); setDropdownOpen(false); setPin(''); setError(''); }}
                    >
                      <span>{p.full_name}</span>
                      <span className="text-xs capitalize text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{p.role}</span>
                    </button>
                  ))}
                  {!profiles.length && <div className="px-4 py-3 text-sm text-gray-400">Loading…</div>}
                </motion.div>
              )}
            </div>

            {/* PIN dots */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">4-digit PIN</label>
              <div className="flex items-center justify-center gap-4 rounded-xl border border-gray-200 bg-gray-50 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: i < pin.length ? 1.2 : 1 }}
                    transition={{ duration: 0.1 }}
                    className={`h-4 w-4 rounded-full transition-all duration-150 ${
                      i < pin.length ? 'bg-brand-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {keypad.map((k, i) => (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleKey(k)}
                  disabled={k === ''}
                  className={`rounded-xl border py-3.5 text-lg font-semibold transition-all duration-100 ${
                    k === '⌫'
                      ? 'border-red-100 bg-red-50 text-red-500 hover:bg-red-100'
                      : k === ''
                      ? 'invisible'
                      : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
                  }`}
                >
                  {k === '⌫' ? <Delete size={18} className="mx-auto" /> : k}
                </motion.button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-600 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Sign in button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={loading || pin.length !== 4 || !selectedProfile}
              className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow hover:from-brand-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
