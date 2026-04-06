import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function StatsChart({ inquiries, demoRequests, session }) {
  // Process data for charts
  const monthlyData = useMemo(() => {
    const months = {};
    const allItems = [...inquiries, ...demoRequests];
    
    allItems.forEach(item => {
      if (!item.created_date) return;
      const month = new Date(item.created_date).toLocaleDateString('ar-SA', { month: 'short' });
      if (!months[month]) {
        months[month] = { month, inquiries: 0, demos: 0 };
      }
      if (item.contact_email) months[month].inquiries++;
      else months[month].demos++;
    });
    
    return Object.values(months);
  }, [inquiries, demoRequests]);

  const statusData = useMemo(() => {
    const statuses = {};
    [...inquiries, ...demoRequests].forEach(item => {
      if (!item.status) return;
      statuses[item.status] = (statuses[item.status] || 0) + 1;
    });
    
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [inquiries, demoRequests]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const engagementData = useMemo(() => {
    if (!session) return [];
    
    return [
      { name: 'الزيارات', value: session.visit_count || 1 },
      { name: 'المنتجات المشاهدة', value: (session.products_viewed || []).length },
      { name: 'المحادثات', value: (session.conversation_ids || []).length },
      { name: 'الاستفسارات', value: (session.inquiries_created || []).length },
    ];
  }, [session]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Monthly Activity */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            النشاط الشهري
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="inquiries" fill="#3b82f6" name="استفسارات" radius={[8, 8, 0, 0]} />
              <Bar dataKey="demos" fill="#8b5cf6" name="عروض" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            توزيع الحالات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      {session && (
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              مقاييس التفاعل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ddd6fe',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}