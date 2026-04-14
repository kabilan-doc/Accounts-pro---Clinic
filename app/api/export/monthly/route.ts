import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import * as XLSX from 'xlsx';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year  = url.searchParams.get('year');
  const month = url.searchParams.get('month');  // 1-12

  if (!year || !month) {
    return NextResponse.json({ message: 'year and month params required' }, { status: 400 });
  }

  const m   = Number(month);
  const y   = Number(year);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endMonth  = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const { data: entries, error } = await supabaseAdmin
    .from('account_entries')
    .select('entry_date, entry_type, category, subcategory, payment_mode, amount, description, reference_number, is_voided')
    .gte('entry_date', startDate)
    .lt('entry_date',  endMonth)
    .order('entry_date', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows = entries ?? [];

  // ── aggregate by date for the FY2026-style summary sheet ──────────────────
  const dateMap: Record<string, {
    medicine: number; op: number; trip: number; extra: number;
    totalSales: number; gpay: number; expense: number;
    totalCash: number; return_amt: number; notes: string[];
    entries: typeof rows;
  }> = {};

  for (const e of rows) {
    if (!dateMap[e.entry_date]) {
      dateMap[e.entry_date] = {
        medicine: 0, op: 0, trip: 0, extra: 0,
        totalSales: 0, gpay: 0, expense: 0,
        totalCash: 0, return_amt: 0, notes: [], entries: []
      };
    }
    const d = dateMap[e.entry_date];
    d.entries.push(e);
    if (e.is_voided) continue;
    const amt = Number(e.amount);
    if (e.entry_type === 'income') {
      d.totalSales += amt;
      if (e.payment_mode === 'UPI') d.gpay += amt;
      else d.totalCash += amt;
      if (e.category === 'Pharmacy Sales')  d.medicine += amt;
      else if (e.category === 'Consultation') d.op += amt;
      else if (e.category === 'Other Income' && e.subcategory === 'trip-others') d.trip += amt;
      else if (e.category === 'Other Income' && e.subcategory === 'extra-charge') d.extra += amt;
    } else {
      d.expense += amt;
    }
    if (e.description && !e.description.startsWith('[Historical')) {
      d.notes.push(e.description);
    }
  }

  // ── Sheet 1: Daily Summary (FY2026 format) ────────────────────────────────
  const summaryRows: (string | number)[][] = [];
  summaryRows.push([
    'DATE','DAY','TOTAL MEDICINE SALES','NO OF OP','TOTAL OP CHARGES',
    'TRIP AND OTHERS','TOTAL SALES','GPAY','EXPENSE','GPAY & EXPENSE',
    'EXTRA CHARGE','RETURN','TOTAL CASH','EXCESS/DEFECIT','NOTES'
  ]);

  const sortedDates = Object.keys(dateMap).sort();
  for (const dateStr of sortedDates) {
    const d = dateMap[dateStr];
    const jsDate = new Date(dateStr + 'T12:00:00');
    const day = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][jsDate.getDay()];
    const gpayExp = d.gpay + d.expense;
    const excess  = d.totalCash - d.expense;
    summaryRows.push([
      dateStr, day, d.medicine, 0, d.op, d.trip, d.totalSales,
      d.gpay, d.expense, gpayExp, d.extra, d.return_amt, d.totalCash,
      excess, d.notes.join('; ')
    ]);
  }

  // totals row
  if (sortedDates.length) {
    const tot = sortedDates.reduce((acc, dt) => {
      const d = dateMap[dt];
      return {
        medicine: acc.medicine + d.medicine,
        op: acc.op + d.op,
        trip: acc.trip + d.trip,
        totalSales: acc.totalSales + d.totalSales,
        gpay: acc.gpay + d.gpay,
        expense: acc.expense + d.expense,
        extra: acc.extra + d.extra,
        totalCash: acc.totalCash + d.totalCash
      };
    }, { medicine: 0, op: 0, trip: 0, totalSales: 0, gpay: 0, expense: 0, extra: 0, totalCash: 0 });

    summaryRows.push([
      'TOTAL', '', tot.medicine, '', tot.op, tot.trip, tot.totalSales,
      tot.gpay, tot.expense, tot.gpay + tot.expense, tot.extra, '',
      tot.totalCash, tot.totalSales - tot.expense, ''
    ]);
  }

  // ── Sheet 2: All Entries (detailed) ────────────────────────────────────────
  const detailRows: (string | number | boolean)[][] = [[
    'Date','Type','Category','Sub-category','Payment Mode','Amount','Description','Reference','Voided'
  ]];
  for (const e of rows) {
    detailRows.push([
      e.entry_date, e.entry_type, e.category, e.subcategory ?? '',
      e.payment_mode, Number(e.amount), e.description ?? '',
      e.reference_number ?? '', e.is_voided ? 'Yes' : 'No'
    ]);
  }

  // ── build workbook ─────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  // style header row bold (basic)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Summary');

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'All Entries');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const filename = `clinic-${MONTH_NAMES[m - 1]}-${y}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
