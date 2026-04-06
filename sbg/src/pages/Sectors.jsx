import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicHeader from '@/components/shared/PublicHeader';
import { 
  Building2, Heart, GraduationCap, Factory, ShoppingBag, 
  Landmark, Smartphone, TrendingUp, ArrowRight, CheckCircle2,
  Sparkles, Users, BarChart3, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ICON_MAP = {
  Building2, Heart, GraduationCap, Factory, ShoppingBag,
  Landmark, Smartphone, TrendingUp, Users, BarChart3, Shield
};

export default function Sectors() {
  const [selectedSector, setSelectedSector] = useState(null);

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => base44.entities.Sector.list('order'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNiwgMTg1LCAxMjksIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

      <div className="relative z-10">
        <PublicHeader />

        <main className="max-w-7xl mx-auto px-6 py-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              الأصول الرقمية الشخصية السعودية
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              حلول متخصصة
              <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                لكل قطاع
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              نقدم أصول رقمية مخصصة ومصممة خصيصاً لتلبية احتياجات كل قطاع في المملكة العربية السعودية
            </p>
          </motion.div>

          {/* Sectors Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {sectors.map((sector, idx) => {
              const Icon = ICON_MAP[sector.icon] || Building2;
              return (
                <motion.div
                  key={sector.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link to={createPageUrl('SectorDetail') + `?id=${sector.id}`}>
                    <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer h-full">
                      <CardHeader>
                        <div className={`w-16 h-16 bg-gradient-to-br ${sector.color_gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-white text-xl">
                          {sector.name}
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-2">
                          {sector.description?.slice(0, 120)}...
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {sector.key_features?.slice(0, 3).map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                        <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 group-hover:bg-emerald-500">
                          استكشف القطاع
                          <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Why Choose Us */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-slate-800 rounded-2xl p-8 md:p-12"
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              لماذا تختار أصولنا الرقمية؟
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">متوافق مع الأنظمة السعودية</h3>
                <p className="text-slate-400">
                  جميع حلولنا متوافقة مع متطلبات NCA وSAMA وZATCA
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">مخصص لكل قطاع</h3>
                <p className="text-slate-400">
                  حلول مصممة خصيصاً لتلبية احتياجات قطاعك المحدد
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">نتائج مثبتة</h3>
                <p className="text-slate-400">
                  تحسين الكفاءة بنسبة تصل إلى 70% في جميع القطاعات
                </p>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}