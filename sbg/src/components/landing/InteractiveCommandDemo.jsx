import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Play, RotateCcw, ChevronRight, CheckCircle, 
  Clock, Package, Shield, Users, BarChart3, Cpu, MessageSquareText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const predefinedCommands = [
  {
    id: 'procurement',
    command: 'أحتاج 100 جهاز لابتوب Dell للموظفين الجدد مع أفضل سعر من موردين سعوديين معتمدين',
    translation: 'I need 100 Dell laptops for new employees with the best price from certified Saudi suppliers',
    icon: Package,
    color: 'from-blue-500 to-cyan-500',
    steps: [
      { title: 'تحليل المتطلبات', desc: 'استخراج المواصفات: 100 لابتوب Dell', tool: 'mind.extract_requirements' },
      { title: 'البحث في قاعدة الموردين', desc: 'تصفية الموردين السعوديين المعتمدين', tool: 'procurement.search_vendors' },
      { title: 'طلب عروض الأسعار', desc: 'إرسال RFQ لـ 5 موردين مؤهلين', tool: 'erpnext.rfq_create' },
      { title: 'مقارنة العروض', desc: 'تحليل السعر والجودة والضمان', tool: 'procurement.compare_quotes' },
      { title: 'بوابة الموافقة', desc: 'انتظار موافقة المدير المالي', tool: 'governance.approval', requiresApproval: true },
      { title: 'إصدار أمر الشراء', desc: 'إنشاء PO للمورد الأفضل', tool: 'erpnext.po_create' },
    ]
  },
  {
    id: 'compliance',
    command: 'جهز تقرير الامتثال لمعايير الهيئة الوطنية للأمن السيبراني NCA مع تحليل الفجوات',
    translation: 'Prepare NCA cybersecurity compliance report with gap analysis',
    icon: Shield,
    color: 'from-emerald-500 to-teal-500',
    steps: [
      { title: 'جمع الضوابط', desc: 'تحميل ضوابط NCA-ECC المطلوبة', tool: 'grc.load_controls' },
      { title: 'مسح الأدلة', desc: 'جمع المستندات والسياسات الموجودة', tool: 'grc.scan_evidence' },
      { title: 'التصنيف الذكي', desc: 'ربط الأدلة بالضوابط تلقائياً', tool: 'grc.map_controls' },
      { title: 'تحليل الفجوات', desc: 'تحديد الضوابط غير المستوفاة', tool: 'grc.gap_analysis' },
      { title: 'إنشاء التقرير', desc: 'تقرير شامل مع التوصيات', tool: 'grc.generate_report' },
    ]
  },
  {
    id: 'hr',
    command: 'عيّن مهندس برمجيات سعودي، تحقق من نطاقات، وجهز عرض العمل',
    translation: 'Hire a Saudi software engineer, verify Nitaqat, and prepare job offer',
    icon: Users,
    color: 'from-purple-500 to-pink-500',
    steps: [
      { title: 'إنشاء طلب التوظيف', desc: 'فتح شاغر مهندس برمجيات', tool: 'hr.job_create' },
      { title: 'فرز المرشحين', desc: 'تصفية حسب الجنسية والمؤهلات', tool: 'hr.candidate_filter' },
      { title: 'التحقق من نطاقات', desc: 'فحص تأثير التوظيف على النطاق', tool: 'hr.nitaqat_check' },
      { title: 'إعداد العرض', desc: 'حساب الراتب والمزايا', tool: 'hr.offer_prepare' },
      { title: 'بوابة الموافقة', desc: 'موافقة مدير الموارد البشرية', tool: 'governance.approval', requiresApproval: true },
      { title: 'إرسال العرض', desc: 'إرسال عرض العمل للمرشح', tool: 'comms.send_email' },
    ]
  },
  {
    id: 'finance',
    command: 'أقفل الشهر المالي مع تسوية الحسابات وتقرير المؤشرات',
    translation: 'Close the financial month with account reconciliation and KPI report',
    icon: BarChart3,
    color: 'from-amber-500 to-orange-500',
    steps: [
      { title: 'سحب البيانات', desc: 'تجميع قيود دفتر الأستاذ', tool: 'finance.ledger_export' },
      { title: 'التسوية البنكية', desc: 'مطابقة كشوف الحسابات', tool: 'finance.bank_reconcile' },
      { title: 'معالجة الاستثناءات', desc: 'تحليل الفروقات وتسويتها', tool: 'finance.exception_handle' },
      { title: 'بوابة الموافقة', desc: 'موافقة المراقب المالي', tool: 'governance.approval', requiresApproval: true },
      { title: 'إقفال الفترة', desc: 'إغلاق الشهر المحاسبي', tool: 'finance.period_close' },
      { title: 'تقرير KPIs', desc: 'إنشاء تقرير المؤشرات', tool: 'finance.kpi_report' },
    ]
  }
];

