/**
 * Minimal Professional PDF Receipt — Aesthetic Gym CRM
 * Clean A5 layout, white background, overflow-safe
 * Shows full payment summary when due is cleared
 */
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { Payment, Join, ProductPurchase } from '@/lib/types';

interface ReceiptData {
  gymName?: string;
  gymPhone?: string;
  clientName: string;
  clientPhone: string;
  payment: Payment;
  linkedJoin?: Join | null;
  linkedPurchase?: ProductPurchase | null;
  upiId?: string;
  upiName?: string;
  /** All payments for the same join/membership — used to show total paid summary */
  relatedPayments?: Payment[];
}

type RGB = [number, number, number];

const K: Record<string, RGB> = {
  bg:     [255, 255, 255],
  card:   [247, 248, 250],
  line:   [220, 223, 228],
  dim:    [150, 155, 165],
  muted:  [110, 115, 125],
  body:   [70, 75, 85],
  dark:   [30, 32, 38],
  black:  [15, 17, 22],
  white:  [255, 255, 255],
  green:  [22, 163, 74],
  greenBg:[235, 251, 240],
  amber:  [180, 120, 10],
  amberBg:[255, 248, 230],
};

const t = (d: jsPDF, c: RGB) => d.setTextColor(...c);
const fl = (d: jsPDF, c: RGB) => d.setFillColor(...c);
const dr = (d: jsPDF, c: RGB) => d.setDrawColor(...c);
const cur = (n: number) => `INR ${Number(n).toLocaleString('en-IN')}`;
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

function drawRightFitted(
  doc: jsPDF,
  value: string,
  rightX: number,
  y: number,
  maxWidth: number,
  baseSize: number,
  minSize = 6
) {
  let size = baseSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(value) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  doc.text(value, rightX, y, { align: 'right' });
}

