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

const { error } = await supabase
  .from('account_entries')
  .delete()
  .like('description', '[Historical%');

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
} else {
  console.log('✅ All historical entries deleted.');
}
