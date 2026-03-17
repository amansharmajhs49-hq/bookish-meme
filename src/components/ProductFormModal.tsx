import { useState, useEffect } from 'react';
import { Check, Tag, Package } from 'lucide-react';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { createAuditLog } from '@/hooks/useAuditLog';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const PRESET_TAGS = ['supplement', 'protein', 'gainer', 'vitamin', 'fat burner', 'creatine', 'bcaa', 'pre-workout'];
const CATEGORIES = ['Supplements', 'Nutrition', 'Accessories', 'Apparel', 'Other'];

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
}

export function ProductFormModal({ isOpen, onClose, editingProduct }: ProductFormModalProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    tags: [] as string[],
    customTag: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setFormData({
          name: editingProduct.name,
          description: editingProduct.description || '',
          price: editingProduct.price.toString(),
          category: editingProduct.category || '',
          tags: editingProduct.tags || [],
          customTag: '',
        });
      } else {
        setFormData({ name: '', description: '', price: '', category: '', tags: [], customTag: '' });
      }
      setErrors({});
    }
  }, [editingProduct, isOpen]);

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const addCustomTag = () => {
    const tag = formData.customTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag], customTag: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price || Number(formData.price) <= 0) newErrors.price = 'Price must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          name: formData.name,
          description: formData.description || null,
          price: Number(formData.price),
          category: formData.category || null,
          tags: formData.tags,
        } as any);
        await createAuditLog({
          action: 'PRODUCT_EDITED',
          entityType: 'product',
          entityId: editingProduct.id,
          adminId: user?.id,
          oldData: { name: editingProduct.name, price: editingProduct.price },
          newData: { name: formData.name, price: Number(formData.price), tags: formData.tags },
        });
        toast({ title: 'Product updated!' });
      } else {
        const product = await createProduct.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          price: Number(formData.price),
          stock: 0,
          category: formData.category || undefined,
          tags: formData.tags,
        });
        await createAuditLog({
          action: 'PRODUCT_CREATED',
          entityType: 'product',
          entityId: product.id,
          adminId: user?.id,
          newData: { name: formData.name, price: Number(formData.price), tags: formData.tags },
        });
        toast({ title: 'Product created!' });
      }
      onClose();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to save product', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[460px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editingProduct ? 'Edit product details' : 'Create a new product'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Product Name */}
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Product Name *</Label>
              <Input
                id="product-name"
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }}
                placeholder="e.g., Whey Protein"
                autoFocus
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price (₹) *</Label>
              <Input
                id="product-price"
                type="number"
                value={formData.price}
                onChange={(e) => { setFormData({ ...formData, price: e.target.value }); setErrors(prev => ({ ...prev, price: '' })); }}
                placeholder="0"
                min="0"
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="product-category">Category</Label>
              <select
                id="product-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-primary/20 border-primary/40 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={formData.customTag}
                  onChange={(e) => setFormData({ ...formData, customTag: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                  placeholder="Custom tag..."
                  className="flex-1"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addCustomTag} className="h-10 px-3">
                  Add
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="product-desc">Description (optional)</Label>
              <Textarea
                id="product-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief product description"
                rows={2}
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {isSubmitting ? 'Saving...' : editingProduct ? 'Update' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
