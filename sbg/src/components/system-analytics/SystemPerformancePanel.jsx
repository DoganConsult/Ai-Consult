import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity, CheckCircle, Zap, TrendingUp, Target
} from 'lucide-react';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SystemPerformancePanel({ dailyData, agentPerformance }) {
  // Calculate system health score
  const avgSuccessRate = agentPerformance.reduce((sum, a) => sum + a.successRate, 0) / agentPerformance.length;
  const avgEfficiency = agentPerformance.reduce((sum, a) => sum + a.efficiency, 0) / agentPerformance.length;
  const avgUptime = agentPerformance.reduce((sum, a) => sum + a.uptime, 0) / agentPerformance.length;
  const healthScore = ((avgSuccessRate + avgEfficiency + avgUptime) / 3).toFixed(0);

  // Agent distribution data
  const agentDistribution = agentPerformance.map(a => ({
    name: a.name.replace(' Agent', ''),
    value: a.executions
  }));

  // Performance breakdown
  const performanceBreakdown = [
    { name: 'Completed', value: Math.round(avgSuccessRate), color: '#10b981' },
    { name: 'Failed', value: Math.round(100 - avgSuccessRate - 5), color: '#ef4444' },
    { name: 'Pending', value: 5, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Health Score Gauge */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              System Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 440' }}
                    animate={{ strokeDasharray: `${(healthScore / 100) * 440} 440` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-900">{healthScore}</span>
                  <span className="text-sm text-slate-500">/ 100</span>
                </div>
              </div>
              <Badge className={`mt-4 ${healthScore >= 80 ? 'bg-emerald-100 text-emerald-700' : healthScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
            
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Success Rate</span>
                <span className="font-medium">{avgSuccessRate.toFixed(1)}%</span>
              </div>
              <Progress value={avgSuccessRate} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Efficiency</span>
                <span className="font-medium">{avgEfficiency.toFixed(1)}%</span>
              </div>
              <Progress value={avgEfficiency} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Uptime</span>
                <span className="font-medium">{avgUptime.toFixed(1)}%</span>
              </div>
              <Progress value={avgUptime} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Execution Distribution */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Execution Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {agentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {performanceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Over Time */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Performance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="executions"
                  stroke="#3b82f6"
                  fill="url(#colorExecutions)"
                  name="Executions"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="successRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Success Rate %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="Efficiency %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Grid */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Agent Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentPerformance.map((agent, idx) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20` }}
                    >
                      <span style={{ color: COLORS[idx % COLORS.length] }}>●</span>
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{agent.name}</span>
                  </div>
                  <Badge className={`text-xs ${agent.successRate >= 85 ? 'bg-emerald-100 text-emerald-700' : agent.successRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {agent.successRate.toFixed(0)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs">Executions</div>
                    <div className="font-semibold">{agent.executions}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Avg Time</div>
                    <div className="font-semibold">{agent.avgTime.toFixed(2)}s</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Efficiency</div>
                    <div className="font-semibold text-purple-600">{agent.efficiency.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Uptime</div>
                    <div className="font-semibold text-emerald-600">{agent.uptime.toFixed(1)}%</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}