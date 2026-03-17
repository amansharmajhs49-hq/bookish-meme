import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { useClients, useRestoreClient, usePermanentlyDeleteClient } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { ClientAvatar } from '@/components/ClientAvatar';
import { MobileNav } from '@/components/MobileNav';
import { BinSkeleton } from '@/components/DashboardSkeleton';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Bin() {
  const { user, loading: authLoading } = useAuth();
  const { data: clients, isLoading } = useClients();
  const restoreClient = useRestoreClient();
  const permanentlyDeleteClient = usePermanentlyDeleteClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const deletedClients = clients?.filter((c) => c.status === 'Deleted') || [];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleRestore = async (id: string, name: string) => {
    await restoreClient.mutateAsync(id);
    toast({ title: `${name} restored successfully!` });
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    await permanentlyDeleteClient.mutateAsync(deleteTarget.id);
    toast({ title: `${deleteTarget.name} permanently deleted!`, variant: 'destructive' });
    setDeleteTarget(null);
  };

  if (authLoading || isLoading) {
    return <BinSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Bin</h1>
        </div>
        <span className="text-sm text-muted-foreground">{deletedClients.length} items</span>
      </header>

      <div className="p-4 space-y-3">
        {deletedClients.map((client) => (
          <div key={client.id} className="stat-card animate-fade-in">
            <div className="flex items-center gap-4">
              <ClientAvatar src={client.photo_url} name={client.name} size="md" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                <p className="text-sm text-muted-foreground">{client.phone}</p>
                <p className="text-xs text-muted-foreground">
                  Deleted on {formatDate(client.updated_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(client.id, client.name)}
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                  title="Restore"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: client.id, name: client.name })}
                  className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                  title="Delete permanently"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {deletedClients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Bin is empty</p>
          </div>
        )}
      </div>

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
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
