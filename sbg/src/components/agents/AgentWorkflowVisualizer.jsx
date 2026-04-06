import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Play,
  RefreshCw
} from 'lucide-react';

const workflows = [
  {
    id: 'procurement-finance',
    name: 'عملية الشراء الكاملة',
    nameEn: 'Complete Procurement Flow',
    description: 'من طلب الشراء إلى الدفع النهائي',
    steps: [
      {
        agent: 'Sara',
        avatar: '👩‍💼',
        role: 'Procurement',
        action: 'تلقي طلب الشراء',
        actionEn: 'Receive Purchase Request',
        status: 'completed',
        duration: '2 min',
        details: 'تحليل المتطلبات واختيار أفضل 3 موردين',
        color: 'blue'
      },
      {
        agent: 'Khaled',
        avatar: '👨‍⚖️',
        role: 'GRC',
        action: 'فحص الامتثال',
        actionEn: 'Compliance Check',
        status: 'completed',
        duration: '5 min',
        details: 'التحقق من شهادات الموردين والامتثال',
        color: 'purple'
      },
      {
        agent: 'Sara',
        avatar: '👩‍💼',
        role: 'Procurement',
        action: 'إرسال RFQ',
        actionEn: 'Send RFQ',
        status: 'completed',
        duration: '1 min',
        details: 'إرسال طلبات التسعير للموردين المعتمدين',
        color: 'blue'
      },
      {
        agent: 'Nora',
        avatar: '👩‍💻',
        role: 'Finance',
        action: 'موافقة الميزانية',
        actionEn: 'Budget Approval',
        status: 'active',
        duration: '3 min',
        details: 'التحقق من توفر الميزانية وإصدار الموافقة',
        color: 'emerald'
      },
      {
        agent: 'Sara',
        avatar: '👩‍💼',
        role: 'Procurement',
        action: 'إصدار PO',
        actionEn: 'Issue PO',
        status: 'pending',
        duration: '2 min',
        details: 'إنشاء أمر الشراء وإرساله للمورد',
        color: 'blue'
      },
      {
        agent: 'Nora',
        avatar: '👩‍💻',
        role: 'Finance',
        action: 'معالجة الدفع',
        actionEn: 'Process Payment',
        status: 'pending',
        duration: '10 min',
        details: 'جدولة الدفع وفقاً لشروط العقد',
        color: 'emerald'
      }
    ]
  },
  {
    id: 'hr-finance',
    name: 'عملية التوظيف',
    nameEn: 'Hiring & Onboarding',
    description: 'من المقابلة إلى إعداد الراتب',
    steps: [
      {
        agent: 'Abdullah',
        avatar: '👨‍💼',
        role: 'HR',
        action: 'عرض وظيفي',
        actionEn: 'Job Offer',
        status: 'completed',
        duration: '5 min',
        details: 'إنشاء عرض وظيفي متوافق مع النطاقات',
        color: 'amber'
      },
      {
        agent: 'Khaled',
        avatar: '👨‍⚖️',
        role: 'GRC',
        action: 'فحص الخلفية',
        actionEn: 'Background Check',
        status: 'completed',
        duration: '24 hours',
        details: 'التحقق من المؤهلات والخبرات',
        color: 'purple'
      },
      {
        agent: 'Abdullah',
        avatar: '👨‍💼',
        role: 'HR',
        action: 'إنشاء ملف الموظف',
        actionEn: 'Create Employee Profile',
        status: 'completed',
        duration: '3 min',
        details: 'إدخال البيانات في نظام الموارد البشرية',
        color: 'amber'
      },
      {
        agent: 'Nora',
        avatar: '👩‍💻',
        role: 'Finance',
        action: 'إعداد كشف الراتب',
        actionEn: 'Setup Payroll',
        status: 'active',
        duration: '5 min',
        details: 'تهيئة الحساب البنكي والراتب',
        color: 'emerald'
      },
      {
        agent: 'Lina',
        avatar: '👩‍🔧',
        role: 'IT Support',
        action: 'إعداد الأجهزة',
        actionEn: 'Equipment Setup',
        status: 'pending',
        duration: '15 min',
        details: 'تجهيز الجهاز والحسابات',
        color: 'rose'
      }
    ]
  }
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  active: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    animate: true
  },
  pending: {
    icon: AlertCircle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200'
  }
};

export default function AgentWorkflowVisualizer() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  const simulateWorkflow = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Selector */}
      <div className="flex flex-wrap gap-3">
        {workflows.map((workflow) => (
          <Button
            key={workflow.id}
            variant={selectedWorkflow.id === workflow.id ? 'default' : 'outline'}
            onClick={() => setSelectedWorkflow(workflow)}
            className="flex-1 min-w-[200px]"
          >
            <div className="text-left">
              <div className="font-semibold">{workflow.name}</div>
              <div className="text-xs opacity-80">{workflow.nameEn}</div>
            </div>
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{selectedWorkflow.description}</h3>
          <p className="text-sm text-slate-500">تتبع مراحل العملية بين الوكلاء</p>
        </div>
        <Button onClick={simulateWorkflow} disabled={isPlaying} className="gap-2">
          {isPlaying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              جاري التنفيذ...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              تشغيل السيناريو
            </>
          )}
        </Button>
      </div>

      {/* Workflow Steps */}
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />
        
        <div className="space-y-4">
          {selectedWorkflow.steps.map((step, idx) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                <Card className={`ml-16 p-4 border-2 ${config.borderColor} ${config.bgColor} hover:shadow-lg transition-shadow`}>
                  {/* Agent Avatar */}
                  <div className="absolute -left-20 top-1/2 -translate-y-1/2">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${step.color}-500 to-${step.color}-600 flex items-center justify-center text-2xl shadow-lg border-4 border-white`}>
                      {step.avatar}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {step.role}
                        </Badge>
                        <Icon className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-pulse' : ''}`} />
                      </div>
                      
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {step.action}
                        <span className="text-sm font-normal text-slate-500 mr-2">
                          {step.actionEn}
                        </span>
                      </h4>
                      
                      <p className="text-sm text-slate-600">{step.details}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">المدة</div>
                      <div className="text-sm font-semibold text-slate-700">{step.duration}</div>
                    </div>
                  </div>

                  {/* Arrow to next step */}
                  {idx < selectedWorkflow.steps.length - 1 && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                      <ArrowRight className="w-5 h-5 text-slate-300 rotate-90" />
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {selectedWorkflow.steps.length}
            </div>
            <div className="text-xs text-slate-600">خطوات العملية</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {selectedWorkflow.steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-xs text-slate-600">مكتملة</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {selectedWorkflow.steps.reduce((acc, s) => {
                const time = parseInt(s.duration);
                return acc + (isNaN(time) ? 0 : time);
              }, 0)} دقيقة
            </div>
            <div className="text-xs text-slate-600">الوقت الإجمالي</div>
          </div>
        </div>
      </Card>
    </div>
  );
}