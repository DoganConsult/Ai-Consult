import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker, Play, Trash2, Copy, Target, AlertTriangle, CheckCircle, BarChart3,
  Sliders, RefreshCw, GitCompare, Brain, Lightbulb, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// Optimization goals
const OPTIMIZATION_GOALS = [
  { id: 'balanced', name: 'Balanced Performance', icon: '⚖️', weights: { successRate: 0.4, executionTime: 0.2, resourceUsage: 0.2, cost: 0.2 } },
  { id: 'speed', name: 'Minimize Time', icon: '⚡', weights: { successRate: 0.2, executionTime: 0.6, resourceUsage: 0.1, cost: 0.1 } },
  { id: 'cost', name: 'Minimize Cost', icon: '💰', weights: { successRate: 0.3, executionTime: 0.1, resourceUsage: 0.1, cost: 0.5 } },
  { id: 'reliability', name: 'Maximize Success', icon: '🎯', weights: { successRate: 0.7, executionTime: 0.1, resourceUsage: 0.1, cost: 0.1 } },
  { id: 'efficiency', name: 'Resource Efficiency', icon: '📊', weights: { successRate: 0.2, executionTime: 0.2, resourceUsage: 0.5, cost: 0.1 } }
];

// AI Analysis Engine
function analyzeSimulationDifferences(simulations) {
  if (simulations.length < 2) return null;

  const paramKeys = ['resourceAvailability', 'taskComplexity', 'externalDependencyRisk', 'approvalDelay', 'teamExperience'];
  const paramLabels = {
    resourceAvailability: 'Resource Availability',
    taskComplexity: 'Task Complexity',
    externalDependencyRisk: 'External Dependency Risk',
    approvalDelay: 'Approval Delay',
    teamExperience: 'Team Experience'
  };

  // Calculate parameter impact on outcomes
  const impacts = paramKeys.map(param => {
    const values = simulations.map(s => s.params[param]);
    const successRates = simulations.map(s => s.results.successRate);
    
    // Simple correlation calculation
    const avgParam = values.reduce((a, b) => a + b, 0) / values.length;
    const avgSuccess = successRates.reduce((a, b) => a + b, 0) / successRates.length;
    
    let correlation = 0;
    let paramVar = 0;
    let successVar = 0;
    
    for (let i = 0; i < values.length; i++) {
      correlation += (values[i] - avgParam) * (successRates[i] - avgSuccess);
      paramVar += Math.pow(values[i] - avgParam, 2);
      successVar += Math.pow(successRates[i] - avgSuccess, 2);
    }
    
    const corr = paramVar > 0 && successVar > 0 ? correlation / Math.sqrt(paramVar * successVar) : 0;
    
    // Calculate variance in parameter values
    const variance = paramVar / values.length;
    
    return {
      param,
      label: paramLabels[param],
      correlation: corr,
      variance,
      impact: Math.abs(corr) * Math.sqrt(variance),
      direction: corr > 0 ? 'positive' : 'negative',
      values: simulations.map((s, i) => ({ name: s.name, value: s.params[param] }))
    };
  });

  // Sort by impact
  impacts.sort((a, b) => b.impact - a.impact);

  // Key differentiators (top 3 with significant impact)
  const keyDifferentiators = impacts.filter(i => i.impact > 5).slice(0, 3);

  // Generate insights
  const insights = [];
  
  if (keyDifferentiators.length > 0) {
    const topParam = keyDifferentiators[0];
    insights.push({
      type: 'primary',
      message: `${topParam.label} has the highest impact on outcomes (${topParam.direction === 'positive' ? 'higher is better' : 'lower is better'})`
    });
  }

  const bestSim = simulations.reduce((best, curr) => 
    curr.results.successRate > best.results.successRate ? curr : best
  );
  const worstSim = simulations.reduce((worst, curr) => 
    curr.results.successRate < worst.results.successRate ? curr : worst
  );

  if (bestSim.id !== worstSim.id) {
    const successDiff = bestSim.results.successRate - worstSim.results.successRate;
    insights.push({
      type: 'comparison',
      message: `"${bestSim.name}" outperforms "${worstSim.name}" by ${successDiff.toFixed(1)}% success rate`
    });
  }

  return { impacts, keyDifferentiators, insights, bestSim, worstSim };
}

