import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PublicHeader from '@/components/shared/PublicHeader';
import { Search, Package, RefreshCw, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ProductFormDialog from '@/components/products/ProductFormDialog';
import ERPSyncButton from '@/components/erp/ERPSyncButton';

export default function ProductCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-updated_date')
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null)
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product deleted successfully');
    }
  });

  const syncAllProducts = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        products.map(async (product) => {
          try {
            await base44.functions.invoke('erpnextIntegration', {
              action: 'push',
              doctype: 'Item',
              data: {
                item_code: product.sku || product.name,
                item_name: product.name,
                description: product.description,
                standard_rate: product.price,
                item_group: product.item_group || 'Products',
                stock_uom: product.stock_uom || 'Nos',
                is_stock_item: product.is_stock_item ? 1 : 0,
                is_sales_item: product.is_sales_item ? 1 : 0
              }
            });
            return { success: true, name: product.name };
          } catch (error) {
            return { success: false, name: product.name, error: error.message };
          }
        })
      );
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      toast.success(`Synced ${successful} products to ERPNext${failed > 0 ? `, ${failed} failed` : ''}`);
      queryClient.invalidateQueries(['products']);
    },
    onError: () => {
      toast.error('Failed to sync products');
    }
  });

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Catalog</h1>
            <p className="text-slate-600">Browse and manage products synced with ERPNext</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={() => syncAllProducts.mutate()}
                disabled={syncAllProducts.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncAllProducts.isPending ? 'animate-spin' : ''}`} />
                Sync All to ERPNext
              </Button>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search products by name, SKU, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg mb-2">No products found</p>
              <p className="text-slate-500 text-sm">
                {searchQuery ? 'Try adjusting your search' : 'Add your first product to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                      {product.sku && (
                        <Badge variant="outline" className="mb-2">
                          SKU: {product.sku}
                        </Badge>
                      )}
                    </div>
                    {product.erp_item_id && (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {product.description || 'No description'}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Price:</span>
                      <span className="font-semibold text-slate-900">
                        {product.price?.toLocaleString()} {product.currency || 'SAR'}
                      </span>
                    </div>
                    {product.stock_quantity !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Stock:</span>
                        <span className="font-semibold text-slate-900">
                          {product.stock_quantity} {product.stock_uom || 'Nos'}
                        </span>
                      </div>
                    )}
                    {product.item_group && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Group:</span>
                        <span className="text-slate-700">{product.item_group}</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 pt-4 border-t">
                      <ERPSyncButton
                        entityType="Item"
                        entityData={product}
                        erpId={product.erp_item_id}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(product);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Delete this product?')) {
                            deleteProduct.mutate(product.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProductFormDialog
          product={editingProduct}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}