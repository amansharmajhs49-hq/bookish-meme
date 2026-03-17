import { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Eye, EyeOff, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateClient } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createAuditLog } from '@/hooks/useAuditLog';
import { ClientWithDetails } from '@/lib/types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientWithDetails;
}

export function EditClientModal({ isOpen, onClose, client }: EditClientModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateClient = useUpdateClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    goal: '',
    remarks: '',
    pin: '',
    alias_name: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (client && isOpen) {
      // Fetch PIN and alias from DB
      supabase.from('clients').select('pin, alias_name').eq('id', client.id).single().then(({ data }) => {
        setFormData({
          name: client.name,
          phone: client.phone,
          goal: client.goal || '',
          remarks: client.remarks || '',
          pin: (data as any)?.pin || '',
          alias_name: (data as any)?.alias_name || '',
        });
      });
      setPhotoPreview(client.photo_url || null);
      setPhotoFile(null);
      setShowPin(false);
    }
  }, [client, isOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: 'Name and phone are required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let photo_path = client.photo_path;

      // Upload new photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${client.id}-${Date.now()}.${fileExt}`;

        // Delete old photo if exists
        if (client.photo_path) {
          await supabase.storage.from('client-photos').remove([client.photo_path]);
        }

        const { error: uploadError } = await supabase.storage
          .from('client-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;
        photo_path = fileName;
      }

      const oldData = { name: client.name, phone: client.phone, goal: client.goal, remarks: client.remarks };
      const newData = { name: formData.name.trim(), phone: formData.phone.trim(), goal: formData.goal.trim() || null, remarks: formData.remarks.trim() || null };

      // Update PIN separately (not in the typed updateClient)
      const pinValue = formData.pin.trim() || null;
      const aliasValue = formData.alias_name.trim() || null;
      await supabase.from('clients').update({ pin: pinValue, alias_name: aliasValue } as any).eq('id', client.id);

      await updateClient.mutateAsync({
        id: client.id,
        ...newData,
        photo_path,
      });

      await createAuditLog({
        action: 'CLIENT_UPDATED',
        entityType: 'client',
        entityId: client.id,
        clientId: client.id,
        adminId: user?.id,
        oldData: oldData as any,
        newData: newData as any,
      }).catch(console.error);

      toast({ title: 'Client updated successfully' });
      onClose();
    } catch (error: any) {
      toast({ title: 'Error updating client', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Client</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <span className="text-xs text-muted-foreground">Tap to change photo</span>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm text-muted-foreground">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field mt-1"
              placeholder="Enter name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm text-muted-foreground">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field mt-1"
              placeholder="Enter phone number"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-sm text-muted-foreground">Goal</label>
            <input
              type="text"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="input-field mt-1"
              placeholder="e.g. Weight loss, Muscle gain"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="text-sm text-muted-foreground">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="input-field mt-1 min-h-[80px] resize-none"
              placeholder="Any notes about the client"
            />
          </div>

          {/* Alias Name */}
          <div>
            <label className="text-sm text-muted-foreground">Alias Name <span className="text-[10px]">(admin only, optional)</span></label>
            <input
              type="text"
              value={formData.alias_name}
              onChange={(e) => setFormData({ ...formData, alias_name: e.target.value })}
              className="input-field mt-1"
              placeholder="e.g. Rahul Morning Batch"
            />
            <p className="text-xs text-muted-foreground mt-1">Optional identifier visible only to admins</p>
          </div>

          {/* Portal PIN */}
          <div>
            <label className="text-sm text-muted-foreground">Portal PIN</label>
            <div className="relative mt-1">
              <input
                type={showPin ? 'text' : 'password'}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="input-field pr-20"
                placeholder="Set 4-6 digit PIN for client portal"
                inputMode="numeric"
                maxLength={6}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {formData.pin && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.pin);
                      toast({ title: 'PIN copied!' });
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Share this PIN with the client for portal access at /portal</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
