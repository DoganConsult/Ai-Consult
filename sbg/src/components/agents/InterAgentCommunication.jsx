import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  ArrowRightLeft, 
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';

const mockCommunications = [
  {
    id: 1,
    from: { name: 'Sara', avatar: '👩‍💼', role: 'Procurement' },
    to: { name: 'Khaled', avatar: '👨‍⚖️', role: 'GRC' },
    message: 'طلب التحقق من امتثال المورد الجديد',
    messageEn: 'Request vendor compliance verification',
    type: 'request',
    timestamp: '2 min ago',
    status: 'delivered',
    priority: 'high'
  },
  {
    id: 2,
    from: { name: 'Khaled', avatar: '👨‍⚖️', role: 'GRC' },
    to: { name: 'Sara', avatar: '👩‍💼', role: 'Procurement' },
    message: 'تم التحقق - جميع الشهادات سارية ✓',
    messageEn: 'Verified - All certificates valid ✓',
    type: 'response',
    timestamp: '1 min ago',
    status: 'read',
    priority: 'high'
  },
  {
    id: 3,
    from: { name: 'Sara', avatar: '👩‍💼', role: 'Procurement' },
    to: { name: 'Nora', avatar: '👩‍💻', role: 'Finance' },
    message: 'طلب موافقة على ميزانية بقيمة 50,000 ريال',
    messageEn: 'Budget approval request for SAR 50,000',
    type: 'request',
    timestamp: '5 min ago',
    status: 'delivered',
    priority: 'medium'
  },
  {
    id: 4,
    from: { name: 'Abdullah', avatar: '👨‍💼', role: 'HR' },
    to: { name: 'Nora', avatar: '👩‍💻', role: 'Finance' },
    message: 'إعداد كشف راتب للموظف الجديد',
    messageEn: 'Setup payroll for new employee',
    type: 'handoff',
    timestamp: '10 min ago',
    status: 'in_progress',
    priority: 'medium'
  },
  {
    id: 5,
    from: { name: 'Nora', avatar: '👩‍💻', role: 'Finance' },
    to: { name: 'Abdullah', avatar: '👨‍💼', role: 'HR' },
    message: 'تم إعداد الراتب - جاهز للمراجعة',
    messageEn: 'Payroll configured - ready for review',
    type: 'response',
    timestamp: '8 min ago',
    status: 'read',
    priority: 'medium'
  },
  {
    id: 6,
    from: { name: 'Max', avatar: '🤖', role: 'Robotics' },
    to: { name: 'Sara', avatar: '👩‍💼', role: 'Procurement' },
    message: 'انخفاض المخزون - يرجى طلب 500 وحدة',
    messageEn: 'Low inventory alert - order 500 units',
    type: 'alert',
    timestamp: '15 min ago',
    status: 'delivered',
    priority: 'high'
  }
];

const typeConfig = {
  request: { color: 'blue', icon: MessageSquare, label: 'طلب' },
  response: { color: 'green', icon: CheckCircle2, label: 'رد' },
  handoff: { color: 'purple', icon: ArrowRightLeft, label: 'تسليم' },
  alert: { color: 'amber', icon: Zap, label: 'تنبيه' }
};

const priorityColors = {
  high: 'border-red-500 bg-red-50',
  medium: 'border-amber-500 bg-amber-50',
  low: 'border-blue-500 bg-blue-50'
};

export default function InterAgentCommunication() {
  const [communications, setCommunications] = useState(mockCommunications);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    avgResponseTime: '4.2 min'
  });

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newComm = {
          id: Date.now(),
          from: mockCommunications[Math.floor(Math.random() * mockCommunications.length)].from,
          to: mockCommunications[Math.floor(Math.random() * mockCommunications.length)].to,
          message: 'رسالة جديدة من النظام',
          messageEn: 'New system message',
          type: ['request', 'response', 'handoff'][Math.floor(Math.random() * 3)],
          timestamp: 'just now',
          status: 'delivered',
          priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
        };
        setCommunications(prev => [newComm, ...prev].slice(0, 10));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setStats({
      total: communications.length,
      active: communications.filter(c => c.status === 'in_progress').length,
      avgResponseTime: '4.2 min'
    });
  }, [communications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            الاتصالات بين الوكلاء
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            متابعة التواصل والتنسيق الفوري بين فريق الوكلاء
          </p>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-slate-600">مباشر</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-xs text-slate-600">رسائل اليوم</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-xs text-slate-600">تحت المعالجة</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}</div>
          <div className="text-xs text-slate-600">متوسط الاستجابة</div>
        </Card>
      </div>

      {/* Communication Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل الاتصالات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] px-6">
            <div className="space-y-3 pb-4">
              {communications.map((comm, idx) => {
                const typeConf = typeConfig[comm.type];
                const TypeIcon = typeConf.icon;
                
                return (
                  <motion.div
                    key={comm.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative border-l-4 ${priorityColors[comm.priority]} rounded-lg p-4 hover:shadow-md transition-shadow`}
                  >
                    {/* Agents Connection */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{comm.from.avatar}</span>
                        <span className="text-xs font-semibold text-slate-700">{comm.from.name}</span>
                      </div>
                      
                      <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                      
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{comm.to.avatar}</span>
                        <span className="text-xs font-semibold text-slate-700">{comm.to.name}</span>
                      </div>

                      <Badge className={`ml-auto text-xs bg-${typeConf.color}-100 text-${typeConf.color}-700`}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeConf.label}
                      </Badge>
                    </div>

                    {/* Message */}
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-900">{comm.message}</p>
                      <p className="text-xs text-slate-500">{comm.messageEn}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{comm.timestamp}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {comm.status === 'read' && '✓✓'}
                        {comm.status === 'delivered' && '✓'}
                        {comm.status === 'in_progress' && '⏳'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">التعاون التلقائي</h4>
            <p className="text-sm text-slate-600">
              الوكلاء يتواصلون ويتعاونون تلقائياً لإنجاز المهام بكفاءة عالية دون تدخل بشري
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}