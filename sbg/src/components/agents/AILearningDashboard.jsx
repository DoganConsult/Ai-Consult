import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, Target, Sparkles, Settings, Database, MessageSquare, Zap, RefreshCw, Save, Trash2, Plus, CheckCircle
} from 'lucide-react';
import CrossScenarioLearning from './CrossScenarioLearning';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Get feedback from localStorage
const getFeedbackHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('ai_feedback_history') || '[]');
  } catch { return []; }
};

// Get learning parameters
const getLearningParams = () => {
  try {
    return JSON.parse(localStorage.getItem('ai_learning_params') || '{}');
  } catch { return {}; }
};

const defaultParams = {
  learningRate: 0.7,
  correctionWeight: 0.8,
  feedbackDecay: 0.95,
  minSamplesForLearning: 3,
  enableAutoLearning: true,
  prioritizeRecentFeedback: true
};

// Get custom training patterns
const getTrainingPatterns = () => {
  try {
    return JSON.parse(localStorage.getItem('ai_training_patterns') || '[]');
  } catch { return []; }
};

function MetricCard({ title, value, subtitle, icon: Icon, color = 'emerald', trend }) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-violet-500',
    amber: 'from-amber-500 to-orange-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <Badge className={trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
            {trend >= 0 ? '+' : ''}{trend}%
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </motion.div>
  );
}

