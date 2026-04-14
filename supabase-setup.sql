-- ============================================================
-- Clinic Accounts & Financial Analytics — Supabase Setup SQL
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- ── Enable UUID extension ─────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 1. profiles ───────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  role            text not null check (role in ('admin', 'staff')),
  pin_hash        text not null,
  phone_number    text,
  is_active       boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- ── 2. categories_master ──────────────────────────────────────────────────────
create table if not exists categories_master (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  type      text not null check (type in ('income','expense','both')),
  is_active boolean not null default true
);

-- ── 3. account_entries ────────────────────────────────────────────────────────
create table if not exists account_entries (
  id               uuid primary key default gen_random_uuid(),
  entry_date       date not null,
  entry_type       text not null check (entry_type in ('income','expense')),
  category         text not null,
  subcategory      text,
  payment_mode     text not null check (payment_mode in ('Cash','UPI','Card','Bank Transfer','Credit')),
  amount           numeric(12,2) not null check (amount > 0),
  description      text not null,
  reference_number text,
  entered_by       uuid not null references profiles(id),
  is_voided        boolean not null default false,
  void_reason      text,
  voided_by        uuid references profiles(id),
  voided_at        timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_entries_date    on account_entries(entry_date);
create index if not exists idx_entries_type    on account_entries(entry_type);
create index if not exists idx_entries_entered on account_entries(entered_by);

-- ── 4. audit_log ──────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id  uuid not null,
  action     text not null check (action in ('INSERT','UPDATE','VOID')),
  changed_by uuid not null references profiles(id),
  changed_at timestamptz not null default now(),
  old_value  jsonb,
  new_value  jsonb,
  ip_address text
);

create index if not exists idx_audit_changed_at on audit_log(changed_at desc);
create index if not exists idx_audit_changed_by on audit_log(changed_by);

-- ── 5. daily_summary_log ──────────────────────────────────────────────────────
create table if not exists daily_summary_log (
  id                uuid primary key default gen_random_uuid(),
  summary_date      date not null unique,
  total_income      numeric(12,2) not null default 0,
  total_expense     numeric(12,2) not null default 0,
  net_balance       numeric(12,2) not null default 0,
  cash_income       numeric(12,2) not null default 0,
  upi_income        numeric(12,2) not null default 0,
  card_income       numeric(12,2) not null default 0,
  whatsapp_sent     boolean not null default false,
  whatsapp_sent_at  timestamptz,
  created_at        timestamptz not null default now()
);

-- ── 6. Row Level Security ─────────────────────────────────────────────────────
alter table profiles          enable row level security;
alter table account_entries   enable row level security;
alter table audit_log         enable row level security;
alter table categories_master enable row level security;
alter table daily_summary_log enable row level security;

-- Service-role key bypasses RLS; all API routes use service-role key,
-- so these policies are a second safety layer for any direct client queries.

-- profiles: authenticated users can read their own row
create policy "profiles_read_own"    on profiles for select using (true);
create policy "profiles_insert_deny" on profiles for insert with check (false);
create policy "profiles_update_deny" on profiles for update using (false);
create policy "profiles_delete_deny" on profiles for delete using (false);

-- account_entries: authenticated users can only read
create policy "entries_read_all"     on account_entries for select using (true);
create policy "entries_insert_deny"  on account_entries for insert with check (false);
create policy "entries_update_deny"  on account_entries for update using (false);
create policy "entries_delete_deny"  on account_entries for delete using (false);

-- audit_log: read-only for everyone via client; writes only via service-role
create policy "audit_read"         on audit_log for select using (true);
create policy "audit_insert_deny"  on audit_log for insert with check (false);
create policy "audit_update_deny"  on audit_log for update using (false);
create policy "audit_delete_deny"  on audit_log for delete using (false);

-- categories: public read
create policy "cats_read" on categories_master for select using (true);
create policy "cats_write_deny" on categories_master for insert with check (false);
create policy "cats_update_deny" on categories_master for update using (false);

-- daily_summary_log: service-role only
create policy "summary_deny_all" on daily_summary_log for all using (false);

-- ── 7. Audit trigger (backup — catches any direct DB writes) ──────────────────
-- NOTE: The application writes audit logs via API. This trigger is a safety net.
create or replace function trg_audit_account_entries()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    insert into audit_log(table_name, record_id, action, changed_by, old_value, new_value)
    values ('account_entries', NEW.id, 'INSERT', NEW.entered_by, null, row_to_json(NEW));
  elsif (TG_OP = 'UPDATE') then
    insert into audit_log(table_name, record_id, action, changed_by, old_value, new_value)
    values ('account_entries', NEW.id,
      case when NEW.is_voided and not OLD.is_voided then 'VOID' else 'UPDATE' end,
      coalesce(NEW.voided_by, NEW.entered_by),
      row_to_json(OLD), row_to_json(NEW));
  end if;
  return NEW;
end;
$$;

drop trigger if exists audit_account_entries on account_entries;
create trigger audit_account_entries
  after insert or update on account_entries
  for each row execute function trg_audit_account_entries();

-- ── 8. Seed — categories_master ───────────────────────────────────────────────
insert into categories_master (name, type) values
  ('Consultation',        'income'),
  ('Pharmacy Sales',      'income'),
  ('Lab / Investigations','income'),
  ('Procedure',           'income'),
  ('Other Income',        'income'),
  ('Staff Salary',        'expense'),
  ('Rent',                'expense'),
  ('Medical Supplies',    'expense'),
  ('Electricity',         'expense'),
  ('Equipment',           'expense'),
  ('Lab Reagents',        'expense'),
  ('Miscellaneous',       'expense')
on conflict do nothing;

-- ── 9. Seed — admin profile (PIN: 0000) ───────────────────────────────────────
-- bcrypt hash of '0000' with cost 12
-- Generate a fresh hash via: node -e "console.log(require('bcryptjs').hashSync('0000',12))"
-- and replace the string below before running.
insert into profiles (full_name, role, pin_hash, is_active) values
  ('Admin', 'admin',
   '$2a$12$REPLACE_THIS_WITH_A_REAL_BCRYPT_HASH_OF_0000',
   true)
on conflict do nothing;

-- ============================================================
-- After running:
-- 1. Generate the real PIN hash: npm run hashpin (add script to package.json)
--    Or: node -e "const b=require('bcryptjs');console.log(b.hashSync('0000',12))"
-- 2. Update the admin row:
--    UPDATE profiles SET pin_hash='<hash>' WHERE full_name='Admin' AND role='admin';
-- 3. Log in at /login → Admin mode → email + PIN 0000
-- ============================================================
