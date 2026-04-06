import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Save, X, Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, Search, Filter, ArrowUpDown, ArrowLeft, LayoutGrid, List, Calendar, Eye, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getViewedProducts } from '@/components/recommendations/ProductRecommendations';
import AIProductEnhancer from '@/components/admin/AIProductEnhancer';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };
const iconOptions = Object.keys(iconMap);
const gradientOptions = [
  "from-violet-600 to-purple-600",
  "from-cyan-600 to-blue-600",
  "from-emerald-600 to-teal-600",
  "from-amber-600 to-orange-600",
  "from-rose-600 to-pink-600",
  "from-indigo-600 to-blue-600",
  "from-green-600 to-emerald-600"
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const sortOptions = [
  { value: 'order', label: 'Display Order' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'price_asc', label: 'Price (Low-High)' },
  { value: 'price_desc', label: 'Price (High-Low)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_viewed', label: 'Most Viewed' },
  { value: 'least_viewed', label: 'Least Viewed' }
];

const dateFilterOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'Last 3 Months' }
];

export default function AdminProducts() {
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', icon: 'Bot', gradient: gradientOptions[0],
    features: [], badge: '', price: 0, is_active: true, order: 0
  });
  const [featureInput, setFeatureInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [descriptionKeywords, setDescriptionKeywords] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('order');
  const [viewMode, setViewMode] = useState('grid');
  const [dateFilter, setDateFilter] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);
  const queryClient = useQueryClient();
  
  const viewedProducts = getViewedProducts();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('order')
  });

  // Calculate max price for slider
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 1000000;
    return Math.max(...products.map(p => p.price || 0), 100000);
  }, [products]);

  // Get view counts
  const viewCounts = useMemo(() => {
    const counts = {};
    viewedProducts.forEach((id, index) => {
      counts[id] = (counts[id] || 0) + (viewedProducts.length - index);
    });
    return counts;
  }, [viewedProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Name search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q));
    }

    // Description keywords filter
    if (descriptionKeywords) {
      const keywords = descriptionKeywords.toLowerCase().split(/[\s,]+/).filter(k => k.length > 0);
      result = result.filter(p => {
        const desc = (p.description || '').toLowerCase();
        return keywords.some(kw => desc.includes(kw));
      });
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(p => p.is_active !== false);
    } else if (statusFilter === 'inactive') {
      result = result.filter(p => p.is_active === false);
    }

    // Price range filter
    result = result.filter(p => {
      const price = p.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff;
      switch (dateFilter) {
        case 'today':
          cutoff = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoff = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoff = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          cutoff = new Date(now.setMonth(now.getMonth() - 3));
          break;
        default:
          cutoff = null;
      }
      if (cutoff) {
        result = result.filter(p => new Date(p.created_date) >= cutoff);
      }
    }

    // Sorting
    switch (sortBy) {
      case 'name_asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'price_asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        break;
      case 'most_viewed':
        result.sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0));
        break;
      case 'least_viewed':
        result.sort((a, b) => (viewCounts[a.id] || 0) - (viewCounts[b.id] || 0));
        break;
      default:
        result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return result;
  }, [products, searchQuery, descriptionKeywords, statusFilter, sortBy, priceRange, dateFilter, viewCounts]);

  const activeFiltersCount = 
    (searchQuery ? 1 : 0) + 
    (descriptionKeywords ? 1 : 0) + 
    (statusFilter !== 'all' ? 1 : 0) + 
    (dateFilter !== 'all' ? 1 : 0) + 
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setDescriptionKeywords('');
    setStatusFilter('all');
    setDateFilter('all');
    setPriceRange([0, maxPrice]);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['products']); resetForm(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['products']); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['products'])
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', icon: 'Bot', gradient: gradientOptions[0], features: [], badge: '', price: 0, is_active: true, order: 0 });
    setEditingProduct(null);
    setIsCreating(false);
    setFeatureInput('');
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      icon: product.icon || 'Bot',
      gradient: product.gradient || gradientOptions[0],
      features: product.features || [],
      badge: product.badge || '',
      price: product.price || 0,
      is_active: product.is_active !== false,
      order: product.order || 0
    });
    setIsCreating(false);
    setShowAIEnhancer(false);
  };

  const handleAIApply = (updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    setShowAIEnhancer(false);
  };

  const handleSave = () => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const IconComponent = iconMap[formData.icon] || Bot;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-emerald-200 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Product Management</h1>
                <p className="text-xs text-slate-500">{products.length} products total</p>
              </div>
            </div>
            <Button onClick={() => { setIsCreating(true); resetForm(); setIsCreating(true); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
          {/* Primary Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Name Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-slate-200"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48">
                <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced Filters Toggle */}
            <Button 
              variant="outline" 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={showAdvancedFilters ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Advanced
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>

            {/* View Toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Description Keywords */}
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Description Keywords</Label>
                <Input
                  type="text"
                  placeholder="e.g. automation, AI, robot"
                  value={descriptionKeywords}
                  onChange={(e) => setDescriptionKeywords(e.target.value)}
                  className="border-slate-200"
                />
              </div>

              {/* Date Filter */}
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">Created Date</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFilterOptions.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-600 mb-1 block">
                  Price Range: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} SAR
                </Label>
                <div className="px-2 pt-2">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={maxPrice}
                    min={0}
                    step={1000}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Active filters ({activeFiltersCount}):</span>
              {searchQuery && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                  Name: {searchQuery} ×
                </Badge>
              )}
              {descriptionKeywords && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setDescriptionKeywords('')}>
                  Keywords: {descriptionKeywords} ×
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setStatusFilter('all')}>
                  Status: {statusFilter} ×
                </Badge>
              )}
              {dateFilter !== 'all' && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setDateFilter('all')}>
                  Date: {dateFilterOptions.find(d => d.value === dateFilter)?.label} ×
                </Badge>
              )}
              {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setPriceRange([0, maxPrice])}>
                  Price: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} ×
                </Badge>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-emerald-600 hover:text-emerald-700 ml-2"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
            <span>Showing {filteredProducts.length} of {products.length} products</span>
            {(sortBy === 'most_viewed' || sortBy === 'least_viewed') && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Eye className="w-3 h-3" /> View tracking active
              </span>
            )}
          </div>
        </div>

        {(isCreating || editingProduct) && (
          <Card className="mb-8 border-emerald-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingProduct ? 'Edit Product' : 'New Product'}</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowAIEnhancer(!showAIEnhancer)}
                  className={showAIEnhancer ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-violet-200 text-violet-600'}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Enhance
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Product name" />
                </div>
                <div>
                  <Label>Price (SAR)</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Product description" />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gradient</Label>
                  <Select value={formData.gradient} onValueChange={(v) => setFormData({ ...formData, gradient: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {gradientOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Badge (optional)</Label>
                  <Input value={formData.badge} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} placeholder="e.g. Popular" />
                </div>
              </div>

              <div>
                <Label>Features</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Add feature" onKeyPress={(e) => e.key === 'Enter' && addFeature()} />
                  <Button type="button" onClick={addFeature} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeFeature(i)}>{f} ×</Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Order</Label>
                  <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })} className="w-20" />
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-500 mb-2">Preview:</p>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${formData.gradient} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold">{formData.name || 'Product Name'}</p>
                    <p className="text-sm text-slate-600">{formData.price} SAR</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-2" /> Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Enhancer Panel */}
        {showAIEnhancer && (isCreating || editingProduct) && (
          <div className="mb-8">
            <AIProductEnhancer 
              productData={formData} 
              onApply={handleAIApply}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No products found</h3>
              <p className="text-slate-500 mb-4">Try adjusting your filters or search query</p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const Icon = iconMap[product.icon] || Bot;
              return (
                <Card key={product.id} className={`bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all ${!product.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient || gradientOptions[0]} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(product)} className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => deleteMutation.mutate(product.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                      {!product.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-emerald-600">{(product.price || 0).toLocaleString()} SAR</p>
                      {product.badge && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{product.badge}</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                      <span>Order: {product.order || 0}</span>
                      {viewCounts[product.id] > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {viewCounts[product.id]}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map(product => {
              const Icon = iconMap[product.icon] || Bot;
              return (
                <Card key={product.id} className={`bg-white border-slate-200 hover:border-emerald-300 transition-all ${!product.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient || gradientOptions[0]} rounded-xl flex items-center justify-center shadow-lg shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{product.name}</h3>
                          {!product.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                          {product.badge && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{product.badge}</Badge>}
                        </div>
                        <p className="text-sm text-slate-600 truncate">{product.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-emerald-600">{(product.price || 0).toLocaleString()} SAR</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Order: {product.order || 0}</span>
                          {viewCounts[product.id] > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {viewCounts[product.id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(product)} className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => deleteMutation.mutate(product.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}