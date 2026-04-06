import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Check, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ProductSelector({ selectedProducts = [], onProductsChange, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(selectedProducts);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({ is_active: true })
  });

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleProduct = (product) => {
    const exists = selected.find(p => p.id === product.id);
    if (exists) {
      setSelected(selected.filter(p => p.id !== product.id));
    } else {
      setSelected([...selected, product]);
    }
  };

  const handleSave = () => {
    onProductsChange(selected);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {selected.length} product{selected.length !== 1 ? 's' : ''} selected
            </span>
            {selected.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected([])}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Products List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-slate-600">No products found</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredProducts.map((product) => {
                  const isSelected = selected.find(p => p.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleProduct(product)}
                      className={`w-full p-4 border rounded-lg text-left transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900">{product.name}</h4>
                            {product.sku && (
                              <Badge variant="outline" className="text-xs">
                                {product.sku}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-1 mb-2">
                            {product.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-emerald-600">
                              {product.price?.toLocaleString()} {product.currency || 'SAR'}
                            </span>
                            {product.stock_quantity !== undefined && (
                              <span className="text-slate-500">
                                Stock: {product.stock_quantity} {product.stock_uom || 'Nos'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={selected.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add {selected.length} Product{selected.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}