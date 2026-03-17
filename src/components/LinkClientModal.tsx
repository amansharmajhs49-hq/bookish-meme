import { useState, useEffect } from 'react';
import { X, Link2, Search, UserPlus, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsFeatureLocked } from '@/hooks/useSubscription';

interface LinkClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

interface ClientOption {
  id: string;
  name: string;
  phone: string;
  isLinked: boolean;
}

export function LinkClientModal({ isOpen, onClose, clientId, clientName }: LinkClientModalProps) {
  const { toast } = useToast();
  const { isLocked, message } = useIsFeatureLocked('client_linking');
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    fetchClients();
  }, [isOpen, clientId]);

  const fetchClients = async () => {
    setLoading(true);
    const [clientsRes, linksRes] = await Promise.all([
      supabase.from('clients').select('id, name, phone').neq('id', clientId).eq('status', 'Active').order('name'),
      supabase.from('client_links').select('client_id_1, client_id_2').or(`client_id_1.eq.${clientId},client_id_2.eq.${clientId}`),
    ]);

    const linkedIds = new Set(
      (linksRes.data || []).map(l => l.client_id_1 === clientId ? l.client_id_2 : l.client_id_1)
    );

    setClients(
      (clientsRes.data || []).map(c => ({ ...c, isLinked: linkedIds.has(c.id) }))
    );
    setLoading(false);
  };

  const handleLink = async (targetId: string) => {
    setSaving(targetId);
    try {
      const { error } = await supabase.from('client_links').insert({
        client_id_1: clientId,
        client_id_2: targetId,
      });
      if (error) throw error;
      toast({ title: 'Client linked successfully' });
      await fetchClients();
    } catch (e: any) {
      toast({ title: e.message || 'Failed to link', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleUnlink = async (targetId: string) => {
    setSaving(targetId);
    try {
      const { error } = await supabase
        .from('client_links')
        .delete()
        .or(`and(client_id_1.eq.${clientId},client_id_2.eq.${targetId}),and(client_id_1.eq.${targetId},client_id_2.eq.${clientId})`);
      if (error) throw error;
      toast({ title: 'Client unlinked' });
      await fetchClients();
    } catch (e: any) {
      toast({ title: e.message || 'Failed to unlink', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const linkedClients = filtered.filter(c => c.isLinked);
  const unlinkedClients = filtered.filter(c => !c.isLinked);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Link Clients</h2>
                <p className="text-[11px] text-muted-foreground">Connect members to {clientName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLocked ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
                <div className="p-4 rounded-3xl bg-destructive/10 text-destructive shadow-inner">
                  <Lock className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black italic uppercase tracking-tight">Feature Locked</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Linked Clients */}
                {linkedClients.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Link2 className="h-3 w-3 text-primary/60" />
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.1em]">
                        Linked ({linkedClients.length})
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {linkedClients.map(c => (
                        <motion.div
                          key={c.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleUnlink(c.id)}
                            disabled={saving === c.id}
                            className="text-[11px] font-semibold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {saving === c.id ? '...' : 'Unlink'}
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Clients */}
                {unlinkedClients.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <UserPlus className="h-3 w-3 text-muted-foreground/60" />
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                        Available ({unlinkedClients.length})
                      </p>
                    </div>
                    <div className="space-y-1">
                      {unlinkedClients.map(c => (
                        <motion.div
                          key={c.id}
                          layout
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleLink(c.id)}
                            disabled={saving === c.id}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <UserPlus className="h-3 w-3" />
                            {saving === c.id ? '...' : 'Link'}
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {filtered.length === 0 && (
                  <div className="text-center py-10">
                    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No clients found</p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
