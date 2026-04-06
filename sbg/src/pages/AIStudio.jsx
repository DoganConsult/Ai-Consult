import React, { useState } from 'react';
import PublicHeader from '@/components/shared/PublicHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Wand2, Target, Users, ArrowRight } from 'lucide-react';
import ContentSummarizer from '@/components/ai/ContentSummarizer';
import ContentGenerator from '@/components/ai/ContentGenerator';
import SmartRecommendations from '@/components/ai/SmartRecommendations';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState('generator');
  const [sampleContent] = useState(`الذكاء الاصطناعي يُحدث ثورة في عالم الأعمال

في عصرنا الحالي، أصبح الذكاء الاصطناعي جزءًا لا يتجزأ من نجاح الشركات والمؤسسات. تُستخدم تقنيات الذكاء الاصطناعي في مختلف المجالات، من التسويق إلى العمليات التشغيلية.

تساعد هذه التقنيات الشركات على:
- تحسين الكفاءة التشغيلية بنسبة تصل إلى 40%
- تقليل التكاليف وزيادة الإنتاجية
- تقديم تجربة عملاء مخصصة ومميزة
- اتخاذ قرارات مبنية على البيانات

مع التطور السريع في هذا المجال، تحتاج الشركات إلى مواكبة هذه التغييرات للبقاء في المنافسة.`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader showBackButton backLabel="العودة للرئيسية" />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            استوديو الذكاء الاصطناعي
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            أدوات ذكاء اصطناعي متقدمة لتلخيص المحتوى، إنشاء مسودات، وتوصيات مخصصة
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-white border border-slate-200 p-1">
            <TabsTrigger value="generator" className="gap-2">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">مولد المحتوى</span>
            </TabsTrigger>
            <TabsTrigger value="summarizer" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">الملخص الذكي</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">التوصيات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <ContentGenerator />
          </TabsContent>

          <TabsContent value="summarizer" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                تلخيص المحتوى بالذكاء الاصطناعي
              </h2>
              <p className="text-slate-600 mb-6">
                قم بتحميل أي محتوى أو استخدم النموذج أدناه لرؤية قوة الملخص الذكي
              </p>
              <ContentSummarizer 
                content={sampleContent}
                title="الذكاء الاصطناعي في الأعمال"
              />
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <SmartRecommendations />
          </TabsContent>
        </Tabs>

        {/* Agent Team CTA */}
        <div className="mt-12">
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNiwgMTg1LCAxMjksIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="relative p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                فريق الوكلاء الأذكياء
              </h2>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                كل وكيل متخصص في مجاله، يعمل بذكاء اصطناعي متقدم لتبسيط عملياتك
              </p>
              <Link to={createPageUrl('AgentTeam')}>
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all gap-2 text-lg px-8 py-6">
                  <Users className="w-5 h-5" />
                  تعرّف على فريق الوكلاء
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Features Overview with Glow Effects */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-500 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <div className="relative">
              <Wand2 className="w-10 h-10 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">إنشاء محتوى ذكي</h3>
              <p className="text-slate-600 text-sm">
                قم بإنشاء مقالات، تدوينات، وأوصاف منتجات احترافية بضغطة زر
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <div className="relative">
              <FileText className="w-10 h-10 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">تلخيص تلقائي</h3>
              <p className="text-slate-600 text-sm">
                احصل على ملخصات شاملة ونقاط رئيسية لأي محتوى في ثوانٍ
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-500 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg blur opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <div className="relative">
              <Target className="w-10 h-10 text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">توصيات مخصصة</h3>
              <p className="text-slate-600 text-sm">
                نظام توصيات ذكي يتعلم من سلوكك ويقدم اقتراحات دقيقة
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}