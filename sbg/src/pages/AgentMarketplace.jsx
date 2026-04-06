import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Search, Star, Shield, ShoppingCart, Calculator, 
  Users, Bot, HeadphonesIcon, Plus, Upload,
  Building2, Heart, Landmark, Factory, ShoppingBag, Radio, Zap, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicHeader from '@/components/shared/PublicHeader';
import MarketplaceItemCard from '@/components/marketplace/MarketplaceItemCard';
import MarketplaceItemDetail from '@/components/marketplace/MarketplaceItemDetail';
import PublishConfigModal from '@/components/marketplace/PublishConfigModal';

const AGENT_TYPES = [
  { id: 'procurement', name: 'Procurement', icon: ShoppingCart, color: 'from-blue-500 to-indigo-600' },
  { id: 'grc', name: 'GRC & Compliance', icon: Shield, color: 'from-emerald-500 to-teal-600' },
  { id: 'financial', name: 'Financial', icon: Calculator, color: 'from-amber-500 to-orange-600' },
  { id: 'hr', name: 'HR Operations', icon: Users, color: 'from-pink-500 to-rose-600' },
  { id: 'robotics', name: 'Robotics & IoT', icon: Bot, color: 'from-violet-500 to-purple-600' },
  { id: 'service_desk', name: 'Service Desk', icon: HeadphonesIcon, color: 'from-cyan-500 to-sky-600' },
];

const CATEGORIES = [
  { id: 'compliance', name: 'Compliance & Regulatory', nameAr: 'الامتثال والتنظيم', icon: Shield },
  { id: 'finance', name: 'Finance & Banking', nameAr: 'المالية والبنوك', icon: Landmark },
  { id: 'healthcare', name: 'Healthcare', nameAr: 'الرعاية الصحية', icon: Heart },
  { id: 'retail', name: 'Retail & E-commerce', nameAr: 'التجزئة والتجارة', icon: ShoppingBag },
  { id: 'manufacturing', name: 'Manufacturing', nameAr: 'التصنيع', icon: Factory },
  { id: 'government', name: 'Government', nameAr: 'القطاع الحكومي', icon: Building2 },
  { id: 'telecom', name: 'Telecom', nameAr: 'الاتصالات', icon: Radio },
  { id: 'energy', name: 'Energy & Utilities', nameAr: 'الطاقة والمرافق', icon: Zap },
  { id: 'general', name: 'General', nameAr: 'عام', icon: Globe },
];

export default function AgentMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPublish, setShowPublish] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['marketplace-items'],
    queryFn: () => base44.entities.MarketplaceItem.list('-downloads', 100)
  });

  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title?.toLowerCase().includes(q) ||
        item.title_ar?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (selectedAgent !== 'all') {
      result = result.filter(item => item.agent_type === selectedAgent);
    }

    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case 'free':
        result = result.filter(item => !item.price || item.price === 0);
        break;
    }

    return result;
  }, [items, searchQuery, selectedAgent, selectedCategory, sortBy]);

  const featuredItems = items.filter(i => i.is_featured).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Store className="w-8 h-8 text-emerald-600" />
              Agent Marketplace
            </h1>
            <p className="text-slate-600 mt-1">سوق إعدادات الوكلاء الأذكياء للأعمال السعودية</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AgentConfiguration')}>
              <Button variant="outline">
                <Shield className="w-4 h-4 mr-2" /> My Configurations
              </Button>
            </Link>
            <Button onClick={() => setShowPublish(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Upload className="w-4 h-4 mr-2" /> Publish Config
            </Button>
          </div>
        </div>

        {/* Featured Section */}
        {featuredItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Featured Configurations
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {featuredItems.map((item) => (
                <MarketplaceItemCard 
                  key={item.id} 
                  item={item} 
                  featured 
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search configurations... (e.g., Sharia, NCA, ZATCA)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Agent Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {AGENT_TYPES.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <cat.icon className="w-3 h-3" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">{filteredItems.length} configurations found</p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-32 bg-slate-200 rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Store className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="font-semibold text-slate-900 mb-2">No configurations found</h3>
              <p className="text-slate-500 mb-4">Try adjusting your search or filters</p>
              <Button onClick={() => setShowPublish(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Be the first to publish
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MarketplaceItemCard item={item} onClick={() => setSelectedItem(item)} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <MarketplaceItemDetail 
            item={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {showPublish && (
          <PublishConfigModal onClose={() => setShowPublish(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}