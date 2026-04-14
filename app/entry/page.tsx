import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { EntryForm } from '@/components/EntryForm';

export default function EntryPage() {
  return (
    <div className="container py-10">
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Sidebar active="/entry" />
        <section className="space-y-6 pb-24">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-700">Daily Entry</p>
              <h1 className="text-3xl font-semibold text-slate-900">New Account Entry</h1>
            </div>
            <div className="rounded-3xl bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-500">Auto-saves to Supabase</p>
            </div>
          </div>

          <EntryForm />

          <div className="card">
            <p className="text-sm font-medium text-slate-700">Today's recent entries</p>
            <div className="mt-4 text-slate-500">Staff view: own entries, admin sees all entries from today.</div>
          </div>
        </section>
      </div>
      <BottomNav active="/entry" />
    </div>
  );
}
