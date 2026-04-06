import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Activity, Clock, CheckCircle, XCircle, AlertTriangle, 
  TrendingUp, Filter, Calendar, BarChart3, PieChart as PieChartIcon,
  Wrench, RefreshCw, MapPin, GitBranch, Scale, Target, Brain, Sparkles
} from 'lucide-react';
import PredictiveAnalytics from './PredictiveAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import AIScenarioOptimizer from './AIScenarioOptimizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Saudi regions for heatmap
const saudiRegions = [
  { id: 'riyadh', name: 'الرياض', nameEn: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { id: 'jeddah', name: 'جدة', nameEn: 'Jeddah', lat: 21.4858, lng: 39.1925 },
  { id: 'dammam', name: 'الدمام', nameEn: 'Dammam', lat: 26.4207, lng: 50.0888 },
  { id: 'makkah', name: 'مكة المكرمة', nameEn: 'Makkah', lat: 21.3891, lng: 39.8579 },
  { id: 'madinah', name: 'المدينة المنورة', nameEn: 'Madinah', lat: 24.5247, lng: 39.5692 },
  { id: 'tabuk', name: 'تبوك', nameEn: 'Tabuk', lat: 28.3835, lng: 36.5550 },
  { id: 'abha', name: 'أبها', nameEn: 'Abha', lat: 18.2164, lng: 42.5053 },
  { id: 'khobar', name: 'الخبر', nameEn: 'Khobar', lat: 26.2172, lng: 50.1971 },
];

// Error categories for root cause analysis
const errorCategories = [
  { id: 'timeout', name: 'انتهاء الوقت', nameEn: 'Timeout', color: '#ef4444' },
  { id: 'auth', name: 'فشل المصادقة', nameEn: 'Auth Failure', color: '#f97316' },
  { id: 'validation', name: 'خطأ التحقق', nameEn: 'Validation Error', color: '#eab308' },
  { id: 'integration', name: 'فشل التكامل', nameEn: 'Integration Failure', color: '#8b5cf6' },
  { id: 'resource', name: 'نقص الموارد', nameEn: 'Resource Exhausted', color: '#ec4899' },
  { id: 'config', name: 'خطأ الإعدادات', nameEn: 'Config Error', color: '#06b6d4' },
];

// Mock data generator for demo purposes
const generateMockAnalyticsData = () => {
  const scenarios = [
    { id: 'procurement-autopilot', name: 'وكيل المشتريات الذكي', nameEn: 'Smart Procurement Agent' },
    { id: 'grc-evidenceops', name: 'وكيل الحوكمة والامتثال', nameEn: 'GRC & Compliance Agent' },
    { id: 'finance-close', name: 'وكيل الإقفال المالي', nameEn: 'Financial Close Agent' },
    { id: 'hr-ops', name: 'وكيل الموارد البشرية', nameEn: 'HR Operations Agent' },
    { id: 'robotics-ops', name: 'وكيل الروبوتات والأتمتة', nameEn: 'Robotics & IoT Agent' },
    { id: 'service-desk', name: 'وكيل الدعم الفني الذكي', nameEn: 'Smart Service Desk Agent' },
    { id: 'logistics-supply', name: 'وكيل اللوجستيات', nameEn: 'Logistics Agent' },
    { id: 'crm-agent', name: 'وكيل علاقات العملاء', nameEn: 'CRM Agent' },
  ];

  const tools = [
    'mind.extract_requirements', 'erpnext.rfq_create', 'procurement.supplier_rank',
    'governance.approval', 'erpnext.po_create', 'comms.send_email',
    'grc.ingest_documents', 'grc.ocr_classify', 'grc.map_controls',
    'finance.ledger_snapshot', 'finance.reconcile', 'hr.job_create',
    'robotics.safety_check', 'servicedesk.ticket_ingest', 'iam.password_reset'
  ];

  const runs = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 150; i++) {
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const status = Math.random() > 0.15 ? (Math.random() > 0.1 ? 'completed' : 'pending_approval') : 'failed';
    const executionTime = 1000 + Math.random() * 9000;
    const usedTools = tools.slice(0, 3 + Math.floor(Math.random() * 5));
    const region = saudiRegions[Math.floor(Math.random() * saudiRegions.length)];
    const errorType = status === 'failed' ? errorCategories[Math.floor(Math.random() * errorCategories.length)] : null;
    
    runs.push({
      id: `RUN-${i}`,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioNameEn: scenario.nameEn,
      status,
      execution_time_ms: executionTime,
      created_date: new Date(now - Math.random() * 30 * dayMs).toISOString(),
      tools_used: usedTools,
      steps_completed: status === 'completed' ? 6 : Math.floor(Math.random() * 5),
      total_steps: 6,
      region: region.id,
      regionName: region.nameEn,
      errorType: errorType?.id || null,
      errorCategory: errorType?.nameEn || null,
    });
  }

  return { runs, scenarios, tools };
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'pending_approval': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default: return <Clock className="w-4 h-4 text-blue-500" />;
  }
};

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-indigo-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-rose-500',
    purple: 'from-purple-500 to-violet-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <Badge className={`${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} text-xs`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-500">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </motion.div>
  );
}

