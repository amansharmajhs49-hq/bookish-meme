/**
 * Professional Excel/CSV Export for Aesthetic Gym CRM
 * Multi-sheet, styled, filtered, currency-formatted exports
 */
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ClientWithMembership } from '@/hooks/useClients';
import { AuditLog } from '@/lib/types';
import { getActionDescription } from '@/hooks/useAuditLog';

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  notes: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return format(date, 'dd MMM yyyy');
  } catch {
    return String(d);
  }
}

function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return '';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return format(date, 'dd MMM yyyy HH:mm');
  } catch {
    return String(d);
  }
}

function cur(n: number | null | undefined): string {
  if (n == null) return '₹0';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function fileName(label: string): string {
  const d = format(new Date(), 'yyyy_MM_dd');
  return `AestheticGym_${label}_${d}.xlsx`;
}

// ── Styling constants ────────────────────────────────────

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1A1F2C' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const EVEN_ROW_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF6F7F9' },
};

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
};

function styleSheet(ws: ExcelJS.Worksheet) {
  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  headerRow.height = 28;

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activeCell: 'A2' }];

  // Auto-filter
  if (ws.rowCount > 0 && ws.columnCount > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: ws.columnCount },
    };
  }

  // Alternating rows + borders
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      if (i % 2 === 0) {
        cell.fill = EVEN_ROW_FILL;
      }
    });
  }

  // Auto column widths
  ws.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 40);
  });
}

// ── Sheet Builders ───────────────────────────────────────

function buildClientsSheet(wb: ExcelJS.Workbook, clients: ClientWithMembership[]) {
  const ws = wb.addWorksheet('Clients');
  ws.columns = [
    { header: 'Client ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Phone', key: 'phone' },
    { header: 'Status', key: 'status' },
    { header: 'Membership Status', key: 'membershipStatus' },
    { header: 'Active Plan', key: 'plan' },
    { header: 'Join Date', key: 'joinDate' },
    { header: 'Expiry Date', key: 'expiryDate' },
    { header: 'Total Fees', key: 'totalFees' },
    { header: 'Total Paid', key: 'paidAmount' },
    { header: 'Membership Due', key: 'dueAmount' },
    { header: 'Product Due', key: 'productDues' },
    { header: 'Advance Balance', key: 'advanceBalance' },
    { header: 'Total Due', key: 'totalDue' },
    { header: 'Goal', key: 'goal' },
    { header: 'Remarks', key: 'remarks' },
  ];

  const sorted = [...clients].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  for (const c of sorted) {
    ws.addRow({
      id: c.id.slice(0, 8),
      name: c.name,
      phone: c.phone,
      status: c.status,
      membershipStatus: c.membershipStatus,
      plan: c.latestJoin?.plan?.name || '—',
      joinDate: fmtDate(c.latestJoin?.join_date),
      expiryDate: fmtDate(c.latestJoin?.expiry_date),
      totalFees: cur(c.totalFees),
      paidAmount: cur(c.paidAmount),
      dueAmount: cur(c.dueAmount),
      productDues: cur(c.productDues),
      advanceBalance: cur(c.advanceBalance),
      totalDue: cur(c.totalDue),
      goal: c.goal || '',
      remarks: c.remarks || '',
    });
  }
  styleSheet(ws);
}

function buildMembershipsSheet(wb: ExcelJS.Workbook, clients: ClientWithMembership[]) {
  const ws = wb.addWorksheet('Memberships');
  ws.columns = [
    { header: 'Membership ID', key: 'id' },
    { header: 'Client Name', key: 'clientName' },
    { header: 'Plan', key: 'plan' },
    { header: 'Start Date', key: 'startDate' },
    { header: 'End Date', key: 'endDate' },
    { header: 'Total Fee', key: 'fee' },
    { header: 'Total Paid', key: 'paid' },
    { header: 'Remaining Due', key: 'due' },
    { header: 'Status', key: 'status' },
    { header: 'Created At', key: 'createdAt' },
  ];

  const rows: any[] = [];
  for (const c of clients) {
    for (const j of c.joins) {
      const fee = Number(j.custom_price ?? (j.plan?.price || 0));
      const paid = c.payments
        .filter(p => p.join_id === j.id && (!p.payment_type || p.payment_type === 'membership' || p.payment_type === 'mixed'))
        .reduce((s, p) => s + Number(p.amount), 0);
      const isExpired = new Date(j.expiry_date) < new Date();
      rows.push({
        id: j.id.slice(0, 8),
        clientName: c.name,
        plan: j.plan?.name || 'Custom',
        startDate: fmtDate(j.join_date),
        endDate: fmtDate(j.expiry_date),
        fee: cur(fee),
        paid: cur(paid),
        due: cur(Math.max(0, fee - paid)),
        status: isExpired ? 'Expired' : 'Active',
        createdAt: fmtDateTime(j.created_at),
        _ts: new Date(j.created_at).getTime(),
      });
    }
  }
  rows.sort((a, b) => b._ts - a._ts);
  for (const r of rows) {
    const { _ts, ...row } = r;
    ws.addRow(row);
  }
  styleSheet(ws);
}

