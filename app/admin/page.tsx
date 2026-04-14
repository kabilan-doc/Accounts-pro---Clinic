'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import {
  UserPlus, RefreshCw, CheckCircle2, XCircle, Lock, Unlock, Edit2, Trash2, Send, X
} from 'lucide-react';

interface UserRow {
  id: string;
  full_name: string;
  role: string;
  phone_number: string | null;
  is_active: boolean;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function Badge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700"><CheckCircle2 size={11}/> Active</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600"><XCircle size={11}/> Inactive</span>;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  // ── users ─────────────────────────────────────────────────────────────
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError,   setUserError]   = useState('');

  const [newName,    setNewName]    = useState('');
  const [newRole,    setNewRole]    = useState('staff');
  const [newPin,     setNewPin]     = useState('');
  const [newPhone,   setNewPhone]   = useState('');
  const [creating,   setCreating]   = useState(false);
  const [createMsg,  setCreateMsg]  = useState('');

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPin,    setResetPin]    = useState('');
  const [resetMsg,    setResetMsg]    = useState('');

  // edit profile modal
  const [editTarget,  setEditTarget]  = useState<UserRow | null>(null);
  const [editName,    setEditName]    = useState('');
  const [editRole,    setEditRole]    = useState('');
  const [editPhone,   setEditPhone]   = useState('');
  const [editPin,     setEditPin]     = useState('');
  const [editSaving,  setEditSaving]  = useState(false);
  const [editMsg,     setEditMsg]     = useState('');

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── categories ────────────────────────────────────────────────────────
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [catsLoading,  setCatsLoading]  = useState(true);
  const [catError,     setCatError]     = useState('');

  const [newCatName,   setNewCatName]   = useState('');
  const [newCatType,   setNewCatType]   = useState('income');
  const [catCreating,  setCatCreating]  = useState(false);
  const [catMsg,       setCatMsg]       = useState('');

  // ── whatsapp test ─────────────────────────────────────────────────────
  const [waLoading, setWaLoading] = useState(false);
  const [waMsg,     setWaMsg]     = useState('');

  // ── load ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsersLoading(true); setUserError('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const d = await res.json();
      setUsers(d.users ?? []);
    } catch (e) { setUserError(e instanceof Error ? e.message : 'Error'); }
    finally { setUsersLoading(false); }
  }, []);

  const loadCategories = useCallback(async () => {
    setCatsLoading(true); setCatError('');
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const d = await res.json();
      setCategories(d.categories ?? []);
    } catch (e) { setCatError(e instanceof Error ? e.message : 'Error'); }
    finally { setCatsLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); loadCategories(); }, [loadUsers, loadCategories]);

  // ── user CRUD ─────────────────────────────────────────────────────────
  const createUser = async () => {
    if (!newName || !newPin) { setCreateMsg('Name and PIN required.'); return; }
    setCreating(true); setCreateMsg('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ full_name: newName, role: newRole, pin: newPin, phone_number: newPhone || null })
    });
    const d = await res.json();
    if (!res.ok) { setCreateMsg(d.message || 'Failed to create user.'); }
    else { setCreateMsg('User created.'); setNewName(''); setNewPin(''); setNewPhone(''); loadUsers(); }
    setCreating(false);
  };

  const toggleActive = async (user: UserRow) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active })
    });
    loadUsers();
  };

  const resetPinSubmit = async () => {
    if (!resetTarget || !resetPin) { setResetMsg('Enter new PIN.'); return; }
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: resetTarget.id, new_pin: resetPin })
    });
    const d = await res.json();
    if (!res.ok) { setResetMsg(d.message || 'Failed.'); }
    else { setResetMsg('PIN reset.'); setResetTarget(null); setResetPin(''); loadUsers(); }
  };

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setEditName(u.full_name);
    setEditRole(u.role);
    setEditPhone(u.phone_number ?? '');
    setEditPin('');
    setEditMsg('');
  };

  const saveEdit = async () => {
    if (!editTarget || !editName) { setEditMsg('Name is required.'); return; }
    if (editPin && !/^\d{4}$/.test(editPin)) { setEditMsg('PIN must be 4 digits.'); return; }
    setEditSaving(true); setEditMsg('');
    const body: Record<string, unknown> = {
      id: editTarget.id,
      full_name: editName,
      role: editRole,
      phone_number: editPhone || null,
    };
    if (editPin) body.new_pin = editPin;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) { setEditMsg(d.message || 'Save failed.'); }
    else { setEditTarget(null); loadUsers(); }
    setEditSaving(false);
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { setDeleteTarget(null); loadUsers(); }
    else {
      const d = await res.json();
      alert(d.message || 'Delete failed.');
    }
    setDeleting(false);
  };

  // ── category CRUD ─────────────────────────────────────────────────────
  const createCategory = async () => {
    if (!newCatName) { setCatMsg('Name required.'); return; }
    setCatCreating(true); setCatMsg('');
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newCatName, type: newCatType })
    });
    const d = await res.json();
    if (!res.ok) { setCatMsg(d.message || 'Failed.'); }
    else { setCatMsg('Category created.'); setNewCatName(''); loadCategories(); }
    setCatCreating(false);
  };

  const toggleCategory = async (cat: Category) => {
    await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: cat.id, is_active: !cat.is_active })
    });
    loadCategories();
  };

  // ── whatsapp test ─────────────────────────────────────────────────────
  const triggerReport = async () => {
    setWaLoading(true); setWaMsg('');
    const res = await fetch('/api/cron/daily-report', {
      method: 'POST',
      headers: { 'x-cron-secret': '' }  // server-side only — will fail from browser intentionally
    });
    setWaMsg(res.ok ? 'Report triggered successfully.' : 'Trigger failed — use Vercel dashboard to run cron manually.');
    setWaLoading(false);
  };

  return (
    <div className="w-full px-4 py-6">
      <div className="grid gap-4 xl:grid-cols-[288px_1fr]">
        <Sidebar active="/admin" />

        <section className="space-y-8 pb-24">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-600">Administration</p>
            <h1 className="text-3xl font-semibold text-slate-900">User & Category Management</h1>
          </div>

          {/* ── staff accounts ── */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Staff Accounts</h2>
              <button type="button" onClick={loadUsers}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {userError && <p className="text-sm text-red-600">{userError}</p>}

            {/* user list */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {usersLoading && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
                  )}
                  {!usersLoading && users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{u.role}</td>
                      <td className="px-4 py-3 text-slate-500">{u.phone_number ?? '—'}</td>
                      <td className="px-4 py-3"><Badge active={u.is_active} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => toggleActive(u)}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100">
                            {u.is_active ? <Lock size={14}/> : <Unlock size={14}/>}
                          </button>
                          <button type="button" onClick={() => openEdit(u)}
                            title="Edit profile"
                            className="rounded-lg border border-blue-200 p-1.5 text-blue-600 hover:bg-blue-50">
                            <Edit2 size={14}/>
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(u)}
                            title="Delete user"
                            className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* create user form */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserPlus size={16}/> Add new staff
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <input placeholder="4-digit PIN" value={newPin} maxLength={4}
                  onChange={e => setNewPin(e.target.value.replace(/\D/, ''))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input placeholder="Phone (for WhatsApp)" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <button type="button" onClick={createUser} disabled={creating}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {creating ? 'Creating…' : 'Create User'}
              </button>
              {createMsg && <p className="text-sm text-slate-600">{createMsg}</p>}
            </div>
          </div>

          {/* ── categories ── */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
              <button type="button" onClick={loadCategories}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                <RefreshCw size={13}/> Refresh
              </button>
            </div>

            {catError && <p className="text-sm text-red-600">{catError}</p>}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catsLoading && <p className="text-sm text-slate-400">Loading…</p>}
              {!catsLoading && categories.map(cat => (
                <div key={cat.id} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${cat.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{cat.type}</p>
                  </div>
                  <button type="button" onClick={() => toggleCategory(cat)}
                    className="text-xs text-slate-500 hover:text-brand-600 underline">
                    {cat.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Add category</h3>
              <div className="flex flex-wrap gap-3">
                <input placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm min-w-[160px]" />
                <select value={newCatType} onChange={e => setNewCatType(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="both">Both</option>
                </select>
                <button type="button" onClick={createCategory} disabled={catCreating}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {catCreating ? 'Adding…' : 'Add'}
                </button>
              </div>
              {catMsg && <p className="text-sm text-slate-600">{catMsg}</p>}
            </div>
          </div>

          {/* ── whatsapp report ── */}
          <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">WhatsApp Report</h2>
            <p className="text-sm text-slate-500">
              Nightly report is sent automatically at 11:00 PM IST via Vercel Cron.
              Recipients are configured in the <code className="rounded bg-slate-100 px-1">WHATSAPP_RECIPIENTS</code> environment variable.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium">Configured recipients:</p>
              <p className="mt-1 font-mono text-xs">{process.env.NEXT_PUBLIC_WA_RECIPIENTS ?? '(set WHATSAPP_RECIPIENTS in .env.local)'}</p>
            </div>
            <button type="button" onClick={triggerReport} disabled={waLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              <Send size={15}/> {waLoading ? 'Sending…' : 'Send Test Report Now'}
            </button>
            {waMsg && <p className="text-sm text-slate-600">{waMsg}</p>}
          </div>
        </section>
      </div>

      {/* reset PIN modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Reset PIN — {resetTarget.full_name}</h3>
            <input
              placeholder="New 4-digit PIN"
              value={resetPin}
              maxLength={4}
              onChange={e => setResetPin(e.target.value.replace(/\D/, ''))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            {resetMsg && <p className="text-sm text-slate-600">{resetMsg}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setResetTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={resetPinSubmit}
                className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                Reset PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit Profile</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="rounded-xl p-1.5 hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Full Name *</span>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Role</span>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Phone</span>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">New PIN <span className="text-slate-400">(leave blank to keep current)</span></span>
                <input value={editPin} onChange={e => setEditPin(e.target.value.replace(/\D/, ''))}
                  maxLength={4} placeholder="4 digits"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            {editMsg && <p className="text-sm text-red-600">{editMsg}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={editSaving}
                className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Delete User?</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.full_name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={deleteUser} disabled={deleting}
                className="flex-1 rounded-2xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="/admin" />
    </div>
  );
}
