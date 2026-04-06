import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Eye, Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const iconMap = { Bot, Cpu, Network, BarChart3, Shield, Rocket, Brain, Cog, Zap, Globe };

export default function TopProductsTable({ products, viewCounts }) {
  const rankedProducts = products
    .map(p => ({
      ...p,
      views: viewCounts[p.id] || 0
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">Top Performing Products</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankedProducts.map((product, index) => {
            const IconComponent = iconMap[product.icon] || Bot;
            return (
              <Link 
                key={product.id}
                to={createPageUrl('ProductDetail') + `?id=${product.id}`}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 text-center text-lg">
                  {index < 3 ? medals[index] : <span className="text-sm text-slate-400">#{index + 1}</span>}
                </div>
                <div className={`w-10 h-10 bg-gradient-to-br ${product.gradient || 'from-emerald-600 to-teal-600'} rounded-lg flex items-center justify-center shrink-0`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{product.name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {product.views} views
                    </span>
                    <span>{(product.price || 0).toLocaleString()} SAR</span>
                  </div>
                </div>
                {product.badge && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs shrink-0">
                    {product.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}