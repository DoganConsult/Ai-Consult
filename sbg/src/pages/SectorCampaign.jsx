import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicHeader from '@/components/shared/PublicHeader';
import { 
  Download, CheckCircle2, ArrowRight, Star, Users, TrendingUp,
  FileText, Video, Calculator, BookOpen, Award, Zap, Shield,
  Building2, Heart, GraduationCap, Factory, ShoppingBag, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const ICON_MAP = {
  Building2, Heart, GraduationCap, Factory, ShoppingBag, Landmark,
  FileText, Video, Calculator, BookOpen
};

const TYPE_CONFIG = {
  whitepaper: { icon: FileText, label: 'ورقة بحثية', color: 'from-blue-500 to-cyan-500' },
  case_study: { icon: Star, label: 'دراسة حالة', color: 'from-purple-500 to-pink-500' },
  webinar: { icon: Video, label: 'ندوة مباشرة', color: 'from-red-500 to-orange-500' },
  guide: { icon: BookOpen, label: 'دليل شامل', color: 'from-green-500 to-emerald-500' },
  calculator: { icon: Calculator, label: 'حاسبة ROI', color: 'from-amber-500 to-yellow-500' }
};

export default function SectorCampaign() {
  const [campaignId, setCampaignId] = useState(null);
  const [selectedMagnet, setSelectedMagnet] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', position: '', company_size: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setCampaignId(urlParams.get('id'));
  }, []);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const campaigns = await base44.entities.SectorCampaign.filter({ id: campaignId });
      return campaigns[0];
    },
    enabled: !!campaignId,
  });

  const { data: sector } = useQuery({
    queryKey: ['sector', campaign?.sector_id],
    queryFn: async () => {
      const sectors = await base44.entities.Sector.filter({ id: campaign.sector_id });
      return sectors[0];
    },
    enabled: !!campaign?.sector_id,
  });

  const { data: leadMagnets = [] } = useQuery({
    queryKey: ['lead-magnets', campaignId],
    queryFn: () => base44.entities.LeadMagnet.filter({ campaign_id: campaignId, is_active: true }),
    enabled: !!campaignId,
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data) => {
      const lead = await base44.entities.CampaignLead.create(data);
      
      // Update download count
      if (selectedMagnet) {
        await base44.entities.LeadMagnet.update(selectedMagnet.id, {
          download_count: (selectedMagnet.download_count || 0) + 1
        });
      }
      
      return lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lead-magnets']);
      toast.success('تم تسجيل طلبك بنجاح! تحقق من بريدك الإلكتروني');
      
      // Download file if available
      if (selectedMagnet?.file_url) {
        window.open(selectedMagnet.file_url, '_blank');
      }
      
      setFormData({ name: '', email: '', phone: '', company: '', position: '', company_size: '' });
      setSelectedMagnet(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('الرجاء إدخال الاسم والبريد الإلكتروني');
      return;
    }

    submitLeadMutation.mutate({
      campaign_id: campaignId,
      lead_magnet_id: selectedMagnet?.id,
      ...formData,
      source: 'campaign_page'
    });
  };

  if (isLoading || !campaign) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SectorIcon = sector ? ICON_MAP[sector.icon] : Building2;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
      
      <div className="relative z-10">
        <PublicHeader />

        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            {sector && (
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${sector.color_gradient} rounded-2xl flex items-center justify-center`}>
                  <SectorIcon className="w-8 h-8 text-white" />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  {sector.name}
                </Badge>
              </div>
            )}
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {campaign.title}
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-8">
              {campaign.description}
            </p>

            {/* Campaign Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">
                  {leadMagnets.reduce((sum, m) => sum + (m.download_count || 0), 0)}+
                </div>
                <div className="text-sm text-slate-500">تحميل</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {leadMagnets.length}
                </div>
                <div className="text-sm text-slate-500">محتوى حصري</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">100%</div>
                <div className="text-sm text-slate-500">مجاني</div>
              </div>
            </div>
          </motion.div>

          {/* Key Messages */}
          {campaign.key_messages && campaign.key_messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid md:grid-cols-3 gap-6 mb-16"
            >
              {campaign.key_messages.slice(0, 3).map((message, i) => (
                <Card key={i} className="bg-slate-900/50 border-slate-800 text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-slate-300">{message}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {/* Lead Magnets Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              محتوى حصري للتحميل المجاني
            </h2>

            {leadMagnets.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {leadMagnets.map((magnet) => {
                  const config = TYPE_CONFIG[magnet.type] || TYPE_CONFIG.whitepaper;
                  const MagnetIcon = config.icon;

                  return (
                    <Dialog key={magnet.id}>
                      <DialogTrigger asChild>
                        <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group">
                          <CardHeader>
                            <div className={`w-16 h-16 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                              <MagnetIcon className="w-8 h-8 text-white" />
                            </div>
                            <Badge className="w-fit mb-2 bg-slate-800 text-slate-300">
                              {config.label}
                            </Badge>
                            <CardTitle className="text-white text-lg">
                              {magnet.title}
                            </CardTitle>
                            <p className="text-sm text-slate-400 mt-2">
                              {magnet.description}
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Download className="w-4 h-4" />
                                {magnet.download_count || 0} تحميل
                              </div>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                تحميل
                                <ArrowRight className="w-4 h-4 mr-2" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </DialogTrigger>

                      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl">{magnet.title}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          setSelectedMagnet(magnet);
                          handleSubmit(e);
                        }} className="space-y-4">
                          <p className="text-sm text-slate-400">{magnet.description}</p>
                          
                          <div className="space-y-3">
                            <Input
                              placeholder="الاسم الكامل *"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="bg-slate-800 border-slate-700"
                              required
                            />
                            <Input
                              type="email"
                              placeholder="البريد الإلكتروني *"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="bg-slate-800 border-slate-700"
                              required
                            />
                            <Input
                              placeholder="رقم الهاتف"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="bg-slate-800 border-slate-700"
                            />
                            <Input
                              placeholder="اسم الشركة"
                              value={formData.company}
                              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                              className="bg-slate-800 border-slate-700"
                            />
                            <Input
                              placeholder="المسمى الوظيفي"
                              value={formData.position}
                              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                              className="bg-slate-800 border-slate-700"
                            />
                            <Select value={formData.company_size} onValueChange={(val) => setFormData({ ...formData, company_size: val })}>
                              <SelectTrigger className="bg-slate-800 border-slate-700">
                                <SelectValue placeholder="حجم الشركة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1-10">1-10 موظف</SelectItem>
                                <SelectItem value="11-50">11-50 موظف</SelectItem>
                                <SelectItem value="51-200">51-200 موظف</SelectItem>
                                <SelectItem value="201-500">201-500 موظف</SelectItem>
                                <SelectItem value="500+">أكثر من 500 موظف</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitLeadMutation.isPending}>
                            {submitLeadMutation.isPending ? 'جاري الإرسال...' : 'تحميل المحتوى'}
                          </Button>

                          <p className="text-xs text-slate-500 text-center">
                            بالتحميل، أنت توافق على تلقي رسائل تسويقية من SBG
                          </p>
                        </form>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-12 text-center">
                  <p className="text-slate-400">لا يوجد محتوى متاح حالياً</p>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Benefits Section */}
          {sector && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-slate-800 rounded-2xl p-8 md:p-12 mb-16"
            >
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                لماذا تختار حلولنا لقطاع {sector.name}؟
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">امتثال كامل</h3>
                  <p className="text-slate-400">
                    متوافق مع {sector.compliance_requirements?.join('، ')}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">تنفيذ سريع</h3>
                  <p className="text-slate-400">
                    ابدأ العمل خلال أيام وليس أشهر
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">نتائج مثبتة</h3>
                  <p className="text-slate-400">
                    عملاء راضون في أكثر من 50 مؤسسة
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 md:p-12 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              هل أنت جاهز لتحويل أعمالك؟
            </h2>
            <p className="text-emerald-100 text-lg mb-6 max-w-2xl mx-auto">
              احجز استشارة مجانية مع خبرائنا واكتشف كيف يمكننا مساعدتك
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={createPageUrl('TestDemoBooking') + (sector ? `?sector=${sector.slug}` : '')}>
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100">
                  احجز عرضاً توضيحياً
                  <ArrowRight className="w-5 h-5 mr-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('SectorDetail') + (sector ? `?id=${sector.id}` : '')}>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  اعرف المزيد
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}