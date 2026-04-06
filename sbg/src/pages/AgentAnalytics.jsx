import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  BarChart3, Clock, CheckCircle2, AlertTriangle, XCircle,
  ShoppingCart, Shield, Calculator, Users, Bot, HeadphonesIcon, RefreshCw, ChevronDown, ChevronUp,
  Zap, DollarSign, Target, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PublicHeader from '@/components/shared/PublicHeader';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';

const AGENT_TYPES = [
  { id: 'procurement', name: 'Procurement', icon: ShoppingCart, color: '#3B82F6' },
  { id: 'grc', name: 'GRC & Compliance', icon: Shield, color: '#10B981' },
  { id: 'financial', name: 'Financial Close', icon: Calculator, color: '#F59E0B' },
  { id: 'hr', name: 'HR Operations', icon: Users, color: '#EC4899' },
  { id: 'robotics', name: 'Robotics & IoT', icon: Bot, color: '#8B5CF6' },
  { id: 'service_desk', name: 'Service Desk', icon: HeadphonesIcon, color: '#06B6D4' },
];

const STATUS_COLORS = {
  completed: '#10B981',
  running: '#3B82F6',
  failed: '#EF4444',
  pending_approval: '#F59E0B'
};

export default function AgentAnalytics() {
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [expandedRun, setExpandedRun] = useState(null);

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['agent-runs', selectedAgent, timeRange],
    queryFn: () => base44.entities.AgentRun.list('-created_date', 100)
  });

  const filteredRuns = useMemo(() => {
    if (selectedAgent === 'all') return runs;
    return runs.filter(r => r.agent_type === selectedAgent);
  }, [runs, selectedAgent]);

  const stats = useMemo(() => {
    const total = filteredRuns.length;
    const completed = filteredRuns.filter(r => r.status === 'completed').length;
    const failed = filteredRuns.filter(r => r.status === 'failed').length;
    const avgTime = filteredRuns.length > 0 
      ? Math.round(filteredRuns.reduce((acc, r) => acc + (r.execution_time_ms || 0), 0) / filteredRuns.length / 1000)
      : 0;
    const totalSavings = filteredRuns.reduce((acc, r) => acc + (r.cost_savings_sar || 0), 0);
    const avgCompliance = filteredRuns.length > 0
      ? Math.round(filteredRuns.reduce((acc, r) => acc + (r.compliance_score || 100), 0) / filteredRuns.length)
      : 100;
    
    return { total, completed, failed, avgTime, totalSavings, avgCompliance, successRate: total > 0 ? Math.round(completed / total * 100) : 0 };
  }, [filteredRuns]);

  const chartData = useMemo(() => {
    const byAgent = AGENT_TYPES.map(agent => ({
      name: agent.name,
      runs: filteredRuns.filter(r => r.agent_type === agent.id).length,
      success: filteredRuns.filter(r => r.agent_type === agent.id && r.status === 'completed').length,
      color: agent.color
    }));

    const byStatus = [
      { name: 'Completed', value: stats.completed, color: STATUS_COLORS.completed },
      { name: 'Failed', value: stats.failed, color: STATUS_COLORS.failed },
      { name: 'Running', value: filteredRuns.filter(r => r.status === 'running').length, color: STATUS_COLORS.running },
      { name: 'Pending', value: filteredRuns.filter(r => r.status === 'pending_approval').length, color: STATUS_COLORS.pending_approval },
    ].filter(d => d.value > 0);

    // Mock trend data
    const trendData = Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      executions: Math.floor(Math.random() * 50) + 20,
      savings: Math.floor(Math.random() * 50000) + 10000,
      compliance: Math.floor(Math.random() * 10) + 90
    }));

    return { byAgent, byStatus, trendData };
  }, [filteredRuns, stats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-600" />
              Agent Analytics Dashboard
            </h1>
            <p className="text-slate-600 mt-1">لوحة تحليلات أداء الوكلاء الأذكياء</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {AGENT_TYPES.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl('AgentConfiguration')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Zap className="w-4 h-4 mr-2" /> Configure Agents
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard title="Total Runs" value={stats.total} icon={Activity} color="blue" />
          <KPICard title="Success Rate" value={`${stats.successRate}%`} icon={Target} color="emerald" trend="+2.5%" />
          <KPICard title="Avg Time" value={`${stats.avgTime}s`} icon={Clock} color="amber" />
          <KPICard title="Failed" value={stats.failed} icon={XCircle} color="red" />
          <KPICard title="Cost Savings" value={`${(stats.totalSavings / 1000).toFixed(0)}K SAR`} icon={DollarSign} color="green" trend="+12%" />
          <KPICard title="Compliance" value={`${stats.avgCompliance}%`} icon={Shield} color="violet" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Executions by Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Executions by Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.byAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="runs" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="executions" stroke="#10B981" fill="#10B98120" name="Executions" />
                  <Area type="monotone" dataKey="compliance" stroke="#8B5CF6" fill="#8B5CF620" name="Compliance %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Runs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Agent Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRuns.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No agent runs recorded yet. Runs will appear here once agents execute tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRuns.slice(0, 10).map((run) => {
                  const agent = AGENT_TYPES.find(a => a.id === run.agent_type);
                  const isExpanded = expandedRun === run.id;
                  return (
                    <motion.div key={run.id} layout>
                      <div 
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: agent?.color + '20' }}>
                          {agent && <agent.icon className="w-5 h-5" style={{ color: agent.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{run.scenario_name}</p>
                          <p className="text-xs text-slate-500">{agent?.name} • {new Date(run.created_date).toLocaleString()}</p>
                        </div>
                        <Badge className={`
                          ${run.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                          ${run.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                          ${run.status === 'running' ? 'bg-blue-100 text-blue-700' : ''}
                          ${run.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' : ''}
                        `}>
                          {run.status}
                        </Badge>
                        <div className="text-right text-sm">
                          <p className="font-medium">{run.compliance_score || 100}%</p>
                          <p className="text-xs text-slate-500">Compliance</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium text-emerald-600">+{(run.cost_savings_sar || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">SAR Saved</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                      
                      {/* Expanded Mind Report */}
                      {isExpanded && run.mind_report && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-4 bg-white border border-slate-200 rounded-lg"
                        >
                          <h4 className="font-semibold text-slate-900 mb-3">Mind Report</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">Execution Steps</p>
                              <div className="space-y-1">
                                {(run.mind_report.steps || []).map((step, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">Evidence IDs</p>
                              <div className="flex flex-wrap gap-1">
                                {(run.evidence_ids || []).map((eid, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{eid}</Badge>
                                ))}
                              </div>
                              {run.error_message && (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                                  {run.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    violet: 'bg-violet-100 text-violet-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{title}</p>
            {trend && <p className="text-xs text-emerald-600">{trend}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}