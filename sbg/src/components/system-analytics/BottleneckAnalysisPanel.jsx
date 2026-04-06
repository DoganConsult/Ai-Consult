import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Clock, Zap, Target, ChevronRight, ChevronDown, Lightbulb, GitBranch, Wrench
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const IMPACT_COLORS = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-500' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-500' }
};

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];

// Generate optimization recommendations
function generateRecommendations(bottlenecks, agentPerformance) {
  const recommendations = [];
  
  bottlenecks.forEach(bottleneck => {
    switch (bottleneck.id) {
      case 'approval_delay':
        recommendations.push({
          id: 'auto-approve',
          title: 'Implement Auto-Approval Rules',
          description: 'Set up automatic approvals for low-risk transactions under threshold amounts.',
          impact: 'high',
          effort: 'medium',
          estimatedImprovement: '40% reduction in approval delays',
          affectedBottleneck: bottleneck.name
        });
        break;
      case 'integration_timeout':
        recommendations.push({
          id: 'retry-logic',
          title: 'Enhance Retry Logic',
          description: 'Implement exponential backoff and circuit breaker patterns for integrations.',
          impact: 'high',
          effort: 'low',
          estimatedImprovement: '60% reduction in timeout failures',
          affectedBottleneck: bottleneck.name
        });
        break;
      case 'resource_contention':
        recommendations.push({
          id: 'queue-management',
          title: 'Implement Queue-Based Processing',
          description: 'Add job queues to distribute workload and prevent resource contention.',
          impact: 'medium',
          effort: 'medium',
          estimatedImprovement: '35% reduction in wait times',
          affectedBottleneck: bottleneck.name
        });
        break;
      case 'validation_failures':
        recommendations.push({
          id: 'pre-validation',
          title: 'Add Pre-Validation Checks',
          description: 'Implement client-side validation before submitting to agents.',
          impact: 'medium',
          effort: 'low',
          estimatedImprovement: '50% reduction in validation errors',
          affectedBottleneck: bottleneck.name
        });
        break;
      case 'api_rate_limits':
        recommendations.push({
          id: 'rate-limit-handling',
          title: 'Implement Rate Limit Handling',
          description: 'Add request queuing and throttling to respect API rate limits.',
          impact: 'low',
          effort: 'low',
          estimatedImprovement: '80% reduction in rate limit errors',
          affectedBottleneck: bottleneck.name
        });
        break;
    }
  });

  // Add agent-specific recommendations
  const lowPerformingAgents = agentPerformance.filter(a => a.successRate < 80);
  lowPerformingAgents.forEach(agent => {
    recommendations.push({
      id: `optimize-${agent.id}`,
      title: `Optimize ${agent.name}`,
      description: `This agent has a success rate of ${agent.successRate.toFixed(1)}%. Consider reviewing error logs and adjusting configurations.`,
      impact: 'medium',
      effort: 'medium',
      estimatedImprovement: '15-25% improvement in success rate',
      affectedAgent: agent.name
    });
  });

  return recommendations;
}

