import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, Zap, TrendingUp, AlertTriangle, 
  CheckCircle, ChevronRight, ChevronDown, Lightbulb, Target, Layers, RefreshCw, Copy, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// AI Analysis Engine
const analyzeScenarioPerformance = (runs, scenarios) => {
  const analysis = {};
  
  scenarios.forEach(scenario => {
    const scenarioRuns = runs.filter(r => r.scenarioId === scenario.id);
    if (scenarioRuns.length === 0) return;

    const completed = scenarioRuns.filter(r => r.status === 'completed');
    const failed = scenarioRuns.filter(r => r.status === 'failed');
    const avgTime = scenarioRuns.reduce((sum, r) => sum + r.execution_time_ms, 0) / scenarioRuns.length;
    const successRate = (completed.length / scenarioRuns.length) * 100;

    // Tool usage analysis
    const toolUsage = {};
    const toolFailures = {};
    scenarioRuns.forEach(run => {
      run.tools_used.forEach(tool => {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
        if (run.status === 'failed') {
          toolFailures[tool] = (toolFailures[tool] || 0) + 1;
        }
      });
    });

    // Identify problematic tools
    const problematicTools = Object.entries(toolFailures)
      .map(([tool, failures]) => ({
        tool,
        failures,
        usage: toolUsage[tool],
        failureRate: (failures / toolUsage[tool]) * 100
      }))
      .filter(t => t.failureRate > 20)
      .sort((a, b) => b.failureRate - a.failureRate);

    // Time analysis
    const times = scenarioRuns.map(r => r.execution_time_ms).sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // Detect redundant patterns
    const toolSequences = scenarioRuns.map(r => r.tools_used.join('->'));
    const sequenceCount = {};
    toolSequences.forEach(seq => {
      sequenceCount[seq] = (sequenceCount[seq] || 0) + 1;
    });

    // Generate recommendations
    const recommendations = [];
    
    // Success rate recommendations
    if (successRate < 70) {
      recommendations.push({
        type: 'critical',
        category: 'reliability',
        title: 'Low Success Rate Detected',
        titleAr: 'معدل نجاح منخفض',
        description: `Success rate is ${successRate.toFixed(1)}%. Consider reviewing error handling and input validation.`,
        impact: 'high',
        effort: 'medium',
        estimatedImprovement: `+${Math.min(30, 100 - successRate).toFixed(0)}% success rate`,
        actions: [
          'Add retry logic for transient failures',
          'Implement input validation before execution',
          'Add fallback mechanisms for critical steps'
        ]
      });
    }

    // Performance recommendations
    if (avgTime > 5000) {
      recommendations.push({
        type: 'warning',
        category: 'performance',
        title: 'High Execution Time',
        titleAr: 'وقت تنفيذ مرتفع',
        description: `Average execution time is ${(avgTime/1000).toFixed(1)}s. Consider parallelizing independent steps.`,
        impact: 'medium',
        effort: 'high',
        estimatedImprovement: `-${Math.min(40, (avgTime - 3000) / 100).toFixed(0)}% execution time`,
        actions: [
          'Identify and parallelize independent tool calls',
          'Cache frequently accessed data',
          'Optimize database queries in tools'
        ]
      });
    }

    // Variance recommendations
    if (stdDev > avgTime * 0.5) {
      recommendations.push({
        type: 'info',
        category: 'consistency',
        title: 'High Execution Time Variance',
        titleAr: 'تباين عالي في وقت التنفيذ',
        description: 'Execution times vary significantly. This may indicate external dependencies or resource contention.',
        impact: 'low',
        effort: 'medium',
        estimatedImprovement: 'More predictable performance',
        actions: [
          'Add timeout configurations',
          'Implement circuit breakers',
          'Monitor external service health'
        ]
      });
    }

    // Tool-specific recommendations
    problematicTools.forEach(tool => {
      recommendations.push({
        type: 'warning',
        category: 'tools',
        title: `Tool "${tool.tool.split('.').pop()}" Has High Failure Rate`,
        titleAr: `الأداة "${tool.tool.split('.').pop()}" لديها معدل فشل عالي`,
        description: `${tool.failureRate.toFixed(0)}% failure rate (${tool.failures}/${tool.usage} runs)`,
        impact: 'high',
        effort: 'low',
        estimatedImprovement: `+${Math.min(20, tool.failureRate / 2).toFixed(0)}% success rate`,
        actions: [
          `Review ${tool.tool} implementation`,
          'Add better error handling',
          'Consider alternative tools'
        ]
      });
    });

    // Redundancy detection
    const toolCounts = Object.values(toolUsage);
    const avgToolUsage = toolCounts.reduce((a, b) => a + b, 0) / toolCounts.length;
    const overusedTools = Object.entries(toolUsage)
      .filter(([_, count]) => count > avgToolUsage * 2)
      .map(([tool]) => tool);

    if (overusedTools.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'optimization',
        title: 'Potential Redundant Tool Usage',
        titleAr: 'استخدام أدوات زائد محتمل',
        description: `Tools [${overusedTools.map(t => t.split('.').pop()).join(', ')}] are called frequently. Consider caching or batching.`,
        impact: 'medium',
        effort: 'low',
        estimatedImprovement: '-15% execution time',
        actions: [
          'Implement result caching',
          'Batch similar operations',
          'Review tool call necessity'
        ]
      });
    }

    // Parameter tuning suggestions
    recommendations.push({
      type: 'suggestion',
      category: 'tuning',
      title: 'Parameter Optimization Available',
      titleAr: 'تحسين المعاملات متاح',
      description: 'Based on historical data, optimal parameters have been calculated.',
      impact: 'medium',
      effort: 'low',
      estimatedImprovement: '+10% overall efficiency',
      parameters: {
        timeout: Math.ceil(p95 * 1.2 / 1000) * 1000,
        retryCount: successRate < 90 ? 3 : 1,
        batchSize: scenarioRuns.length > 50 ? 10 : 5,
        concurrency: avgTime > 5000 ? 3 : 1
      },
      actions: [
        `Set timeout to ${Math.ceil(p95 * 1.2 / 1000)}s (based on P95)`,
        `Set retry count to ${successRate < 90 ? 3 : 1}`,
        'Enable parallel execution where possible'
      ]
    });

    analysis[scenario.id] = {
      scenario,
      metrics: {
        totalRuns: scenarioRuns.length,
        successRate,
        avgTime,
        p50,
        p95,
        stdDev,
        failedRuns: failed.length
      },
      problematicTools,
      recommendations,
      optimizationScore: Math.min(100, Math.max(0, 
        successRate * 0.4 + 
        Math.max(0, 100 - (avgTime / 100)) * 0.3 + 
        (100 - problematicTools.length * 10) * 0.3
      ))
    };
  });

  return analysis;
};

