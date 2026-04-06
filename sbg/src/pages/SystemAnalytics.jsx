import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, TrendingUp, Zap, AlertTriangle, CheckCircle, Clock,
  BarChart3, Gauge, Brain,
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar,
  Bot, Shield, DollarSign, GitBranch
} from 'lucide-react';
import { ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PublicHeader from '@/components/shared/PublicHeader';

import SystemPerformancePanel from '@/components/system-analytics/SystemPerformancePanel';
import TrendAnalysisPanel from '@/components/system-analytics/TrendAnalysisPanel';
import AgentComparisonPanel from '@/components/system-analytics/AgentComparisonPanel';
import BottleneckAnalysisPanel from '@/components/system-analytics/BottleneckAnalysisPanel';
import PredictiveAnalyticsPanel from '@/components/system-analytics/PredictiveAnalyticsPanel';
import AnomalyDetectionPanel from '@/components/system-analytics/AnomalyDetectionPanel';
import ReportGeneratorPanel from '@/components/system-analytics/ReportGeneratorPanel';
import ProactiveActionsPanel from '@/components/system-analytics/ProactiveActionsPanel';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

// Generate mock data for the dashboard
const generateSystemData = () => {
  const agents = [
    { id: 'procurement', name: 'Procurement Agent', icon: 'ShoppingCart' },
    { id: 'grc', name: 'GRC Agent', icon: 'Shield' },
    { id: 'financial', name: 'Financial Agent', icon: 'DollarSign' },
    { id: 'hr', name: 'HR Agent', icon: 'Users' },
    { id: 'robotics', name: 'Robotics Agent', icon: 'Cpu' },
    { id: 'service_desk', name: 'Service Desk Agent', icon: 'Bot' }
  ];

  // Generate 30 days of data
  const dailyData = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * dayMs);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    dailyData.push({
      date: dateStr,
      executions: 50 + Math.floor(Math.random() * 100),
      successRate: 75 + Math.random() * 20,
      avgTime: 2 + Math.random() * 4,
      costSavings: 5000 + Math.random() * 15000,
      efficiency: 70 + Math.random() * 25
    });
  }

  // Agent performance data
  const agentPerformance = agents.map(agent => ({
    ...agent,
    executions: 100 + Math.floor(Math.random() * 500),
    successRate: 70 + Math.random() * 25,
    avgTime: 1.5 + Math.random() * 5,
    costSavings: 10000 + Math.random() * 50000,
    efficiency: 65 + Math.random() * 30,
    uptime: 95 + Math.random() * 5,
    errors: Math.floor(Math.random() * 20)
  }));

  // Bottleneck data
  const bottlenecks = [
    { id: 'approval_delay', name: 'Approval Delays', impact: 'high', frequency: 45, avgDelay: 4.2, affectedAgents: ['procurement', 'financial'] },
    { id: 'integration_timeout', name: 'Integration Timeouts', impact: 'medium', frequency: 28, avgDelay: 2.8, affectedAgents: ['grc', 'service_desk'] },
    { id: 'resource_contention', name: 'Resource Contention', impact: 'medium', frequency: 22, avgDelay: 1.5, affectedAgents: ['robotics', 'hr'] },
    { id: 'validation_failures', name: 'Validation Failures', impact: 'low', frequency: 15, avgDelay: 0.8, affectedAgents: ['procurement'] },
    { id: 'api_rate_limits', name: 'API Rate Limits', impact: 'low', frequency: 12, avgDelay: 0.5, affectedAgents: ['financial', 'grc'] }
  ];

  return { agents, dailyData, agentPerformance, bottlenecks };
};

