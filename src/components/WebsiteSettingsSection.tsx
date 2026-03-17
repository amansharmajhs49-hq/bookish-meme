import { useState, useEffect, useRef } from 'react';
import {
  Globe, Edit, Save, Loader2, Trash2, Plus, Image, Camera, Palette,
  Phone, MessageCircle, MapPin, Clock, Instagram, Facebook, X, ExternalLink, Eye,
  Upload, ImageIcon,
} from 'lucide-react';
import { useAppSettings, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { useGalleryPhotos, useUploadGalleryPhoto, useDeleteGalleryPhoto } from '@/hooks/useGalleryPhotos';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  icon: React.ElementType;
}

const FIELDS: FieldDef[] = [
  { key: 'phone', label: 'Phone Number', placeholder: '+917651923441 ,+917376266928', icon: Phone },
  { key: 'whatsapp_number', label: 'WhatsApp (with country code, no +)', placeholder: '917651923441', icon: MessageCircle },
  { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/yourgym', icon: Instagram },
  { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/yourgym', icon: Facebook },
  { key: 'address', label: 'Address', placeholder: 'Full gym address', multiline: true, icon: MapPin },
  { key: 'timings_weekday', label: 'Weekday Timings', placeholder: 'Mon – Sat: 5:30 AM – 10:00 PM', icon: Clock },
  { key: 'timings_weekend', label: 'Weekend Timings', placeholder: 'Sunday: 6:00 AM – 12:00 PM', icon: Clock },
];

const PRESET_COLORS = [
  { name: 'Grey', value: '#9c9c9c' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#9333ea' },
];

function SectionHeader({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

export function WebsiteSettingsSection() {
  const { data: appSettings } = useAppSettings();
  const updateSetting = useUpdateAppSetting();
  const { toast } = useToast();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const ws = appSettings?.website_settings || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [galleryEnabled, setGalleryEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#9c9c9c');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroBgUrl, setHeroBgUrl] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'hero' | null>(null);

  const buildValue = (overrides: Record<string, any> = {}) => ({
    ...form,
    gallery_enabled: galleryEnabled,
    primary_color: primaryColor,
    logo_url: logoUrl,
    hero_bg_url: heroBgUrl,
    ...overrides,
  });

  useEffect(() => {
    if (ws) {
      const f: Record<string, string> = {};
      FIELDS.forEach(fd => { f[fd.key] = ws[fd.key] || ''; });
      setForm(f);
      setGalleryEnabled(ws.gallery_enabled ?? false);
      setPrimaryColor(ws.primary_color ?? '#9c9c9c');
      setLogoUrl(ws.logo_url ?? '');
      setHeroBgUrl(ws.hero_bg_url ?? '');
    }
  }, [appSettings]);

  const syncToWebsiteSettingsTable = async (values: Record<string, any>) => {
    try {
      // Fetch the single website_settings row
      const { data: existing } = await supabase.from('website_settings').select('id').limit(1).maybeSingle();
      if (!existing) {
        // Create the row if it doesn't exist
        await supabase.from('website_settings').insert({
          gym_name: values.gym_name || 'Aesthetic Gym',
          contact_phone: values.phone || '',
          contact_email: values.email || '',
          address: values.address || '',
          tagline: values.tagline || '',
          description: values.description || '',
          whatsapp_number: values.whatsapp_number || '',
          instagram_url: values.instagram_url || '',
          facebook_url: values.facebook_url || '',
          timings_weekday: values.timings_weekday || '',
          timings_weekend: values.timings_weekend || '',
          gallery_enabled: values.gallery_enabled ?? false,
          primary_color: values.primary_color || '#9C9C9C',
          logo_url: values.logo_url || '',
          hero_bg_url: values.hero_bg_url || '',
          upi_id: values.upi_id || '',
          upi_qr: values.upi_qr || '',
          payment_name: values.payment_name || '',
        });
        return;
      }

      await supabase.from('website_settings').update({
        gym_name: values.gym_name || '',
        contact_phone: values.phone || '',
        contact_email: values.email || '',
        address: values.address || '',
        tagline: values.tagline || '',
        description: values.description || '',
        whatsapp_number: values.whatsapp_number || '',
        instagram_url: values.instagram_url || '',
        facebook_url: values.facebook_url || '',
        timings_weekday: values.timings_weekday || '',
        timings_weekend: values.timings_weekend || '',
        gallery_enabled: values.gallery_enabled ?? false,
        primary_color: values.primary_color || '#9C9C9C',
        logo_url: values.logo_url || '',
        hero_bg_url: values.hero_bg_url || '',
        upi_id: values.upi_id || '',
        upi_qr: values.upi_qr || '',
        payment_name: values.payment_name || '',
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } catch (e) {
      console.error('Failed to sync website_settings table:', e);
    }
  };

  const handleSave = async () => {
    try {
      const values = buildValue();
      await updateSetting.mutateAsync({ key: 'website_settings', value: values });
      await syncToWebsiteSettingsTable(values);
      toast({ title: 'Website settings saved!' });
      setEditing(false);
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleColorChange = async (color: string) => {
    setPrimaryColor(color);
    try {
      const values = buildValue({ primary_color: color });
      await updateSetting.mutateAsync({ key: 'website_settings', value: values });
      await syncToWebsiteSettingsTable(values);
      toast({ title: 'Theme color updated!' });
    } catch {
      toast({ title: 'Failed to update color', variant: 'destructive' });
    }
  };

  const handleToggleGallery = async () => {
    const next = !galleryEnabled;
    setGalleryEnabled(next);
    try {
      const values = buildValue({ gallery_enabled: next });
      await updateSetting.mutateAsync({ key: 'website_settings', value: values });
      await syncToWebsiteSettingsTable(values);
      toast({ title: `Gallery ${next ? 'enabled' : 'disabled'} on website` });
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
      setGalleryEnabled(!next);
    }
  };

  const handleAssetUpload = async (file: File, type: 'logo' | 'hero') => {
    setUploading(type);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('website-assets')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('website-assets').getPublicUrl(path);
      const url = urlData.publicUrl;

      if (type === 'logo') {
        setLogoUrl(url);
        await updateSetting.mutateAsync({ key: 'website_settings', value: buildValue({ logo_url: url }) });
        toast({ title: 'Logo uploaded!' });
      } else {
        setHeroBgUrl(url);
        await updateSetting.mutateAsync({ key: 'website_settings', value: buildValue({ hero_bg_url: url }) });
        toast({ title: 'Hero background uploaded!' });
      }
    } catch {
      toast({ title: `Failed to upload ${type}`, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleAssetRemove = async (type: 'logo' | 'hero') => {
    const url = type === 'logo' ? logoUrl : heroBgUrl;
    if (!url) return;
    try {
      // Extract path from URL
      const parts = url.split('/website-assets/');
      if (parts[1]) {
        await supabase.storage.from('website-assets').remove([parts[1]]);
      }
      if (type === 'logo') {
        setLogoUrl('');
        await updateSetting.mutateAsync({ key: 'website_settings', value: buildValue({ logo_url: '' }) });
        toast({ title: 'Logo removed' });
      } else {
        setHeroBgUrl('');
        await updateSetting.mutateAsync({ key: 'website_settings', value: buildValue({ hero_bg_url: '' }) });
        toast({ title: 'Hero background removed' });
      }
    } catch {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Website Info Section ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <SectionHeader icon={Globe} title="Website Info">
          <div className="flex items-center gap-2">
            <a
              href="/website"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-3 w-3" />
              Preview
            </a>
            <button
              onClick={() => setEditing(!editing)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                editing
                  ? "text-muted-foreground bg-muted hover:bg-muted/80"
                  : "text-primary bg-primary/10 hover:bg-primary/15"
              )}
            >
              {editing ? <X className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </SectionHeader>

        {editing ? (
          <div className="space-y-3">
            {FIELDS.map(fd => {
              const Icon = fd.icon;
              return (
                <div key={fd.key}>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                    <Icon className="h-3 w-3" />
                    {fd.label}
                  </label>
                  {fd.multiline ? (
                    <textarea
                      value={form[fd.key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [fd.key]: e.target.value }))}
                      className="input-field w-full min-h-[60px] resize-y text-sm"
                      placeholder={fd.placeholder}
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[fd.key] || ''}
                      onChange={e => setForm(prev => ({ ...prev, [fd.key]: e.target.value }))}
                      className="input-field w-full text-sm"
                      placeholder={fd.placeholder}
                    />
                  )}
                </div>
              );
            })}
            <button
              onClick={handleSave}
              disabled={updateSetting.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {updateSetting.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updateSetting.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {FIELDS.map(fd => {
              const Icon = fd.icon;
              const value = form[fd.key];
              return (
                <div key={fd.key} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{fd.label}</p>
                    {value ? (
                      <p className="text-xs font-medium text-foreground break-words">{value}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 italic">Not set</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Branding Section (Logo + Hero BG) ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <SectionHeader icon={ImageIcon} title="Branding" />

        {/* Logo Upload */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Gym Logo</p>
          {logoUrl ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-xl object-contain bg-background border border-border" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Logo uploaded</p>
                <button
                  onClick={() => handleAssetRemove('logo')}
                  className="text-[11px] text-destructive hover:underline mt-0.5"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-colors",
              uploading === 'logo' && "pointer-events-none opacity-60"
            )}>
              {uploading === 'logo' ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {uploading === 'logo' ? 'Uploading...' : 'Upload logo (PNG, JPG)'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAssetUpload(file, 'logo');
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>

        {/* Hero Background Upload */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Hero Background Image</p>
          {heroBgUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={heroBgUrl} alt="Hero background" className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleAssetRemove('hero')}
                  className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
                >
                  <Trash2 className="h-3 w-3 inline mr-1" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-colors",
              uploading === 'hero' && "pointer-events-none opacity-60"
            )}>
              {uploading === 'hero' ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {uploading === 'hero' ? 'Uploading...' : 'Upload hero background (recommended 1920×1080)'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAssetUpload(file, 'hero');
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* ── Theme Color Section ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <SectionHeader icon={Palette} title="Theme Color" />

        {/* Current color preview */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <div
            className="h-10 w-10 rounded-lg border-2 border-background shadow-sm shrink-0"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Current Color</p>
            <p className="text-[11px] text-muted-foreground font-mono uppercase">{primaryColor}</p>
          </div>
        </div>

        {/* Preset colors */}
        <div className="grid grid-cols-9 gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color.value)}
              disabled={updateSetting.isPending}
              className={cn(
                "aspect-square rounded-lg transition-all hover:scale-110 relative",
                primaryColor === color.value && "ring-2 ring-offset-2 ring-offset-card"
              )}
              style={{
                backgroundColor: color.value,
                ...(primaryColor === color.value ? { boxShadow: `0 0 0 2px ${color.value}` } : {}),
              }}
              title={color.name}
            >
              {primaryColor === color.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white shadow" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Custom color picker */}
        <button
          onClick={() => colorInputRef.current?.click()}
          disabled={updateSetting.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Palette className="h-3.5 w-3.5" />
          Pick Custom Color
          <input
            ref={colorInputRef}
            type="color"
            value={primaryColor}
            onChange={e => handleColorChange(e.target.value)}
            className="hidden"
          />
        </button>
      </div>

      {/* ── Gallery Section ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <SectionHeader icon={Camera} title="Photo Gallery" />

        <button
          onClick={handleToggleGallery}
          disabled={updateSetting.isPending}
          className={cn(
            "w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all",
            galleryEnabled
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-background"
          )}
        >
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-foreground">Show Gallery on Website</p>
            <p className="text-[11px] text-muted-foreground">Display photos in a gallery section for visitors</p>
          </div>
          {/* Toggle pill */}
          <div className={cn(
            "relative h-6 w-11 rounded-full transition-colors shrink-0",
            galleryEnabled ? "bg-primary" : "bg-muted"
          )}>
            <div className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              galleryEnabled ? "translate-x-[22px]" : "translate-x-0.5"
            )} />
          </div>
        </button>

        {galleryEnabled && <GalleryManager />}
      </div>
    </div>
  );
}

function GalleryManager() {
  const { data: photos, isLoading } = useGalleryPhotos();
  const uploadPhoto = useUploadGalleryPhoto();
  const deletePhoto = useDeleteGalleryPhoto();
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        await uploadPhoto.mutateAsync(file);
      } catch {
        toast({ title: `Failed to upload ${file.name}`, variant: 'destructive' });
      }
    }
    toast({ title: `${files.length} photo(s) uploaded!` });
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {photos?.length || 0} photo{(photos?.length || 0) !== 1 ? 's' : ''}
        </p>
        <label className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/15 transition-colors cursor-pointer">
          <Plus className="h-3 w-3" /> Add Photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploadPhoto.isPending}
          />
        </label>
      </div>

      {uploadPhoto.isPending && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading photos...
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !photos || photos.length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-border bg-muted/30">
          <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Upload photos to show on your website</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.name} className="relative group rounded-xl overflow-hidden aspect-square bg-muted border border-border">
              <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                onClick={async () => {
                  await deletePhoto.mutateAsync(photo.name);
                  toast({ title: 'Photo deleted' });
                }}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
