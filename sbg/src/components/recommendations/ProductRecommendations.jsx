import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

const HISTORY_KEY = 'sbg_viewed_products';
const MAX_HISTORY = 20;

// Get browsing history from localStorage
export const getViewedProducts = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

// Add product to browsing history
export const addToViewedProducts = (productId) => {
  if (!productId) return;
  const history = getViewedProducts().filter(id => id !== productId);
  history.unshift(productId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

export default function ProductRecommendations({ 
  currentProductId = null, 
  title = "Recommended for You",
  subtitle = "Based on your browsing history",
  icon: TitleIcon = Sparkles,
  maxItems = 4,
  variant = 'home' // 'home' | 'detail'
}) {
  const viewedIds = getViewedProducts();

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-recommendations'],
    queryFn: () => base44.entities.Product.filter({ is_active: true })
  });

  const { data: currentProduct } = useQuery({
    queryKey: ['product-current', currentProductId],
    queryFn: async () => {
      if (!currentProductId) return null;
      const products = await base44.entities.Product.filter({ id: currentProductId });
      return products[0];
    },
    enabled: !!currentProductId
  });

  const recommendations = useMemo(() => {
    if (allProducts.length === 0) return [];

    let scored = allProducts
      .filter(p => p.id !== currentProductId)
      .map(product => {
        let score = 0;

        // Score based on view history (recently viewed = higher score)
        const viewIndex = viewedIds.indexOf(product.id);
        if (viewIndex === -1) {
          // Not viewed - give some base score for discovery
          score += 5;
        } else {
          // Recently viewed but not current - lower priority
          score += Math.max(0, 3 - viewIndex * 0.5);
        }

        // If on product detail page, boost similar products
        if (currentProduct) {
          // Same badge/category
          if (product.badge && product.badge === currentProduct.badge) {
            score += 10;
          }

          // Similar price range (within 30%)
          if (currentProduct.price && product.price) {
            const priceDiff = Math.abs(product.price - currentProduct.price) / currentProduct.price;
            if (priceDiff < 0.3) score += 5;
            else if (priceDiff < 0.5) score += 2;
          }

          // Shared features
          const currentFeatures = (currentProduct.features || []).map(f => f.toLowerCase());
          const productFeatures = (product.features || []).map(f => f.toLowerCase());
          const sharedFeatures = productFeatures.filter(f => 
            currentFeatures.some(cf => cf.includes(f) || f.includes(cf))
          );
          score += sharedFeatures.length * 3;

          // Similar description keywords
          const currentWords = (currentProduct.description || '').toLowerCase().split(/\s+/);
          const productWords = (product.description || '').toLowerCase().split(/\s+/);
          const keywords = ['ai', 'automation', 'robot', 'erp', 'analytics', 'compliance', 'agent', 'integration'];
          keywords.forEach(kw => {
            if (currentWords.includes(kw) && productWords.includes(kw)) {
              score += 2;
            }
          });
        } else {
          // Home page - prioritize products user hasn't seen
          if (viewIndex === -1) {
            score += 8;
          }
          // Boost popular/badged products
          if (product.badge) {
            score += 3;
          }
        }

        return { ...product, score };
      });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxItems);
  }, [allProducts, currentProductId, currentProduct, viewedIds, maxItems]);

  if (recommendations.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
          <TitleIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${variant === 'detail' ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {recommendations.map((product, index) => {
          const IconComponent = iconMap[product.icon] || Bot;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`}>
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all h-full cursor-pointer group">
                  <CardContent className="p-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{product.name}</h3>
                    {product.price > 0 && (
                      <p className="text-lg font-bold text-emerald-600 mb-1">{product.price.toLocaleString()} SAR</p>
                    )}
                    <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
                    {product.badge && (
                      <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-0 text-xs">{product.badge}</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}