function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'emerald', sparklineData }) {
  const colorClasses = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-indigo-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-violet-500',
    red: 'from-red-500 to-rose-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <Badge className={`${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} text-xs flex items-center gap-1`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-500">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      
      {sparklineData && (
        <div className="mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color === 'emerald' ? '#10b981' : '#3b82f6'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color === 'emerald' ? '#10b981' : '#3b82f6'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color === 'emerald' ? '#10b981' : '#3b82f6'} 
                fill={`url(#sparkline-${color})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

export default function SystemAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { agents, dailyData, agentPerformance, bottlenecks } = useMemo(() => generateSystemData(), []);

  // Calculate aggregate KPIs
  const kpis = useMemo(() => {
    const totalExecutions = dailyData.reduce((sum, d) => sum + d.executions, 0);
    const avgSuccessRate = dailyData.reduce((sum, d) => sum + d.successRate, 0) / dailyData.length;
    const avgTime = dailyData.reduce((sum, d) => sum + d.avgTime, 0) / dailyData.length;
    const totalSavings = dailyData.reduce((sum, d) => sum + d.costSavings, 0);
    const avgEfficiency = dailyData.reduce((sum, d) => sum + d.efficiency, 0) / dailyData.length;
    
    // Calculate trends (compare last 7 days to previous 7 days)
    const recent = dailyData.slice(-7);
    const previous = dailyData.slice(-14, -7);
    
    const recentAvgSuccess = recent.reduce((sum, d) => sum + d.successRate, 0) / 7;
    const previousAvgSuccess = previous.reduce((sum, d) => sum + d.successRate, 0) / 7;
    const successTrend = ((recentAvgSuccess - previousAvgSuccess) / previousAvgSuccess) * 100;

    const recentAvgTime = recent.reduce((sum, d) => sum + d.avgTime, 0) / 7;
    const previousAvgTime = previous.reduce((sum, d) => sum + d.avgTime, 0) / 7;
    const timeTrend = ((previousAvgTime - recentAvgTime) / previousAvgTime) * 100;

    return {
      totalExecutions,
      avgSuccessRate: avgSuccessRate.toFixed(1),
      avgTime: avgTime.toFixed(2),
      totalSavings: (totalSavings / 1000).toFixed(0),
      avgEfficiency: avgEfficiency.toFixed(1),
      activeAgents: agents.length,
      successTrend,
      timeTrend
    };
  }, [dailyData, agents]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PublicHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              System Analytics Dashboard
            </h1>
            <p className="text-slate-600 mt-2">Comprehensive KPIs and insights across all agents and simulations</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard
            title="Total Executions"
            value={kpis.totalExecutions.toLocaleString()}
            icon={Activity}
            trend={12.5}
            color="blue"
            sparklineData={dailyData.map(d => ({ value: d.executions }))}
          />
          <KPICard
            title="Success Rate"
            value={`${kpis.avgSuccessRate}%`}
            icon={CheckCircle}
            trend={kpis.successTrend}
            color="emerald"
            sparklineData={dailyData.map(d => ({ value: d.successRate }))}
          />
          <KPICard
            title="Avg Execution Time"
            value={`${kpis.avgTime}s`}
            icon={Clock}
            trend={kpis.timeTrend}
            color="amber"
          />
          <KPICard
            title="Cost Savings"
            value={`${kpis.totalSavings}K SAR`}
            icon={DollarSign}
            trend={18.3}
            color="purple"
          />
          <KPICard
            title="System Efficiency"
            value={`${kpis.avgEfficiency}%`}
            icon={Gauge}
            trend={5.2}
            color="emerald"
          />
          <KPICard
            title="Active Agents"
            value={kpis.activeAgents}
            subtitle="All operational"
            icon={Bot}
            color="blue"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              <span className="hidden xl:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden xl:inline">Actions</span>
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden xl:inline">Predictive</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden xl:inline">Anomalies</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden xl:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden xl:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="bottlenecks" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden xl:inline">Bottlenecks</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span className="hidden xl:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <SystemPerformancePanel dailyData={dailyData} agentPerformance={agentPerformance} />
          </TabsContent>

          <TabsContent value="actions">
            <ProactiveActionsPanel dailyData={dailyData} agentPerformance={agentPerformance} bottlenecks={bottlenecks} />
          </TabsContent>

          <TabsContent value="predictive">
            <PredictiveAnalyticsPanel dailyData={dailyData} agentPerformance={agentPerformance} />
          </TabsContent>

          <TabsContent value="anomalies">
            <AnomalyDetectionPanel dailyData={dailyData} agentPerformance={agentPerformance} />
          </TabsContent>

          <TabsContent value="trends">
            <TrendAnalysisPanel dailyData={dailyData} />
          </TabsContent>

          <TabsContent value="agents">
            <AgentComparisonPanel agentPerformance={agentPerformance} />
          </TabsContent>

          <TabsContent value="bottlenecks">
            <BottleneckAnalysisPanel bottlenecks={bottlenecks} agentPerformance={agentPerformance} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportGeneratorPanel dailyData={dailyData} agentPerformance={agentPerformance} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}