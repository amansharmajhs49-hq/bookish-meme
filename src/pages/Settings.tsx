import { useEffect, useState, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Upload, LogOut, Dumbbell, FileText, Shield, UserPlus,
  Sun, Moon, Monitor, Palette, Check, Loader2, Table, Users, CreditCard,
  ShoppingBag, Database, Megaphone, Plus, Send, Trash2, QrCode, IndianRupee,
  Edit, Save, ChevronDown, Settings2, BarChart3, RotateCcw, Receipt, CheckCircle2, AlertCircle, Smartphone, Eye, Globe, MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useClients, useRestoreClient, usePermanentlyDeleteClient } from '@/hooks/useClients';
import { usePlans } from '@/hooks/usePlans';
import { useIsSuperAdmin, useIsAdmin } from '@/hooks/useRoles';
import { useAppSettings, useUpdateAppSetting } from '@/hooks/useAppSettings';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { MobileNav } from '@/components/MobileNav';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTheme, ACCENT_OPTIONS } from '@/hooks/useTheme';
import {
  exportClients, exportMemberships, exportPayments, exportProducts,
  exportFullData, exportCSV,
} from '@/lib/export';
import { useAnnouncements, useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { BulkWhatsAppSender } from '@/components/BulkWhatsAppSender';
import { WebsiteSettingsSection } from '@/components/WebsiteSettingsSection';
import { SuggestionsViewer } from '@/components/SuggestionsViewer';
import type { Announcement } from '@/hooks/useAnnouncements';

type ThemeMode = 'light' | 'dark' | 'system';

/* ── Collapsible Section Component ── */
function SettingsSection({
  icon: Icon,
  title,
  badge,
  children,
  defaultOpen = false,
  borderAccent = false,
}: {
  icon: typeof Sun;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  borderAccent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors ${borderAccent ? 'border-primary/25' : 'border-border'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {badge}
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-4 animate-fade-in">
          <div className="h-px bg-border -mx-4" />
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Swipe Navigation Toggle ── */
function SwipeNavigationToggle() {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('swipe-navigation-enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('swipe-navigation-enabled', String(next));
    window.dispatchEvent(new Event('swipe-setting-changed'));
  };

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors ${enabled ? 'border-primary/25' : 'border-border'}`}>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Swipe Navigation</h3>
          <p className="text-[11px] text-muted-foreground">Swipe left/right to switch between sections</p>
        </div>
        <span className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {enabled ? 'ON' : 'OFF'}
        </span>
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: clients } = useClients();
  const { data: plans } = usePlans();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const { data: isAdmin } = useIsAdmin();
  const { data: appSettings } = useAppSettings();
  const { data: auditLogs } = useAuditLogs(1000);
  const updateSetting = useUpdateAppSetting();
  const { toast } = useToast();
  const { mode, accent, setMode, setAccent } = useTheme();
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any[] | null>(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [sendingAnnouncement, setSendingAnnouncement] = useState<Announcement | null>(null);
  const { data: announcements } = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();
  const restoreClient = useRestoreClient();
  const permanentlyDeleteClient = usePermanentlyDeleteClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [editingUpi, setEditingUpi] = useState(false);
  const [upiPhone, setUpiPhone] = useState('');
  const [upiName, setUpiName] = useState('Aesthetic Gym');
  const [upiId, setUpiId] = useState('');
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState('Aesthetic Gym');
  const [contactPhones, setContactPhones] = useState<string[]>(['']);
  const [contactNote, setContactNote] = useState('Your Fitness Partner 💪');
  const [contactWhatsAppMsg, setContactWhatsAppMsg] = useState('Hi 👋');
  const [contactQrMode, setContactQrMode] = useState<'vcard' | 'whatsapp'>('vcard');
  const [whatsappPhoneIndex, setWhatsappPhoneIndex] = useState(0);

  useEffect(() => {
    if (appSettings?.upi_details) {
      setUpiPhone(appSettings.upi_details.phone || '');
      setUpiName(appSettings.upi_details.name || 'Aesthetic Gym');
      setUpiId(appSettings.upi_details.upi_id || '');
    }
  }, [appSettings]);

  useEffect(() => {
    if (appSettings?.gym_contact) {
      setContactName(appSettings.gym_contact.name || 'Aesthetic Gym');
      // Support both legacy single phone and new phones array
      const phones = appSettings.gym_contact.phones || (appSettings.gym_contact.phone ? [appSettings.gym_contact.phone] : ['']);
      setContactPhones(phones.length > 0 ? phones : ['']);
      setContactNote(appSettings.gym_contact.note || 'Your Fitness Partner 💪');
      setContactWhatsAppMsg(appSettings.gym_contact.whatsapp_msg || 'Hi 👋');
    }
  }, [appSettings]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!user) return null;

  const runExport = async (key: string, fn: () => Promise<void>, label: string) => {
    if (exportingKey) return;
    setExportingKey(key);
    try {
      await fn();
      toast({ title: `${label} exported successfully!` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExportingKey(null);
    }
  };

  const handleToggleSignup = async () => {
    const currentEnabled = appSettings?.signup_enabled?.enabled ?? false;
    try {
      await updateSetting.mutateAsync({ key: 'signup_enabled', value: { enabled: !currentEnabled } });
      toast({ title: `Sign-ups ${!currentEnabled ? 'enabled' : 'disabled'}` });
    } catch {
      toast({ title: 'Failed to update setting', variant: 'destructive' });
    }
  };

  const handleSaveUpi = async () => {
    try {
      const effectiveUpiId = upiId || (upiPhone ? `${upiPhone}@ybl` : '');
      await updateSetting.mutateAsync({
        key: 'upi_details',
        value: { phone: upiPhone, name: upiName, upi_id: effectiveUpiId },
      });
      toast({ title: 'UPI details saved!' });
      setEditingUpi(false);
    } catch {
      toast({ title: 'Failed to save UPI details', variant: 'destructive' });
    }
  };

  const handleSaveContact = async () => {
    const validPhones = contactPhones.filter(p => p.trim());
    if (validPhones.length === 0) {
      toast({ title: 'Please enter at least one phone number', variant: 'destructive' });
      return;
    }
    try {
      await updateSetting.mutateAsync({
        key: 'gym_contact',
        value: { name: contactName, phone: validPhones[0], phones: validPhones, note: contactNote, whatsapp_msg: contactWhatsAppMsg },
      });
      toast({ title: 'Contact details saved!' });
      setEditingContact(false);
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const getUpiLink = (amount?: number, note?: string) => {
    const id = upiId || (upiPhone ? `${upiPhone}@ybl` : '');
    if (!id) return '';
    const params = new URLSearchParams({ pa: id, pn: upiName, cu: 'INR' });
    if (amount) params.set('am', amount.toString());
    if (note) params.set('tn', note);
    return `upi://pay?${params.toString()}`;
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/website';
  };

  const signupEnabled = appSettings?.signup_enabled?.enabled ?? false;

  const themeModes: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  const exportOptions = [
    { key: 'full', label: 'Full System Data', desc: '6 sheets: Clients, Memberships, Payments, Products, Plans, Logs', icon: Database, action: () => runExport('full', () => exportFullData(clients || [], auditLogs || [], plans || []), 'Full data') },
    { key: 'clients', label: 'Clients', desc: 'All client profiles with dues & balances', icon: Users, action: () => runExport('clients', () => exportClients(clients || []), 'Clients') },
    { key: 'memberships', label: 'Memberships', desc: 'All membership records with payment status', icon: Table, action: () => runExport('memberships', () => exportMemberships(clients || []), 'Memberships') },
    { key: 'payments', label: 'Payments', desc: 'All payment history with linked entities', icon: CreditCard, action: () => runExport('payments', () => exportPayments(clients || []), 'Payments') },
    { key: 'products', label: 'Product Purchases', desc: 'All product sales with dues', icon: ShoppingBag, action: () => runExport('products', () => exportProducts(clients || []), 'Products') },
    { key: 'csv', label: 'Clients (CSV)', desc: 'Simple CSV for quick sharing', icon: FileText, action: () => { exportCSV(clients || []); toast({ title: 'CSV exported!' }); } },
  ];

  const totalClients = clients?.filter((c) => c.status !== 'Deleted').length || 0;
  const activePlans = plans?.filter((p) => p.active).length || 0;
  const totalRevenue = clients?.reduce((sum, c) => sum + c.paidAmount, 0) || 0;
  const pendingDues = clients?.reduce((sum, c) => sum + c.dueAmount, 0) || 0;

  return (
    <div className="page-container overflow-x-hidden">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your gym</p>
          </div>
        </div>
        <Settings2 className="h-5 w-5 text-muted-foreground shrink-0" />
      </header>

      <div className="p-4 space-y-4 pb-24 overflow-x-hidden">
        {/* ── Profile Card ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 shrink-0">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">Aesthetic Gym</h2>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1.5">
                  <Shield className="h-2.5 w-2.5" /> Super Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Total Clients', value: totalClients, icon: Users, color: 'text-primary' },
            { label: 'Active Plans', value: activePlans, icon: Table, color: 'text-info' },
            { label: 'Revenue', value: formatCurrency(totalRevenue), icon: BarChart3, color: 'text-success' },
            { label: 'Pending Dues', value: formatCurrency(pendingDues), icon: CreditCard, color: 'text-destructive' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 space-y-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span className="text-[11px] text-muted-foreground truncate">{label}</span>
              </div>
              <p className={`text-base font-bold truncate ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Section Label ── */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Preferences</p>
        </div>

        {/* ── Theme & Appearance ── */}
        <SettingsSection icon={Palette} title="Theme & Appearance" defaultOpen>
          <div className="space-y-4">
            {/* Mode */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {themeModes.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      mode === key
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Accent Color</p>
              <div className="flex gap-3 flex-wrap">
                {ACCENT_OPTIONS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setAccent(key)}
                    className="relative flex flex-col items-center gap-1.5 group"
                    title={label}
                  >
                    <div
                      className={`h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center ring-2 ring-offset-2 ring-offset-background ${
                        accent === key ? 'ring-foreground scale-110' : 'ring-transparent group-hover:ring-muted-foreground/30'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {accent === key && <Check className="h-4 w-4 text-white" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ── Admin Controls ── */}
        {isSuperAdmin && (
          <>
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Admin Controls</p>
            </div>

            {/* Super Admin Controls */}
            <SettingsSection icon={Shield} title="Access & Security" borderAccent>
              <button
                onClick={handleToggleSignup}
                disabled={updateSetting.isPending}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  signupEnabled
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium">New Sign-ups</p>
                  <p className="text-[11px] text-muted-foreground">Allow new admins to register</p>
                </div>
                <span className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  signupEnabled
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {signupEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </SettingsSection>

            {/* Signup Approvals */}
            <PendingSignupsSection />

            {/* Expense Tracker Toggle */}
            <SettingsSection icon={Receipt} title="Expense Tracker" borderAccent>
              <p className="text-xs text-muted-foreground">
                Track gym expenses like rent, salaries, equipment, and more.
              </p>
              <button
                onClick={async () => {
                  const currentEnabled = appSettings?.expense_tracker_enabled?.enabled ?? false;
                  try {
                    await updateSetting.mutateAsync({ key: 'expense_tracker_enabled', value: { enabled: !currentEnabled } });
                    toast({ title: `Expense Tracker ${!currentEnabled ? 'enabled' : 'disabled'}` });
                  } catch {
                    toast({ title: 'Failed to update setting', variant: 'destructive' });
                  }
                }}
                disabled={updateSetting.isPending}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  appSettings?.expense_tracker_enabled?.enabled
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium">Enable Expense Tracker</p>
                  <p className="text-[11px] text-muted-foreground">Show expenses page in navigation</p>
                </div>
                <span className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  appSettings?.expense_tracker_enabled?.enabled
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {appSettings?.expense_tracker_enabled?.enabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </SettingsSection>

            {/* Website Settings */}
            <SettingsSection icon={Globe} title="Website Settings" borderAccent>
              <WebsiteSettingsSection />
            </SettingsSection>

            {/* Swipe Navigation Toggle */}
            <SwipeNavigationToggle />

            {/* Announcements */}
            <SettingsSection icon={Megaphone} title="Announcements" badge={
              announcements && announcements.length > 0 ? (
                <span className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{announcements.length}</span>
              ) : null
            } borderAccent>
              <p className="text-xs text-muted-foreground">
                Create announcements for holidays, closures, or events and send via WhatsApp.
              </p>
              <button
                onClick={() => setAnnouncementModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary bg-primary/10 py-2.5 rounded-xl hover:bg-primary/15 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create Announcement
              </button>
              {announcements && announcements.length > 0 && (
                <div className="space-y-2">
                  {announcements.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.announcement_type} · {format(new Date(a.created_at), 'dd MMM yyyy')}
                          {a.occasion_date && ` · ${format(new Date(a.occasion_date), 'dd MMM')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSendingAnnouncement(a)} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Send">
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => { await deleteAnnouncement.mutateAsync(a.id); toast({ title: 'Announcement deleted' }); }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SettingsSection>

            {/* UPI Payment QR */}
            {/* Super Admin Promotion */}
            <AdminUsersSection />

            <SettingsSection icon={IndianRupee} title="UPI Payment QR" borderAccent>
              {(isSuperAdmin || isAdmin) && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditingUpi(!editingUpi)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/15 transition-colors"
                  >
                    <Edit className="h-3 w-3" />
                    {editingUpi ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              )}

              {editingUpi && (isSuperAdmin || isAdmin) ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                    <input type="tel" value={upiPhone} onChange={e => setUpiPhone(e.target.value)} className="input-dark w-full mt-1" placeholder="9876543210" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                    <input type="text" value={upiName} onChange={e => setUpiName(e.target.value)} className="input-dark w-full mt-1" placeholder="Aesthetic Gym" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">UPI ID <span className="font-normal text-muted-foreground/70">(auto-generated if empty)</span></label>
                    <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} className="input-dark w-full mt-1" placeholder="9876543210@ybl" />
                  </div>
                  <button onClick={handleSaveUpi} disabled={updateSetting.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Save className="h-4 w-4" />
                    {updateSetting.isPending ? 'Saving...' : 'Save UPI Details'}
                  </button>
                </div>
              ) : getUpiLink() ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <QRCodeSVG key={`upi-${upiId}-${upiPhone}-${upiName}`} value={getUpiLink()} size={180} level="H" fgColor="#000000" bgColor="#ffffff" />
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-sm font-semibold">{upiName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{upiId || `${upiPhone}@ybl`}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No UPI details configured</p>
                  <p className="text-xs mt-1">Tap Edit to add your payment details</p>
                </div>
              )}
            </SettingsSection>
          </>
        )}

        {/* ── Portal Activity ── */}
        <PortalLoginHistory />

        {/* ── Suggestions ── */}
        <SettingsSection icon={MessageSquare} title="Member Suggestions" badge={null}>
          <p className="text-xs text-muted-foreground">
            Suggestions submitted by members from the portal.
          </p>
          <SuggestionsViewer />
        </SettingsSection>

        {/* ── QR Codes & Tools ── */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">QR Codes & Tools</p>
        </div>

        {/* Gym Contact QR */}
        <SettingsSection icon={QrCode} title="Gym Contact QR">
          <p className="text-xs text-muted-foreground">
            Clients scan this QR to save your gym contact — great for WhatsApp broadcast reach!
          </p>

          {editingContact ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gym Name</label>
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="input-dark w-full mt-1" placeholder="Aesthetic Gym" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone Numbers</label>
                <div className="space-y-2 mt-1">
                  {contactPhones.map((phone, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => {
                          const updated = [...contactPhones];
                          updated[idx] = e.target.value;
                          setContactPhones(updated);
                        }}
                        className="input-dark w-full"
                        placeholder={idx === 0 ? 'Primary number' : `Number ${idx + 1}`}
                      />
                      {contactPhones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setContactPhones(contactPhones.filter((_, i) => i !== idx))}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {contactPhones.length < 4 && (
                    <button
                      type="button"
                      onClick={() => setContactPhones([...contactPhones, ''])}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary bg-primary/10 py-2 rounded-lg hover:bg-primary/15 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Number
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                <input type="text" value={contactNote} onChange={e => setContactNote(e.target.value)} className="input-dark w-full mt-1" placeholder="Your Fitness Partner 💪" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">WhatsApp Greeting Message</label>
                <input type="text" value={contactWhatsAppMsg} onChange={e => setContactWhatsAppMsg(e.target.value)} className="input-dark w-full mt-1" placeholder="Hi 👋" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Pre-filled message when clients scan the WhatsApp QR</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveContact} disabled={updateSetting.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />
                  {updateSetting.isPending ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditingContact(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {contactPhones.filter(p => p.trim()).length > 0 ? (
                <div className="space-y-3">
                  {/* Mode toggle */}
                  <div className="flex rounded-xl bg-muted p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setContactQrMode('vcard')}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                        contactQrMode === 'vcard' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      📇 Save Contact
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactQrMode('whatsapp')}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                        contactQrMode === 'whatsapp' ? 'bg-green-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      💬 WhatsApp Hi
                    </button>
                  </div>

                  {/* WhatsApp phone selector when multiple numbers */}
                  {contactQrMode === 'whatsapp' && contactPhones.filter(p => p.trim()).length > 1 && (
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {contactPhones.filter(p => p.trim()).map((phone, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setWhatsappPhoneIndex(idx)}
                          className={cn(
                            'px-3 py-1 rounded-lg text-xs font-medium transition-all border',
                            whatsappPhoneIndex === idx
                              ? 'bg-green-600 text-white border-green-600'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          +91 {phone.trim()}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      {(() => {
                        const validPhones = contactPhones.filter(p => p.trim());
                        if (contactQrMode === 'vcard') {
                          const telLines = validPhones.map((p, i) =>
                            `TEL;TYPE=CELL${i === 0 ? ',PREF' : ''}:+91${p.replace(/\D/g, '')}`
                          );
                          const vcardValue = [
                            'BEGIN:VCARD', 'VERSION:3.0',
                            `FN:${contactName}`, `ORG:${contactName}`,
                            ...telLines,
                            `NOTE:${contactNote}`, 'END:VCARD',
                          ].join('\n');
                          return <QRCodeSVG key={`vcard-${vcardValue.length}-${contactName}`} value={vcardValue} size={160} level="M" fgColor="#000000" bgColor="#ffffff" />;
                        } else {
                          const selectedPhone = validPhones[whatsappPhoneIndex] || validPhones[0];
                          const waLink = `https://wa.me/91${selectedPhone.replace(/\D/g, '')}?text=${encodeURIComponent(contactWhatsAppMsg || 'Hi 👋')}`;
                          return <QRCodeSVG key={`wa-${waLink}`} value={waLink} size={160} level="M" fgColor="#000000" bgColor="#ffffff" />;
                        }
                      })()}
                    </div>
                    <div className="text-center space-y-0.5">
                      <p className="text-sm font-semibold">{contactName}</p>
                      <div className="flex flex-wrap justify-center gap-1">
                        {contactPhones.filter(p => p.trim()).map((phone, idx) => (
                          <span key={idx} className="text-xs text-muted-foreground font-mono">+91 {phone.trim()}{idx < contactPhones.filter(p => p.trim()).length - 1 ? ' ·' : ''}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {contactQrMode === 'vcard' 
                          ? `Scan to save ${contactPhones.filter(p => p.trim()).length > 1 ? 'all numbers' : 'contact number'}` 
                          : 'Scan to open WhatsApp & say Hi'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <QrCode className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No contact details set</p>
                  <p className="text-xs mt-1">Tap Edit to configure</p>
                </div>
              )}
              {(isSuperAdmin || isAdmin) && (
                <button
                  onClick={() => setEditingContact(true)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-medium text-primary bg-primary/10 py-2.5 rounded-xl hover:bg-primary/15 transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Contact Details
                </button>
              )}
            </>
          )}
        </SettingsSection>

        {/* ── Data & Export ── */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Data & Export</p>
        </div>

        <SettingsSection icon={Download} title="Export Data">
          <p className="text-xs text-muted-foreground">
            Download formatted Excel files with styled headers, filters, and currency formatting.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {exportOptions.map(({ key, label, desc, icon: Icon, action }) => (
              <button
                key={key}
                onClick={action}
                disabled={!!exportingKey}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {exportingKey === key ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs font-medium truncate w-full">{label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 w-full">{desc}</p>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* ── Import Data ── */}
        <SettingsSection icon={Upload} title="Import Data">
          <p className="text-xs text-muted-foreground">
            Import data from exported Excel files. Supports Clients, Memberships, Payments, Product Purchases, and Expenses sheets. Existing clients (same phone) are updated.
          </p>
          <label className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
            importing ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
          }`}>
            {importing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
            ) : (
              <><Upload className="h-4 w-4" /> Choose Excel File (.xlsx)</>
            )}
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={importing}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true);
                setImportResults(null);
                try {
                  const { importExcelFile } = await import('@/lib/import');
                  const results = await importExcelFile(file);
                  setImportResults(results);
                  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
                  const hasErrors = results.some(r => r.errors.length > 0);
                  toast({
                    title: totalInserted > 0 ? `Imported ${totalInserted} records!` : 'No new records imported',
                    variant: hasErrors ? 'destructive' : undefined,
                  });
                  // Refresh data
                  if (results.some(r => r.inserted > 0)) {
                    window.location.reload();
                  }
                } catch (err: any) {
                  toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
                } finally {
                  setImporting(false);
                  e.target.value = '';
                }
              }}
            />
          </label>

          {importResults && (
            <div className="space-y-2">
              {importResults.map((r, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm space-y-1 ${
                  r.errors.length > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-primary/30 bg-primary/5'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    {r.errors.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span>{r.sheet}</span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-6">
                    {r.inserted > 0 && <span className="text-primary font-medium">{r.inserted} imported</span>}
                    {r.inserted > 0 && ((r as any).updated > 0 || r.skipped > 0) && <span> · </span>}
                    {(r as any).updated > 0 && <span className="text-amber-500 font-medium">{(r as any).updated} updated</span>}
                    {(r as any).updated > 0 && r.skipped > 0 && <span> · </span>}
                    {r.skipped > 0 && <span>{r.skipped} skipped (duplicates/empty)</span>}
                  </div>
                  {r.errors.map((err: string, j: number) => (
                    <p key={j} className="text-xs text-destructive pl-6">{err}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </SettingsSection>

        {/* ── Bin ── */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Danger Zone</p>
        </div>

        <SettingsSection icon={Trash2} title="Deleted Clients" badge={
          (() => {
            const deletedClients = clients?.filter((c) => c.status === 'Deleted') || [];
            return deletedClients.length > 0 ? (
              <span className="text-[10px] font-bold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">{deletedClients.length}</span>
            ) : null;
          })()
        } borderAccent>
          {(() => {
            const deletedClients = clients?.filter((c) => c.status === 'Deleted') || [];
            if (deletedClients.length === 0) {
              return (
                <div className="text-center py-6">
                  <Trash2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Bin is empty</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Deleted clients will appear here</p>
                </div>
              );
            }
            return (
              <div className="space-y-2">
                {deletedClients.map((client) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background animate-fade-in">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-[11px] text-muted-foreground">{client.phone}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          await restoreClient.mutateAsync(client.id);
                          toast({ title: `${client.name} restored!` });
                        }}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: client.id, name: client.name })}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </SettingsSection>

        {/* ── Sign Out ── */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All data including payment history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                await permanentlyDeleteClient.mutateAsync(deleteTarget.id);
                toast({ title: `${deleteTarget.name} permanently deleted!`, variant: 'destructive' });
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
      <AnnouncementModal open={announcementModalOpen} onOpenChange={setAnnouncementModalOpen} />
      <BulkWhatsAppSender open={!!sendingAnnouncement} onOpenChange={() => setSendingAnnouncement(null)} announcement={sendingAnnouncement} />
    </div>
  );
}

/* ── Portal Login History Component ── */
function PortalLoginHistory() {
  const [logins, setLogins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadLogins = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('portal_logins' as any)
        .select('*')
        .order('logged_in_at', { ascending: false })
        .limit(50);
      setLogins((data as any[]) || []);
      setLoaded(true);
    } catch {
      setLogins([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSection icon={Eye} title="Portal Activity" badge={
      logins.length > 0 ? (
        <span className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{logins.length}</span>
      ) : null
    }>
      <p className="text-xs text-muted-foreground">
        See which clients checked their details via the member portal.
      </p>
      {!loaded ? (
        <button
          onClick={loadLogins}
          disabled={loading}
          className="btn-secondary text-sm w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Load Portal Activity
        </button>
      ) : logins.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No portal logins yet</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {logins.map((login: any) => (
            <div key={login.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{login.client_name}</p>
                  <p className="text-xs text-muted-foreground">{login.client_phone}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground shrink-0 ml-2">
                {format(new Date(login.logged_in_at), 'dd MMM, hh:mm a')}
              </p>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

/* ── Pending Signups Section ── */
function PendingSignupsSection() {
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  

  const loadSignups = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pending_signups')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setSignups(data || []);
      setLoaded(true);
    } catch {
      setSignups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (signup: any) => {
    setActionLoading(signup.id);
    try {
      // Assign 'user' role
      await supabase.from('user_roles').insert({ user_id: signup.user_id, role: 'user' });
      // Update signup status
      await supabase
        .from('pending_signups')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() } as any)
        .eq('id', signup.id);
      setSignups(prev => prev.filter(s => s.id !== signup.id));
      toast({ title: `${signup.email} approved!` });
    } catch (e: any) {
      toast({ title: 'Failed to approve', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (signup: any) => {
    if (!confirm(`Reject ${signup.email}?`)) return;
    setActionLoading(signup.id);
    try {
      await supabase
        .from('pending_signups')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() } as any)
        .eq('id', signup.id);
      setSignups(prev => prev.filter(s => s.id !== signup.id));
      toast({ title: `${signup.email} rejected` });
    } catch {
      toast({ title: 'Failed to reject', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = signups.length;

  return (
    <SettingsSection
      icon={UserPlus}
      title="Signup Approvals"
      borderAccent
      badge={pendingCount > 0 ? (
        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-full">{pendingCount}</span>
      ) : null}
    >
      <p className="text-xs text-muted-foreground">
        Review and approve new user registrations.
      </p>
      {!loaded ? (
        <button
          onClick={loadSignups}
          disabled={loading}
          className="btn-secondary text-sm w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Load Pending Signups
        </button>
      ) : signups.length === 0 ? (
        <div className="text-center py-4">
          <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary/40" />
          <p className="text-sm text-muted-foreground">No pending signups</p>
        </div>
      ) : (
        <div className="space-y-2">
          {signups.map(signup => (
            <div key={signup.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{signup.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(signup.created_at), 'dd MMM yyyy, hh:mm a')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleApprove(signup)}
                  disabled={actionLoading === signup.id}
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  title="Approve"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleReject(signup)}
                  disabled={actionLoading === signup.id}
                  className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  title="Reject"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

/* ── Admin Users Management (Super Admin Promotion) ── */
function AdminUsersSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(data || []);
      setLoaded(true);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (userId: string) => {
    setActionLoading(userId);
    try {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'super_admin' });
      toast({ title: 'Promoted to Super Admin' });
      loadUsers();
    } catch {
      toast({ title: 'Failed to promote', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm('Remove Super Admin privileges?')) return;
    setActionLoading(userId);
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'super_admin');
      toast({ title: 'Super Admin removed' });
      loadUsers();
    } catch {
      toast({ title: 'Failed to demote', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  // Group by user_id
  const userMap = useMemo(() => {
    const map = new Map<string, { roles: string[] }>();
    users.forEach(u => {
      if (!map.has(u.user_id)) map.set(u.user_id, { roles: [] });
      map.get(u.user_id)!.roles.push(u.role);
    });
    return map;
  }, [users]);

  return (
    <SettingsSection icon={Shield} title="User Management" borderAccent>
      <p className="text-xs text-muted-foreground">
        Promote or demote users to Super Admin.
      </p>
      {!loaded ? (
        <button
          onClick={loadUsers}
          disabled={loading}
          className="btn-secondary text-sm w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          Load Users
        </button>
      ) : userMap.size === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
      ) : (
        <div className="space-y-2">
          {Array.from(userMap.entries()).map(([userId, { roles }]) => {
            const isSA = roles.includes('super_admin');
            return (
              <div key={userId} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground truncate">{userId.slice(0, 8)}...</p>
                  <div className="flex gap-1 mt-1">
                    {roles.map(r => (
                      <span key={r} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        r === 'super_admin' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>{r}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  {isSA ? (
                    <button
                      onClick={() => handleDemote(userId)}
                      disabled={actionLoading === userId}
                      className="text-xs font-medium text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg hover:bg-destructive/20 disabled:opacity-50"
                    >
                      Remove SA
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePromote(userId)}
                      disabled={actionLoading === userId}
                      className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 disabled:opacity-50"
                    >
                      Promote
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}