import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicHeader from '@/components/shared/PublicHeader';
import { 
  ArrowLeft, CheckCircle2, Sparkles, TrendingUp, Users,
  Building2, Heart, GraduationCap, Factory, ShoppingBag,
  Landmark, Smartphone, BarChart3, Shield, Target, Zap,
  FileText, Calendar, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const ICON_MAP = {
  Building2, Heart, GraduationCap, Factory, ShoppingBag,
  Landmark, Smartphone, TrendingUp, Users, BarChart3, Shield
};

export default function SectorDetail() {
  const [sectorId, setSectorId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setSectorId(urlParams.get('id'));
  }, []);

  const { data: sector, isLoading } = useQuery({
    queryKey: ['sector', sectorId],
    queryFn: async () => {
      const sectors = await base44.entities.Sector.filter({ id: sectorId });
      return sectors[0];
    },
    enabled: !!sectorId,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['sector-campaigns', sectorId],
    queryFn: () => base44.entities.SectorCampaign.filter({ sector_id: sectorId, status: 'active' }),
    enabled: !!sectorId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['sector-products', sector?.name_en],
    queryFn: () => base44.entities.Product.filter({ category: sector.name_en }),
    enabled: !!sector,
  });

  const handleRequestDemo = async () => {
    try {
      const user = await base44.auth.isAuthenticated()
        .then(isAuth => isAuth ? base44.auth.me() : null)
        .catch(() => null);

      if (!user) {
        toast.error('الرجاء تسجيل الدخول لطلب عرض توضيحي');
        return;
      }

      await base44.entities.DemoRequest.create({
        product_id: sectorId,
        product_name: sector.name,
        name: user.full_name,
        email: user.email,
        company: 'N/A',
        demo_focus: [sector.name],
        message: `طلب عرض توضيحي لقطاع ${sector.name}`
      });

      toast.success('تم إرسال طلبك بنجاح! سنتواصل معك قريباً');
    } catch (error) {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  };

  if (isLoading || !sector) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const Icon = ICON_MAP[sector.icon] || Building2;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
      
      <div className="relative z-10">
        <PublicHeader />

        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Back Button */}
          <Link to={createPageUrl('Sectors')} className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            العودة إلى القطاعات
          </Link>

          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-start gap-6 mb-6">
              <div className={`w-20 h-20 bg-gradient-to-br ${sector.color_gradient} rounded-2xl flex items-center justify-center shrink-0`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {sector.name}
                </h1>
                <p className="text-xl text-slate-400 leading-relaxed">
                  {sector.description}
                </p>
              </div>
            </div>

            {sector.campaign_message && (
              <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border-emerald-500/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">عرض خاص</h3>
                      <p className="text-slate-300">{sector.campaign_message}</p>
                      <Button onClick={handleRequestDemo} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        {sector.cta_text || 'اطلب عرض توضيحي'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-slate-900/50 border border-slate-800">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="features">المميزات</TabsTrigger>
              <TabsTrigger value="products">المنتجات</TabsTrigger>
              <TabsTrigger value="campaigns">الحملات</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Use Cases */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-emerald-400" />
                      حالات الاستخدام
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {sector.use_cases?.map((useCase, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{useCase}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Target Audience */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      الجمهور المستهدف
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sector.target_audience?.map((audience, i) => (
                        <Badge key={i} className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {audience}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Digital Assets */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      الأصول الرقمية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {sector.digital_assets?.map((asset, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-300">
                          <div className="w-2 h-2 bg-amber-400 rounded-full" />
                          <span>{asset}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Compliance */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      متطلبات الامتثال
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sector.compliance_requirements?.map((req, i) => (
                        <Badge key={i} className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ROI Metrics */}
              {sector.roi_metrics && (
                <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/10 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      مؤشرات العائد على الاستثمار المتوقعة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      {Object.entries(sector.roi_metrics).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-3xl font-bold text-blue-400 mb-2">{value}</div>
                          <div className="text-slate-400 text-sm">{key}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Features */}
            <TabsContent value="features">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sector.key_features?.map((feature, i) => (
                  <Card key={i} className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Products */}
            <TabsContent value="products">
              {products.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => {
                    const ProductIcon = ICON_MAP[product.icon] || Smartphone;
                    return (
                      <Card key={product.id} className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 transition-all">
                        <CardHeader>
                          <div className={`w-12 h-12 bg-gradient-to-br ${product.gradient} rounded-lg flex items-center justify-center mb-3`}>
                            <ProductIcon className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-white">{product.name}</CardTitle>
                          <p className="text-sm text-slate-400 mt-2">{product.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-emerald-400">{product.price} ر.س</span>
                            <Link to={createPageUrl('ProductDetail') + `?id=${product.id}`}>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                التفاصيل
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-400">لا توجد منتجات متاحة حالياً لهذا القطاع</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Campaigns */}
            <TabsContent value="campaigns">
              {campaigns.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="bg-slate-900/50 border-slate-800">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            {campaign.campaign_type}
                          </Badge>
                          <Badge variant="outline">{campaign.status}</Badge>
                        </div>
                        <CardTitle className="text-white">{campaign.title}</CardTitle>
                        <p className="text-sm text-slate-400 mt-2">{campaign.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {campaign.key_messages?.slice(0, 3).map((msg, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <MessageSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                              <span>{msg}</span>
                            </div>
                          ))}
                        </div>
                        {campaign.start_date && (
                          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-sm text-slate-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(campaign.start_date).toLocaleDateString('ar-SA')}
                            {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString('ar-SA')}`}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-400">لا توجد حملات نشطة حالياً</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 md:p-12 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              هل أنت جاهز لتحويل {sector.name}؟
            </h2>
            <p className="text-emerald-100 text-lg mb-6 max-w-2xl mx-auto">
              احجز عرضاً توضيحياً مجانياً واكتشف كيف يمكن لأصولنا الرقمية أن تحدث ثورة في عملك
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button onClick={handleRequestDemo} size="lg" className="bg-white text-emerald-600 hover:bg-slate-100">
                <Calendar className="w-5 h-5 mr-2" />
                احجز عرضاً توضيحياً
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                <Link to={createPageUrl('Search') + `?q=${sector.name_en}`}>
                  <FileText className="w-5 h-5 mr-2" />
                  تصفح المنتجات
                </Link>
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}