/**
 * Full-fidelity import system matching the export format.
 * Supports: Clients, Memberships, Payments, Product Purchases, Expenses sheets.
 * Also supports single-sheet exports (auto-detect).
 * Uses upsert to handle both new and existing records.
 */
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';

export type ImportableSheet = 'Clients' | 'Memberships' | 'Payments' | 'Product Purchases' | 'Expenses';

export interface ImportResult {
  sheet: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ── Helpers ──────────────────────────────────────────────

function parseCurrency(val: string | number | null | undefined): number {
  if (val == null) return 0;
  const str = String(val).replace(/[₹,\s]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // dd MMM yyyy (e.g. "05 Mar 2026")
  const parts = str.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (parts) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const m = months[parts[2]];
    if (m) return `${parts[3]}-${m}-${parts[1].padStart(2, '0')}`;
  }
  // dd MMM yyyy HH:mm
  const dtParts = str.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})\s+\d{2}:\d{2}$/);
  if (dtParts) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const m = months[dtParts[2]];
    if (m) return `${dtParts[3]}-${m}-${dtParts[1].padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function getHeaders(ws: ExcelJS.Worksheet): string[] {
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell) => headers.push(String(cell.value || '').trim()));
  return headers;
}

function getRowValues(row: ExcelJS.Row, headers: string[]): Record<string, any> {
  const obj: Record<string, any> = {};
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1);
    obj[h] = cell.value;
  });
  return obj;
}

function findHeader(headers: string[], ...keywords: string[]): string | undefined {
  return headers.find(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
}

// ── Sheet Importers ──────────────────────────────────────

const PLAN_PLACEHOLDERS = new Set(['', '—', '-', 'no active plan', 'n/a', 'na', 'none', 'null', 'undefined']);

function isPlanPlaceholder(planName: string | null | undefined): boolean {
  if (!planName) return true;
  return PLAN_PLACEHOLDERS.has(planName.trim().toLowerCase());
}

function getDurationMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 1;
  return Math.max(1, Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000)));
}

function buildGeneratedCustomPlanName(clientName: string, fee: number, durationMonths: number): string {
  const safeName = clientName.trim().slice(0, 30) || 'Member';
  const feeLabel = fee > 0 ? `₹${Math.round(fee)}` : '₹0';
  return `Custom Plan - ${safeName} - ${feeLabel} - ${durationMonths}M`;
}

async function importClients(ws: ExcelJS.Worksheet): Promise<ImportResult> {
  const result: ImportResult = { sheet: 'Clients', inserted: 0, updated: 0, skipped: 0, errors: [] };
  const headers = getHeaders(ws);

  const nameCol = findHeader(headers, 'Name');
  const phoneCol = findHeader(headers, 'Phone');
  if (!nameCol || !phoneCol) {
    result.errors.push('Missing required columns: Name and Phone');
    return result;
  }

  const statusCol = findHeader(headers, 'Status');
  const goalCol = findHeader(headers, 'Goal');
  const remarksCol = findHeader(headers, 'Remarks');
  const advanceCol = findHeader(headers, 'Advance Balance', 'Advance');
  const aliasCol = findHeader(headers, 'Alias', 'Alias Name');
  const joinDateCol = findHeader(headers, 'Join Date');
  const expiryDateCol = findHeader(headers, 'Expiry Date');
  const planCol = findHeader(headers, 'Active Plan', 'Plan');
  const totalPaidCol = findHeader(headers, 'Total Paid', 'Amount Paid', 'Paid');
  const totalFeesCol = findHeader(headers, 'Total Fees', 'Fees');

  // Get existing clients by phone for matching
  const { data: existing } = await supabase.from('clients').select('id, phone');
  const phoneMap = new Map((existing || []).map(c => [c.phone, c.id]));

  // Get plans for membership creation
  const { data: plans } = await supabase.from('plans').select('id, name, price, duration_months');
  const planNameMap = new Map((plans || []).map((p: any) => [p.name.toLowerCase(), p]));

  const toInsert: any[] = [];
  const toUpdate: { id: string; data: any }[] = [];
  const membershipRecords: {
    clientPhone: string;
    clientName: string;
    planName: string;
    joinDate: string;
    expiryDate: string;
    fee: number;
  }[] = [];
  const paymentRecords: { clientPhone: string; amount: number; date: string }[] = [];

  const now = Date.now();

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const hasValues = headers.some((_, idx) => {
      const val = row.getCell(idx + 1).value;
      return val != null && String(val).trim() !== '';
    });
    if (!hasValues) continue;

    const vals = getRowValues(row, headers);
    const name = String(vals[nameCol] || '').trim();
    const phone = String(vals[phoneCol] || '').trim();
    if (!name || !phone) {
      result.skipped++;
      continue;
    }

    // Preserve imported row order: top row becomes newest client.
    const createdAt = new Date(now - (i - 2) * 60000).toISOString();

    const record: any = {
      name,
      phone,
      created_at: createdAt,
    };

    if (statusCol) {
      const status = String(vals[statusCol] || '').trim();
      if (status && ['Active', 'Expired', 'Left', 'Deleted'].includes(status)) {
        record.status = status;
      }
    }

    if (goalCol) {
      const goal = String(vals[goalCol] || '').trim();
      if (goal) record.goal = goal;
    }

    if (remarksCol) {
      const remarks = String(vals[remarksCol] || '').trim();
      if (remarks) record.remarks = remarks;
    }

    if (advanceCol) {
      const adv = parseCurrency(vals[advanceCol]);
      if (Number.isFinite(adv)) record.advance_balance = adv;
    }

    if (aliasCol) {
      const alias = String(vals[aliasCol] || '').trim();
      if (alias) record.alias_name = alias;
    }

    // Collect membership data even when plan is blank/placeholder (custom-fee clients).
    if (joinDateCol && expiryDateCol) {
      const joinDate = parseExcelDate(vals[joinDateCol]);
      const expiryDate = parseExcelDate(vals[expiryDateCol]);
      const planNameRaw = planCol ? String(vals[planCol] || '').trim() : '';
      const fee = totalFeesCol ? parseCurrency(vals[totalFeesCol]) : 0;
      const hasExplicitPlan = !isPlanPlaceholder(planNameRaw);

      if (joinDate && expiryDate && (hasExplicitPlan || fee > 0)) {
        membershipRecords.push({
          clientPhone: phone,
          clientName: name,
          planName: planNameRaw,
          joinDate,
          expiryDate,
          fee,
        });
      }
    }

    if (totalPaidCol) {
      const paid = parseCurrency(vals[totalPaidCol]);
      const joinDate = joinDateCol ? parseExcelDate(vals[joinDateCol]) : null;
      if (paid > 0) {
        paymentRecords.push({
          clientPhone: phone,
          amount: paid,
          date: joinDate || new Date().toISOString().split('T')[0],
        });
      }
    }

    const existingId = phoneMap.get(phone);
    if (existingId) {
      toUpdate.push({
        id: existingId,
        data: {
          ...record,
          created_at: createdAt,
        },
      });
    } else {
      toInsert.push(record);
      phoneMap.set(phone, 'pending');
    }
  }

  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error } = await supabase.from('clients').insert(chunk);
    if (error) result.errors.push(`Insert batch ${Math.floor(i / 50) + 1}: ${error.message}`);
    else result.inserted += chunk.length;
  }

  for (const { id, data } of toUpdate) {
    const { error } = await supabase.from('clients').update(data).eq('id', id);
    if (error) result.errors.push(`Update ${id.slice(0, 8)}: ${error.message}`);
    else result.updated++;
  }

  const { data: allClients } = await supabase.from('clients').select('id, phone');
  const freshPhoneMap = new Map((allClients || []).map(c => [c.phone, c.id]));

  if (membershipRecords.length > 0) {
    let membershipInserted = 0;
    let customPlansCreated = 0;

    for (const mr of membershipRecords) {
      const clientId = freshPhoneMap.get(mr.clientPhone);
      if (!clientId) continue;

      const durationMonths = getDurationMonths(mr.joinDate, mr.expiryDate);
      const planNameToUse = isPlanPlaceholder(mr.planName)
        ? buildGeneratedCustomPlanName(mr.clientName, mr.fee, durationMonths)
        : mr.planName;

      let plan = planNameMap.get(planNameToUse.toLowerCase()) as any;

      if (!plan) {
        const { data: newPlan, error: planErr } = await supabase
          .from('plans')
          .insert({
            name: planNameToUse,
            price: mr.fee > 0 ? mr.fee : 0,
            duration_months: durationMonths,
            active: true,
          })
          .select('id, name, price, duration_months')
          .single();

        if (!planErr && newPlan) {
          plan = newPlan;
          planNameMap.set(planNameToUse.toLowerCase(), newPlan);
          customPlansCreated++;
        }
      }

      const planId = plan?.id || null;

      const { data: existingJoins } = await supabase
        .from('joins')
        .select('id')
        .eq('client_id', clientId)
        .eq('join_date', mr.joinDate)
        .eq('expiry_date', mr.expiryDate)
        .limit(1);

      if (existingJoins && existingJoins.length > 0) continue;

      const { error } = await supabase.from('joins').insert({
        client_id: clientId,
        plan_id: planId,
        join_date: mr.joinDate,
        expiry_date: mr.expiryDate,
        custom_price: mr.fee > 0 ? mr.fee : null,
      });

      if (!error) membershipInserted++;
    }

    if (customPlansCreated > 0) {
      result.errors.push(`Also created ${customPlansCreated} custom plan records`);
    }

    if (membershipInserted > 0) {
      result.errors.push(`Also created ${membershipInserted} membership records`);
    }
  }

  if (paymentRecords.length > 0) {
    let paymentInserted = 0;
    for (const pr of paymentRecords) {
      const clientId = freshPhoneMap.get(pr.clientPhone);
      if (!clientId || pr.amount <= 0) continue;

      const { data: existingPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('client_id', clientId)
        .eq('amount', pr.amount)
        .limit(1);

      if (existingPayments && existingPayments.length > 0) continue;

      const { data: latestJoin } = await supabase
        .from('joins')
        .select('id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      const { error } = await supabase.from('payments').insert({
        client_id: clientId,
        amount: pr.amount,
        payment_method: 'cash',
        payment_date: pr.date,
        payment_type: 'membership',
        join_id: latestJoin?.[0]?.id || null,
      });

      if (!error) paymentInserted++;
    }
    if (paymentInserted > 0) {
      result.errors.push(`Also created ${paymentInserted} payment records`);
    }
  }

  return result;
}

async function importMemberships(ws: ExcelJS.Worksheet): Promise<ImportResult> {
  const result: ImportResult = { sheet: 'Memberships', inserted: 0, updated: 0, skipped: 0, errors: [] };
  const headers = getHeaders(ws);

  const clientNameCol = findHeader(headers, 'Client Name');
  const planCol = findHeader(headers, 'Plan');
  const startCol = findHeader(headers, 'Start Date');
  const endCol = findHeader(headers, 'End Date');
  const feeCol = findHeader(headers, 'Total Fee');

  if (!clientNameCol || !startCol || !endCol) {
    result.errors.push('Missing required columns: Client Name, Start Date, End Date');
    return result;
  }

  const { data: clients } = await supabase.from('clients').select('id, name');
  const { data: plans } = await supabase.from('plans').select('id, name');
  const clientNameMap = new Map((clients || []).map(c => [c.name.toLowerCase(), c.id]));
  const planNameMap = new Map((plans || []).map(p => [p.name.toLowerCase(), p.id]));

  // Fetch existing joins to prevent duplicates
  const { data: existingJoins } = await supabase.from('joins').select('client_id, join_date, expiry_date');
  const existingJoinSet = new Set(
    (existingJoins || []).map(j => `${j.client_id}|${j.join_date}|${j.expiry_date}`)
  );

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const hasValues = headers.some((_, idx) => {
      const val = row.getCell(idx + 1).value;
      return val != null && String(val).trim() !== '';
    });
    if (!hasValues) continue;

    const vals = getRowValues(row, headers);
    const clientName = String(vals[clientNameCol] || '').trim();
    const startDate = parseExcelDate(vals[startCol!]);
    const endDate = parseExcelDate(vals[endCol!]);

    if (!clientName || !startDate || !endDate) { result.skipped++; continue; }

    const clientId = clientNameMap.get(clientName.toLowerCase());
    if (!clientId) { result.skipped++; continue; }

    // Skip if this exact join already exists
    if (existingJoinSet.has(`${clientId}|${startDate}|${endDate}`)) {
      result.skipped++;
      continue;
    }

    const planName = planCol ? String(vals[planCol] || '').trim() : '';
    let planId = planName ? planNameMap.get(planName.toLowerCase()) || null : null;
    const fee = feeCol ? parseCurrency(vals[feeCol]) : null;

    // Auto-create plan if not found
    if (!planId && planName && planName !== '—') {
      const diffMonths = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
      const { data: newPlan, error: planErr } = await supabase.from('plans').insert({
        name: planName,
        price: fee && fee > 0 ? fee : 0,
        duration_months: diffMonths,
        active: true,
      }).select().single();
      if (!planErr && newPlan) {
        planId = newPlan.id;
        planNameMap.set(planName.toLowerCase(), newPlan.id);
      }
    }

    const { error } = await supabase.from('joins').insert({
      client_id: clientId,
      plan_id: planId,
      join_date: startDate,
      expiry_date: endDate,
      custom_price: fee && fee > 0 ? fee : null,
    });

    if (error) {
      result.errors.push(`Row ${i}: ${error.message}`);
    } else {
      result.inserted++;
    }
  }

  return result;
}

async function importPayments(ws: ExcelJS.Worksheet): Promise<ImportResult> {
  const result: ImportResult = { sheet: 'Payments', inserted: 0, updated: 0, skipped: 0, errors: [] };
  const headers = getHeaders(ws);

  const clientNameCol = findHeader(headers, 'Client Name');
  const amountCol = findHeader(headers, 'Amount Paid', 'Amount');
  const methodCol = findHeader(headers, 'Method');
  const dateCol = findHeader(headers, 'Payment Date', 'Date');
  const typeCol = findHeader(headers, 'Payment Type', 'Type');
  const notesCol = findHeader(headers, 'Notes');
  const dueBeforeCol = findHeader(headers, 'Due Before');
  const dueAfterCol = findHeader(headers, 'Due After');
  const linkedMembershipCol = findHeader(headers, 'Linked Membership');

  if (!clientNameCol || !amountCol) {
    result.errors.push('Missing required columns: Client Name and Amount');
    return result;
  }

  const { data: clients } = await supabase.from('clients').select('id, name');
  const clientNameMap = new Map((clients || []).map(c => [c.name.toLowerCase(), c.id]));

  // Fetch existing payments to prevent duplicates
  const { data: existingPayments } = await supabase.from('payments').select('client_id, amount, payment_date');
  const existingPaymentSet = new Set(
    (existingPayments || []).map(p => `${p.client_id}|${p.amount}|${p.payment_date}`)
  );

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const hasValues = headers.some((_, idx) => {
      const val = row.getCell(idx + 1).value;
      return val != null && String(val).trim() !== '';
    });
    if (!hasValues) continue;

    const vals = getRowValues(row, headers);
    const clientName = String(vals[clientNameCol] || '').trim();
    const amount = parseCurrency(vals[amountCol!]);
    if (!clientName || amount <= 0) { result.skipped++; continue; }

    const clientId = clientNameMap.get(clientName.toLowerCase());
    if (!clientId) { result.skipped++; continue; }

    const paymentDate = dateCol ? parseExcelDate(vals[dateCol]) : null;
    const resolvedDate = paymentDate || new Date().toISOString().split('T')[0];
    const paymentType = typeCol ? String(vals[typeCol] || 'membership').toLowerCase() : 'membership';
    const method = methodCol ? String(vals[methodCol] || 'cash').toLowerCase() : 'cash';

    // Skip if this exact payment already exists
    if (existingPaymentSet.has(`${clientId}|${amount}|${resolvedDate}`)) {
      result.skipped++;
      continue;
    }

    const record: any = {
      client_id: clientId,
      amount,
      payment_method: method === 'online' ? 'online' : 'cash',
      payment_date: resolvedDate,
      payment_type: ['membership', 'product', 'mixed', 'advance'].includes(paymentType) ? paymentType : 'membership',
    };

    if (notesCol) {
      const notes = String(vals[notesCol] || '').trim();
      if (notes) record.notes = notes;
    }

    if (dueBeforeCol) {
      const db = parseCurrency(vals[dueBeforeCol]);
      if (db > 0) record.due_before = db;
    }
    if (dueAfterCol) {
      const da = parseCurrency(vals[dueAfterCol]);
      record.due_after = da;
    }

    // Try to link to the latest join for this client
    const { data: latestJoin } = await supabase
      .from('joins')
      .select('id')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (latestJoin?.[0]?.id) {
      record.join_id = latestJoin[0].id;
    }

    const { error } = await supabase.from('payments').insert(record);
    if (error) result.errors.push(`Row ${i}: ${error.message}`);
    else result.inserted++;
  }

  return result;
}

async function importProductPurchases(ws: ExcelJS.Worksheet): Promise<ImportResult> {
  const result: ImportResult = { sheet: 'Product Purchases', inserted: 0, updated: 0, skipped: 0, errors: [] };
  const headers = getHeaders(ws);

  const clientNameCol = findHeader(headers, 'Client Name');
  const productCol = findHeader(headers, 'Product Name', 'Product');
  const qtyCol = findHeader(headers, 'Quantity', 'Qty');
  const unitPriceCol = findHeader(headers, 'Unit Price');
  const totalCol = findHeader(headers, 'Total Amount', 'Total');
  const dateCol = findHeader(headers, 'Purchase Date', 'Date');
  const notesCol = findHeader(headers, 'Notes');

  if (!clientNameCol || !productCol || !totalCol) {
    result.errors.push('Missing required columns: Client Name, Product Name, Total Amount');
    return result;
  }

  const { data: clients } = await supabase.from('clients').select('id, name');
  const { data: products } = await supabase.from('products').select('id, name');
  const clientNameMap = new Map((clients || []).map(c => [c.name.toLowerCase(), c.id]));
  const productNameMap = new Map((products || []).map(p => [p.name.toLowerCase(), p.id]));

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const hasValues = headers.some((_, idx) => {
      const val = row.getCell(idx + 1).value;
      return val != null && String(val).trim() !== '';
    });
    if (!hasValues) continue;

    const vals = getRowValues(row, headers);
    const clientName = String(vals[clientNameCol] || '').trim();
    const productName = String(vals[productCol] || '').trim();
    const total = parseCurrency(vals[totalCol]);

    if (!clientName || !productName || total <= 0) { result.skipped++; continue; }

    const clientId = clientNameMap.get(clientName.toLowerCase());
    const productId = productNameMap.get(productName.toLowerCase());
    if (!clientId || !productId) { result.skipped++; continue; }

    const qty = qtyCol ? Number(vals[qtyCol]) || 1 : 1;
    const unitPrice = unitPriceCol ? parseCurrency(vals[unitPriceCol]) : total / qty;
    const purchaseDate = dateCol ? parseExcelDate(vals[dateCol]) : null;

    const record: any = {
      client_id: clientId,
      product_id: productId,
      quantity: qty,
      unit_price: unitPrice,
      total_price: total,
      purchase_date: purchaseDate || new Date().toISOString().split('T')[0],
    };

    if (notesCol) {
      const notes = String(vals[notesCol] || '').trim();
      if (notes) record.notes = notes;
    }

    const { error } = await supabase.from('product_purchases').insert(record);
    if (error) result.errors.push(`Row ${i}: ${error.message}`);
    else result.inserted++;
  }

  return result;
}

async function importExpenses(ws: ExcelJS.Worksheet): Promise<ImportResult> {
  const result: ImportResult = { sheet: 'Expenses', inserted: 0, updated: 0, skipped: 0, errors: [] };
  const headers = getHeaders(ws);

  const titleCol = findHeader(headers, 'Title');
  const amountCol = findHeader(headers, 'Amount');
  if (!titleCol || !amountCol) {
    result.errors.push('Missing required columns: Title and Amount');
    return result;
  }

  const catCol = findHeader(headers, 'Category');
  const dateCol = findHeader(headers, 'Expense Date', 'Date');
  const recurCol = findHeader(headers, 'Recurring');
  const intervalCol = findHeader(headers, 'Interval');
  const notesCol = findHeader(headers, 'Notes');

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const hasValues = headers.some((_, idx) => {
      const val = row.getCell(idx + 1).value;
      return val != null && String(val).trim() !== '';
    });
    if (!hasValues) continue;

    const vals = getRowValues(row, headers);
    const title = String(vals[titleCol] || '').trim();
    const amount = parseCurrency(vals[amountCol]);
    if (!title || amount <= 0) { result.skipped++; continue; }

    const expenseDate = dateCol ? parseExcelDate(vals[dateCol]) : null;
    const isRecurring = recurCol ? String(vals[recurCol] || '').toLowerCase() === 'yes' : false;

    const record: any = {
      title,
      amount,
      category: catCol ? String(vals[catCol] || 'other').toLowerCase() : 'other',
      expense_date: expenseDate || new Date().toISOString().split('T')[0],
      is_recurring: isRecurring,
    };

    if (isRecurring && intervalCol) {
      const interval = String(vals[intervalCol] || '').trim();
      if (interval && interval !== '—') record.recurring_interval = interval;
    }

    if (notesCol) {
      const notes = String(vals[notesCol] || '').trim();
      if (notes) record.notes = notes;
    }

    const { error } = await supabase.from('expenses').insert(record);
    if (error) result.errors.push(`Row ${i}: ${error.message}`);
    else result.inserted++;
  }

  return result;
}

async function importPlans(ws: ExcelJS.Worksheet): Promise<ImportResult> {
  const result: ImportResult = { sheet: 'Plans', inserted: 0, updated: 0, skipped: 0, errors: [] };
  const headers = getHeaders(ws);

  const nameCol = findHeader(headers, 'Plan Name', 'Name');
  const durationCol = findHeader(headers, 'Duration');
  const priceCol = findHeader(headers, 'Price');
  const descCol = findHeader(headers, 'Description');
  const activeCol = findHeader(headers, 'Active');

  if (!nameCol || !priceCol) {
    result.errors.push('Missing required columns: Plan Name and Price');
    return result;
  }

  const { data: existing } = await supabase.from('plans').select('id, name');
  const existingMap = new Map((existing || []).map(p => [p.name.toLowerCase(), p.id]));

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const hasValues = headers.some((_, idx) => {
      const val = row.getCell(idx + 1).value;
      return val != null && String(val).trim() !== '';
    });
    if (!hasValues) continue;

    const vals = getRowValues(row, headers);
    const name = String(vals[nameCol] || '').trim();
    const price = parseCurrency(vals[priceCol]);
    if (!name || price <= 0) { result.skipped++; continue; }

    const duration = durationCol ? Number(vals[durationCol]) || 1 : 1;
    const description = descCol ? String(vals[descCol] || '').trim() || null : null;
    const active = activeCol ? String(vals[activeCol] || '').toLowerCase() !== 'no' : true;

    const existingId = existingMap.get(name.toLowerCase());
    if (existingId) {
      const { error } = await supabase.from('plans').update({ price, duration_months: duration, description, active }).eq('id', existingId);
      if (error) result.errors.push(`Row ${i}: ${error.message}`);
      else result.updated++;
    } else {
      const { error } = await supabase.from('plans').insert({ name, price, duration_months: duration, description, active });
      if (error) result.errors.push(`Row ${i}: ${error.message}`);
      else result.inserted++;
    }
  }

  return result;
}

// ── Public API ───────────────────────────────────────────

export async function importExcelFile(file: File): Promise<ImportResult[]> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const results: ImportResult[] = [];

  // Map sheet names to importers (case-insensitive matching)
  const sheetImporters: Record<string, (ws: ExcelJS.Worksheet) => Promise<ImportResult>> = {
    'plans': importPlans,
    'clients': importClients,
    'memberships': importMemberships,
    'payments': importPayments,
    'product purchases': importProductPurchases,
    'expenses': importExpenses,
  };

  // Sheets to skip (informational only, not importable)
  const skipSheets = new Set(['activity logs', 'audit logs', 'logs']);

  // Import sheets in dependency order (plans first so clients can reference them)
  const importOrder = ['plans', 'clients', 'memberships', 'payments', 'product purchases', 'expenses'];

  for (const sheetKey of importOrder) {
    const ws = wb.worksheets.find(s => s.name.trim().toLowerCase() === sheetKey);
    if (ws && sheetImporters[sheetKey]) {
      results.push(await sheetImporters[sheetKey](ws));
    }
  }

  // Report skipped sheets
  for (const ws of wb.worksheets) {
    const name = ws.name.trim().toLowerCase();
    if (skipSheets.has(name) && !importOrder.includes(name)) {
      results.push({
        sheet: ws.name,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: ['Skipped (informational sheet)'],
      });
    }
  }

  // If no known sheets found, try to auto-detect
  if (results.length === 0 && wb.worksheets.length > 0) {
    const firstSheet = wb.worksheets[0];
    const headers: string[] = [];
    firstSheet.getRow(1).eachCell((cell) => headers.push(String(cell.value || '').toLowerCase()));

    if (headers.some(h => h.includes('phone')) && headers.some(h => h.includes('name'))) {
      results.push(await importClients(firstSheet));
    } else if (headers.some(h => h.includes('client name')) && headers.some(h => h.includes('amount'))) {
      results.push(await importPayments(firstSheet));
    } else if (headers.some(h => h.includes('title')) && headers.some(h => h.includes('amount'))) {
      results.push(await importExpenses(firstSheet));
    } else {
      results.push({
        sheet: firstSheet.name,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: ['Could not detect data format. Export data first and use the same file format for import.'],
      });
    }
  }

  return results;
}
