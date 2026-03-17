import { QRCodeSVG } from 'qrcode.react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { IndianRupee } from 'lucide-react';

interface PaymentUpiQrProps {
  amount: number;
  clientName: string;
  note?: string;
}

export function PaymentUpiQr({ amount, clientName, note }: PaymentUpiQrProps) {
  const { data: settings } = useAppSettings();
  const upiDetails = settings?.upi_details;

  const upiId = upiDetails?.upi_id || (upiDetails?.phone ? `${upiDetails.phone}@ybl` : '');
  const upiName = upiDetails?.name || 'Gym';

  if (!upiId) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          UPI not configured. Go to Settings → UPI Payment QR to set up.
        </p>
      </div>
    );
  }

  const rawNote = note?.trim() || `Payment by ${clientName}`;
  const paymentNote = rawNote.replace(/\s+/g, ' ').slice(0, 80);
  const transactionRef = `GYM${Date.now().toString().slice(-10)}`;

  // Build UPI URI with tn + tr for better Google Pay compatibility
  let upiParams = `pa=${upiId}&pn=${encodeURIComponent(upiName)}&cu=INR`;
  if (amount > 0) upiParams += `&am=${amount.toFixed(2)}`;
  upiParams += `&tr=${encodeURIComponent(transactionRef)}`;
  upiParams += `&tn=${encodeURIComponent(paymentNote)}`;

  const upiLink = `upi://pay?${upiParams}`;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <IndianRupee className="h-4 w-4" />
        Scan to Pay{amount > 0 ? ` ₹${amount}` : ''}
      </div>
      <div className="flex justify-center">
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG value={upiLink} size={160} />
        </div>
      </div>
      <div className="rounded-md bg-muted/60 px-3 py-2 text-center">
        <p className="text-xs text-muted-foreground">Note / Remark</p>
        <p className="text-sm font-medium text-foreground">{paymentNote}</p>
      </div>
    </div>
  );
}