// Optimization Engine
function findOptimalConfiguration(simulations, goalId, historicalData) {
  const goal = OPTIMIZATION_GOALS.find(g => g.id === goalId) || OPTIMIZATION_GOALS[0];
  
  // Score each simulation based on goal weights
  const scoredSims = simulations.map(sim => {
    const normalizedSuccess = sim.results.successRate / 100;
    const normalizedTime = 1 - Math.min(sim.results.executionTime / 10, 1);
    const normalizedResource = 1 - sim.results.resourceUsage / 100;
    const normalizedCost = 1 - Math.min(sim.results.estimatedCost / 5000, 1);

    const score = 
      goal.weights.successRate * normalizedSuccess +
      goal.weights.executionTime * normalizedTime +
      goal.weights.resourceUsage * normalizedResource +
      goal.weights.cost * normalizedCost;

    return { ...sim, optimizationScore: score * 100 };
  });

  scoredSims.sort((a, b) => b.optimizationScore - a.optimizationScore);

  // Generate optimal config suggestions
  const optimal = scoredSims[0];
  const suggestions = [];

  if (goal.id === 'speed' && optimal.params.parallelExecution === false) {
    suggestions.push('Enable parallel execution to reduce time');
  }
  if (goal.id === 'cost' && optimal.params.resourceAvailability > 70) {
    suggestions.push('Reduce resource allocation to lower costs');
  }
  if (goal.id === 'reliability' && optimal.params.teamExperience < 70) {
    suggestions.push('Increase team experience level for better reliability');
  }
  if (goal.id === 'efficiency' && optimal.params.taskComplexity > 60) {
    suggestions.push('Break down complex tasks to improve efficiency');
  }

  return {
    goal,
    rankedSimulations: scoredSims,
    optimal: scoredSims[0],
    suggestions,
    scoreBreakdown: {
      successRate: goal.weights.successRate * 100,
      executionTime: goal.weights.executionTime * 100,
      resourceUsage: goal.weights.resourceUsage * 100,
      cost: goal.weights.cost * 100
    }
  };
}

// Simulation engine
function runSimulation(params, historicalData) {
  const {
    resourceAvailability,
    taskComplexity,
    externalDependencyRisk,
    parallelExecution,
    approvalDelay,
    teamExperience
  } = params;

  // Base predictions from historical data
  const baseSuccessRate = historicalData.avgSuccessRate || 75;
  const baseExecutionTime = historicalData.avgExecutionTime || 4.5;
  const baseResourceUsage = historicalData.avgResourceUsage || 65;

  // Apply modifiers
  const resourceModifier = (resourceAvailability - 50) / 100;
  const complexityModifier = (taskComplexity - 50) / 100;
  const dependencyModifier = (100 - externalDependencyRisk) / 100;
  const parallelModifier = parallelExecution ? 0.7 : 1;
  const approvalModifier = 1 + (approvalDelay / 100) * 0.3;
  const experienceModifier = (teamExperience - 50) / 200;

  // Calculate predicted outcomes
  const predictedSuccessRate = Math.min(99, Math.max(20,
    baseSuccessRate * (1 + resourceModifier * 0.3) * dependencyModifier * (1 - complexityModifier * 0.2) * (1 + experienceModifier)
  ));

  const predictedExecutionTime = Math.max(1,
    baseExecutionTime * (1 - resourceModifier * 0.2) * (1 + complexityModifier * 0.4) * parallelModifier * approvalModifier * (1 - experienceModifier * 0.3)
  );

  const predictedResourceUsage = Math.min(100, Math.max(20,
    baseResourceUsage * (1 + complexityModifier * 0.3) / (1 + resourceModifier * 0.2)
  ));

  const predictedCost = predictedExecutionTime * predictedResourceUsage * 10;

  // Risk assessment
  const risks = [];
  if (resourceAvailability < 40) risks.push({ type: 'resource', message: 'Low resource availability may cause delays' });
  if (taskComplexity > 70) risks.push({ type: 'complexity', message: 'High complexity increases failure risk' });
  if (externalDependencyRisk > 60) risks.push({ type: 'dependency', message: 'External dependencies may block execution' });
  if (approvalDelay > 50) risks.push({ type: 'approval', message: 'Approval bottlenecks expected' });

  // Recommendations
  const recommendations = [];
  if (resourceAvailability < 50 && parallelExecution) {
    recommendations.push('Consider disabling parallel execution to reduce resource strain');
  }
  if (taskComplexity > 60 && teamExperience < 50) {
    recommendations.push('Assign more experienced team members for complex tasks');
  }
  if (externalDependencyRisk > 50) {
    recommendations.push('Implement fallback mechanisms for external dependencies');
  }

  return {
    successRate: Number(predictedSuccessRate.toFixed(1)),
    executionTime: Number(predictedExecutionTime.toFixed(2)),
    resourceUsage: Number(predictedResourceUsage.toFixed(1)),
    estimatedCost: Number(predictedCost.toFixed(0)),
    risks,
    recommendations,
    confidence: Math.max(60, 95 - risks.length * 10)
  };
}

