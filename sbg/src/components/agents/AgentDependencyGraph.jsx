import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GitBranch, Zap, Users } from 'lucide-react';

const dependencies = [
  {
    primary: { name: 'Sara', avatar: '👩‍💼', role: 'Procurement', color: 'blue' },
    dependencies: [
      { 
        agent: { name: 'Khaled', avatar: '👨‍⚖️', role: 'GRC', color: 'purple' },
        reason: 'فحص الامتثال',
        reasonEn: 'Compliance verification',
        frequency: 'عالية'
      },
      { 
        agent: { name: 'Nora', avatar: '👩‍💻', role: 'Finance', color: 'emerald' },
        reason: 'موافقة الميزانية',
        reasonEn: 'Budget approval',
        frequency: 'عالية'
      },
      { 
        agent: { name: 'Max', avatar: '🤖', role: 'Robotics', color: 'indigo' },
        reason: 'حالة المخزون',
        reasonEn: 'Inventory status',
        frequency: 'متوسطة'
      }
    ]
  },
  {
    primary: { name: 'Abdullah', avatar: '👨‍💼', role: 'HR', color: 'amber' },
    dependencies: [
      { 
        agent: { name: 'Khaled', avatar: '👨‍⚖️', role: 'GRC', color: 'purple' },
        reason: 'فحص الخلفية',
        reasonEn: 'Background checks',
        frequency: 'عالية'
      },
      { 
        agent: { name: 'Nora', avatar: '👩‍💻', role: 'Finance', color: 'emerald' },
        reason: 'إعداد الرواتب',
        reasonEn: 'Payroll setup',
        frequency: 'عالية'
      },
      { 
        agent: { name: 'Lina', avatar: '👩‍🔧', role: 'IT Support', color: 'rose' },
        reason: 'تجهيز الأجهزة',
        reasonEn: 'Equipment setup',
        frequency: 'متوسطة'
      }
    ]
  },
  {
    primary: { name: 'Nora', avatar: '👩‍💻', role: 'Finance', color: 'emerald' },
    dependencies: [
      { 
        agent: { name: 'Khaled', avatar: '👨‍⚖️', role: 'GRC', color: 'purple' },
        reason: 'مراجعة التقارير',
        reasonEn: 'Report auditing',
        frequency: 'عالية'
      },
      { 
        agent: { name: 'Sara', avatar: '👩‍💼', role: 'Procurement', color: 'blue' },
        reason: 'معالجة الفواتير',
        reasonEn: 'Invoice processing',
        frequency: 'عالية'
      }
    ]
  }
];

const frequencyColors = {
  'عالية': 'bg-red-100 text-red-700 border-red-200',
  'متوسطة': 'bg-amber-100 text-amber-700 border-amber-200',
  'منخفضة': 'bg-blue-100 text-blue-700 border-blue-200'
};

export default function AgentDependencyGraph() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-emerald-600" />
            تبعيات المهام بين الوكلاء
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            خريطة الاعتمادات والتنسيق المطلوب لإنجاز العمليات
          </p>
        </div>
      </div>

      {/* Dependency Tree */}
      <div className="space-y-8">
        {dependencies.map((dep, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.2 }}
          >
            <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
              {/* Primary Agent */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${dep.primary.color}-500 to-${dep.primary.color}-600 flex items-center justify-center text-3xl shadow-lg`}>
                  {dep.primary.avatar}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{dep.primary.name}</h4>
                  <p className="text-sm text-slate-600">{dep.primary.role}</p>
                </div>
                <div className="ml-auto">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    {dep.dependencies.length} تبعيات
                  </Badge>
                </div>
              </div>

              {/* Dependencies Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {dep.dependencies.map((dependency, depIdx) => (
                  <motion.div
                    key={depIdx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.2 + depIdx * 0.1 }}
                    className="relative"
                  >
                    <Card className="p-4 hover:shadow-lg transition-all border-2 hover:border-emerald-300">
                      {/* Connection Line */}
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <ArrowRight className="w-5 h-5 text-slate-300 rotate-90" />
                      </div>

                      {/* Dependent Agent */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${dependency.agent.color}-500 to-${dependency.agent.color}-600 flex items-center justify-center text-xl shadow-md`}>
                          {dependency.agent.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm truncate">
                            {dependency.agent.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {dependency.agent.role}
                          </div>
                        </div>
                      </div>

                      {/* Dependency Info */}
                      <div className="space-y-2">
                        <div className="text-sm text-slate-700">
                          <div className="font-medium">{dependency.reason}</div>
                          <div className="text-xs text-slate-500">{dependency.reasonEn}</div>
                        </div>
                        
                        <Badge className={`text-xs ${frequencyColors[dependency.frequency]}`}>
                          تكرار: {dependency.frequency}
                        </Badge>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <Users className="w-8 h-8 text-blue-600 mb-2" />
          <div className="text-2xl font-bold text-blue-600">6</div>
          <div className="text-xs text-slate-600">وكلاء نشطون</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <GitBranch className="w-8 h-8 text-purple-600 mb-2" />
          <div className="text-2xl font-bold text-purple-600">12</div>
          <div className="text-xs text-slate-600">تبعيات مباشرة</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <Zap className="w-8 h-8 text-emerald-600 mb-2" />
          <div className="text-2xl font-bold text-emerald-600">95%</div>
          <div className="text-xs text-slate-600">معدل التنسيق</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <ArrowRight className="w-8 h-8 text-amber-600 mb-2" />
          <div className="text-2xl font-bold text-amber-600">3.2 min</div>
          <div className="text-xs text-slate-600">متوسط التسليم</div>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">تنسيق ذكي ومتزامن</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              يتعاون الوكلاء بشكل تلقائي وذكي، حيث يفهم كل وكيل متى يحتاج إلى مساعدة من الآخرين، 
              ويتواصل معهم مباشرة لإنجاز المهام بأعلى كفاءة وبدون تدخل بشري.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}