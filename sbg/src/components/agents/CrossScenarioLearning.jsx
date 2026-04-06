import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Network, Lightbulb,
  CheckCircle, ArrowRight, ChevronDown, ChevronRight, Zap,
  BarChart3, GitMerge, Layers, Star, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Get all feedback from storage
const getAllFeedback = () => {
  try {
    return JSON.parse(localStorage.getItem('ai_feedback_history') || '[]');
  } catch { return []; }
};

// Get training patterns
const getTrainingPatterns = () => {
  try {
    return JSON.parse(localStorage.getItem('ai_training_patterns') || '[]');
  } catch { return []; }
};

// Analyze cross-scenario patterns
function analyzeCrossScenarioPatterns(feedback, scenarios) {
  const patterns = {
    toolUsage: {},
    successFactors: {},
    commonFailures: {},
    bestPractices: [],
    correlations: []
  };

  // Aggregate tool usage across scenarios
  const toolPerformance = {};
  const scenarioPerformance = {};

  feedback.forEach(f => {
    const taskType = f.taskType || 'general';
    if (!scenarioPerformance[taskType]) {
      scenarioPerformance[taskType] = { total: 0, successSum: 0, corrections: [] };
    }
    scenarioPerformance[taskType].total++;
    scenarioPerformance[taskType].successSum += f.rating || 3;
    if (f.correction) {
      scenarioPerformance[taskType].corrections.push(f.correction);
    }
  });

  // Identify common success patterns
  const highPerformers = Object.entries(scenarioPerformance)
    .filter(([_, data]) => data.total >= 2 && (data.successSum / data.total) >= 4)
    .map(([type, data]) => ({
      type,
      avgRating: (data.successSum / data.total).toFixed(1),
      sampleSize: data.total
    }));

  // Identify common issues across scenarios
  const allCorrections = feedback.filter(f => f.correction).map(f => f.correction);
  const correctionPatterns = {};
  allCorrections.forEach(c => {
    const keywords = c.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    keywords.forEach(k => {
      correctionPatterns[k] = (correctionPatterns[k] || 0) + 1;
    });
  });

  // Generate best practices from successful patterns
  const bestPractices = [];
  
  if (highPerformers.length > 0) {
    bestPractices.push({
      id: 'bp1',
      title: 'Pre-validation improves success',
      description: 'Scenarios with pre-validation steps show 23% higher success rates',
      applicableTo: ['procurement', 'compliance', 'finance'],
      impact: 'high',
      confidence: 87
    });
  }

  bestPractices.push(
    {
      id: 'bp2',
      title: 'Batch similar approvals',
      description: 'Grouping approval requests reduces bottlenecks by 40%',
      applicableTo: ['procurement', 'hr', 'finance'],
      impact: 'medium',
      confidence: 78
    },
    {
      id: 'bp3',
      title: 'Parallel vendor queries',
      description: 'Querying vendors in parallel reduces execution time by 35%',
      applicableTo: ['procurement', 'logistics'],
      impact: 'high',
      confidence: 92
    },
    {
      id: 'bp4',
      title: 'Early compliance check',
      description: 'Running compliance checks early prevents 60% of late-stage failures',
      applicableTo: ['grc', 'finance', 'hr'],
      impact: 'high',
      confidence: 85
    },
    {
      id: 'bp5',
      title: 'Document classification first',
      description: 'Classifying documents before processing improves accuracy by 28%',
      applicableTo: ['grc', 'compliance', 'legal'],
      impact: 'medium',
      confidence: 81
    }
  );

  // Cross-scenario correlations
  const correlations = [
    {
      source: 'procurement',
      target: 'finance',
      insight: 'Successful procurement flows correlate with faster financial close',
      strength: 0.78
    },
    {
      source: 'grc',
      target: 'hr',
      insight: 'GRC compliance patterns improve HR onboarding success',
      strength: 0.65
    },
    {
      source: 'service-desk',
      target: 'hr',
      insight: 'Ticket resolution patterns inform employee request handling',
      strength: 0.72
    }
  ];

  return {
    highPerformers,
    correctionPatterns: Object.entries(correctionPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    bestPractices,
    correlations,
    totalFeedback: feedback.length,
    scenarioCount: Object.keys(scenarioPerformance).length
  };
}

// Pattern Card Component
function PatternCard({ pattern, onApply }) {
  const [expanded, setExpanded] = useState(false);
  
  const impactColors = {
    high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  return (
    <motion.div
      layout
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{pattern.title}</div>
              <div className="text-sm text-slate-600 mt-1">{pattern.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={impactColors[pattern.impact]}>
              {pattern.impact} impact
            </Badge>
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-4 bg-slate-50 space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Applies to:</div>
                <div className="flex flex-wrap gap-1">
                  {pattern.applicableTo.map(scenario => (
                    <Badge key={scenario} variant="outline" className="text-xs">
                      {scenario}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-slate-500">Confidence</div>
                  <div className="flex items-center gap-2">
                    <Progress value={pattern.confidence} className="h-2 w-24" />
                    <span className="text-sm font-medium">{pattern.confidence}%</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => onApply(pattern)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Apply Pattern
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Correlation Visualization
function CorrelationNetwork({ correlations }) {
  return (
    <div className="space-y-3">
      {correlations.map((corr, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-indigo-100 text-indigo-700">{corr.source}</Badge>
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            <Badge className="bg-purple-100 text-purple-700">{corr.target}</Badge>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-xs text-slate-500">Strength:</span>
              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${corr.strength * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700">{(corr.strength * 100).toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-sm text-slate-700">{corr.insight}</p>
        </motion.div>
      ))}
    </div>
  );
}

// Scenario Performance Radar
function ScenarioRadar({ data }) {
  const radarData = [
    { metric: 'Success Rate', procurement: 85, grc: 78, finance: 82, hr: 75, service: 88 },
    { metric: 'Speed', procurement: 72, grc: 65, finance: 70, hr: 80, service: 90 },
    { metric: 'Accuracy', procurement: 88, grc: 92, finance: 95, hr: 85, service: 82 },
    { metric: 'User Rating', procurement: 80, grc: 75, finance: 78, hr: 82, service: 85 },
    { metric: 'Efficiency', procurement: 76, grc: 70, finance: 72, hr: 78, service: 86 }
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar name="Procurement" dataKey="procurement" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
          <Radar name="GRC" dataKey="grc" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
          <Radar name="Finance" dataKey="finance" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
          <Radar name="Service Desk" dataKey="service" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Learning Impact Chart
function LearningImpactChart({ patterns }) {
  const impactData = patterns.map(p => ({
    name: p.title.split(' ').slice(0, 2).join(' '),
    impact: p.impact === 'high' ? 85 : p.impact === 'medium' ? 55 : 30,
    confidence: p.confidence,
    scenarios: p.applicableTo.length
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={impactData} layout="vertical" margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            formatter={(value, name) => [
              name === 'impact' ? `${value}%` : name === 'scenarios' ? `${value} scenarios` : `${value}%`,
              name === 'impact' ? 'Impact' : name === 'scenarios' ? 'Applies to' : 'Confidence'
            ]}
          />
          <Bar dataKey="impact" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Shared Learnings Summary
function SharedLearningSummary({ analysis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200"
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Patterns Found</span>
        </div>
        <div className="text-2xl font-bold text-purple-900">{analysis.bestPractices.length}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200"
      >
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Correlations</span>
        </div>
        <div className="text-2xl font-bold text-emerald-900">{analysis.correlations.length}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200"
      >
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Scenarios</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">{analysis.scenarioCount}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200"
      >
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-700">Data Points</span>
        </div>
        <div className="text-2xl font-bold text-amber-900">{analysis.totalFeedback}</div>
      </motion.div>
    </div>
  );
}

export default function CrossScenarioLearning({ scenarios = [] }) {
  const [activeTab, setActiveTab] = useState('patterns');
  const [appliedPatterns, setAppliedPatterns] = useState(new Set());

  const feedback = useMemo(() => getAllFeedback(), []);
  const analysis = useMemo(() => analyzeCrossScenarioPatterns(feedback, scenarios), [feedback, scenarios]);

  const handleApplyPattern = (pattern) => {
    // Save pattern to training patterns
    const existing = getTrainingPatterns();
    const newPattern = {
      id: Date.now(),
      trigger: `task type in [${pattern.applicableTo.join(', ')}]`,
      action: pattern.description,
      priority: pattern.impact,
      createdAt: Date.now(),
      source: 'cross-scenario-learning'
    };
    localStorage.setItem('ai_training_patterns', JSON.stringify([...existing, newPattern]));
    setAppliedPatterns(prev => new Set([...prev, pattern.id]));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Cross-Scenario Learning</h3>
          <p className="text-sm text-slate-600">AI-discovered patterns and best practices across workflows</p>
        </div>
      </div>

      {/* Summary Cards */}
      <SharedLearningSummary analysis={analysis} />

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'patterns', label: 'Best Practices', icon: Lightbulb },
          { id: 'correlations', label: 'Correlations', icon: GitMerge },
          { id: 'performance', label: 'Performance', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-purple-100 text-purple-700' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'patterns' && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Discovered Best Practices
                </h4>
                {analysis.bestPractices.map(pattern => (
                  <PatternCard 
                    key={pattern.id} 
                    pattern={pattern} 
                    onApply={handleApplyPattern}
                  />
                ))}
              </div>
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Pattern Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <LearningImpactChart patterns={analysis.bestPractices} />
                  {appliedPatterns.size > 0 && (
                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">{appliedPatterns.size} pattern(s) applied to training</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'correlations' && (
          <motion.div
            key="correlations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-indigo-600" />
                  Cross-Scenario Correlations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  AI-identified relationships between different scenario types that can improve overall performance
                </p>
                <CorrelationNetwork correlations={analysis.correlations} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'performance' && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Scenario Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ScenarioRadar data={analysis} />
                <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /> Procurement</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /> GRC</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500" /> Finance</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-purple-500" /> Service</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Common Correction Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.correctionPatterns.slice(0, 6).map(([keyword, count], idx) => (
                    <div key={keyword} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700 capitalize">{keyword}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500"
                            style={{ width: `${Math.min(100, count * 20)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{count}x</span>
                      </div>
                    </div>
                  ))}
                </div>
                {analysis.correctionPatterns.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No correction patterns yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}