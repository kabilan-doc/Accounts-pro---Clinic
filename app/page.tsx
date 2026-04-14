import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 text-center">
      <div className="max-w-2xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-xl">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-700">Clinic Accounting</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Dr. Kabilan's Clinic</h1>
            <p className="mt-3 text-slate-600">A clinic accounts and financial analytics system with PIN-based staff login, audit trails, and nightly WhatsApp summaries.</p>
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-left text-slate-600">Ready to manage clinic income and expenses?</p>
            <Link href="/login" className="inline-flex w-full justify-center rounded-2xl bg-brand-600 px-5 py-3 text-white hover:bg-brand-700">Go to Login</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