function drawCenteredFitted(
  doc: jsPDF,
  value: string,
  centerX: number,
  y: number,
  maxWidth: number,
  baseSize: number,
  minSize = 5
) {
  let size = baseSize;
  doc.setFontSize(size);
  while (size > minSize && doc.getTextWidth(value) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  doc.text(value, centerX, y, { align: 'center' });
}

export async function generateReceipt(data: ReceiptData) {
  const {
    gymName = 'Aesthetic Gym',
    gymPhone,
    clientName,
    clientPhone,
    payment,
    linkedJoin,
    linkedPurchase,
    upiId,
    upiName,
    relatedPayments = [],
  } = data;

  const pType = payment.payment_type || 'membership';
  const linkedJoinFee = linkedJoin ? Number(linkedJoin.custom_price ?? (linkedJoin.plan?.price || 0)) : null;
  const dueBeforeRaw = payment.due_before != null ? Number(payment.due_before) : null;
  const dueAfterRaw = payment.due_after != null ? Number(payment.due_after) : null;
  const isMembershipPayment = !pType || pType === 'membership' || pType === 'mixed';
  const shouldDeriveDue = isMembershipPayment && linkedJoinFee != null && (
    dueBeforeRaw == null ||
    dueAfterRaw == null ||
    (dueBeforeRaw === 0 && dueAfterRaw === 0 && Number(payment.amount) < linkedJoinFee)
  );
  const resolvedDueBefore = shouldDeriveDue ? linkedJoinFee : dueBeforeRaw;
  const resolvedDueAfter = shouldDeriveDue ? Math.max(0, linkedJoinFee - Number(payment.amount)) : dueAfterRaw;

  const isPaid = resolvedDueAfter != null && resolvedDueAfter === 0;
  const dueAmt = Number(resolvedDueAfter || 0);
  const hasDue = resolvedDueAfter != null && dueAmt > 0;

  // Calculate total paid across all related payments (for summary when due cleared)
  const previousPaid = relatedPayments
    .filter(p => p.id !== payment.id)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaidAll = previousPaid + Number(payment.amount);
  const hasPreviousPayments = previousPaid > 0;

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const W = 148, H = 210, mx = 12;
  const cw = W - mx * 2;
  const rx = W - mx;
  let y = 0;

  // Background
  fl(doc, K.bg); doc.rect(0, 0, W, H, 'F');

  y = 14;

  // ── HEADER ─────────────────────────────────────────────
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); t(doc, K.black);
  doc.text(gymName, mx, y);

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
  doc.text('RECEIPT', mx, y + 5);

  // Right: ID + Date
  doc.setFontSize(6); t(doc, K.dim);
  doc.text(`#${payment.id.slice(0, 8).toUpperCase()}`, rx, y - 1, { align: 'right' });
  doc.setFontSize(7.5); t(doc, K.body);
  doc.text(format(new Date(payment.payment_date), 'dd MMM yyyy'), rx, y + 5, { align: 'right' });

  y += 11;
  dr(doc, K.line); doc.setLineWidth(0.25); doc.line(mx, y, rx, y);
  y += 7;

  // ── CLIENT + PAYMENT (two cols) ────────────────────────
  const col2 = mx + cw * 0.58;

  doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
  doc.text('BILLED TO', mx, y);
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); t(doc, K.black);
  const nameLines = doc.splitTextToSize(clientName, cw * 0.52) as string[];
  doc.text(nameLines[0], mx, y + 5.5);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
  doc.text(clientPhone, mx, y + 10);

  doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
  doc.text('PAYMENT', col2, y);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); t(doc, K.body);
  doc.text(cap(payment.payment_method), col2, y + 5.5);
  doc.setFontSize(7); t(doc, K.muted);
  doc.text(cap(pType), col2, y + 10);

  y += 17;

  // ── ITEM TABLE ─────────────────────────────────────────
  const c1 = mx + 3;
  const c2 = mx + cw * 0.46;
  const c3 = rx - 3;

  // Header
  fl(doc, K.card); doc.roundedRect(mx, y, cw, 7, 1, 1, 'F');
  dr(doc, K.line); doc.setLineWidth(0.15); doc.roundedRect(mx, y, cw, 7, 1, 1, 'S');
  doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
  doc.text('ITEM', c1, y + 4.5);
  doc.text('DETAILS', c2, y + 4.5);
  doc.text('AMOUNT', c3, y + 4.5, { align: 'right' });
  y += 10;

  const addRow = (item: string, detail: string, amt: string) => {
    const itemMax = cw * 0.40;
    const detailMax = cw * 0.22;
    const amtMax = cw * 0.28;

    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); t(doc, K.dark);
    const itemText = (doc.splitTextToSize(item, itemMax) as string[])[0];
    doc.text(itemText, c1, y);

    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
    const detailText = (doc.splitTextToSize(detail, detailMax) as string[])[0];
    doc.text(detailText, c2, y);

    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); t(doc, K.dark);
    drawRightFitted(doc, amt, c3, y, amtMax, 8, 6.5);

    y += 7;
  };

  if (linkedJoin) {
    const plan = linkedJoin.plan?.name || 'Custom Plan';
    const dates = `${format(new Date(linkedJoin.join_date), 'dd MMM')} – ${format(new Date(linkedJoin.expiry_date), 'dd MMM yy')}`;
    const fee = linkedJoinFee || Number(payment.amount);
    addRow(plan, dates, cur(fee));
  }
  if (linkedPurchase) {
    const prod = linkedPurchase.product?.name || 'Product';
    const qty = `${linkedPurchase.quantity}×${cur(Number(linkedPurchase.unit_price))}`;
    addRow(prod, qty, cur(Number(linkedPurchase.total_price)));
  }
  if (!linkedJoin && !linkedPurchase) {
    addRow(cap(pType) + ' Payment', format(new Date(payment.payment_date), 'dd MMM yyyy'), cur(Number(payment.amount)));
  }

  dr(doc, K.line); doc.setLineWidth(0.15); doc.line(mx, y - 3, rx, y - 3);
  y += 2;

  // ── PAYMENT SUMMARY ────────────────────────────────────
  const labelX = mx + 3;
  const valX = rx - 3;
  const summaryMaxW = cw * 0.42;

  // Show previous payments + this payment when there are related payments
  if (hasPreviousPayments) {
    // Individual previous payment rows
    const prevPayments = relatedPayments
      .filter(p => p.id !== payment.id)
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
    doc.text('PAYMENT HISTORY', labelX, y);
    y += 4;
    
    for (const prev of prevPayments) {
      if (y > H - 60) break; // Prevent overflow
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
      doc.text(`${format(new Date(prev.payment_date), 'dd MMM yyyy')} • ${cap(prev.payment_method)}`, labelX, y);
      t(doc, K.body);
      drawRightFitted(doc, cur(Number(prev.amount)), valX, y, summaryMaxW, 6.5, 5.5);
      y += 4;
    }
    
    // Current payment row (highlighted)
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); t(doc, K.dark);
    doc.text(`${format(new Date(payment.payment_date), 'dd MMM yyyy')} • ${cap(payment.payment_method)} (Now)`, labelX, y);
    t(doc, K.dark);
    drawRightFitted(doc, cur(Number(payment.amount)), valX, y, summaryMaxW, 6.5, 5.5);
    y += 5;

    dr(doc, K.line); doc.setLineWidth(0.08); doc.line(labelX, y - 1.5, valX, y - 1.5);

    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); t(doc, K.muted);
    doc.text('Total paid', labelX, y + 2);
    t(doc, K.green); doc.setFont('helvetica', 'bold');
    drawRightFitted(doc, cur(totalPaidAll), valX, y + 2, summaryMaxW, 7.5, 6);
    y += 7;

    dr(doc, K.line); doc.setLineWidth(0.1); doc.line(mx, y, rx, y);
    y += 3;
  }

  // Due before → after (always show when we have due data)
  if (resolvedDueBefore != null && resolvedDueAfter != null) {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
    doc.text('Due before payment', labelX, y);
    t(doc, K.body);
    drawRightFitted(doc, cur(resolvedDueBefore), valX, y, summaryMaxW, 7, 6);
    y += 5;

    t(doc, K.muted); doc.text('Due after payment', labelX, y);
    t(doc, dueAmt === 0 ? K.green : K.amber);
    doc.setFont('helvetica', 'bold');
    drawRightFitted(doc, dueAmt === 0 ? 'NO DUE' : cur(dueAmt), valX, y, summaryMaxW, 7, 6);
    y += 6;

    dr(doc, K.line); doc.setLineWidth(0.1); doc.line(mx, y - 2, rx, y - 2);
    y += 3;
  }

  // ── AMOUNT PAID (hero) ─────────────────────────────────
  fl(doc, K.card);
  doc.roundedRect(mx, y, cw, 14, 2, 2, 'F');
  dr(doc, K.line); doc.setLineWidth(0.2);
  doc.roundedRect(mx, y, cw, 14, 2, 2, 'S');

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
  doc.text('AMOUNT PAID', mx + 5, y + 8);

  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); t(doc, K.black);
  const amtStr = cur(Number(payment.amount));
  drawRightFitted(doc, amtStr, rx - 5, y + 9, cw * 0.45, 14, 9);

  y += 19;

  // ── STATUS BADGE ───────────────────────────────────────
  if (isPaid) {
    const badgeW = hasPreviousPayments ? 42 : 28;
    const badgeLabel = hasPreviousPayments ? 'ALL DUES CLEARED' : 'PAID IN FULL';
    fl(doc, K.greenBg); doc.roundedRect(W / 2 - badgeW / 2, y, badgeW, 6, 1.5, 1.5, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); t(doc, K.green);
    doc.text(badgeLabel, W / 2, y + 4, { align: 'center' });
    y += 10;
  } else if (hasDue) {
    doc.setFontSize(6); doc.setFont('helvetica', 'bold');
    const lbl = `DUE: ${cur(dueAmt)}`;
    const lblW = Math.min(cw - 20, Math.max(36, doc.getTextWidth(lbl) + 12));
    fl(doc, K.amberBg); doc.roundedRect(W / 2 - lblW / 2, y, lblW, 6, 1.5, 1.5, 'F');
    t(doc, K.amber);
    drawCenteredFitted(doc, lbl, W / 2, y + 4, lblW - 8, 6, 5);
    y += 10;
  } else {
    y += 3;
  }

  // ── NOTES ──────────────────────────────────────────────
  if (payment.notes && y < H - 38) {
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
    doc.text('NOTE', mx, y); y += 3.5;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
    const nl = doc.splitTextToSize(payment.notes, cw) as string[];
    const max = Math.min(2, Math.floor((H - 38 - y) / 3.5));
    doc.text(nl.slice(0, max), mx, y);
    y += max * 3.5 + 3;
  }

  // ── UPI PAYMENT SECTION (QR + details when due) ─────────
  if (hasDue && y < H - 55) {
    dr(doc, K.line); doc.setLineWidth(0.15); doc.line(mx, y, rx, y);
    y += 5;

    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); t(doc, K.dark);
    doc.text('PAY REMAINING DUE', mx, y);
    y += 5;

    // Payment options card
    fl(doc, K.card);
    const payCardH = upiId ? 40 : 18;
    doc.roundedRect(mx, y, cw, payCardH, 2, 2, 'F');
    dr(doc, K.line); doc.setLineWidth(0.15);
    doc.roundedRect(mx, y, cw, payCardH, 2, 2, 'S');

    const payY = y + 5;

    // Due amount
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
    doc.text('Amount Due', mx + 5, payY);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); t(doc, K.amber);
    drawRightFitted(doc, cur(dueAmt), rx - 5, payY, cw * 0.45, 10, 7);

    // Payment methods
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
    doc.text('Pay via Cash or Online Transfer', mx + 5, payY + 6);

    if (upiId) {
      const upiY = payY + 12;
      dr(doc, K.line); doc.setLineWidth(0.1);
      doc.line(mx + 5, upiY, rx - 5, upiY);

      const qrSize = 22;
      const textX = mx + 5;
      const qrX = rx - 5 - qrSize;

      doc.setFontSize(6); doc.setFont('helvetica', 'bold'); t(doc, K.dim);
      doc.text('UPI PAYMENT', textX, upiY + 4.5);

      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); t(doc, K.dark);
      doc.text(upiId, textX, upiY + 9.5);

      if (upiName) {
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); t(doc, K.muted);
        doc.text(upiName, textX, upiY + 14);
      }

      doc.setFontSize(6); t(doc, K.dim);
      doc.text('Scan QR to pay →', textX, upiY + (upiName ? 19 : 14));

      try {
        const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || gymName)}&am=${dueAmt}&cu=INR`;
        const qrDataUrl = await QRCode.toDataURL(upiLink, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#1e2026', light: '#ffffff' },
        });
        doc.addImage(qrDataUrl, 'PNG', qrX, upiY + 2, qrSize, qrSize);
      } catch {
        doc.setFontSize(6); t(doc, K.dim);
        doc.text('QR unavailable', qrX + qrSize / 2, upiY + 12, { align: 'center' });
      }
    }

    y += payCardH + 5;
  }

  // ── WATERMARK ──────────────────────────────────────────
  if (isPaid) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
    doc.setFontSize(52); doc.setFont('helvetica', 'bold'); t(doc, K.green);
    doc.text('PAID', W / 2, H / 2, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();
  }

  // ── FOOTER ─────────────────────────────────────────────
  const fy = H - 14;
  dr(doc, K.line); doc.setLineWidth(0.15); doc.line(mx, fy, rx, fy);

  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); t(doc, K.body);
  doc.text(`Thank you — ${gymName}`, W / 2, fy + 4.5, { align: 'center' });

  doc.setFontSize(5); t(doc, K.dim);
  const meta = ['Auto-generated receipt', format(new Date(), 'dd MMM yyyy, hh:mm a'), gymPhone || ''].filter(Boolean).join('  ·  ');
  doc.text(meta, W / 2, fy + 8.5, { align: 'center' });

  // ── SAVE ───────────────────────────────────────────────
  doc.save(`${gymName.replace(/\s+/g, '_')}_Receipt_${payment.id.slice(0, 8)}_${format(new Date(payment.payment_date), 'yyyyMMdd')}.pdf`);
}