function buildPaymentsSheet(wb: ExcelJS.Workbook, clients: ClientWithMembership[]) {
  const ws = wb.addWorksheet('Payments');
  ws.columns = [
    { header: 'Payment ID', key: 'id' },
    { header: 'Client Name', key: 'clientName' },
    { header: 'Payment Type', key: 'type' },
    { header: 'Linked Membership', key: 'membership' },
    { header: 'Linked Product', key: 'product' },
    { header: 'Amount Paid', key: 'amount' },
    { header: 'Method', key: 'method' },
    { header: 'Due Before', key: 'dueBefore' },
    { header: 'Due After', key: 'dueAfter' },
    { header: 'Payment Date', key: 'date' },
    { header: 'Notes', key: 'notes' },
  ];

  const rows: any[] = [];
  for (const c of clients) {
    for (const p of c.payments) {
      const linkedJoin = p.join_id ? c.joins.find(j => j.id === p.join_id) : null;
      const linkedPurchase = p.product_purchase_id ? c.productPurchases?.find(pp => pp.id === p.product_purchase_id) : null;
      rows.push({
        id: p.id.slice(0, 8),
        clientName: c.name,
        type: p.payment_type || 'membership',
        membership: linkedJoin ? (linkedJoin.plan?.name || 'Custom') : '—',
        product: linkedPurchase ? (linkedPurchase.product?.name || 'Product') : '—',
        amount: cur(Number(p.amount)),
        method: p.payment_method,
        dueBefore: p.due_before != null ? cur(Number(p.due_before)) : '—',
        dueAfter: p.due_after != null ? cur(Number(p.due_after)) : '—',
        date: fmtDate(p.payment_date),
        notes: p.notes || '',
        _ts: new Date(p.payment_date).getTime(),
      });
    }
  }
  rows.sort((a, b) => b._ts - a._ts);
  for (const r of rows) {
    const { _ts, ...row } = r;
    ws.addRow(row);
  }
  styleSheet(ws);
}

