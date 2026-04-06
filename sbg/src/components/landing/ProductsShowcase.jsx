import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bot, Cpu, Network, BarChart3, Shield, Rocket, ChevronRight, Zap, Brain, Cog, Globe } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

export default function ProductsShowcase() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-public'],
    queryFn: () => base44.entities.Product.filter({ is_active: true }, 'order')
  });
  return (
    <section id="products" className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 mb-4">
          Product Store
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          World-Class <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Products</span>
        </h2>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
          Enterprise-grade solutions built with cutting-edge technology. Explore our product lineup.
        </p>
      </motion.div>

      {isLoading ? (
        <div className="text-center text-slate-400">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center text-slate-400">No products available yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => {
            const IconComponent = iconMap[product.icon] || Bot;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 hover:border-emerald-500/30 transition-all h-full group overflow-hidden relative">
                  {product.badge && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-white/10 text-white border-0 text-xs">
                        {product.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/10`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                    {product.price > 0 && (
                      <p className="text-2xl font-bold text-emerald-400 mb-3">{product.price.toLocaleString()} SAR</p>
                    )}
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">{product.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-5">
                      {(product.features || []).map((feature, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-slate-300 border-slate-700 bg-slate-800/50">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    
                    <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`} className="w-full">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 group/btn"
                      >
                        Learn More
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Visit Saudi Map Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20 inline-block">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold">Explore Saudi Arabia</p>
              <p className="text-sm text-slate-400">Click anywhere on the map above to discover locations</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}