function ExecutionStep({ step, index, isActive, isCompleted }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
        isCompleted ? 'bg-emerald-50 border-emerald-200' :
        isActive ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' :
        'bg-white border-slate-200'
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isCompleted ? 'bg-emerald-500' :
        isActive ? 'bg-blue-500' :
        'bg-slate-200'
      }`}>
        {isCompleted ? (
          <CheckCircle className="w-4 h-4 text-white" />
        ) : isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Cpu className="w-4 h-4 text-white" />
          </motion.div>
        ) : (
          <span className="text-xs font-bold text-slate-500">{index + 1}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-700' : isActive ? 'text-blue-700' : 'text-slate-700'}`}>
            {step.title}
          </span>
          {step.requiresApproval && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">موافقة</Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
        <code className="text-xs text-slate-400 font-mono">{step.tool}</code>
      </div>
    </motion.div>
  );
}

export default function InteractiveCommandDemo() {
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [customInput, setCustomInput] = useState('');

  const handleExecute = (command) => {
    setSelectedCommand(command);
    setIsExecuting(true);
    setCurrentStep(0);

    // Simulate step-by-step execution
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= command.steps.length) {
        clearInterval(interval);
        setIsExecuting(false);
        setCurrentStep(command.steps.length);
      } else {
        setCurrentStep(step);
      }
    }, 800);
  };

  const handleReset = () => {
    setSelectedCommand(null);
    setIsExecuting(false);
    setCurrentStep(-1);
  };

  return (
    <section className="py-12" dir="rtl">
      <div className="text-center mb-10">
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-4">
          <Sparkles className="w-3 h-3 ml-1" />
          تجربة تفاعلية
        </Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
          جرّب قوة الأوامر بالعربي
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          اختر أحد الأوامر النموذجية أو اكتب أمرك الخاص لترى كيف يحوّله النظام إلى خطة تنفيذية محكمة
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Command Selection */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" />
            اختر أمراً للتجربة:
          </div>
          
          {predefinedCommands.map((cmd) => {
            const Icon = cmd.icon;
            const isSelected = selectedCommand?.id === cmd.id;
            
            return (
              <motion.button
                key={cmd.id}
                onClick={() => !isExecuting && handleExecute(cmd)}
                disabled={isExecuting}
                whileHover={{ scale: isExecuting ? 1 : 1.01 }}
                whileTap={{ scale: isExecuting ? 1 : 0.99 }}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                  isSelected 
                    ? 'border-emerald-400 bg-emerald-50 shadow-lg' 
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                } ${isExecuting && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cmd.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 leading-relaxed mb-1">
                      "{cmd.command}"
                    </p>
                    <p className="text-xs text-slate-500 italic">{cmd.translation}</p>
                  </div>
                  {!isSelected && (
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 rotate-180" />
                  )}
                  {isSelected && isExecuting && (
                    <Badge className="bg-blue-100 text-blue-700 shrink-0">جاري التنفيذ...</Badge>
                  )}
                  {isSelected && !isExecuting && currentStep >= 0 && (
                    <Badge className="bg-emerald-100 text-emerald-700 shrink-0">مكتمل ✓</Badge>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Execution Plan */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              خطة التنفيذ
            </h3>
            {selectedCommand && (
              <Button size="sm" variant="ghost" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 ml-1" />
                إعادة
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!selectedCommand ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">اختر أمراً من القائمة لمشاهدة خطة التنفيذ</p>
              </motion.div>
            ) : (
              <motion.div
                key="execution"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                {selectedCommand.steps.map((step, idx) => (
                  <ExecutionStep
                    key={idx}
                    step={step}
                    index={idx}
                    isActive={currentStep === idx}
                    isCompleted={currentStep > idx}
                  />
                ))}

                {currentStep >= selectedCommand.steps.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white text-center"
                  >
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-semibold">تم تنفيذ الأمر بنجاح!</p>
                    <p className="text-sm text-emerald-100 mt-1">
                      {selectedCommand.steps.length} خطوات • {selectedCommand.steps.filter(s => s.requiresApproval).length} بوابات موافقة
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Note */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-emerald-600">💡 نصيحة:</span> في النظام الفعلي، يمكنك كتابة أي أمر بلغتك الطبيعية وسيتم تحويله تلقائياً لخطة تنفيذية
        </p>
      </div>
    </section>
  );
}