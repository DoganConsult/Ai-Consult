import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import AddToInquiryButton from '@/components/inquiry/AddToInquiryButton';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

// Get viewed products from localStorage
const getViewedProducts = () => {
  try {
    return JSON.parse(localStorage.getItem('viewedProducts') || '[]');
  } catch {
    return [];
  }
};

export default function AIRecommendations({ 
  currentProductId = null, 
  maxItems = 4, 
  title = "AI Recommended for You",
  variant = "default" // "default" | "compact"
}) {
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ['products-recommendations'],
    queryFn: () => base44.entities.Product.filter({ is_active: true })
  });

  const { data: userInquiries = [] } = useQuery({
    queryKey: ['user-inquiries', user?.email],
    queryFn: () => base44.entities.Inquiry.filter({ contact_email: user.email }),
    enabled: !!user?.email
  });

  // Generate AI recommendations
  useEffect(() => {
    const generateRecommendations = async () => {
      if (products.length === 0) return;

      const viewedProducts = getViewedProducts();
      const viewedDetails = products.filter(p => viewedProducts.includes(p.id));
      const inquiredProducts = userInquiries.flatMap(i => i.product_names || []);

      // Skip if no behavior data
      if (viewedDetails.length === 0 && inquiredProducts.length === 0) {
        // Return random recommendations
        const shuffled = [...products].filter(p => p.id !== currentProductId).sort(() => 0.5 - Math.random());
        setAiRecommendations({
          products: shuffled.slice(0, maxItems),
          reason: "Popular products you might like"
        });
        return;
      }

      setIsLoading(true);

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a product recommendation engine for Saudi Business Gate, an enterprise solutions company.

User Behavior:
- Recently viewed products: ${viewedDetails.map(p => `${p.name} (${p.badge || 'General'})`).join(', ') || 'None'}
- Previously inquired products: ${inquiredProducts.join(', ') || 'None'}
${currentProductId ? `- Currently viewing product ID: ${currentProductId}` : ''}

Available products to recommend:
${JSON.stringify(products.filter(p => p.id !== currentProductId).map(p => ({
  id: p.id,
  name: p.name,
  description: p.description?.substring(0, 100),
  price: p.price,
  badge: p.badge,
  features: p.features?.slice(0, 3)
})), null, 2)}

Based on the user's behavior, recommend the top ${maxItems} most relevant products.
Consider:
- Similar categories/domains to what they've viewed
- Complementary products that work well together
- Price range consistency with their browsing history
- Features that align with their interests

Return recommendations with explanations.`,
          response_json_schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    productId: { type: "string" },
                    reason: { type: "string" },
                    matchScore: { type: "number" }
                  }
                }
              },
              overallReason: { type: "string" }
            }
          }
        });

        const recommendedProducts = result.recommendations
          ?.map(rec => {
            const product = products.find(p => p.id === rec.productId);
            return product ? { ...product, aiReason: rec.reason, matchScore: rec.matchScore } : null;
          })
          .filter(Boolean)
          .slice(0, maxItems);

        setAiRecommendations({
          products: recommendedProducts || [],
          reason: result.overallReason || "Based on your browsing history"
        });
      } catch (error) {
        console.error('AI recommendations failed:', error);
        // Fallback to basic recommendations
        const shuffled = [...products].filter(p => p.id !== currentProductId).sort(() => 0.5 - Math.random());
        setAiRecommendations({
          products: shuffled.slice(0, maxItems),
          reason: "Products you might be interested in"
        });
      } finally {
        setIsLoading(false);
      }
    };

    generateRecommendations();
  }, [products, userInquiries, currentProductId, maxItems]);

  if (!aiRecommendations?.products?.length && !isLoading) return null;

  return (
    <div className={variant === "compact" ? "py-4" : "py-8"}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {aiRecommendations?.reason && (
            <p className="text-sm text-slate-500">{aiRecommendations.reason}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing your preferences...</span>
          </div>
        </div>
      ) : (
        <div className={`grid gap-4 ${variant === "compact" ? "grid-cols-2 md:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"}`}>
          {aiRecommendations?.products?.map((product, index) => {
            const IconComponent = iconMap[product.icon] || Bot;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all h-full group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-xl flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <AddToInquiryButton product={product} variant="icon" />
                    </div>
                    <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`}>
                      <h4 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {product.name}
                      </h4>
                    </Link>
                    {product.price > 0 && (
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        {product.price.toLocaleString()} SAR
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{product.description}</p>
                    {product.aiReason && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-violet-600 flex items-start gap-1">
                          <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                          {product.aiReason}
                        </p>
                      </div>
                    )}
                    {product.badge && (
                      <Badge className="mt-2 bg-slate-100 text-slate-600 text-xs">{product.badge}</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}