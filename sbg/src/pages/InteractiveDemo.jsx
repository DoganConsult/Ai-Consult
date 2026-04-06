import React, { useState } from 'react';
import PublicHeader from '@/components/shared/PublicHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Users, 
  TrendingUp,
  Lightbulb 
} from 'lucide-react';

const DEMO_COMMANDS = [
  {
    id: 'procurement',
    title: 'أحتاج 100 جهاز لابتوب Dell للموظفين الجدد مع أفضل سعر من موردين سعوديين معتمدين',
    titleEn: 'I need 100 Dell laptops for new employees with the best price from certified Saudi suppliers',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    steps: [
      { title: 'تحليل المتطلبات', description: 'تحديد المواصفات والكميات والميزانية المتاحة', duration: '5 دقائق' },
      { title: 'البحث عن الموردين', description: 'مسح قاعدة الموردين السعوديين المعتمدين', duration: '10 دقائق' },
      { title: 'طلب عروض الأسعار', description: 'إرسال RFQ تلقائي لـ 5 موردين مؤهلين', duration: '15 دقيقة' },
      { title: 'تحليل العروض', description: 'مقارنة الأسعار والشروط والجودة', duration: '20 دقيقة' },
      { title: 'التفاوض التلقائي', description: 'تفاوض ذكي للحصول على أفضل سعر', duration: '30 دقيقة' },
      { title: 'إنشاء أمر الشراء', description: 'توليد PO في ERPNext مع الموافقات المطلوبة', duration: '5 دقائق' }
    ],
    insights: [
      'توفير متوقع: 15-20% من السعر المعتاد',
      'الامتثال الكامل للمشتريات الحكومية',
      'تتبع تلقائي للتسليم والدفع'
    ]
  },
  {
    id: 'compliance',
    title: 'جهز تقرير الامتثال لمعايير الهيئة الوطنية للأمن السيبراني NCA مع تحليل الفجوات',
    titleEn: 'Prepare NCA cybersecurity compliance report with gap analysis',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
    steps: [
      { title: 'جمع البيانات', description: 'مسح الأنظمة والسياسات الحالية', duration: '30 دقيقة' },
      { title: 'تحليل الفجوات', description: 'مقارنة مع معايير NCA (66 ضابطة)', duration: '45 دقيقة' },
      { title: 'تقييم المخاطر', description: 'تحديد مستوى الخطورة لكل فجوة', duration: '20 دقيقة' },
      { title: 'خطة العلاج', description: 'إنشاء خارطة طريق للامتثال الكامل', duration: '30 دقيقة' },
      { title: 'توليد التقرير', description: 'تقرير شامل باللغتين مع المخططات', duration: '15 دقيقة' },
      { title: 'التدقيق والختم', description: 'ختم SBG مع سجل تدقيق كامل', duration: '10 دقيقة' }
    ],
    insights: [
      'امتثال موثق ومختوم رقمياً',
      'سجل تدقيق غير قابل للتعديل',
      'تحديثات تلقائية عند تغيير المعايير'
    ]
  },
  {
    id: 'hr',
    title: 'عيّن مهندس برمجيات سعودي، تحقق من نطاقات، وجهز عرض العمل',
    titleEn: 'Hire a Saudi software engineer, verify Nitaqat, and prepare job offer',
    icon: Users,
    color: 'from-green-500 to-emerald-500',
    steps: [
      { title: 'تحليل الوظيفة', description: 'تحديد المهارات والخبرات المطلوبة', duration: '10 دقائق' },
      { title: 'فحص نطاقات', description: 'التحقق من الامتثال والحصص المتاحة', duration: '5 دقائق' },
      { title: 'بحث المرشحين', description: 'مسح قواعد البيانات وLinkedIn', duration: '20 دقيقة' },
      { title: 'تقييم السير الذاتية', description: 'AI Screening وترتيب المرشحين', duration: '15 دقيقة' },
      { title: 'إعداد عرض العمل', description: 'توليد عقد متوافق مع قانون العمل السعودي', duration: '10 دقيقة' },
      { title: 'إرسال العرض', description: 'إرسال العرض مع تتبع القبول', duration: '5 دقيقة' }
    ],
    insights: [
      'توافق كامل مع قانون العمل ونطاقات',
      'تسريع عملية التوظيف بنسبة 70%',
      'تكامل مباشر مع مكاتب العمل'
    ]
  },
  {
    id: 'finance',
    title: 'أقفل الشهر المالي مع تسوية الحسابات وتقرير المؤشرات',
    titleEn: 'Close the financial month with account reconciliation and KPI report',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-500',
    steps: [
      { title: 'جمع المعاملات', description: 'استيراد جميع الحركات المالية من ERPNext', duration: '10 دقائق' },
      { title: 'تسوية الحسابات', description: 'مطابقة الإيرادات والمصروفات', duration: '25 دقيقة' },
      { title: 'التحقق من الالتزامات', description: 'فحص الفواتير المعلقة والمدفوعات', duration: '15 دقيقة' },
      { title: 'حساب KPIs', description: 'احتساب مؤشرات الأداء المالي الرئيسية', duration: '10 دقيقة' },
      { title: 'توليد التقارير', description: 'إعداد تقارير شاملة للإدارة', duration: '15 دقيقة' },
      { title: 'الموافقة والإقفال', description: 'سير موافقات تلقائي وإقفال الفترة', duration: '10 دقيقة' }
    ],
    insights: [
      'دقة 99.9% في التسويات المالية',
      'امتثال كامل لمعايير المحاسبة',
      'تقارير جاهزة للهيئات الرقابية'
    ]
  }
];