function BottleneckCard({ bottleneck, isExpanded, onToggle }) {
  const style = IMPACT_COLORS[bottleneck.impact];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 ${style.bg} ${style.border} overflow-hidden`}
    >
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${style.badge} flex items-center justify-center`}>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{bottleneck.name}</div>
            <div className="text-sm text-slate-600">
              Frequency: {bottleneck.frequency} occurrences • Avg Delay: {bottleneck.avgDelay}s
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${style.badge} text-white`}>{bottleneck.impact} impact</Badge>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200"
          >
            <div className="p-4 bg-white/50">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Affected Agents</div>
                  <div className="flex flex-wrap gap-2">
                    {bottleneck.affectedAgents.map(agent => (
                      <Badge key={agent} className="bg-slate-100 text-slate-700">
                        {agent}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Impact Analysis</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Total time lost:</span>
                      <span className="font-medium">{(bottleneck.frequency * bottleneck.avgDelay / 60).toFixed(1)} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Estimated cost impact:</span>
                      <span className="font-medium text-red-600">{(bottleneck.frequency * bottleneck.avgDelay * 10).toFixed(0)} SAR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RecommendationCard({ recommendation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center mt-0.5">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900">{recommendation.title}</div>
            <div className="text-sm text-slate-600 mt-1">{recommendation.description}</div>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={`${recommendation.impact === 'high' ? 'bg-emerald-500' : recommendation.impact === 'medium' ? 'bg-blue-500' : 'bg-slate-500'} text-white text-xs`}>
                {recommendation.impact} impact
              </Badge>
              <Badge className={`${recommendation.effort === 'low' ? 'bg-emerald-100 text-emerald-700' : recommendation.effort === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} text-xs`}>
                {recommendation.effort} effort
              </Badge>
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                {recommendation.estimatedImprovement}
              </Badge>
            </div>
          </div>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          Apply
        </Button>
      </div>
    </motion.div>
  );
}

export default function BottleneckAnalysisPanel({ bottlenecks, agentPerformance }) {
  const [expandedBottleneck, setExpandedBottleneck] = useState(null);
  
  const recommendations = useMemo(() => 
    generateRecommendations(bottlenecks, agentPerformance), 
    [bottlenecks, agentPerformance]
  );

  // Bottleneck distribution for pie chart
  const bottleneckDistribution = bottlenecks.map(b => ({
    name: b.name,
    value: b.frequency,
    impact: b.impact
  }));

  // Time impact data
  const timeImpactData = bottlenecks.map(b => ({
    name: b.name.split(' ')[0],
    frequency: b.frequency,
    avgDelay: b.avgDelay,
    totalImpact: b.frequency * b.avgDelay
  }));

  // Calculate total impact
  const totalImpact = bottlenecks.reduce((sum, b) => sum + (b.frequency * b.avgDelay), 0);
  const highImpactCount = bottlenecks.filter(b => b.impact === 'high').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{bottlenecks.length}</div>
          <div className="text-sm text-slate-500">Active Bottlenecks</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{(totalImpact / 60).toFixed(1)}m</div>
          <div className="text-sm text-slate-500">Total Time Lost</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{highImpactCount}</div>
          <div className="text-sm text-slate-500">High Impact Issues</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{recommendations.length}</div>
          <div className="text-sm text-slate-500">Recommendations</div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bottleneck Distribution */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-red-600" />
              Bottleneck Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bottleneckDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {bottleneckDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.impact === 'high' ? '#ef4444' : entry.impact === 'medium' ? '#f59e0b' : '#3b82f6'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time Impact Analysis */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Time Impact Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeImpactData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Bar dataKey="frequency" fill="#3b82f6" name="Frequency" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalImpact" fill="#ef4444" name="Total Impact (s)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Details */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Active Bottlenecks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bottlenecks
              .sort((a, b) => {
                const impactOrder = { high: 0, medium: 1, low: 2 };
                return impactOrder[a.impact] - impactOrder[b.impact];
              })
              .map(bottleneck => (
                <BottleneckCard
                  key={bottleneck.id}
                  bottleneck={bottleneck}
                  isExpanded={expandedBottleneck === bottleneck.id}
                  onToggle={() => setExpandedBottleneck(
                    expandedBottleneck === bottleneck.id ? null : bottleneck.id
                  )}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <RecommendationCard recommendation={rec} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins Summary */}
      <Card className="border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Quick Wins - Low Effort, High Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {recommendations
              .filter(r => r.effort === 'low' && (r.impact === 'high' || r.impact === 'medium'))
              .slice(0, 3)
              .map((rec, idx) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-white rounded-xl border border-purple-200 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{rec.title}</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-2">{rec.estimatedImprovement}</div>
                  <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                    Implement Now
                  </Button>
                </motion.div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}