export default function ScenarioAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedScenario, setSelectedScenario] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [compareScenarios, setCompareScenarios] = useState([]);
  
  const { runs, scenarios, tools } = useMemo(() => generateMockAnalyticsData(), []);

  // Filter runs based on selections
  const filteredRuns = useMemo(() => {
    let filtered = [...runs];
    
    if (selectedScenario !== 'all') {
      filtered = filtered.filter(r => r.scenarioId === selectedScenario);
    }
    
    const now = Date.now();
    const days = parseInt(timeRange);
    if (!isNaN(days)) {
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(r => new Date(r.created_date).getTime() > cutoff);
    }
    
    return filtered;
  }, [runs, selectedScenario, timeRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredRuns.length;
    const completed = filteredRuns.filter(r => r.status === 'completed').length;
    const failed = filteredRuns.filter(r => r.status === 'failed').length;
    const pending = filteredRuns.filter(r => r.status === 'pending_approval').length;
    const avgTime = total > 0 
      ? filteredRuns.reduce((sum, r) => sum + r.execution_time_ms, 0) / total 
      : 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalExecutions: total,
      successRate: successRate.toFixed(1),
      avgExecutionTime: (avgTime / 1000).toFixed(2),
      failedRuns: failed,
      pendingApprovals: pending,
    };
  }, [filteredRuns]);

  // Scenario frequency data
  const scenarioFrequency = useMemo(() => {
    const freq = {};
    filteredRuns.forEach(r => {
      freq[r.scenarioId] = freq[r.scenarioId] || { name: r.scenarioNameEn, count: 0, success: 0, failed: 0 };
      freq[r.scenarioId].count++;
      if (r.status === 'completed') freq[r.scenarioId].success++;
      if (r.status === 'failed') freq[r.scenarioId].failed++;
    });
    return Object.entries(freq)
      .map(([id, data]) => ({ id, ...data, successRate: ((data.success / data.count) * 100).toFixed(0) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRuns]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const dist = { completed: 0, failed: 0, pending_approval: 0 };
    filteredRuns.forEach(r => { dist[r.status] = (dist[r.status] || 0) + 1; });
    return [
      { name: 'Completed', value: dist.completed, color: '#10b981' },
      { name: 'Failed', value: dist.failed, color: '#ef4444' },
      { name: 'Pending', value: dist.pending_approval, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [filteredRuns]);

  // Tool usage frequency
  const toolUsage = useMemo(() => {
    const usage = {};
    filteredRuns.forEach(r => {
      r.tools_used.forEach(tool => {
        usage[tool] = (usage[tool] || 0) + 1;
      });
    });
    return Object.entries(usage)
      .map(([tool, count]) => ({ tool: tool.split('.').pop(), fullTool: tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredRuns]);

  // Execution time by scenario
  const executionTimeByScenario = useMemo(() => {
    const times = {};
    filteredRuns.forEach(r => {
      if (!times[r.scenarioId]) {
        times[r.scenarioId] = { name: r.scenarioNameEn, total: 0, count: 0 };
      }
      times[r.scenarioId].total += r.execution_time_ms;
      times[r.scenarioId].count++;
    });
    return Object.entries(times)
      .map(([id, data]) => ({ 
        id, 
        name: data.name.length > 20 ? data.name.substring(0, 20) + '...' : data.name, 
        avgTime: (data.total / data.count / 1000).toFixed(2) 
      }))
      .sort((a, b) => b.avgTime - a.avgTime);
  }, [filteredRuns]);

  // Daily trend data
  const dailyTrend = useMemo(() => {
    const trend = {};
    filteredRuns.forEach(r => {
      const date = new Date(r.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!trend[date]) trend[date] = { date, executions: 0, success: 0, failed: 0 };
      trend[date].executions++;
      if (r.status === 'completed') trend[date].success++;
      if (r.status === 'failed') trend[date].failed++;
    });
    return Object.values(trend).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
  }, [filteredRuns]);

  // Regional heatmap data
  const regionalData = useMemo(() => {
    const regionStats = {};
    saudiRegions.forEach(r => {
      regionStats[r.id] = { ...r, total: 0, success: 0, failed: 0, avgTime: 0, times: [] };
    });
    filteredRuns.forEach(r => {
      if (regionStats[r.region]) {
        regionStats[r.region].total++;
        if (r.status === 'completed') regionStats[r.region].success++;
        if (r.status === 'failed') regionStats[r.region].failed++;
        regionStats[r.region].times.push(r.execution_time_ms);
      }
    });
    return Object.values(regionStats).map(r => ({
      ...r,
      successRate: r.total > 0 ? ((r.success / r.total) * 100).toFixed(0) : 0,
      avgTime: r.times.length > 0 ? (r.times.reduce((a, b) => a + b, 0) / r.times.length / 1000).toFixed(2) : 0,
      intensity: Math.min(r.total / 20, 1),
    }));
  }, [filteredRuns]);

  // Root cause analysis
  const rootCauseData = useMemo(() => {
    const causes = {};
    errorCategories.forEach(c => {
      causes[c.id] = { ...c, count: 0, scenarios: {}, tools: {} };
    });
    filteredRuns.filter(r => r.status === 'failed').forEach(r => {
      if (r.errorType && causes[r.errorType]) {
        causes[r.errorType].count++;
        causes[r.errorType].scenarios[r.scenarioNameEn] = (causes[r.errorType].scenarios[r.scenarioNameEn] || 0) + 1;
        r.tools_used.forEach(t => {
          causes[r.errorType].tools[t] = (causes[r.errorType].tools[t] || 0) + 1;
        });
      }
    });
    return Object.values(causes)
      .filter(c => c.count > 0)
      .map(c => ({
        ...c,
        topScenario: Object.entries(c.scenarios).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
        topTool: Object.entries(c.tools).sort((a, b) => b[1] - a[1])[0]?.[0]?.split('.').pop() || 'N/A',
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRuns]);

  // Scenario comparison data
  const comparisonData = useMemo(() => {
    if (compareScenarios.length < 2) return null;
    
    const data = compareScenarios.map(sId => {
      const sRuns = runs.filter(r => r.scenarioId === sId);
      const scenario = scenarios.find(s => s.id === sId);
      const completed = sRuns.filter(r => r.status === 'completed').length;
      const failed = sRuns.filter(r => r.status === 'failed').length;
      const avgTime = sRuns.length > 0 
        ? sRuns.reduce((sum, r) => sum + r.execution_time_ms, 0) / sRuns.length / 1000
        : 0;
      
      return {
        id: sId,
        name: scenario?.nameEn || sId,
        executions: sRuns.length,
        successRate: sRuns.length > 0 ? (completed / sRuns.length) * 100 : 0,
        failureRate: sRuns.length > 0 ? (failed / sRuns.length) * 100 : 0,
        avgTime: avgTime.toFixed(2),
        efficiency: Math.min(100, (1 / (avgTime / 5)) * 100).toFixed(0),
      };
    });

    // Generate trend comparison
    const trendData = [];
    const days = parseInt(timeRange) || 30;
    for (let i = days; i >= 0; i -= Math.ceil(days / 10)) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const point = { date: dateStr };
      compareScenarios.forEach(sId => {
        const scenario = scenarios.find(s => s.id === sId);
        const dayRuns = runs.filter(r => 
          r.scenarioId === sId && 
          new Date(r.created_date).toDateString() === date.toDateString()
        );
        point[scenario?.nameEn || sId] = dayRuns.filter(r => r.status === 'completed').length;
      });
      trendData.push(point);
    }

    return { summary: data, trend: trendData };
  }, [compareScenarios, runs, scenarios, timeRange]);

  const toggleCompareScenario = (sId) => {
    if (compareScenarios.includes(sId)) {
      setCompareScenarios(compareScenarios.filter(id => id !== sId));
    } else if (compareScenarios.length < 4) {
      setCompareScenarios([...compareScenarios, sId]);
    }
  };

  return (
    <div className="space-y-6" dir="ltr">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Scenario Analytics Dashboard
          </h2>
          <p className="text-slate-600 mt-1">Track performance, usage, and optimization opportunities</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Scenarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scenarios</SelectItem>
              {scenarios.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Predictive
            </TabsTrigger>
            <TabsTrigger value="geography" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Geography
            </TabsTrigger>
            <TabsTrigger value="rootcause" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Root Cause
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="aioptimize" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Optimize
            </TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          title="Total Executions"
          value={metrics.totalExecutions}
          icon={Activity}
          trend={12}
          color="blue"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate}%`}
          icon={CheckCircle}
          trend={5}
          color="emerald"
        />
        <MetricCard
          title="Avg Execution Time"
          value={`${metrics.avgExecutionTime}s`}
          icon={Clock}
          trend={-8}
          color="purple"
        />
        <MetricCard
          title="Failed Runs"
          value={metrics.failedRuns}
          icon={XCircle}
          color="red"
        />
        <MetricCard
          title="Pending Approvals"
          value={metrics.pendingApprovals}
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Execution Frequency by Scenario */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Execution Frequency by Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarioFrequency} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value, name) => [value, name === 'count' ? 'Executions' : name]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-emerald-600" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Execution Trend */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Daily Execution Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Area type="monotone" dataKey="success" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" name="Success" />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" name="Failed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Average Execution Time */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Avg Execution Time by Scenario (seconds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executionTimeByScenario} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} unit="s" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value) => [`${value}s`, 'Avg Time']}
                  />
                  <Bar dataKey="avgTime" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Usage & Bottlenecks */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            Most Used Tools & Potential Bottlenecks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tool Usage Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolUsage} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="tool" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value, name, props) => [value, props.payload.fullTool]}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tool List with Insights */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {toolUsage.map((tool, idx) => (
                <div key={tool.fullTool} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold`} 
                         style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{tool.tool}</div>
                      <div className="text-xs text-slate-500">{tool.fullTool}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{tool.count} uses</div>
                    {idx < 3 && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">High Usage</Badge>
                    )}
                    {tool.count < 10 && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">Low Usage</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Performance Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Scenario Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Scenario</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Executions</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Success</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Failed</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {scenarioFrequency.map((s, idx) => (
                  <motion.tr 
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{s.count}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-emerald-600 font-medium">{s.success}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-red-600 font-medium">{s.failed}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={`${parseInt(s.successRate) >= 80 ? 'bg-emerald-100 text-emerald-700' : parseInt(s.successRate) >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {s.successRate}%
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Predictive Analytics Tab */}
        <TabsContent value="predictive" className="space-y-6">
          <PredictiveAnalytics runs={filteredRuns} scenarios={scenarios} />
        </TabsContent>

        {/* Geography Tab - Regional Heatmap */}
        <TabsContent value="geography" className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Regional Performance Heatmap - Saudi Arabia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Visual Heatmap */}
                <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 min-h-[400px]">
                  <div className="absolute inset-0 opacity-20">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M20,20 Q50,10 80,25 Q90,50 75,75 Q50,90 25,70 Q10,50 20,20" 
                            fill="none" stroke="#d97706" strokeWidth="0.5" />
                    </svg>
                  </div>
                  {regionalData.map((region, idx) => (
                    <motion.div
                      key={region.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="absolute cursor-pointer group"
                      style={{
                        left: `${15 + (idx % 4) * 22}%`,
                        top: `${15 + Math.floor(idx / 4) * 35}%`,
                      }}
                    >
                      <div 
                        className="relative flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
                        style={{
                          width: `${40 + region.total * 2}px`,
                          height: `${40 + region.total * 2}px`,
                          backgroundColor: `rgba(16, 185, 129, ${0.2 + region.intensity * 0.6})`,
                          border: `3px solid rgba(16, 185, 129, ${0.5 + region.intensity * 0.5})`,
                        }}
                      >
                        <span className="text-xs font-bold text-emerald-800">{region.total}</span>
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {region.nameEn}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl min-w-[140px]">
                          <div className="font-semibold mb-2">{region.nameEn}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Executions:</span>
                              <span className="font-medium">{region.total}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Success Rate:</span>
                              <span className="font-medium text-emerald-400">{region.successRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg Time:</span>
                              <span className="font-medium">{region.avgTime}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Regional Stats Table */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {regionalData.sort((a, b) => b.total - a.total).map((region, idx) => (
                    <motion.div
                      key={region.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `rgba(16, 185, 129, ${0.2 + region.intensity * 0.6})` }}
                        >
                          <MapPin className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{region.nameEn}</div>
                          <div className="text-xs text-slate-500">{region.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-semibold text-slate-900">{region.total}</div>
                          <div className="text-xs text-slate-500">Runs</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-emerald-600">{region.successRate}%</div>
                          <div className="text-xs text-slate-500">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-amber-600">{region.avgTime}s</div>
                          <div className="text-xs text-slate-500">Avg Time</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Root Cause Tab */}
        <TabsContent value="rootcause" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Error Distribution */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-red-600" />
                  Error Distribution by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rootCauseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="count"
                        label={({ nameEn, percent }) => `${nameEn} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {rootCauseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Root Cause Details */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Root Cause Analysis Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {rootCauseData.map((cause, idx) => (
                    <motion.div
                      key={cause.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: cause.color }}
                          />
                          <span className="font-semibold text-slate-900">{cause.nameEn}</span>
                        </div>
                        <Badge className="bg-red-100 text-red-700">{cause.count} errors</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Most Affected Scenario</div>
                          <div className="font-medium text-slate-700 truncate">{cause.topScenario}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Most Failing Tool</div>
                          <div className="font-medium text-slate-700">{cause.topTool}</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                          💡 Recommendation: {
                            cause.id === 'timeout' ? 'Increase timeout limits or optimize long-running operations' :
                            cause.id === 'auth' ? 'Review authentication tokens and API credentials' :
                            cause.id === 'validation' ? 'Add input validation checks before execution' :
                            cause.id === 'integration' ? 'Check third-party service availability and retry logic' :
                            cause.id === 'resource' ? 'Scale up resources or implement queue-based processing' :
                            'Review configuration settings and environment variables'
                          }
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          {/* Scenario Selector */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                Select Scenarios to Compare (up to 4)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {scenarios.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                      compareScenarios.includes(s.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={compareScenarios.includes(s.id)}
                      onCheckedChange={() => toggleCompareScenario(s.id)}
                      disabled={!compareScenarios.includes(s.id) && compareScenarios.length >= 4}
                    />
                    <span className="text-sm font-medium">{s.nameEn}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparisonData ? (
            <>
              {/* Comparison Summary */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {comparisonData.summary.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mb-3"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <h4 className="font-semibold text-slate-900 mb-3 truncate">{s.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Executions</span>
                        <span className="font-medium">{s.executions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Success Rate</span>
                        <span className="font-medium text-emerald-600">{s.successRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Avg Time</span>
                        <span className="font-medium">{s.avgTime}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Efficiency</span>
                        <span className="font-medium text-blue-600">{s.efficiency}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trend Comparison Chart */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Performance Trend Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData.trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Legend />
                        {compareScenarios.map((sId, idx) => {
                          const scenario = scenarios.find(s => s.id === sId);
                          return (
                            <Line
                              key={sId}
                              type="monotone"
                              dataKey={scenario?.nameEn || sId}
                              stroke={COLORS[idx % COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Radar Comparison */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Multi-Metric Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { metric: 'Success Rate', ...Object.fromEntries(comparisonData.summary.map(s => [s.name, s.successRate])) },
                        { metric: 'Efficiency', ...Object.fromEntries(comparisonData.summary.map(s => [s.name, parseFloat(s.efficiency)])) },
                        { metric: 'Volume', ...Object.fromEntries(comparisonData.summary.map(s => [s.name, Math.min(100, s.executions * 2)])) },
                        { metric: 'Speed', ...Object.fromEntries(comparisonData.summary.map(s => [s.name, Math.max(0, 100 - parseFloat(s.avgTime) * 10)])) },
                        { metric: 'Reliability', ...Object.fromEntries(comparisonData.summary.map(s => [s.name, 100 - s.failureRate])) },
                      ]}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        {comparisonData.summary.map((s, idx) => (
                          <Radar
                            key={s.id}
                            name={s.name}
                            dataKey={s.name}
                            stroke={COLORS[idx % COLORS.length]}
                            fill={COLORS[idx % COLORS.length]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
              <Scale className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Select at least 2 scenarios to compare</h3>
              <p className="text-sm text-slate-500">Choose scenarios from the list above to see detailed comparisons</p>
            </div>
          )}
        </TabsContent>

        {/* AI Optimization Tab */}
        <TabsContent value="aioptimize" className="space-y-6">
          <AIScenarioOptimizer runs={filteredRuns} scenarios={scenarios} />
        </TabsContent>
      </Tabs>
    </div>
  );
}