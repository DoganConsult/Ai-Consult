import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function ProductFormDialog({ product, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    price: product?.price || 0,
    currency: product?.currency || 'SAR',
    stock_uom: product?.stock_uom || 'Nos',
    item_group: product?.item_group || 'Products',
    is_stock_item: product?.is_stock_item ?? true,
    is_sales_item: product?.is_sales_item ?? true,
    stock_quantity: product?.stock_quantity || 0,
    category: product?.category || '',
    is_active: product?.is_active ?? true
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (product) {
        return base44.entities.Product.update(product.id, data);
      } else {
        return base44.entities.Product.create(data);
      }
    },
    onSuccess: async (savedProduct) => {
      queryClient.invalidateQueries(['products']);
      toast.success(`Product ${product ? 'updated' : 'created'} successfully`);
      
      // Auto-sync to ERPNext if it's a new product or SKU changed
      if (!product || product.sku !== formData.sku) {
        try {
          await base44.functions.invoke('erpnextIntegration', {
            action: 'push',
            doctype: 'Item',
            data: {
              item_code: formData.sku || formData.name,
              item_name: formData.name,
              description: formData.description,
              standard_rate: formData.price,
              item_group: formData.item_group,
              stock_uom: formData.stock_uom,
              is_stock_item: formData.is_stock_item ? 1 : 0,
              is_sales_item: formData.is_sales_item ? 1 : 0
            }
          });
          toast.success('Product synced to ERPNext');
        } catch (error) {
          toast.error('Product saved but ERPNext sync failed: ' + error.message);
        }
      }
      
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save product: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Stock Keeping Unit"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="SAR"
              />
            </div>

            <div>
              <Label htmlFor="stock_quantity">Stock Quantity</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="stock_uom">Unit of Measure</Label>
              <Input
                id="stock_uom"
                value={formData.stock_uom}
                onChange={(e) => setFormData({ ...formData, stock_uom: e.target.value })}
                placeholder="Nos"
              />
            </div>

            <div>
              <Label htmlFor="item_group">Item Group</Label>
              <Input
                id="item_group"
                value={formData.item_group}
                onChange={(e) => setFormData({ ...formData, item_group: e.target.value })}
                placeholder="Products"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Category"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_stock_item">Maintains Stock</Label>
              <Switch
                id="is_stock_item"
                checked={formData.is_stock_item}
                onCheckedChange={(checked) => setFormData({ ...formData, is_stock_item: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_sales_item">Available for Sales</Label>
              <Switch
                id="is_sales_item"
                checked={formData.is_sales_item}
                onCheckedChange={(checked) => setFormData({ ...formData, is_sales_item: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : product ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}