function CorrectionImpactChart({ feedbackHistory }) {
  const impactData = useMemo(() => {
    const corrections = feedbackHistory.filter(f => f.correction);
    const grouped = {};
    
    corrections.forEach(c => {
      const key = c.correction.split(' ').slice(0, 3).join(' ');
      if (!grouped[key]) {
        grouped[key] = { correction: key, count: 0, avgRatingBefore: 0, avgRatingAfter: 0, ratings: [] };
      }
      grouped[key].count++;
      grouped[key].ratings.push(c.rating);
    });

    return Object.values(grouped)
      .map(g => ({
        ...g,
        avgRating: g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length,
        impact: Math.min(100, g.count * 20 + (5 - g.ratings[0]) * 10)
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 6);
  }, [feedbackHistory]);

  if (impactData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No corrections recorded yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={impactData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="correction" width={100} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            formatter={(value) => [`${value.toFixed(0)}%`, 'Impact Score']}
          />
          <Bar dataKey="impact" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LearningProgressChart({ feedbackHistory }) {
  const progressData = useMemo(() => {
    if (feedbackHistory.length === 0) return [];
    
    const sorted = [...feedbackHistory].sort((a, b) => a.timestamp - b.timestamp);
    const windowSize = 5;
    const data = [];
    
    for (let i = windowSize - 1; i < sorted.length; i++) {
      const window = sorted.slice(i - windowSize + 1, i + 1);
      const avgRating = window.reduce((sum, f) => sum + f.rating, 0) / windowSize;
      const date = new Date(sorted[i].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data.push({ date, rating: avgRating, count: i + 1 });
    }
    
    return data;
  }, [feedbackHistory]);

  if (progressData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        Not enough data for progress chart
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <Area type="monotone" dataKey="rating" stroke="#8b5cf6" fill="url(#colorRating)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FeedbackDistribution({ feedbackHistory }) {
  const distData = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbackHistory.forEach(f => { dist[f.rating] = (dist[f.rating] || 0) + 1; });
    return Object.entries(dist).map(([rating, count]) => ({
      rating: `${rating} Star`,
      count,
      fill: COLORS[parseInt(rating) - 1]
    }));
  }, [feedbackHistory]);

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={distData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="count"
            label={({ rating, percent }) => percent > 0 ? `${rating}` : ''}
            labelLine={false}
          >
            {distData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function LearningParametersPanel({ params, onUpdate }) {
  const [localParams, setLocalParams] = useState({ ...defaultParams, ...params });

  const handleSave = () => {
    localStorage.setItem('ai_learning_params', JSON.stringify(localParams));
    onUpdate(localParams);
  };

  const handleReset = () => {
    setLocalParams(defaultParams);
    localStorage.setItem('ai_learning_params', JSON.stringify(defaultParams));
    onUpdate(defaultParams);
  };

  return (
    <div className="space-y-6">
      {/* Learning Rate */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Learning Rate</label>
          <span className="text-sm text-slate-500">{(localParams.learningRate * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[localParams.learningRate * 100]}
          onValueChange={([v]) => setLocalParams({ ...localParams, learningRate: v / 100 })}
          max={100}
          step={5}
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">How quickly the AI adapts to new feedback</p>
      </div>

      {/* Correction Weight */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Correction Weight</label>
          <span className="text-sm text-slate-500">{(localParams.correctionWeight * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[localParams.correctionWeight * 100]}
          onValueChange={([v]) => setLocalParams({ ...localParams, correctionWeight: v / 100 })}
          max={100}
          step={5}
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">Impact of explicit corrections on learning</p>
      </div>

      {/* Feedback Decay */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Feedback Decay</label>
          <span className="text-sm text-slate-500">{(localParams.feedbackDecay * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[localParams.feedbackDecay * 100]}
          onValueChange={([v]) => setLocalParams({ ...localParams, feedbackDecay: v / 100 })}
          min={50}
          max={100}
          step={5}
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">How much older feedback loses importance over time</p>
      </div>

      {/* Min Samples */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">Min Samples for Learning</label>
          <span className="text-sm text-slate-500">{localParams.minSamplesForLearning}</span>
        </div>
        <Slider
          value={[localParams.minSamplesForLearning]}
          onValueChange={([v]) => setLocalParams({ ...localParams, minSamplesForLearning: v })}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-slate-500 mt-1">Minimum feedback samples before applying learnings</p>
      </div>

      {/* Toggles */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700">Auto Learning</label>
            <p className="text-xs text-slate-500">Automatically apply learnings from feedback</p>
          </div>
          <Switch
            checked={localParams.enableAutoLearning}
            onCheckedChange={(v) => setLocalParams({ ...localParams, enableAutoLearning: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700">Prioritize Recent</label>
            <p className="text-xs text-slate-500">Give more weight to recent feedback</p>
          </div>
          <Switch
            checked={localParams.prioritizeRecentFeedback}
            onCheckedChange={(v) => setLocalParams({ ...localParams, prioritizeRecentFeedback: v })}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700">
          <Save className="w-4 h-4 mr-2" />
          Save Parameters
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}

function TrainingPatternsPanel() {
  const [patterns, setPatterns] = useState(getTrainingPatterns);
  const [newPattern, setNewPattern] = useState({ trigger: '', action: '', priority: 'medium' });
  const [isAdding, setIsAdding] = useState(false);

  const savePatterns = (updated) => {
    setPatterns(updated);
    localStorage.setItem('ai_training_patterns', JSON.stringify(updated));
  };

  const addPattern = () => {
    if (!newPattern.trigger.trim() || !newPattern.action.trim()) return;
    const updated = [...patterns, { ...newPattern, id: Date.now(), createdAt: Date.now() }];
    savePatterns(updated);
    setNewPattern({ trigger: '', action: '', priority: 'medium' });
    setIsAdding(false);
  };

  const deletePattern = (id) => {
    const updated = patterns.filter(p => p.id !== id);
    savePatterns(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Define explicit rules for the AI to follow</p>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "default"}>
          <Plus className="w-4 h-4 mr-1" />
          Add Pattern
        </Button>
      </div>

      {/* Add Pattern Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-purple-50 rounded-xl border border-purple-200 p-4 space-y-3"
          >
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">When (Trigger)</label>
              <Input
                value={newPattern.trigger}
                onChange={(e) => setNewPattern({ ...newPattern, trigger: e.target.value })}
                placeholder="e.g., task contains 'procurement' or 'مشتريات'"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Then (Action)</label>
              <Textarea
                value={newPattern.action}
                onChange={(e) => setNewPattern({ ...newPattern, action: e.target.value })}
                placeholder="e.g., Always check vendor certifications before creating RFQ"
                className="h-20"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700">Priority:</label>
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  onClick={() => setNewPattern({ ...newPattern, priority: p })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    newPattern.priority === p
                      ? p === 'high' ? 'bg-red-500 text-white' :
                        p === 'medium' ? 'bg-amber-500 text-white' :
                        'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button onClick={addPattern} className="w-full bg-purple-600 hover:bg-purple-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Add Training Pattern
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patterns List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {patterns.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No training patterns defined
          </div>
        ) : (
          patterns.map((pattern, idx) => (
            <motion.div
              key={pattern.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${
                      pattern.priority === 'high' ? 'bg-red-100 text-red-700' :
                      pattern.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {pattern.priority}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(pattern.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-700 mb-1">
                    <span className="text-purple-600">When:</span> {pattern.trigger}
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="text-emerald-600">Then:</span> {pattern.action}
                  </div>
                </div>
                <button
                  onClick={() => deletePattern(pattern.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AILearningDashboard() {
  const [feedbackHistory] = useState(getFeedbackHistory);
  const [params, setParams] = useState({ ...defaultParams, ...getLearningParams() });

  const stats = useMemo(() => {
    const total = feedbackHistory.length;
    const avgRating = total > 0 ? feedbackHistory.reduce((sum, f) => sum + f.rating, 0) / total : 0;
    const correctionsCount = feedbackHistory.filter(f => f.correction).length;
    const recentAvg = feedbackHistory.slice(-10).reduce((sum, f) => sum + f.rating, 0) / Math.min(10, feedbackHistory.length) || 0;
    const trend = total > 10 ? Math.round((recentAvg - avgRating) / avgRating * 100) : 0;

    return { total, avgRating, correctionsCount, recentAvg, trend };
  }, [feedbackHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">AI Learning Dashboard</h3>
          <p className="text-sm text-slate-600">Monitor and fine-tune AI learning from your feedback</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Feedback"
          value={stats.total}
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          subtitle="out of 5"
          icon={Target}
          color="emerald"
          trend={stats.trend}
        />
        <MetricCard
          title="Corrections Made"
          value={stats.correctionsCount}
          icon={Sparkles}
          color="purple"
        />
        <MetricCard
          title="Recent Performance"
          value={stats.recentAvg.toFixed(1)}
          subtitle="last 10 sessions"
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="cross-scenario">Cross-Scenario</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Rating Trend Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LearningProgressChart feedbackHistory={feedbackHistory} />
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <FeedbackDistribution feedbackHistory={feedbackHistory} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cross-scenario" className="mt-4">
          <CrossScenarioLearning />
        </TabsContent>

        <TabsContent value="impact" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                Correction Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CorrectionImpactChart feedbackHistory={feedbackHistory} />
              <p className="text-xs text-slate-500 mt-4 text-center">
                Higher impact scores indicate corrections that significantly influenced AI behavior
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parameters" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                Learning Parameters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LearningParametersPanel params={params} onUpdate={setParams} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Custom Training Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrainingPatternsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}