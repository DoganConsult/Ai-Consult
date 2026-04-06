import React from 'react';
import { Star, Download, Check, ShoppingCart, Shield, Calculator, Users, Bot, HeadphonesIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AGENT_ICONS = {
  procurement: ShoppingCart,
  grc: Shield,
  financial: Calculator,
  hr: Users,
  robotics: Bot,
  service_desk: HeadphonesIcon,
};

const AGENT_COLORS = {
  procurement: 'from-blue-500 to-indigo-600',
  grc: 'from-emerald-500 to-teal-600',
  financial: 'from-amber-500 to-orange-600',
  hr: 'from-pink-500 to-rose-600',
  robotics: 'from-violet-500 to-purple-600',
  service_desk: 'from-cyan-500 to-sky-600',
};

export default function MarketplaceItemCard({ item, featured, onClick }) {
  const Icon = AGENT_ICONS[item.agent_type] || Shield;
  const gradient = AGENT_COLORS[item.agent_type] || 'from-slate-500 to-slate-600';

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg hover:border-emerald-300 ${
        featured ? 'border-amber-300 bg-amber-50/30' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
              {item.is_verified && (
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            {item.title_ar && (
              <p className="text-xs text-slate-500 truncate" dir="rtl">{item.title_ar}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{item.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {(item.tags || []).slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
          ))}
          {(item.tags || []).length > 3 && (
            <Badge variant="outline" className="text-xs">+{item.tags.length - 3}</Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              {(item.avg_rating || 0).toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              {item.downloads || 0}
            </span>
          </div>
          {item.price > 0 ? (
            <Badge className="bg-emerald-100 text-emerald-700">{item.price} SAR</Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-700">Free</Badge>
          )}
        </div>

        {featured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white">
              <Star className="w-3 h-3 mr-1" /> Featured
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}