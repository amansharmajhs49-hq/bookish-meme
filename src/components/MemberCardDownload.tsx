import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { MembershipStatus } from '@/lib/membership';
import jsPDF from 'jspdf';

interface MemberCardProps {
  client: { id: string; name: string; phone: string; photo_url?: string };
  latestJoin?: { plan?: { name: string } | null; expiry_date: string; join_date: string } | null;
  membershipStatus: MembershipStatus;
  gymName?: string;
  primaryColor?: string;
}

const STATUS_COLOR: Record<MembershipStatus, string> = {
  ACTIVE: '#22c55e',
  PAYMENT_DUE: '#f59e0b',
  EXPIRED: '#ef4444',
  LEFT: '#f97316',
  INACTIVE: '#6b7280',
};

export function MemberCardDownload({
  client,
  latestJoin,
  membershipStatus,
  gymName = 'Aesthetic Gym',
  primaryColor = '#9c9c9c',
}: MemberCardProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });

      // Background
      doc.setFillColor(15, 15, 18);
      doc.rect(0, 0, 85.6, 54, 'F');

      // Top accent bar in primary color
      const hex = primaryColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16) || 156;
      const g = parseInt(hex.slice(2, 4), 16) || 156;
      const b = parseInt(hex.slice(4, 6), 16) || 156;
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, 85.6, 1.5, 'F');

      // Gym name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(gymName, 5, 11);

      // MEMBER CARD label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      doc.text('MEMBER CARD', 5, 17);

      // Status badge
      const sc = STATUS_COLOR[membershipStatus];
      const sr = parseInt(sc.slice(1, 3), 16);
      const sg = parseInt(sc.slice(3, 5), 16);
      const sb = parseInt(sc.slice(5, 7), 16);
      doc.setFillColor(sr, sg, sb);
      doc.roundedRect(62, 6, 20, 5, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(membershipStatus, 72, 9.5, { align: 'center' });

      // Separator line
      doc.setDrawColor(40, 40, 48);
      doc.line(5, 22, 80.6, 22);

      // Member name
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(client.name, 5, 31);

      // Plan name
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text(latestJoin?.plan?.name || 'Membership', 5, 37);

      // Expiry
      if (latestJoin?.expiry_date) {
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`Valid until ${format(parseISO(latestJoin.expiry_date), 'dd MMM yyyy')}`, 5, 43);
      }

      // Member since
      if (latestJoin?.join_date) {
        doc.setFontSize(6.5);
        doc.setTextColor(80, 80, 90);
        doc.text(`Member since ${format(parseISO(latestJoin.join_date), 'MMM yyyy')}`, 5, 49);
      }

      // Phone
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 110);
      doc.text(client.phone, 5, 52);

      // Decorative dot pattern (bottom right)
      doc.setFillColor(40, 40, 52);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          doc.circle(56 + col * 3.5, 37 + row * 3.5, 0.5, 'F');
        }
      }

      doc.save(`${client.name.replace(/\s+/g, '_')}_member_card.pdf`);
    } catch (err) {
      console.error('Card generation failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const portalUrl = `${window.location.origin}/portal`;

  return (
    <div className="space-y-3">
      {/* Preview card */}
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{
          aspectRatio: '1.586',
          background: 'linear-gradient(135deg, #0f0f12 0%, #1c1c24 60%, #0f0f12 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: primaryColor }} />

        {/* Gym name + status */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div>
            <p className="text-white font-bold" style={{ fontSize: 13 }}>{gymName}</p>
            <p style={{ color: '#9ca3af', fontSize: 8, marginTop: 1, letterSpacing: '0.08em' }}>MEMBER CARD</p>
          </div>
          <div
            className="px-2 py-0.5 rounded-full text-white font-bold"
            style={{ background: STATUS_COLOR[membershipStatus] + '33', border: `1px solid ${STATUS_COLOR[membershipStatus]}66`, fontSize: 8, color: STATUS_COLOR[membershipStatus] }}
          >
            {membershipStatus}
          </div>
        </div>

        {/* Separator */}
        <div className="absolute left-4 right-4" style={{ top: '36%', height: 1, background: 'rgba(255,255,255,0.07)' }} />

        {/* Photo */}
        {client.photo_url && (
          <div className="absolute" style={{ left: 16, top: '42%' }}>
            <img
              src={client.photo_url}
              alt=""
              className="rounded-full object-cover"
              style={{ width: 42, height: 42, border: `2px solid ${primaryColor}` }}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Member details */}
        <div className="absolute" style={{ left: client.photo_url ? 68 : 16, top: '40%' }}>
          <p className="text-white font-bold" style={{ fontSize: 14 }}>{client.name}</p>
          <p style={{ color: '#9ca3af', fontSize: 9, marginTop: 2 }}>{latestJoin?.plan?.name || 'Membership'}</p>
          {latestJoin?.expiry_date && (
            <p style={{ color: '#6b7280', fontSize: 8, marginTop: 1 }}>
              Until {format(parseISO(latestJoin.expiry_date), 'dd MMM yyyy')}
            </p>
          )}
        </div>

        {/* QR code */}
        <div className="absolute bottom-4 right-4 p-1.5 rounded-xl bg-white">
          <QRCodeSVG value={portalUrl} size={42} level="M" />
        </div>

        {/* Member since */}
        {latestJoin?.join_date && (
          <p className="absolute bottom-4 left-4" style={{ color: '#4b5563', fontSize: 7.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Since {format(parseISO(latestJoin.join_date), 'MMM yyyy')}
          </p>
        )}

        {/* Decorative dots */}
        <div className="absolute" style={{ right: 64, bottom: 12, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border',
          'text-sm font-semibold text-foreground bg-card hover:bg-muted transition-colors disabled:opacity-60'
        )}
      >
        {downloading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF...</>
          : <><Download className="h-4 w-4" /> Download Member Card</>
        }
      </button>
    </div>
  );
}
