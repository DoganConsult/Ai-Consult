import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function ActivityTimeline({ inquiries, demoRequests, approvalRequests }) {
  // Combine and sort all activities
  const activities = [
    ...inquiries.map(i => ({
      type: 'inquiry',
      title: `استفسار: ${i.products?.[0] || 'منتج'}`,
      status: i.status,
      date: i.created_date,
      icon: MessageSquare,
      color: 'blue'
    })),
    ...demoRequests.map(d => ({
      type: 'demo',
      title: `طلب عرض: ${d.product_name}`,
      status: d.status,
      date: d.created_date,
      icon: Calendar,
      color: 'purple'
    })),
    ...approvalRequests.map(a => ({
      type: 'approval',
      title: `طلب موافقة: ${a.title}`,
      status: a.status,
      date: a.created_date,
      icon: CheckCircle2,
      color: 'emerald'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  const statusConfig = {
    pending: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700' },
    contacted: { label: 'تم التواصل', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-indigo-100 text-indigo-700' },
    completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
    approved: { label: 'موافق', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
    scheduled: { label: 'مجدول', color: 'bg-purple-100 text-purple-700' },
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          سجل النشاطات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              لا توجد نشاطات حتى الآن. ابدأ باستكشاف منتجاتنا!
            </p>
          ) : (
            activities.map((activity, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className={
                  activity.color === 'blue' ? 'w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0' :
                  activity.color === 'purple' ? 'w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0' :
                  'w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0'
                }>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                    <Badge className={`${statusConfig[activity.status]?.color || 'bg-slate-100 text-slate-700'} text-xs shrink-0`}>
                      {statusConfig[activity.status]?.label || activity.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(activity.date), 'PPp', { locale: ar })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}