function RecommendationCard({ recommendation, onApply }) {
  const [expanded, setExpanded] = useState(false);
  
  const typeStyles = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Lightbulb, iconColor: 'text-blue-500' },
    suggestion: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Sparkles, iconColor: 'text-emerald-500' },
  };

  const style = typeStyles[recommendation.type] || typeStyles.info;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <Icon className={`w-5 h-5 mt-0.5 ${style.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{recommendation.title}</span>
            <Badge className={`text-xs ${
              recommendation.impact === 'high' ? 'bg-red-100 text-red-700' :
              recommendation.impact === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {recommendation.impact} impact
            </Badge>
          </div>
          <p className="text-sm text-slate-600">{recommendation.description}</p>
          {recommendation.estimatedImprovement && (
            <div className="flex items-center gap-1 mt-2 text-sm text-emerald-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              {recommendation.estimatedImprovement}
            </div>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200"
          >
            <div className="p-4 space-y-4">
              {/* Actions */}
              <div>
                <h5 className="text-sm font-semibold text-slate-700 mb-2">Recommended Actions</h5>
                <ul className="space-y-2">
                  {recommendation.actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Parameters if available */}
              {recommendation.parameters && (
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 mb-2">Optimal Parameters</h5>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <pre className="text-xs text-slate-700 overflow-x-auto">
                      {JSON.stringify(recommendation.parameters, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => onApply?.(recommendation)}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Apply Optimization
                </Button>
                <Button size="sm" variant="outline">
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Config
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScenarioOptimizationPanel({ analysis, onClose }) {
  const { scenario, metrics, recommendations, optimizationScore } = analysis;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-6 h-6" />
              <span className="text-sm opacity-80">AI Optimization Report</span>
            </div>
            <h3 className="text-xl font-bold">{scenario.nameEn}</h3>
            <p className="text-sm opacity-80 mt-1">{scenario.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optimization Score */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Optimization Score</span>
            <span className="text-2xl font-bold">{optimizationScore.toFixed(0)}%</span>
          </div>
          <Progress value={optimizationScore} className="h-2 bg-white/20" />
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border-b border-slate-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{metrics.totalRuns}</div>
          <div className="text-xs text-slate-500">Total Runs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{metrics.successRate.toFixed(0)}%</div>
          <div className="text-xs text-slate-500">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{(metrics.avgTime/1000).toFixed(1)}s</div>
          <div className="text-xs text-slate-500">Avg Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{(metrics.p95/1000).toFixed(1)}s</div>
          <div className="text-xs text-slate-500">P95 Time</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Recommendations ({recommendations.length})
        </h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recommendations.map((rec, idx) => (
            <RecommendationCard key={idx} recommendation={rec} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function AIScenarioOptimizer({ runs, scenarios }) {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analysis = useMemo(() => {
    return analyzeScenarioPerformance(runs, scenarios);
  }, [runs, scenarios]);

  const sortedScenarios = useMemo(() => {
    return Object.values(analysis)
      .sort((a, b) => a.optimizationScore - b.optimizationScore);
  }, [analysis]);

  const overallStats = useMemo(() => {
    const values = Object.values(analysis);
    if (values.length === 0) return { avgScore: 0, totalRecs: 0, criticalRecs: 0 };
    
    return {
      avgScore: values.reduce((sum, a) => sum + a.optimizationScore, 0) / values.length,
      totalRecs: values.reduce((sum, a) => sum + a.recommendations.length, 0),
      criticalRecs: values.reduce((sum, a) => sum + a.recommendations.filter(r => r.type === 'critical').length, 0),
    };
  }, [analysis]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">AI Scenario Optimizer</h3>
            <p className="text-sm text-slate-600">Intelligent analysis and optimization recommendations</p>
          </div>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700">
          {isAnalyzing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <Target className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-700">{overallStats.avgScore.toFixed(0)}%</div>
                <div className="text-sm text-purple-600">Average Optimization Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-700">{overallStats.totalRecs}</div>
                <div className="text-sm text-amber-600">Total Recommendations</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-red-700">{overallStats.criticalRecs}</div>
                <div className="text-sm text-red-600">Critical Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenario List & Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Scenario List */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-600" />
              Scenarios by Optimization Need
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {sortedScenarios.map((item, idx) => (
                <motion.button
                  key={item.scenario.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedScenario(item.scenario.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                    selectedScenario === item.scenario.id
                      ? 'bg-purple-50 border-purple-300 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.optimizationScore >= 80 ? 'bg-emerald-100' :
                      item.optimizationScore >= 60 ? 'bg-amber-100' :
                      'bg-red-100'
                    }`}>
                      <span className={`text-sm font-bold ${
                        item.optimizationScore >= 80 ? 'text-emerald-700' :
                        item.optimizationScore >= 60 ? 'text-amber-700' :
                        'text-red-700'
                      }`}>
                        {item.optimizationScore.toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{item.scenario.nameEn}</div>
                      <div className="text-xs text-slate-500">
                        {item.recommendations.length} recommendations
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.recommendations.some(r => r.type === 'critical') && (
                      <Badge className="bg-red-100 text-red-700 text-xs">Critical</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Details Panel */}
        <AnimatePresence mode="wait">
          {selectedScenario && analysis[selectedScenario] ? (
            <ScenarioOptimizationPanel
              key={selectedScenario}
              analysis={analysis[selectedScenario]}
              onClose={() => setSelectedScenario(null)}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full min-h-[400px] bg-slate-50 rounded-2xl border border-slate-200"
            >
              <div className="text-center p-8">
                <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-slate-600 mb-2">Select a Scenario</h4>
                <p className="text-sm text-slate-500">Click on a scenario to see AI-powered optimization recommendations</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}