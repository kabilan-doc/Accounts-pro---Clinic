# Clinic Accounts & Financial Analytics

A full-stack clinic accounts management system built with **Next.js 14 App Router**, **Supabase (PostgreSQL)**, **Tailwind CSS**, **Recharts**, and **Twilio WhatsApp API**. Deployable to Vercel with a single click.

---

## Features

| Feature | Details |
|---|---|
| PIN-based login | ATM-style 4-digit pad, account lockout after 5 failures |
| Admin override | Email + PIN mode for admin accounts |
| Daily entry form | Income / Expense with category, payment mode, description |
| Void instead of delete | Soft-delete with void reason + audit trail |
| Dashboard | Real-time summary cards + 4 Recharts charts |
| History | Paginated ledger with filters, void action, CSV/PDF export |
| Analytics | Date-range selector + 6 chart panels + key metrics |
| Audit log | Append-only diff viewer (old/new value per field) |
| Admin panel | User management, category management, WhatsApp trigger |
| WhatsApp report | Nightly 11 PM IST summary via Twilio + Vercel Cron |
| Mobile nav | Fixed bottom tab bar on screens < 768 px |
| IST timezone | All dates/times shown in Asia/Kolkata |
| Indian currency | ₹1,00,000 format throughout |

---

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Custom PIN/bcrypt + httpOnly cookie session
- **Styling**: Tailwind CSS (custom brand palette)
- **Charts**: Recharts
- **WhatsApp**: Twilio WhatsApp Business API
- **Cron**: Vercel Cron Jobs
- **Deployment**: Vercel

---

## Prerequisites

