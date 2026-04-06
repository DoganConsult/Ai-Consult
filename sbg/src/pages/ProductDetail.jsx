import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe, Check, MessageCircle, Eye, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import DemoRequestForm from '@/components/DemoRequestForm';
import PublicHeader from '@/components/shared/PublicHeader';
import ProductRecommendations, { addToViewedProducts } from '@/components/recommendations/ProductRecommendations';
import RelatedProducts from '@/components/recommendations/RelatedProducts';
import AIRecommendations from '@/components/recommendations/AIRecommendations';
import AddToInquiryButton from '@/components/inquiry/AddToInquiryButton';
import InquiryDrawer from '@/components/inquiry/InquiryDrawer';
import { useInquiry } from '@/components/inquiry/InquiryContext';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [showInquiryDrawer, setShowInquiryDrawer] = useState(false);
  const { addToInquiry, itemCount } = useInquiry();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const products = await base44.entities.Product.filter({ id: productId });
      return products[0];
    },
    enabled: !!productId
  });

  // Track product view
  useEffect(() => {
    if (productId) {
      addToViewedProducts(productId);
    }
  }, [productId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-emerald-600">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center">
        <p className="text-slate-600 mb-4">Product not found</p>
        <Link to={createPageUrl('Home')}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Button>
        </Link>
      </div>
    );
  }

  const IconComponent = iconMap[product.icon] || Bot;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <PublicHeader showBackButton={true} backLabel="Back to Products" />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-12"
        >
          {/* Left - Icon & Visual */}
          <div className="flex flex-col items-center md:items-start">
            <div className={`w-32 h-32 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6`}>
              <IconComponent className="w-16 h-16 text-white" />
            </div>
            
            {product.badge && (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 mb-4">
                {product.badge}
              </Badge>
            )}

            {/* Features List */}
            <Card className="w-full bg-white border-slate-200 mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Key Features</h3>
                <ul className="space-y-3">
                  {(product.features || []).map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right - Details */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">{product.name}</h1>
            
            {product.price > 0 && (
              <div className="mb-6">
                <span className="text-4xl font-bold text-emerald-600">{product.price.toLocaleString()}</span>
                <span className="text-xl text-slate-500 ml-2">SAR</span>
              </div>
            )}

            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              {product.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <AddToInquiryButton product={product} size="lg" />
              <Button 
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                onClick={() => {
                  addToInquiry(product);
                  setShowInquiryDrawer(true);
                }}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Inquire Now {itemCount > 0 && `(${itemCount})`}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setShowDemoForm(true)}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Request Demo
              </Button>
            </div>

            {/* Additional Info */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-emerald-800 mb-2">Why Choose This Product?</h3>
                <ul className="text-sm text-emerald-700 space-y-2">
                  <li>✓ Saudi Arabia localized solution</li>
                  <li>✓ Enterprise-grade security & compliance</li>
                  <li>✓ 24/7 dedicated support</li>
                  <li>✓ Seamless integration with existing systems</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts currentProduct={product} maxItems={4} />
        </div>

        {/* AI Recommendations */}
                      <div className="mt-8">
                        <AIRecommendations 
                          currentProductId={productId}
                          title="AI Recommended for You"
                          maxItems={4}
                        />
                      </div>

                      {/* Recommendations */}
                      <div className="mt-8">
                        <ProductRecommendations 
                          currentProductId={productId}
                          title="Customers Also Viewed"
                          subtitle="Based on browsing history"
                          icon={Eye}
                          maxItems={4}
                          variant="detail"
                        />
                      </div>
      </main>

      {/* Demo Request Form Modal */}
      <DemoRequestForm 
        product={product} 
        isOpen={showDemoForm} 
        onClose={() => setShowDemoForm(false)} 
      />

      {/* Inquiry Drawer */}
      <InquiryDrawer isOpen={showInquiryDrawer} onClose={() => setShowInquiryDrawer(false)} />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm">
          © 2024 Saudi Business Gate. All rights reserved. | 
          <a href="https://www.saudibusinessgate.com" className="text-emerald-400 hover:text-emerald-300 ml-1">saudibusinessgate.com</a>
        </div>
      </footer>
    </div>
  );
}