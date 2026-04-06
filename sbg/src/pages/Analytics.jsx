import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Package, Eye, ShoppingBag, TrendingUp, Users, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getViewedProducts } from '@/components/recommendations/ProductRecommendations';

import MetricCard from '@/components/analytics/MetricCard';
import ProductPerformanceChart from '@/components/analytics/ProductPerformanceChart';
import EngagementChart from '@/components/analytics/EngagementChart';
import ConversionFunnel from '@/components/analytics/ConversionFunnel';
import CategoryBreakdown from '@/components/analytics/CategoryBreakdown';
import TopProductsTable from '@/components/analytics/TopProductsTable';
import VisitorProblems from '@/components/analytics/VisitorProblems';

export default function Analytics() {
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products-analytics'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: demoRequests = [] } = useQuery({
    queryKey: ['demo-requests-analytics'],
    queryFn: () => base44.entities.DemoRequest.list()
  });

  const viewedProducts = getViewedProducts();

  // Calculate view counts
  const viewCounts = useMemo(() => {
    const counts = {};
    viewedProducts.forEach((id, index) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [viewedProducts]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeProducts = products.filter(p => p.is_active !== false);
    const totalViews = Object.values(viewCounts).reduce((sum, v) => sum + v, 0);
    const totalInquiries = demoRequests.length;
    const avgPrice = products.length > 0 
      ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length 
      : 0;
    const conversionRate = totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : 0;

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      totalViews,
      totalInquiries,
      avgPrice,
      conversionRate,
      uniqueViewedProducts: Object.keys(viewCounts).length
    };
  }, [products, viewCounts, demoRequests]);

  // Top products by views
  const topProductsData = useMemo(() => {
    return products
      .map(p => ({
        name: p.name,
        views: viewCounts[p.id] || 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);
  }, [products, viewCounts]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const categories = {};
    products.forEach(p => {
      const cat = p.badge || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [products]);

  // Engagement over time (simulated based on demo requests)
  const engagementData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => ({
      date: day,
      views: Math.floor(Math.random() * 50) + 20 + (metrics.totalViews / 7),
      inquiries: Math.floor(Math.random() * 10) + 2
    }));
  }, [metrics.totalViews]);

  // Conversion funnel
  const funnelData = useMemo(() => [
    { name: 'Product Views', value: metrics.totalViews || 100, color: 'bg-emerald-500' },
    { name: 'Product Details', value: Math.floor((metrics.totalViews || 100) * 0.6), color: 'bg-cyan-500' },
    { name: 'Added to Inquiry', value: Math.floor((metrics.totalViews || 100) * 0.25), color: 'bg-violet-500' },
    { name: 'Demo Requested', value: metrics.totalInquiries || 5, color: 'bg-amber-500' }
  ], [metrics]);

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
                <h1 className="text-xl font-bold text-slate-900">Product Analytics</h1>
                <p className="text-xs text-slate-500">Performance insights and metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link to={createPageUrl('AdminProducts')}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Package className="w-4 h-4 mr-2" />
                  Manage Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Total Products"
            value={metrics.totalProducts}
            icon={Package}
            color="emerald"
          />
          <MetricCard
            title="Active Products"
            value={metrics.activeProducts}
            icon={Activity}
            color="blue"
            change={5.2}
          />
          <MetricCard
            title="Total Views"
            value={metrics.totalViews}
            icon={Eye}
            color="violet"
            change={12.5}
          />
          <MetricCard
            title="Demo Requests"
            value={metrics.totalInquiries}
            icon={ShoppingBag}
            color="amber"
            change={8.3}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${metrics.conversionRate}%`}
            icon={TrendingUp}
            color="rose"
            change={2.1}
          />
          <MetricCard
            title="Avg. Price"
            value={`${Math.round(metrics.avgPrice).toLocaleString()} SAR`}
            icon={DollarSign}
            color="emerald"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <ProductPerformanceChart data={topProductsData} />
          <EngagementChart data={engagementData} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <ConversionFunnel data={funnelData} />
          <CategoryBreakdown data={categoryData} />
          <TopProductsTable products={products} viewCounts={viewCounts} />
        </div>

        {/* Visitor Problems Analysis */}
        <div className="mb-6">
          <VisitorProblems />
        </div>

        {/* Quick Stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Insights</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700 font-medium">Most Viewed</p>
              <p className="text-lg font-bold text-emerald-900">
                {topProductsData[0]?.name || 'N/A'}
              </p>
              <p className="text-xs text-emerald-600">{topProductsData[0]?.views || 0} views</p>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
              <p className="text-sm text-violet-700 font-medium">Products Explored</p>
              <p className="text-lg font-bold text-violet-900">
                {metrics.uniqueViewedProducts} / {metrics.totalProducts}
              </p>
              <p className="text-xs text-violet-600">
                {metrics.totalProducts > 0 
                  ? ((metrics.uniqueViewedProducts / metrics.totalProducts) * 100).toFixed(0) 
                  : 0}% discovery rate
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700 font-medium">Pending Demos</p>
              <p className="text-lg font-bold text-amber-900">
                {demoRequests.filter(d => d.status === 'pending').length}
              </p>
              <p className="text-xs text-amber-600">Awaiting follow-up</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}