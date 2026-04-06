import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, ShoppingBag, Calendar, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuickActions() {
  const actions = [
    {
      icon: Search,
      label: 'استكشاف المنتجات',
      href: createPageUrl('ProductCatalog'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Calendar,
      label: 'طلب عرض توضيحي',
      href: createPageUrl('ProductCatalog'),
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: ShoppingBag,
      label: 'استفساراتي',
      href: createPageUrl('MyInquiries'),
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Sparkles,
      label: 'AI Studio',
      href: createPageUrl('AIStudio'),
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: MessageSquare,
      label: 'المساعد الذكي',
      href: createPageUrl('Advisor'),
      color: 'from-violet-500 to-purple-500'
    },
    {
      icon: Zap,
      label: 'تجربة تفاعلية',
      href: createPageUrl('InteractiveDemo'),
      color: 'from-rose-500 to-red-500'
    },
  ];

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, idx) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={action.href}>
                <Button 
                  variant="outline" 
                  className="w-full h-auto flex-col gap-2 py-4 hover:shadow-md transition-all group"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-slate-700 text-center">{action.label}</span>
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}