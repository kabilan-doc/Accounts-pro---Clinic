'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileOption {
  id: string;
  full_name: string;
  role: 'admin' | 'staff';
}

const defaultProfiles: ProfileOption[] = [];

export default function LoginPage() {
  const [profiles, setProfiles] = useState<ProfileOption[]>(defaultProfiles);
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(null);
  const [pin, setPin] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadProfiles() {
      try {
        const res = await fetch('/api/profiles');
        if (res.ok) {
          const data = await res.json();
          setProfiles(data.profiles || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadProfiles();
  }, []);

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const handleKeyPress = (value: string) => {
    if (pin.length >= 4) return;
    setPin(prev => prev + value);
  };

  const handleSubmit = async () => {
    setError('');
    if (!adminMode && !selectedProfile) {
      setError('Select your name.');
      return;
    }
    if (pin.length !== 4) {
      setError('Enter a 4-digit PIN.');
      return;
    }
    setLoading(true);
    try {
      const body = adminMode ? { admin: true, pin } : { id: selectedProfile?.id, pin };
      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result?.message || 'Login failed.');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 px-4 py-10 sm:px-6">
      <div className="w-full max-w-2xl animate-slideUp rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-md">
            <span className="text-2xl font-bold text-white">K</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Dr. Kabilan's Clinic</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Staff Login</h1>
          <p className="mt-1 text-sm text-slate-500">Select your name and enter your 4-digit PIN.</p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">User</label>
              <div className="relative">
                <button
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left"
                  type="button"
                  onClick={() => setDropdownOpen(prev => !prev)}
                >
                  <span>{selectedProfile?.full_name || 'Select your name'}</span>
                  <ChevronDown size={18} />
                </button>
                {dropdownOpen && (
                  <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg">
                    {profiles.map(profile => (
                      <button
                        key={profile.id}
                        type="button"
                        className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedProfile(profile);
                          setDropdownOpen(false);
                        }}
                      >
                        {profile.full_name}
                      </button>
                    ))}
                    {!profiles.length && <div className="px-4 py-3 text-sm text-slate-500">Loading staff...</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-700"
                onClick={() => setAdminMode(prev => !prev)}
              >
                {adminMode ? '🔐 Admin PIN mode' : 'Staff PIN login'}
              </button>
            </div>
          </div>

          {adminMode && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Admin mode — enter your 4-digit admin PIN below.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">4-digit PIN</label>
            <div className="flex h-14 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition-all duration-150 ${
                    i < pin.length
                      ? 'scale-110 bg-brand-600'
                      : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {keypad.map(item => (
              <button
                key={item}
                type="button"
                className="rounded-xl border border-slate-200 bg-slate-50 py-4 text-xl font-semibold text-slate-900 transition-all duration-100 hover:bg-slate-100 active:scale-95 active:bg-slate-200"
                onClick={() => handleKeyPress(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setPin('')}
            >
              Clear
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-sm text-slate-500">{format(new Date(), 'eeee, d MMMM yyyy')}</p>
        </div>
      </div>
    </main>
  );
}
