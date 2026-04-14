/**
 * import-historical.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script to import FY2025 and FY2026 Excel files into Supabase.
 *
 * Usage:
 *   node scripts/import-historical.mjs
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *           npm install (xlsx must be in dependencies)
 *
 * What it does:
 *  1. Reads all xlsx files from "Financial Year 2025/" and "Financial year 2026/"
 *  2. Detects column format per file
 *  3. Converts Excel serial dates → ISO dates
 *  4. Creates account_entries rows in Supabase (skips existing by date+category)
 *  5. Uses the first admin profile as entered_by
 *
 * Payment-mode note:
 *  Historical files show GPAY (UPI) and TOTAL CASH as day-level totals.
 *  Individual category entries cannot be accurately split by payment mode,
 *  so all income categories are recorded as "Cash". A separate "GPay
 *  (historical)" income entry with payment_mode=UPI is created per day
 *  for the GPay amount so that monthly UPI totals are correct.
 *  The cash-category entries are REDUCED by the gpay portion proportionally.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

// ── load env ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found at', envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...rest] = line.trim().split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = rest.join('=').trim();
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Excel serial → ISO date string ───────────────────────────────────────────
function excelSerialToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const ms = Date.UTC(1899, 11, 30) + serial * 86400000;
  return new Date(ms).toISOString().substring(0, 10);
}

// ── format detection ─────────────────────────────────────────────────────────
function detectFormat(header) {
  const h2 = String(header[2] ?? '').toUpperCase();
  const h3 = String(header[3] ?? '').toUpperCase();
  const cols = header.length;

  if (h2.includes('MEDICINE') && h3.includes('NO OF OP')) return 'FY2026';

  if (h2.includes('SALE')) {
    if (cols <= 14) return 'FY2025_A';   // April (14 cols)
    if (cols === 15) return 'FY2025_B';  // May   (15 cols, same layout as A)
    if (cols === 16) return 'FY2025_C';  // June  (16 cols, EXTRA CHARGE added)
    return 'FY2025_D';                   // July+ (17 cols)
  }
  return 'UNKNOWN';
}

// ── column map per format ─────────────────────────────────────────────────────
const COLS = {
  FY2025_A: { date:0, total:2, op:3, inj:4, med:5, gpay:6, exp:7, extra:null, ret:null, cash:10 },
  FY2025_B: { date:0, total:2, op:3, inj:4, med:5, gpay:6, exp:7, extra:null, ret:null, cash:10 },
  FY2025_C: { date:0, total:2, op:3, inj:4, med:5, gpay:6, exp:7, extra:10,  ret:null, cash:11 },
  FY2025_D: { date:0, total:2, op:3, inj:4, med:5, gpay:6, exp:7, extra:9,   ret:11,   cash:12 },
  FY2026:   { date:0, med:2,   op:4, trip:5, total:6, gpay:7, exp:8, extra:10, ret:11, cash:12 },
};

function n(row, col) {
  if (col === null || col === undefined) return 0;
  const v = row[col];
  return typeof v === 'number' ? v : 0;
}

function parseRow(row, fmt) {
  const c = COLS[fmt];
  if (!c) return null;

  const date = excelSerialToISO(row[c.date]);
  if (!date) return null;

  const op      = n(row, c.op);
  const inj     = fmt !== 'FY2026' ? n(row, c.inj) : 0;
  const med     = n(row, c.med);
  const trip    = fmt === 'FY2026' ? n(row, c.trip) : 0;
  const extra   = n(row, c.extra);
  const total   = n(row, c.total);
  const gpay    = n(row, c.gpay);
  const expense = n(row, c.exp);
  const ret     = n(row, c.ret);
  const cash    = n(row, c.cash);

  if (total === 0 && expense === 0) return null;  // blank / holiday

  return { date, op, inj, med, trip, extra, total, gpay, expense, ret, cash, fmt };
}

// ── build entry records from one parsed row ───────────────────────────────────
function buildEntries(row, enteredBy, source) {
  const { date, op, inj, med, trip, extra, total, gpay, expense, ret, fmt } = row;
  const entries = [];
  const desc = `[Historical ${source}]`;

  // GPay is a PAYMENT MODE split (not extra income).
  // We distribute UPI (GPay) proportionally across income categories,
  // and the remainder is Cash.
  const incomeTotal = op + inj + med + trip + extra;
  const gpayRatio   = incomeTotal > 0 && gpay > 0 ? Math.min(gpay / incomeTotal, 1) : 0;
  // mode for each entry: UPI if gpay covers 100%, else Cash for simplicity
  // Accurate split: each category gets proportional UPI/Cash amounts.
  // We record two entries per category only if gpay > 0 — otherwise just Cash.
  function pushIncome(cat, amt, ref) {
    if (amt <= 0) return;
    if (gpayRatio === 0) {
      entries.push({ date, type:'income', cat, mode:'Cash', amt, desc, ref });
    } else {
      const upiAmt  = Math.round(amt * gpayRatio * 100) / 100;
      const cashAmt = Math.round((amt - upiAmt) * 100) / 100;
      if (upiAmt  > 0) entries.push({ date, type:'income', cat, mode:'UPI',  amt: upiAmt,  desc, ref });
      if (cashAmt > 0) entries.push({ date, type:'income', cat, mode:'Cash', amt: cashAmt, desc, ref });
    }
  }

  pushIncome('Consultation',   op,    null);
  pushIncome('Pharmacy Sales', med,   null);
  pushIncome('Procedure',      inj,   'injection');
  pushIncome('Other Income',   trip,  'trip-others');
  pushIncome('Other Income',   extra, 'extra-charge');

  // expense & returns
  if (expense > 0) entries.push({ date, type:'expense', cat:'Miscellaneous', mode:'Cash', amt: expense, desc, ref: null });
  if (ret     > 0) entries.push({ date, type:'expense', cat:'Returns',        mode:'Cash', amt: ret,     desc, ref: null });

  return entries;
}

// ── read all xlsx files from a folder ────────────────────────────────────────
function readFolder(folder, fyLabel) {
  const dir = path.join(rootDir, folder);
  if (!fs.existsSync(dir)) { console.warn('⚠  Folder not found:', dir); return []; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
  const allRows = [];

  for (const file of files) {
    const wb   = XLSX.readFile(path.join(dir, file));
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (!data.length) continue;
    const header = data[0];
    const fmt    = detectFormat(header);

    if (fmt === 'UNKNOWN') { console.warn('⚠  Unknown format:', file); continue; }

    let rowCount = 0;
    for (let i = 1; i < data.length; i++) {
      const parsed = parseRow(data[i], fmt);
      if (!parsed) continue;
      parsed.source = `${fyLabel}/${file.replace('.xlsx','')}`;
      allRows.push(parsed);
      rowCount++;
    }
    console.log(`  ✓ ${file} [${fmt}] → ${rowCount} days`);
  }
  return allRows;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔷  Clinic Historical Data Importer');
  console.log('────────────────────────────────────────');

  // get admin profile
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1);

  if (!admins?.length) {
    console.error('❌  No admin profile found. Run supabase-setup.sql first and create an admin user.');
    process.exit(1);
  }
  const enteredBy = admins[0].id;
  console.log('✓ Using admin profile:', enteredBy);

  // read files
  console.log('\n📂  Reading FY2025 files...');
  const rows2025 = readFolder('Financial Year 2025', 'FY2025');

  console.log('\n📂  Reading FY2026 files...');
  const rows2026 = readFolder('Financial year 2026', 'FY2026');

  const allRows = [...rows2025, ...rows2026];
  console.log(`\n📊  Total days parsed: ${allRows.length}`);

  // check for existing entries (by date range) to avoid duplicates
  const dates = allRows.map(r => r.date).filter(Boolean);
  const minDate = dates.sort()[0];
  const maxDate = dates.sort().at(-1);

  // fetch ALL existing historical entries (paginated to bypass 1000-row limit)
  let existing = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: page } = await supabase
      .from('account_entries')
      .select('entry_date, category, payment_mode, description')
      .gte('entry_date', minDate)
      .lte('entry_date', maxDate)
      .like('description', '[Historical%')
      .range(from, from + PAGE - 1);
    if (!page?.length) break;
    existing = existing.concat(page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  // key includes payment_mode so Cash and UPI entries are both tracked
  const existingKeys = new Set(
    existing.map(e => `${e.entry_date}|${e.category}|${e.payment_mode}`)
  );
  console.log(`  (${existingKeys.size} already-imported entries found — will skip)`);

  // build and deduplicate entries
  const toInsert = [];
  for (const row of allRows) {
    const entries = buildEntries(row, enteredBy, row.source);
    for (const e of entries) {
      const key = `${e.date}|${e.cat}|${e.mode}`;
      if (existingKeys.has(key)) continue;
      toInsert.push({
        entry_date:       e.date,
        entry_type:       e.type,
        category:         e.cat,
        subcategory:      e.ref || null,
        payment_mode:     e.mode,
        amount:           e.amt,
        description:      e.desc,
        reference_number: null,
        entered_by:       enteredBy,
        is_voided:        false,
        created_at:       new Date().toISOString()
      });
      existingKeys.add(key); // prevent dupe within this run
    }
  }

  console.log(`\n🚀  Inserting ${toInsert.length} entries into Supabase...`);

  // batch insert (Supabase recommends ≤1000 per request)
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('account_entries').insert(batch);
    if (error) {
      console.error(`❌  Batch ${i / BATCH + 1} failed:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`  ✓ ${inserted}/${toInsert.length}\r`);
    }
  }

  console.log(`\n\n✅  Import complete. ${inserted} entries inserted.`);
  console.log('   Open /historical in the app to see month-wise analytics.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
