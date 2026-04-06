import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, CheckCircle2, Zap } from 'lucide-react';

const agents = [
  {
    name: 'سارة',
    nameEn: 'Sara',
    role: 'وكيل المشتريات',
    roleEn: 'Procurement Agent',
    avatar: '👩‍💼',
    tagline: 'Smart Procurement Specialist',
    description: 'دقيقة ومنظمة، تحرص على أفضل الصفقات مع الموردين المعتمدين',
    expertise: ['Vendor Management', 'RFQ Automation', 'Cost Optimization'],
    achievement: '10M+ SAR saved in Q4 2024',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'خالد',
    nameEn: 'Khaled',
    role: 'وكيل الحوكمة',
    roleEn: 'GRC Agent',
    avatar: '👨‍⚖️',
    tagline: 'Compliance & Governance Expert',
    description: 'حازم وملتزم، يضمن الامتثال الكامل للمعايير التنظيمية',
    expertise: ['NCA Compliance', 'Risk Management', 'Audit Trails'],
    achievement: '100% compliance rate across all audits',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    name: 'نورة',
    nameEn: 'Nora',
    role: 'وكيل المالية',
    roleEn: 'Financial Agent',
    avatar: '👩‍💻',
    tagline: 'Financial Operations Director',
    description: 'تحليلية ودقيقة، تدير الإقفالات المالية بسلاسة تامة',
    expertise: ['IFRS Standards', 'Period Close', 'Financial Reporting'],
    achievement: 'Reduced closing time from 5 days to 2 hours',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    name: 'عبدالله',
    nameEn: 'Abdullah',
    role: 'وكيل الموارد البشرية',
    roleEn: 'HR Agent',
    avatar: '👨‍💼',
    tagline: 'Human Capital Strategist',
    description: 'ودود وفعال، يسهل عمليات التوظيف والتأهيل',
    expertise: ['Nitaqat Compliance', 'Talent Acquisition', 'Onboarding'],
    achievement: '95% Saudization rate maintained',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    name: 'ماكس',
    nameEn: 'Max',
    role: 'وكيل الروبوتات',
    roleEn: 'Robotics Agent',
    avatar: '🤖',
    tagline: 'Automation & Robotics Commander',
    description: 'سريع ودقيق، يدير المستودعات الذكية بكفاءة عالية',
    expertise: ['IoT Integration', 'Motion Control', 'Warehouse Automation'],
    achievement: '99.9% picking accuracy with zero downtime',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    name: 'لينا',
    nameEn: 'Lina',
    role: 'وكيل الدعم الفني',
    roleEn: 'Service Desk Agent',
    avatar: '👩‍🔧',
    tagline: 'IT Support Specialist',
    description: 'مساعدة وصبورة، تحل المشاكل التقنية بسرعة',
    expertise: ['Ticket Resolution', 'Password Resets', 'System Diagnostics'],
    achievement: 'Average resolution time: 4 minutes',
    gradient: 'from-rose-500 to-red-500'
  }
];

export default function AgentTeam() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Users className="w-8 h-8 text-emerald-600" />
          <h2 className="text-3xl font-bold text-slate-900">فريق الوكلاء الأذكياء</h2>
        </div>
        <p className="text-slate-600 max-w-2xl mx-auto">
          كل وكيل متخصص في مجاله، يعمل بذكاء اصطناعي متقدم لتبسيط عملياتك
        </p>
      </div>

      {/* Agents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 border-2 hover:border-emerald-400">
              {/* Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              {/* Animated Light Beam */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
              </div>

              <CardHeader className="relative">
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {agent.avatar}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">
                      {agent.name} - {agent.role}
                    </CardTitle>
                    <p className="text-sm text-slate-500">{agent.nameEn} - {agent.roleEn}</p>
                  </div>
                </div>
                <Badge className={`bg-gradient-to-r ${agent.gradient} text-white border-0 w-fit`}>
                  {agent.tagline}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4 relative">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {agent.description}
                </p>

                {/* Core Expertise */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Core Expertise:
                  </h4>
                  <div className="space-y-1">
                    {agent.expertise.map((skill, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Achievement */}
                <div className={`p-3 rounded-lg bg-gradient-to-r ${agent.gradient} bg-opacity-10 border-l-4`} style={{ borderColor: 'currentColor' }}>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <p className="text-sm font-medium text-slate-700">
                      {agent.achievement}
                    </p>
                  </div>
                </div>
              </CardContent>

              {/* Bottom Glow Line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${agent.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid md:grid-cols-4 gap-4 mt-12"
      >
        <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
          <p className="text-sm text-slate-600">عمل متواصل</p>
        </Card>
        <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-2">99.9%</div>
          <p className="text-sm text-slate-600">دقة العمليات</p>
        </Card>
        <Card className="p-6 text-center bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="text-3xl font-bold text-emerald-600 mb-2">70%</div>
          <p className="text-sm text-slate-600">تقليل الوقت</p>
        </Card>
        <Card className="p-6 text-center bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="text-3xl font-bold text-amber-600 mb-2">100%</div>
          <p className="text-sm text-slate-600">امتثال تنظيمي</p>
        </Card>
      </motion.div>
    </div>
  );
}