1. [Node.js 18+](https://nodejs.org/)
2. [Supabase account](https://supabase.com) (free tier works)
3. [Twilio account](https://twilio.com) with WhatsApp sandbox or Business API
4. [Vercel account](https://vercel.com) for deployment

---

## 1. Supabase Setup

### 1.1 Create a new Supabase project

Go to [supabase.com](https://supabase.com) → New Project. Note your **Project URL** and **anon key** (Settings → API).

### 1.2 Run the schema SQL

1. Open your project → **SQL Editor** → **New query**
2. Paste the full contents of [`supabase-setup.sql`](./supabase-setup.sql)
3. Before running, generate a real bcrypt hash for the admin PIN `0000`:

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('0000', 12));"
```

4. Replace `REPLACE_THIS_WITH_A_REAL_BCRYPT_HASH_OF_0000` in the SQL with the hash
5. Click **Run**

### 1.3 Verify tables

You should see 5 tables: `profiles`, `categories_master`, `account_entries`, `audit_log`, `daily_summary_log`.

---

## 2. Environment Variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role (keep secret!)

# Session
SESSION_SECRET=a-long-random-string-at-least-32-chars

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_RECIPIENTS=whatsapp:+919876543210,whatsapp:+919876543211

# Cron security
CRON_SECRET=another-long-random-secret

# Clinic name
NEXT_PUBLIC_CLINIC_NAME=Dr. Kabilan's Clinic
```

---

## 3. Twilio WhatsApp Setup

### Option A — Sandbox (for testing)

1. Twilio Console → Messaging → Try WhatsApp
2. Send the join code from your phone to the Twilio sandbox number
3. Use `whatsapp:+14155238886` as `TWILIO_WHATSAPP_FROM`
4. Add your phone as `WHATSAPP_RECIPIENTS=whatsapp:+91XXXXXXXXXX`

### Option B — WhatsApp Business API (production)

1. Twilio Console → Messaging → Senders → WhatsApp → Apply for Business profile
2. Once approved, use your dedicated number as `TWILIO_WHATSAPP_FROM`

---

## 4. Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**First login:**
- Click "Admin mode" toggle on the login page
- Enter `admin@clinic.com` (or any email — the system matches on email field in profiles)
- PIN: `0000`

> **Important**: Change the admin PIN immediately after first login via Admin → Staff Accounts → Reset PIN.

---

## 5. Vercel Deployment

### 5.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourname/clinic-accounts.git
git push -u origin main
```

### 5.2 Import to Vercel

1. [vercel.com/new](https://vercel.com/new) → Import your GitHub repo
2. Framework: **Next.js** (auto-detected)
3. Add all environment variables from `.env.local`
4. Deploy

### 5.3 Cron job

`vercel.json` already configures the cron:

```json
{
  "crons": [{ "path": "/api/cron/daily-report", "schedule": "30 17 * * *" }]
}
```

`17:30 UTC` = `23:00 IST`. The cron runs automatically on Vercel Pro/Hobby plans.

To test manually: Vercel Dashboard → Functions → Cron Jobs → Trigger.

---

## 6. Security Notes

- PINs are bcrypt-hashed (cost 12) and never stored plain text
- Sessions are httpOnly cookies signed with HMAC-SHA256
- All writes go through server-side API routes; client never touches DB directly
- Supabase RLS denies all direct client writes as a second layer
- Audit log is append-only; no UPDATE or DELETE permitted
- `/audit` and `/admin` routes require `role = 'admin'`; enforced in both middleware and API

---

## 7. Page Reference

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing → redirects to `/login` |
| `/login` | Public | PIN pad / Admin email+PIN |
| `/dashboard` | All staff | Summary cards + 4 charts + date table |
| `/entry` | All staff | New income/expense entry form |
| `/history` | All staff | Paginated ledger, filters, export, void |
| `/analytics` | All staff | Date-range charts + key metrics |
| `/audit` | Admin only | Append-only audit log with diff viewer |
| `/admin` | Admin only | User management + categories + WhatsApp |

---

## 8. WhatsApp Message Format

```
📊 *Dr. Kabilan's Clinic — Daily Summary*
📅 Date: 11 Apr 2026

💰 *INCOME*
• Consultation: ₹4,500
• Pharmacy: ₹2,300
• Total Income: ₹6,800

💸 *EXPENSES*
• Supplies: ₹1,200
• Total Expenses: ₹1,200

✅ *Net Balance: ₹5,600*

💳 *Payment Breakdown*
• Cash: ₹4,000
• UPI: ₹2,800

📝 Total Entries: 18
_Sent automatically at 11:00 PM_
```

---

## 9. Database Schema (summary)

```
profiles              — staff accounts, bcrypt PIN hashes, lockout
categories_master     — income/expense category list
account_entries       — every income/expense transaction
audit_log             — append-only change log (old + new JSON)
daily_summary_log     — nightly WhatsApp report log
```

Full schema with RLS and triggers: [`supabase-setup.sql`](./supabase-setup.sql)

---

## 10. Folder Structure

```
app/
  login/         — PIN pad + admin login
  dashboard/     — summary + charts
  entry/         — new entry form
  history/       — paginated ledger + void
  analytics/     — date-range analytics
  audit/         — audit log (admin)
  admin/         — user/category management (admin)
  api/
    auth/pin-login/     — bcrypt PIN verification
    dashboard/          — aggregated stats
    entries/            — GET (paginated) + POST
    entries/[id]/void/  — soft-delete with reason
    audit/              — audit log read
    categories/         — public category list
    admin/users/        — user CRUD (admin)
    admin/categories/   — category CRUD (admin)
    export/csv/         — filtered CSV download
    export/pdf/         — formatted PDF export
    cron/daily-report/  — WhatsApp nightly report

components/
  Sidebar.tsx         — desktop left nav
  BottomNav.tsx       — mobile bottom tab bar
  SummaryCard.tsx     — metric card
  EntryForm.tsx       — income/expense entry form
  EntryTable.tsx      — paginated table + void modal
  DateSummaryTable.tsx — date-wise summary
  AccountCharts.tsx   — Recharts chart library
  AuditTable.tsx      — audit log with diff view

lib/
  supabase.ts         — client-side Supabase client
  supabaseAdmin.ts    — server-side service-role client
  auth.ts             — bcrypt + session token helpers
  auditLogger.ts      — server-side audit writer
  whatsapp.ts         — Twilio WhatsApp sender
  formatCurrency.ts   — ₹ Indian number format
  dateUtils.ts        — IST timezone helpers
  sessionHelpers.ts   — cookie → session parser
```

---

## 11. Troubleshooting

| Issue | Fix |
|---|---|
| Login says "User not found" | Check profiles table has an active admin row |
| Charts blank | Check `/api/dashboard` returns 200 in browser Network tab |
| WhatsApp not sending | Verify Twilio credentials and sandbox join |
| Cron not running | Vercel Hobby plan supports 1 cron job; Pro plan for more |
| `brand-600` missing | Tailwind config now includes full palette; rebuild |
| `date-fns-tz` error | Move from devDependencies to dependencies in package.json |
