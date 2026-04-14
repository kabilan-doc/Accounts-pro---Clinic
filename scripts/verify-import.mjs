import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lines = fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8').split('\n');
for (const line of lines) {
  const [k, ...rest] = line.trim().split('=');
  if (k && !k.startsWith('#')) process.env[k.trim()] = rest.join('=').trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// paginated fetch
let all = [];
let from = 0;
while (true) {
  const { data: page } = await supabase
    .from('account_entries')
    .select('entry_date, entry_type, category, payment_mode, amount')
    .like('description', '[Historical%')
    .order('entry_date')
    .range(from, from + 999);
  if (!page?.length) break;
  all = all.concat(page);
  if (page.length < 1000) break;
  from += 1000;
}

const income  = all.filter(e => e.entry_type === 'income');
const expense = all.filter(e => e.entry_type === 'expense');

const totalIncome  = income.reduce((s, e) => s + Number(e.amount), 0);
const totalExpense = expense.reduce((s, e) => s + Number(e.amount), 0);
const upi  = income.filter(e => e.payment_mode === 'UPI').reduce((s, e) => s + Number(e.amount), 0);
const cash = income.filter(e => e.payment_mode === 'Cash').reduce((s, e) => s + Number(e.amount), 0);

const byCat = {};
for (const e of income) byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount);

const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

console.log('\n📊  Import Verification');
console.log('──────────────────────────────────');
console.log(`Total entries      : ${all.length}`);
console.log(`Income entries     : ${income.length}  →  ${fmt(totalIncome)}`);
console.log(`Expense entries    : ${expense.length}  →  ${fmt(totalExpense)}`);
console.log(`Net balance        : ${fmt(totalIncome - totalExpense)}`);
console.log(`\nPayment mode split:`);
console.log(`  Cash             : ${fmt(cash)}`);
console.log(`  UPI (GPay)       : ${fmt(upi)}`);
console.log(`  Cash+UPI = Total?: ${cash + upi === totalIncome ? '✅ YES' : '❌ NO — diff: ' + fmt(totalIncome - cash - upi)}`);
console.log(`\nIncome by category:`);
for (const [cat, amt] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(22)} : ${fmt(amt)}`);
}