function buildProductsSheet(wb: ExcelJS.Workbook, clients: ClientWithMembership[]) {
  const ws = wb.addWorksheet('Product Purchases');
  ws.columns = [
    { header: 'Purchase ID', key: 'id' },
    { header: 'Client Name', key: 'clientName' },
    { header: 'Product Name', key: 'product' },
    { header: 'Tags', key: 'tags' },
    { header: 'Quantity', key: 'qty' },
    { header: 'Unit Price', key: 'unitPrice' },
    { header: 'Total Amount', key: 'total' },
    { header: 'Paid', key: 'paid' },
    { header: 'Remaining Due', key: 'due' },
    { header: 'Purchase Date', key: 'date' },
    { header: 'Notes', key: 'notes' },
  ];

  const rows: any[] = [];
  for (const c of clients) {
    for (const pp of c.productPurchases || []) {
      const paidAmount = c.payments
        .filter(p => p.product_purchase_id === pp.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      rows.push({
        id: pp.id.slice(0, 8),
        clientName: c.name,
        product: pp.product?.name || 'Product',
        tags: pp.product?.tags?.join(', ') || '',
        qty: pp.quantity,
        unitPrice: cur(Number(pp.unit_price)),
        total: cur(Number(pp.total_price)),
        paid: cur(paidAmount),
        due: cur(Math.max(0, Number(pp.total_price) - paidAmount)),
        date: fmtDate(pp.purchase_date),
        notes: pp.notes || '',
        _ts: new Date(pp.created_at).getTime(),
      });
    }
  }
  rows.sort((a, b) => b._ts - a._ts);
  for (const r of rows) {
    const { _ts, ...row } = r;
    ws.addRow(row);
  }
  styleSheet(ws);
}

function buildAuditSheet(wb: ExcelJS.Workbook, logs: AuditLog[], clients: ClientWithMembership[]) {
  const ws = wb.addWorksheet('Activity Logs');
  ws.columns = [
    { header: 'Log ID', key: 'id' },
    { header: 'Client Name', key: 'clientName' },
    { header: 'Action', key: 'action' },
    { header: 'Entity Type', key: 'entityType' },
    { header: 'Amount', key: 'amount' },
    { header: 'Reason', key: 'reason' },
    { header: 'Timestamp', key: 'timestamp' },
  ];

  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  const sorted = [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  for (const log of sorted) {
    const newData = log.new_data as Record<string, any> | null;
    const amount = newData?.amount ?? newData?.total_price ?? '';
    ws.addRow({
      id: log.id.slice(0, 8),
      clientName: log.client_id ? (clientMap.get(log.client_id) || log.client_id.slice(0, 8)) : '—',
      action: getActionDescription(log.action as any),
      entityType: log.entity_type,
      amount: amount ? cur(Number(amount)) : '—',
      reason: log.reason || '',
      timestamp: fmtDateTime(log.created_at),
    });
  }
  styleSheet(ws);
}

function buildExpensesSheet(wb: ExcelJS.Workbook, expenses: ExpenseRow[]) {
  const ws = wb.addWorksheet('Expenses');
  ws.columns = [
    { header: 'Expense ID', key: 'id' },
    { header: 'Title', key: 'title' },
    { header: 'Amount', key: 'amount' },
    { header: 'Category', key: 'category' },
    { header: 'Expense Date', key: 'date' },
    { header: 'Recurring', key: 'recurring' },
    { header: 'Interval', key: 'interval' },
    { header: 'Notes', key: 'notes' },
    { header: 'Created At', key: 'createdAt' },
  ];

  const sorted = [...expenses].sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  for (const e of sorted) {
    ws.addRow({
      id: e.id.slice(0, 8),
      title: e.title,
      amount: cur(Number(e.amount)),
      category: e.category,
      date: fmtDate(e.expense_date),
      recurring: e.is_recurring ? 'Yes' : 'No',
      interval: e.recurring_interval || '—',
      notes: e.notes || '',
      createdAt: fmtDateTime(e.created_at),
    });
  }
  styleSheet(ws);
}

function buildPlansSheet(wb: ExcelJS.Workbook, plans: { id: string; name: string; duration_months: number; price: number; description: string | null; active: boolean }[]) {
  const ws = wb.addWorksheet('Plans');
  ws.columns = [
    { header: 'Plan Name', key: 'name' },
    { header: 'Duration (Months)', key: 'duration' },
    { header: 'Price', key: 'price' },
    { header: 'Description', key: 'description' },
    { header: 'Active', key: 'active' },
  ];
  for (const p of plans) {
    ws.addRow({
      name: p.name,
      duration: p.duration_months,
      price: cur(p.price),
      description: p.description || '',
      active: p.active ? 'Yes' : 'No',
    });
  }
  styleSheet(ws);
}

// ── Public API ───────────────────────────────────────────

async function downloadWorkbook(wb: ExcelJS.Workbook, name: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportClients(clients: ClientWithMembership[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aesthetic Gym CRM';
  buildClientsSheet(wb, clients);
  await downloadWorkbook(wb, fileName('Clients'));
}

export async function exportMemberships(clients: ClientWithMembership[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aesthetic Gym CRM';
  buildMembershipsSheet(wb, clients);
  await downloadWorkbook(wb, fileName('Memberships'));
}

export async function exportPayments(clients: ClientWithMembership[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aesthetic Gym CRM';
  buildPaymentsSheet(wb, clients);
  await downloadWorkbook(wb, fileName('Payments'));
}

export async function exportProducts(clients: ClientWithMembership[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aesthetic Gym CRM';
  buildProductsSheet(wb, clients);
  await downloadWorkbook(wb, fileName('Products'));
}

export async function exportExpenses(expenses: ExpenseRow[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aesthetic Gym CRM';
  buildExpensesSheet(wb, expenses);
  await downloadWorkbook(wb, fileName('Expenses'));
}

export async function exportFullData(clients: ClientWithMembership[], auditLogs: AuditLog[], plans?: { id: string; name: string; duration_months: number; price: number; description: string | null; active: boolean }[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aesthetic Gym CRM';
  buildClientsSheet(wb, clients);
  buildMembershipsSheet(wb, clients);
  buildPaymentsSheet(wb, clients);
  buildProductsSheet(wb, clients);
  if (plans && plans.length > 0) {
    buildPlansSheet(wb, plans);
  }
  buildAuditSheet(wb, auditLogs, clients);
  await downloadWorkbook(wb, fileName('Data_Export'));
}

export function exportCSV(clients: ClientWithMembership[]) {
  const csvContent = [
    ['Name', 'Phone', 'Status', 'Plan', 'Total Fees', 'Paid', 'Due', 'Advance'].join(','),
    ...clients.map(c =>
      [
        `"${c.name}"`,
        c.phone,
        c.status,
        `"${c.latestJoin?.plan?.name || ''}"`,
        c.totalFees,
        c.paidAmount,
        c.totalDue,
        c.advanceBalance,
      ].join(',')
    ),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AestheticGym_Clients_${format(new Date(), 'yyyy_MM_dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
