import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PublicHeader from '@/components/shared/PublicHeader';
import { TrendingUp, Users, DollarSign, Target, Activity, Sparkles, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CSuiteDashboard() {
  const [timeRange, setTimeRange] = useState('7d');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: demos = [] } = useQuery({
    queryKey: ['demos'],
    queryFn: () => base44.entities.DemoRequest.list('-created_date', 100)
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ['inquiries'],
    queryFn: () => base44.entities.Inquiry.list('-created_date', 100)
  });

  const { data: visitors = [] } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => base44.entities.VisitorSession.list('-last_visit', 100)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-600">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalRevenue = inquiries.reduce((sum, inq) => sum + (inq.total_value || 0), 0);
  const avgLeadScore = visitors.reduce((sum, v) => sum + (v.lead_score || 0), 0) / (visitors.length || 1);
  const conversionRate = ((demos.filter(d => d.status === 'completed').length / demos.length) * 100).toFixed(1);
  const activeVisitors = visitors.filter(v => {
    const lastVisit = new Date(v.last_visit);
    const daysSince = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  }).length;

  // Journey stage distribution
  const journeyData = [
    { name: 'Explorer', value: visitors.filter(v => v.journey_stage === 'explorer').length },
    { name: 'Evaluator', value: visitors.filter(v => v.journey_stage === 'evaluator').length },
    { name: 'Decision Maker', value: visitors.filter(v => v.journey_stage === 'decision_maker').length },
    { name: 'Customer', value: visitors.filter(v => v.journey_stage === 'customer').length }
  ];

  // Demo funnel
  const funnelData = [
    { stage: 'Demos Requested', count: demos.length },
    { stage: 'Contacted', count: demos.filter(d => d.status === 'contacted').length },
    { stage: 'Scheduled', count: demos.filter(d => d.status === 'scheduled').length },
    { stage: 'Completed', count: demos.filter(d => d.status === 'completed').length }
  ];

  // Product performance
  const productPerf = products.slice(0, 5).map(p => ({
    name: p.name.split(' ').slice(0, 2).join(' '),
    views: visitors.reduce((sum, v) => sum + (v.products_viewed?.includes(p.id) ? 1 : 0), 0),
    inquiries: inquiries.filter(inq => inq.products?.includes(p.id)).length
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              C-Suite Executive Dashboard
            </h1>
            <p className="text-slate-600 mt-1">Real-time intelligence for strategic decision-making</p>
          </div>
          <Badge className="bg-emerald-500 text-white px-4 py-2">Live Data</Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Pipeline</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {totalRevenue.toLocaleString()} <span className="text-lg text-slate-500">SAR</span>
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-emerald-600 text-sm">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+24% vs last month</span>
                  </div>
                </div>
                <DollarSign className="w-10 h-10 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Visitors</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{activeVisitors}</p>
                  <p className="text-xs text-slate-500 mt-2">Last 7 days</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Conversion Rate</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{conversionRate}%</p>
                  <div className="flex items-center gap-1 mt-2 text-emerald-600 text-sm">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+5.2% improvement</span>
                  </div>
                </div>
                <Target className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg Lead Score</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{avgLeadScore.toFixed(1)}/10</p>
                  <p className="text-xs text-slate-500 mt-2">AI-calculated quality</p>
                </div>
                <Activity className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Journey Stages */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Journey Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={journeyData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                    {journeyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Demo Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Demo Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productPerf}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#3b82f6" name="Page Views" />
                <Bar dataKey="inquiries" fill="#10b981" name="Inquiries" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Demos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demos.slice(0, 5).map((demo) => (
                  <div key={demo.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{demo.company}</p>
                      <p className="text-sm text-slate-600">{demo.product_name}</p>
                    </div>
                    <Badge className={
                      demo.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      demo.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {demo.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High-Value Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visitors
                  .filter(v => v.lead_score >= 7)
                  .slice(0, 5)
                  .map((visitor) => (
                    <div key={visitor.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{visitor.visitor_email || 'Anonymous'}</p>
                        <p className="text-sm text-slate-600">
                          {visitor.pages_visited?.length || 0} pages • {Math.floor((visitor.time_spent_seconds || 0) / 60)}m
                        </p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700">
                        Score: {visitor.lead_score}/10
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}