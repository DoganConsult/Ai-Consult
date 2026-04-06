import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import AddToInquiryButton from '@/components/inquiry/AddToInquiryButton';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

export default function RelatedProducts({ currentProduct, maxItems = 4 }) {
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products-related'],
    queryFn: () => base44.entities.Product.filter({ is_active: true })
  });

  const relatedProducts = useMemo(() => {
    if (!currentProduct || allProducts.length === 0) return [];

    const currentFeatures = (currentProduct.features || []).map(f => f.toLowerCase());
    const currentBadge = currentProduct.badge?.toLowerCase();

    return allProducts
      .filter(p => p.id !== currentProduct.id)
      .map(product => {
        let score = 0;

        // Same category/badge = strong relation
        if (product.badge && currentBadge && product.badge.toLowerCase() === currentBadge) {
          score += 20;
        }

        // Shared features
        const productFeatures = (product.features || []).map(f => f.toLowerCase());
        const sharedFeatures = productFeatures.filter(f => 
          currentFeatures.some(cf => 
            cf.includes(f) || f.includes(cf) || 
            cf.split(' ').some(w => f.includes(w) && w.length > 3)
          )
        );
        score += sharedFeatures.length * 5;

        // Similar keywords in name
        const currentNameWords = currentProduct.name.toLowerCase().split(/\s+/);
        const productNameWords = product.name.toLowerCase().split(/\s+/);
        const commonKeywords = ['ai', 'automation', 'robot', 'agent', 'erp', 'analytics', 'compliance', 'integration'];
        commonKeywords.forEach(kw => {
          if (currentNameWords.some(w => w.includes(kw)) && productNameWords.some(w => w.includes(kw))) {
            score += 3;
          }
        });

        return { ...product, relationScore: score };
      })
      .filter(p => p.relationScore > 0)
      .sort((a, b) => b.relationScore - a.relationScore)
      .slice(0, maxItems);
  }, [allProducts, currentProduct, maxItems]);

  if (relatedProducts.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Related Products</h2>
          <p className="text-sm text-slate-500">Products with similar features</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {relatedProducts.map((product, index) => {
          const IconComponent = iconMap[product.icon] || Bot;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all h-full group relative">
                <div className="absolute top-3 right-3 z-10">
                  <AddToInquiryButton product={product} variant="icon" />
                </div>
                <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`}>
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
                      <Badge className="mt-2 bg-violet-100 text-violet-700 border-0 text-xs">{product.badge}</Badge>
                    )}
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}