function SimulationCard({ simulation, onRemove, onDuplicate, isBaseline }) {
  const riskLevel = simulation.results.risks.length === 0 ? 'low' : 
    simulation.results.risks.length <= 2 ? 'medium' : 'high';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-xl border-2 ${isBaseline ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'} p-4`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: simulation.color }}
          />
          <span className="font-semibold text-slate-900">{simulation.name}</span>
          {isBaseline && <Badge className="bg-purple-100 text-purple-700 text-xs">Baseline</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onDuplicate(simulation)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded">
            <Copy className="w-4 h-4" />
          </button>
          {!isBaseline && (
            <button onClick={() => onRemove(simulation.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500">Success Rate</div>
          <div className={`text-lg font-bold ${simulation.results.successRate >= 80 ? 'text-emerald-600' : simulation.results.successRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {simulation.results.successRate}%
          </div>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500">Exec Time</div>
          <div className="text-lg font-bold text-blue-600">{simulation.results.executionTime}s</div>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500">Resources</div>
          <div className="text-lg font-bold text-purple-600">{simulation.results.resourceUsage}%</div>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500">Est. Cost</div>
          <div className="text-lg font-bold text-slate-700">${simulation.results.estimatedCost}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge className={`text-xs ${
          riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700' :
          riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {riskLevel} risk
        </Badge>
        <span className="text-xs text-slate-500">{simulation.results.confidence}% confidence</span>
      </div>
    </motion.div>
  );
}

function ParameterEditor({ params, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Resource Availability</label>
          <span className="text-sm text-slate-500">{params.resourceAvailability}%</span>
        </div>
        <Slider
          value={[params.resourceAvailability]}
          onValueChange={([v]) => onChange({ ...params, resourceAvailability: v })}
          max={100}
          step={5}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Task Complexity</label>
          <span className="text-sm text-slate-500">{params.taskComplexity}%</span>
        </div>
        <Slider
          value={[params.taskComplexity]}
          onValueChange={([v]) => onChange({ ...params, taskComplexity: v })}
          max={100}
          step={5}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">External Dependency Risk</label>
          <span className="text-sm text-slate-500">{params.externalDependencyRisk}%</span>
        </div>
        <Slider
          value={[params.externalDependencyRisk]}
          onValueChange={([v]) => onChange({ ...params, externalDependencyRisk: v })}
          max={100}
          step={5}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Approval Delay Factor</label>
          <span className="text-sm text-slate-500">{params.approvalDelay}%</span>
        </div>
        <Slider
          value={[params.approvalDelay]}
          onValueChange={([v]) => onChange({ ...params, approvalDelay: v })}
          max={100}
          step={5}
        />
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Team Experience Level</label>
          <span className="text-sm text-slate-500">{params.teamExperience}%</span>
        </div>
        <Slider
          value={[params.teamExperience]}
          onValueChange={([v]) => onChange({ ...params, teamExperience: v })}
          max={100}
          step={5}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="text-sm font-medium text-slate-700">Parallel Execution</label>
        <Switch
          checked={params.parallelExecution}
          onCheckedChange={(v) => onChange({ ...params, parallelExecution: v })}
        />
      </div>
    </div>
  );
}

function ComparisonChart({ simulations }) {
  const comparisonData = [
    { metric: 'Success Rate', ...Object.fromEntries(simulations.map(s => [s.name, s.results.successRate])) },
    { metric: 'Speed (inv)', ...Object.fromEntries(simulations.map(s => [s.name, Math.max(0, 100 - s.results.executionTime * 10)])) },
    { metric: 'Efficiency', ...Object.fromEntries(simulations.map(s => [s.name, 100 - s.results.resourceUsage])) },
    { metric: 'Cost Eff.', ...Object.fromEntries(simulations.map(s => [s.name, Math.max(0, 100 - s.results.estimatedCost / 50)])) },
    { metric: 'Reliability', ...Object.fromEntries(simulations.map(s => [s.name, s.results.confidence])) }
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={comparisonData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          {simulations.map((sim, idx) => (
            <Radar
              key={sim.id}
              name={sim.name}
              dataKey={sim.name}
              stroke={sim.color}
              fill={sim.color}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricComparisonBars({ simulations }) {
  const metrics = ['successRate', 'executionTime', 'resourceUsage', 'estimatedCost'];

  const data = simulations.map(s => ({
    name: s.name,
    ...Object.fromEntries(metrics.map(m => [m, s.results[m]]))
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <Bar dataKey="successRate" fill="#10b981" name="Success %" />
          <Bar dataKey="executionTime" fill="#3b82f6" name="Time (s)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ParameterImpactChart({ impacts }) {
  const data = impacts.map(i => ({
    param: i.label.split(' ')[0],
    impact: Math.round(i.impact * 10),
    correlation: Math.round(i.correlation * 100)
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="param" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <Bar dataKey="impact" fill="#8b5cf6" name="Impact Score" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AIAnalysisPanel({ analysis, simulations }) {
  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Key Differentiators */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Key Parameter Differences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.keyDifferentiators.map((diff, idx) => (
              <div key={diff.param} className="p-3 bg-white rounded-lg border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{diff.label}</span>
                  <Badge className={diff.direction === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                    {diff.direction === 'positive' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {diff.direction}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {diff.values.map((v, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-slate-100 rounded">
                      {v.name}: <strong>{v.value}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Impact Chart */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Parameter Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParameterImpactChart impacts={analysis.impacts} />
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-slate-900">AI Insights</span>
        </div>
        <div className="space-y-2">
          {analysis.insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              {insight.message}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OptimizationPanel({ simulations, historicalData }) {
  const [selectedGoal, setSelectedGoal] = useState('balanced');
  const optimization = useMemo(() => 
    findOptimalConfiguration(simulations, selectedGoal, historicalData),
    [simulations, selectedGoal, historicalData]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Goal Selector */}
      <div className="flex flex-wrap gap-2">
        {OPTIMIZATION_GOALS.map(goal => (
          <button
            key={goal.id}
            onClick={() => setSelectedGoal(goal.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedGoal === goal.id
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300'
            }`}
          >
            <span className="mr-1">{goal.icon}</span>
            {goal.name}
          </button>
        ))}
      </div>

      {/* Optimal Configuration */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Optimal Configuration for "{optimization.goal.name}"
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: optimization.optimal.color }}
                />
                <span className="font-semibold text-slate-900">{optimization.optimal.name}</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700">
                Score: {optimization.optimal.optimizationScore.toFixed(1)}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 bg-emerald-50 rounded-lg">
                <div className="text-slate-500">Success</div>
                <div className="font-bold text-emerald-600">{optimization.optimal.results.successRate}%</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-slate-500">Time</div>
                <div className="font-bold text-blue-600">{optimization.optimal.results.executionTime}s</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <div className="text-slate-500">Resources</div>
                <div className="font-bold text-purple-600">{optimization.optimal.results.resourceUsage}%</div>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded-lg">
                <div className="text-slate-500">Cost</div>
                <div className="font-bold text-amber-600">${optimization.optimal.results.estimatedCost}</div>
              </div>
            </div>
          </div>

          {/* Goal Weight Visualization */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Optimization Weights</div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
              <div className="bg-emerald-500" style={{ width: `${optimization.scoreBreakdown.successRate}%` }} title="Success Rate" />
              <div className="bg-blue-500" style={{ width: `${optimization.scoreBreakdown.executionTime}%` }} title="Execution Time" />
              <div className="bg-purple-500" style={{ width: `${optimization.scoreBreakdown.resourceUsage}%` }} title="Resources" />
              <div className="bg-amber-500" style={{ width: `${optimization.scoreBreakdown.cost}%` }} title="Cost" />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Success</span>
              <span>Time</span>
              <span>Resources</span>
              <span>Cost</span>
            </div>
          </div>

          {/* Ranking */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Simulation Ranking</div>
            <div className="space-y-1">
              {optimization.rankedSimulations.map((sim, idx) => (
                <div key={sim.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700">{sim.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{sim.optimizationScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {optimization.suggestions.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-sm font-medium text-amber-800 mb-2">💡 Optimization Suggestions</div>
              <ul className="text-sm text-amber-700 space-y-1">
                {optimization.suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ScenarioSimulator({ historicalData = {} }) {
  const defaultHistorical = {
    avgSuccessRate: historicalData.avgSuccessRate || 78,
    avgExecutionTime: historicalData.avgExecutionTime || 4.2,
    avgResourceUsage: historicalData.avgResourceUsage || 62
  };

  const defaultParams = {
    resourceAvailability: 50,
    taskComplexity: 50,
    externalDependencyRisk: 30,
    parallelExecution: true,
    approvalDelay: 20,
    teamExperience: 60
  };

  const [simulations, setSimulations] = useState([
    {
      id: 'baseline',
      name: 'Baseline',
      params: defaultParams,
      color: COLORS[0],
      results: runSimulation(defaultParams, defaultHistorical)
    }
  ]);

  const [editingParams, setEditingParams] = useState(defaultParams);
  const [newSimName, setNewSimName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);

  // AI Analysis
  const analysis = useMemo(() => 
    simulations.length > 1 ? analyzeSimulationDifferences(simulations) : null,
    [simulations]
  );

  const handleAddSimulation = () => {
    if (!newSimName.trim()) return;
    
    setIsRunning(true);
    setTimeout(() => {
      const newSim = {
        id: `sim-${Date.now()}`,
        name: newSimName.trim(),
        params: { ...editingParams },
        color: COLORS[simulations.length % COLORS.length],
        results: runSimulation(editingParams, defaultHistorical)
      };
      setSimulations([...simulations, newSim]);
      setNewSimName('');
      setIsRunning(false);
    }, 500);
  };

  const handleRemove = (id) => {
    setSimulations(simulations.filter(s => s.id !== id));
  };

  const handleDuplicate = (sim) => {
    const duplicate = {
      ...sim,
      id: `sim-${Date.now()}`,
      name: `${sim.name} (Copy)`,
      color: COLORS[simulations.length % COLORS.length]
    };
    setSimulations([...simulations, duplicate]);
  };

  const bestSimulation = useMemo(() => {
    return simulations.reduce((best, current) => 
      current.results.successRate > best.results.successRate ? current : best
    , simulations[0]);
  }, [simulations]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <Beaker className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Scenario Simulator</h3>
          <p className="text-sm text-slate-600">Create what-if scenarios and compare AI predictions</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Parameter Editor */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Simulation Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ParameterEditor params={editingParams} onChange={setEditingParams} />
            
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <Input
                value={newSimName}
                onChange={(e) => setNewSimName(e.target.value)}
                placeholder="Scenario name..."
                className="text-sm"
              />
              <Button 
                onClick={handleAddSimulation} 
                disabled={!newSimName.trim() || isRunning}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isRunning ? 'Running...' : 'Run Simulation'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Simulation Cards */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">Simulations ({simulations.length})</h4>
            {simulations.length > 1 && bestSimulation && (
              <Badge className="bg-emerald-100 text-emerald-700">
                Best: {bestSimulation.name} ({bestSimulation.results.successRate}%)
              </Badge>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {simulations.map((sim) => (
                <SimulationCard
                  key={sim.id}
                  simulation={sim}
                  onRemove={handleRemove}
                  onDuplicate={handleDuplicate}
                  isBaseline={sim.id === 'baseline'}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Comparison Charts */}
      {simulations.length > 1 && (
        <>
          {/* Analysis Toggle Buttons */}
          <div className="flex gap-2">
            <Button
              variant={showAnalysis ? "default" : "outline"}
              onClick={() => { setShowAnalysis(!showAnalysis); setShowOptimization(false); }}
              className={showAnalysis ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              <Brain className="w-4 h-4 mr-2" />
              {showAnalysis ? 'Hide Analysis' : 'AI Analysis'}
            </Button>
            <Button
              variant={showOptimization ? "default" : "outline"}
              onClick={() => { setShowOptimization(!showOptimization); setShowAnalysis(false); }}
              className={showOptimization ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              <Target className="w-4 h-4 mr-2" />
              {showOptimization ? 'Hide Optimization' : 'Find Optimal'}
            </Button>
          </div>

          {/* AI Analysis Panel */}
          <AnimatePresence>
            {showAnalysis && analysis && (
              <AIAnalysisPanel analysis={analysis} simulations={simulations} />
            )}
          </AnimatePresence>

          {/* Optimization Panel */}
          <AnimatePresence>
            {showOptimization && (
              <OptimizationPanel simulations={simulations} historicalData={defaultHistorical} />
            )}
          </AnimatePresence>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-purple-600" />
                  Multi-Metric Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComparisonChart simulations={simulations} />
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Performance Bars
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MetricComparisonBars simulations={simulations} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Recommendations */}
      {simulations.length > 0 && bestSimulation.results.recommendations.length > 0 && (
        <Card className="border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bestSimulation.results.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}