export default function InteractiveDemo() {
  const [selectedCommand, setSelectedCommand] = useState(null);

  const command = selectedCommand ? DEMO_COMMANDS.find(c => c.id === selectedCommand) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNiwgMTg1LCAxMjksIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

      <div className="relative z-10">
        <PublicHeader showBackButton backLabel="العودة للرئيسية" />

        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              تجربة تفاعلية
            </h1>
            <p className="text-xl text-slate-400 mb-2">
              جرّب قوة الأوامر بالعربي
            </p>
            <p className="text-slate-500 max-w-3xl mx-auto">
              اختر أحد الأوامر النموذجية أو اكتب أمرك الخاص لترى كيف يحوّله النظام إلى خطة تنفيذية محكمة
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Commands List */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-6">اختر أمراً للتجربة:</h2>
              
              {DEMO_COMMANDS.map((cmd, idx) => {
                const Icon = cmd.icon;
                return (
                  <motion.div
                    key={cmd.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card 
                      className={`p-6 cursor-pointer transition-all ${
                        selectedCommand === cmd.id 
                          ? 'bg-slate-800 border-emerald-500 shadow-xl shadow-emerald-500/20' 
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                      onClick={() => setSelectedCommand(cmd.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${cmd.color} rounded-xl flex items-center justify-center shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-2 leading-relaxed">
                            "{cmd.title}"
                          </p>
                          <p className="text-slate-400 text-sm italic">
                            {cmd.titleEn}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Execution Plan */}
            <div className="lg:sticky lg:top-24 h-fit">
              <Card className="p-6 bg-slate-900/50 border-slate-800">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-emerald-500" />
                  خطة التنفيذ
                </h2>

                <AnimatePresence mode="wait">
                  {!command ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <Sparkles className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500">
                        اختر أمراً من القائمة لمشاهدة خطة التنفيذ
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={command.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* Steps */}
                      <div className="space-y-3">
                        {command.steps.map((step, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-emerald-400 font-bold text-sm">{idx + 1}</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-white">{step.title}</h4>
                                  <Badge className="bg-slate-700 text-slate-300 text-xs">
                                    {step.duration}
                                  </Badge>
                                </div>
                                <p className="text-slate-400 text-sm">{step.description}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Insights */}
                      <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-lg p-4 border border-emerald-500/30">
                        <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          النتائج المتوقعة:
                        </h4>
                        <ul className="space-y-2">
                          {command.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                              <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Tip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-500/30"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-300 text-sm font-medium mb-1">💡 نصيحة:</p>
                    <p className="text-slate-400 text-sm">
                      في النظام الفعلي، يمكنك كتابة أي أمر بلغتك الطبيعية وسيتم تحويله تلقائياً لخطة تنفيذية
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}