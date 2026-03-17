import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Package, X, Tag, Search, ShoppingBag, IndianRupee } from 'lucide-react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { MobileNav } from '@/components/MobileNav';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { ProductFormModal } from '@/components/ProductFormModal';
import { ProductsPageSkeleton } from '@/components/DashboardSkeleton';

export default function Products() {
  const { user, loading: authLoading } = useAuth();
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeactivate = async (id: string) => {
    await deleteProduct.mutateAsync(id);
    toast({ title: 'Product deactivated' });
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  if (authLoading || isLoading) return <ProductsPageSkeleton />;
  if (!user) return null;

  const activeProducts = products?.filter((p) => p.active) || [];
  const inactiveProducts = products?.filter((p) => !p.active) || [];

  const filteredActive = search
    ? activeProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase())
      )
    : activeProducts;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Products</h1>
            <p className="text-xs text-muted-foreground">{activeProducts.length} active products</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
          className="p-2 rounded-lg bg-primary text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pl-10"
            placeholder="Search products or tags..."
          />
        </div>

        {/* Active Products */}
        <div className="grid grid-cols-2 gap-3">
          {filteredActive.map((product) => (
            <div
              key={product.id}
              className="relative rounded-xl border border-border bg-card p-3.5 animate-fade-in group hover:border-primary/30 transition-all"
            >
              {/* Product Icon */}
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(product)} className="p-1.5 rounded-md hover:bg-muted">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDeactivate(product.id)} className="p-1.5 rounded-md hover:bg-destructive/10">
                    <X className="h-3.5 w-3.5 text-destructive/70" />
                  </button>
                </div>
              </div>

              {/* Name */}
              <h3 className="font-semibold text-foreground text-sm truncate mb-1">{product.name}</h3>

              {/* Category */}
              {product.category && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{product.category}</p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-0.5 mb-2.5">
                <span className="text-xl font-black text-primary">{formatCurrency(Number(product.price))}</span>
              </div>

              {/* Stock Indicator */}
              {product.stock > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${product.stock > 5 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[11px] text-muted-foreground">{product.stock} in stock</span>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
                    >
                      <Tag className="h-2 w-2" />
                      {tag}
                    </span>
                  ))}
                  {product.tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{product.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredActive.length === 0 && !showForm && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">{search ? 'No matching products' : 'No products yet'}</p>
            <p className="text-sm mt-1">{search ? 'Try a different search' : 'Add your first product!'}</p>
          </div>
        )}

        {/* Inactive Products */}
        {inactiveProducts.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Deactivated ({inactiveProducts.length})
            </h3>
            {inactiveProducts.map((product) => (
              <InactiveProductRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={showForm}
        onClose={handleFormClose}
        editingProduct={editingProduct}
      />

      <MobileNav />
    </div>
  );
}

function InactiveProductRow({ product }: { product: Product }) {
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();

  return (
    <div className="rounded-xl border border-border bg-card p-3 opacity-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-muted-foreground text-sm">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{formatCurrency(Number(product.price))}</p>
        </div>
        <button
          onClick={() =>
            updateProduct.mutateAsync({ id: product.id, active: true } as any)
              .then(() => toast({ title: 'Product reactivated' }))
          }
          className="text-xs text-primary hover:underline"
        >
          Reactivate
        </button>
      </div>
    </div>
  </div>
  );
}
