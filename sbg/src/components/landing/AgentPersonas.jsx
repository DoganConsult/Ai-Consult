import React from 'react';
import { motion } from 'framer-motion';
import { Package, Shield, BarChart3, Users, Cpu, Wrench, Truck, HeartHandshake, FolderKanban, Building2, ShieldAlert, Sparkles, Zap, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const agents = [
  {
    id: 'procurement',
    name: 'سارة - وكيل المشتريات',
    nameEn: 'Sara - Procurement Agent',
    role: 'Smart Procurement Specialist',
    personality: 'دقيقة ومنظمة، تحرص على أفضل الصفقات مع الموردين المعتمدين',
    avatar: '👩‍💼',
    color: 'from-blue-500 to-cyan-500',
    icon: Package,
    expertise: ['Vendor Management', 'RFQ Automation', 'Cost Optimization'],
    achievement: '10M+ SAR saved in Q4 2024'
  },
  {
    id: 'grc',
    name: 'خالد - وكيل الحوكمة',
    nameEn: 'Khaled - GRC Agent',
    role: 'Compliance & Governance Expert',
    personality: 'حازم وملتزم، يضمن الامتثال الكامل للمعايير التنظيمية',
    avatar: '👨‍⚖️',
    color: 'from-emerald-500 to-teal-500',
    icon: Shield,
    expertise: ['NCA Compliance', 'Risk Management', 'Audit Trails'],
    achievement: '100% compliance rate across all audits'
  },
  {
    id: 'financial',
    name: 'نورة - وكيل المالية',
    nameEn: 'Nora - Financial Agent',
    role: 'Financial Operations Director',
    personality: 'تحليلية ودقيقة، تدير الإقفالات المالية بسلاسة تامة',
    avatar: '👩‍💻',
    color: 'from-amber-500 to-orange-500',
    icon: BarChart3,
    expertise: ['IFRS Standards', 'Period Close', 'Financial Reporting'],
    achievement: 'Reduced closing time from 5 days to 2 hours'
  },
  {
    id: 'hr',
    name: 'عبدالله - وكيل الموارد البشرية',
    nameEn: 'Abdullah - HR Agent',
    role: 'Human Capital Strategist',
    personality: 'ودود وفعال، يسهل عمليات التوظيف والتأهيل',
    avatar: '👨‍💼',
    color: 'from-purple-500 to-pink-500',
    icon: Users,
    expertise: ['Nitaqat Compliance', 'Talent Acquisition', 'Onboarding'],
    achievement: '95% Saudization rate maintained'
  },
  {
    id: 'robotics',
    name: 'ماكس - وكيل الروبوتات',
    nameEn: 'Max - Robotics Agent',
    role: 'Automation & Robotics Commander',
    personality: 'سريع ودقيق، يدير المستودعات الذكية بكفاءة عالية',
    avatar: '🤖',
    color: 'from-rose-500 to-red-500',
    icon: Cpu,
    expertise: ['IoT Integration', 'Motion Control', 'Warehouse Automation'],
    achievement: '99.9% picking accuracy with zero downtime'
  },
  {
    id: 'service',
    name: 'لينا - وكيل الدعم الفني',
    nameEn: 'Lina - Service Desk Agent',
    role: 'IT Support Specialist',
    personality: 'مساعدة وصبورة، تحل المشاكل التقنية بسرعة',
    avatar: '👩‍🔧',
    color: 'from-indigo-500 to-blue-500',
    icon: Wrench,
    expertise: ['Ticket Resolution', 'Password Resets', 'System Diagnostics'],
    achievement: 'Average resolution time: 4 minutes'
  },
];

export default function AgentPersonas() {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Meet Your AI Team
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            فريق الوكلاء الأذكياء
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            كل وكيل متخصص في مجاله، يعمل بذكاء اصطناعي متقدم لتبسيط عملياتك
          </p>
        </motion.div>

        {/* Agents Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group h-full bg-white hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 border-2 hover:border-emerald-200 overflow-hidden">
                  <CardContent className="p-6">
                    {/* Avatar & Icon */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="text-6xl"
                        >
                          {agent.avatar}
                        </motion.div>
                        <motion.div
                          className={`absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br ${agent.color} rounded-lg flex items-center justify-center shadow-lg`}
                          whileHover={{ scale: 1.2, rotate: -5 }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </motion.div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 mb-1" dir="rtl">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-slate-500">{agent.nameEn}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="mb-3">
                      <Badge className={`bg-gradient-to-r ${agent.color} text-white border-0 text-xs`}>
                        {agent.role}
                      </Badge>
                    </div>

                    {/* Personality */}
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed" dir="rtl">
                      {agent.personality}
                    </p>

                    {/* Expertise */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Core Expertise:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.expertise.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Achievement */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <p className="text-xs font-medium text-slate-700">{agent.achievement}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Brain className="w-8 h-8 text-emerald-600" />
              <h3 className="text-2xl font-bold text-slate-900">All Agents Work Together</h3>
            </div>
            <p className="text-slate-600 mb-2">
              Multi-agent coordination ensures seamless workflows across departments
            </p>
            <p className="text-sm text-slate-500">
              Powered by advanced AI orchestration and real-time collaboration protocols
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}