import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Activity, Bell, Calendar, ShoppingBag, 
  MessageSquare, Star, Eye, Clock, CheckCircle2, XCircle,
  BarChart3, Users, Package, ArrowUpRight, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PublicHeader from '@/components/shared/PublicHeader';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import StatsChart from '@/components/dashboard/StatsChart';
import QuickActions from '@/components/dashboard/QuickActions';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { toast } from 'sonner';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(isAuth => {
        if (!isAuth) {
          toast.error('الرجاء تسجيل الدخول أولاً');
          setTimeout(() => window.location.href = createPageUrl('Home'), 1000);
          return null;
        }
        return base44.auth.me();
      })
      .then(setUser)
      .catch(() => {
        toast.error('الرجاء تسجيل الدخول أولاً');
        setTimeout(() => window.location.href = createPageUrl('Home'), 1000);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch user's recent activities
  const { data: inquiries = [] } = useQuery({
    queryKey: ['user-inquiries', user?.email],
    queryFn: () => base44.entities.Inquiry.filter({ contact_email: user.email }),
    enabled: !!user,
    retry: false
  });

  const { data: demoRequests = [] } = useQuery({
    queryKey: ['user-demos', user?.email],
    queryFn: () => base44.entities.DemoRequest.filter({ email: user.email }),
    enabled: !!user,
    retry: false
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['user-notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }),
    enabled: !!user,
    retry: false
  });

  const { data: approvalRequests = [] } = useQuery({
    queryKey: ['user-approvals', user?.email],
    queryFn: () => base44.entities.ApprovalRequest.filter({ requester_email: user.email }),
    enabled: !!user,
    retry: false
  });

  const { data: session } = useQuery({
    queryKey: ['visitor-session'],
    queryFn: async () => {
      const sessionId = localStorage.getItem('sbg_session_id');
      if (!sessionId) return null;
      const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
      return sessions[0] || null;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const pendingInquiries = inquiries.filter(i => i.status === 'pending').length;
  const pendingApprovals = approvalRequests.filter(a => a.status === 'pending').length;

  const stats = [
    { 
      label: 'إجمالي الاستفسارات', 
      value: inquiries.length, 
      icon: MessageSquare, 
      color: 'from-blue-500 to-cyan-500',
      change: '+12%'
    },
    { 
      label: 'طلبات العروض', 
      value: demoRequests.length, 
      icon: Calendar, 
      color: 'from-purple-500 to-pink-500',
      change: '+8%'
    },
    { 
      label: 'إشعارات جديدة', 
      value: unreadNotifications, 
      icon: Bell, 
      color: 'from-amber-500 to-orange-500',
      change: 'جديد'
    },
    { 
      label: 'الموافقات المعلقة', 
      value: pendingApprovals, 
      icon: CheckCircle2, 
      color: 'from-emerald-500 to-teal-500',
      change: pendingApprovals > 0 ? 'عاجل' : 'لا يوجد'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <PublicHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                مرحباً، {user?.full_name || 'User'} 👋
              </h1>
              <p className="text-slate-600 mt-1">
                إليك ملخص نشاطك اليوم
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              {session?.journey_stage === 'customer' ? 'عميل نشط' : 'مستكشف'}
            </Badge>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Activity Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <ErrorBoundary fallbackMessage="تعذر تحميل جدول الأنشطة">
              <ActivityTimeline 
                inquiries={inquiries}
                demoRequests={demoRequests}
                approvalRequests={approvalRequests}
              />
            </ErrorBoundary>
            
            <ErrorBoundary fallbackMessage="تعذر تحميل الإحصائيات">
              <StatsChart 
                inquiries={inquiries}
                demoRequests={demoRequests}
                session={session}
              />
            </ErrorBoundary>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* Recent Notifications */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>إشعارات حديثة</span>
                  {unreadNotifications > 0 && (
                    <Badge className="bg-red-500 text-white">{unreadNotifications}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border ${
                        notif.is_read ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          notif.type === 'pending_approval' ? 'bg-amber-100 text-amber-600' :
                          notif.type === 'approved' ? 'bg-green-100 text-green-600' :
                          notif.type === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(notif.created_date).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {notifications.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      لا توجد إشعارات حالياً
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Insights */}
            {session && (
              <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    رؤى شخصية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">عدد الزيارات</span>
                    <Badge className="bg-violet-100 text-violet-700">{session.visit_count || 1}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">نقاط الجودة</span>
                    <Badge className="bg-emerald-100 text-emerald-700">{session.lead_score || 0}</Badge>
                  </div>
                  {session.interests && session.interests.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-700 mb-2">اهتماماتك:</p>
                      <div className="flex flex-wrap gap-1">
                        {session.interests.map((interest, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}