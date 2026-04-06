import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, Target, Clock, Zap, DollarSign, TrendingUp, ArrowUpDown, BarChart3, Shield
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function AgentScoreCard({ agent, rank, isSelected, onToggle }) {
  const overallScore = ((agent.successRate + agent.efficiency + agent.uptime) / 3).toFixed(0);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <span className="font-bold text-slate-600">#{rank}</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900">{agent.name}</div>
            <Badge className={`text-xs mt-1 ${
              overallScore >= 85 ? 'bg-emerald-100 text-emerald-700' :
              overallScore >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              Score: {overallScore}
            </Badge>
          </div>
        </div>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-500" />
          <span className="text-slate-600">Success:</span>
          <span className="font-medium">{agent.successRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-slate-600">Time:</span>
          <span className="font-medium">{agent.avgTime.toFixed(2)}s</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <span className="text-slate-600">Efficiency:</span>
          <span className="font-medium">{agent.efficiency.toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span className="text-slate-600">Savings:</span>
          <span className="font-medium">{(agent.costSavings / 1000).toFixed(0)}K</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function AgentComparisonPanel({ agentPerformance }) {
  const [selectedAgents, setSelectedAgents] = useState(
    agentPerformance.slice(0, 3).map(a => a.id)
  );
  const [sortBy, setSortBy] = useState('successRate');

  // Sort agents
  const sortedAgents = useMemo(() => {
    return [...agentPerformance].sort((a, b) => {
      if (sortBy === 'avgTime') return a[sortBy] - b[sortBy];
      return b[sortBy] - a[sortBy];
    });
  }, [agentPerformance, sortBy]);

  // Filter selected agents for comparison
  const comparisonAgents = agentPerformance.filter(a => selectedAgents.includes(a.id));

  // Radar chart data
  const radarData = useMemo(() => {
    const metrics = ['Success Rate', 'Efficiency', 'Uptime', 'Speed', 'Cost Savings'];
    return metrics.map(metric => {
      const point = { metric };
      comparisonAgents.forEach(agent => {
        let value;
        switch (metric) {
          case 'Success Rate': value = agent.successRate; break;
          case 'Efficiency': value = agent.efficiency; break;
          case 'Uptime': value = agent.uptime; break;
          case 'Speed': value = Math.max(0, 100 - agent.avgTime * 15); break;
          case 'Cost Savings': value = Math.min(100, agent.costSavings / 600); break;
          default: value = 0;
        }
        point[agent.name.replace(' Agent', '')] = value;
      });
      return point;
    });
  }, [comparisonAgents]);

  // Bar comparison data
  const barData = comparisonAgents.map(a => ({
    name: a.name.replace(' Agent', ''),
    'Success Rate': a.successRate,
    'Efficiency': a.efficiency,
    'Uptime': a.uptime
  }));

  // Scatter plot data (Efficiency vs Success Rate)
  const scatterData = agentPerformance.map((a, idx) => ({
    name: a.name.replace(' Agent', ''),
    successRate: a.successRate,
    efficiency: a.efficiency,
    executions: a.executions,
    color: COLORS[idx % COLORS.length]
  }));

  const toggleAgent = (agentId) => {
    if (selectedAgents.includes(agentId)) {
      if (selectedAgents.length > 1) {
        setSelectedAgents(selectedAgents.filter(id => id !== agentId));
      }
    } else if (selectedAgents.length < 4) {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">Sort by:</span>
          <div className="flex gap-2">
            {[
              { key: 'successRate', label: 'Success Rate' },
              { key: 'efficiency', label: 'Efficiency' },
              { key: 'avgTime', label: 'Speed' },
              { key: 'costSavings', label: 'Savings' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={sortBy === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(key)}
                className={sortBy === key ? 'bg-blue-600' : ''}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-700">
          {selectedAgents.length} agents selected for comparison
        </Badge>
      </div>

      {/* Agent Selection Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAgents.map((agent, idx) => (
          <AgentScoreCard
            key={agent.id}
            agent={agent}
            rank={idx + 1}
            isSelected={selectedAgents.includes(agent.id)}
            onToggle={() => toggleAgent(agent.id)}
          />
        ))}
      </div>

      {/* Comparison Charts */}
      {comparisonAgents.length >= 2 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Radar Comparison */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                Multi-Metric Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {comparisonAgents.map((agent, idx) => (
                      <Radar
                        key={agent.id}
                        name={agent.name.replace(' Agent', '')}
                        dataKey={agent.name.replace(' Agent', '')}
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

          {/* Bar Comparison */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend />
                    <Bar dataKey="Success Rate" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Efficiency" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Uptime" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Efficiency vs Success Scatter */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Efficiency vs Success Rate (Bubble size = Executions)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="successRate" 
                  name="Success Rate" 
                  domain={[60, 100]}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Success Rate %', position: 'bottom', fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="efficiency" 
                  name="Efficiency"
                  domain={[60, 100]}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Efficiency %', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="executions" range={[50, 400]} name="Executions" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value, name) => [value.toFixed(1), name]}
                />
                <Scatter name="Agents" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {scatterData.map((agent, idx) => (
              <div key={agent.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                <span className="text-slate-600">{agent.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Detailed Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Agent</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Executions</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Success Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Avg Time</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Efficiency</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Uptime</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Errors</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">Savings</th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent, idx) => (
                  <motion.tr 
                    key={agent.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border-b border-slate-100 ${selectedAgents.includes(agent.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-medium text-slate-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">{agent.executions}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={`${agent.successRate >= 85 ? 'bg-emerald-100 text-emerald-700' : agent.successRate >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {agent.successRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">{agent.avgTime.toFixed(2)}s</td>
                    <td className="py-3 px-4 text-center text-purple-600 font-medium">{agent.efficiency.toFixed(0)}%</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-medium">{agent.uptime.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${agent.errors > 10 ? 'text-red-600' : agent.errors > 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {agent.errors}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">{(agent.costSavings / 1000).toFixed(1)}K SAR</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}