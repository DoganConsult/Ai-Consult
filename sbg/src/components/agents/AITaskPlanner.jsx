import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, GitBranch, Play, Pause, RotateCcw, CheckCircle, XCircle,
  AlertTriangle, Zap, Clock, Target,
  RefreshCw, MessageSquare, ThumbsUp, ThumbsDown, Save, Settings, Sparkles, Users
} from 'lucide-react';
import AILearningDashboard from './AILearningDashboard';
import MultiAgentWorkflowGenerator from './MultiAgentWorkflowGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

// AI Task Decomposition Engine
const decomposeTask = (task, context = {}) => {
  const subtasks = [];
  const complexity = estimateComplexity(task);
  
  // Break down based on task type and complexity
  if (task.includes('procurement') || task.includes('مشتريات')) {
    subtasks.push(
      { id: 'req', title: 'Extract Requirements', titleAr: 'استخراج المتطلبات', tool: 'mind.extract_requirements', priority: 1, dependencies: [] },
      { id: 'validate', title: 'Validate Specifications', titleAr: 'التحقق من المواصفات', tool: 'validation.check_specs', priority: 2, dependencies: ['req'] },
      { id: 'vendors', title: 'Identify Vendors', titleAr: 'تحديد الموردين', tool: 'procurement.find_vendors', priority: 3, dependencies: ['validate'] },
      { id: 'rfq', title: 'Generate RFQ', titleAr: 'إنشاء طلب العروض', tool: 'erpnext.rfq_create', priority: 4, dependencies: ['vendors'] },
      { id: 'compare', title: 'Compare Quotes', titleAr: 'مقارنة العروض', tool: 'procurement.compare_quotes', priority: 5, dependencies: ['rfq'] },
      { id: 'approve', title: 'Request Approval', titleAr: 'طلب الموافقة', tool: 'governance.approval', priority: 6, dependencies: ['compare'], requiresApproval: true },
      { id: 'po', title: 'Create Purchase Order', titleAr: 'إنشاء أمر الشراء', tool: 'erpnext.po_create', priority: 7, dependencies: ['approve'] }
    );
  } else if (task.includes('compliance') || task.includes('امتثال')) {
    subtasks.push(
      { id: 'gather', title: 'Gather Evidence', titleAr: 'جمع الأدلة', tool: 'grc.collect_evidence', priority: 1, dependencies: [] },
      { id: 'classify', title: 'Classify Documents', titleAr: 'تصنيف المستندات', tool: 'grc.classify_docs', priority: 2, dependencies: ['gather'] },
      { id: 'map', title: 'Map to Controls', titleAr: 'ربط بالضوابط', tool: 'grc.map_controls', priority: 3, dependencies: ['classify'] },
      { id: 'gap', title: 'Gap Analysis', titleAr: 'تحليل الفجوات', tool: 'grc.gap_analysis', priority: 4, dependencies: ['map'] },
      { id: 'remediate', title: 'Create Remediation Plan', titleAr: 'خطة المعالجة', tool: 'grc.remediation_plan', priority: 5, dependencies: ['gap'] }
    );
  } else {
    // Generic task decomposition
    subtasks.push(
      { id: 'analyze', title: 'Analyze Request', titleAr: 'تحليل الطلب', tool: 'mind.analyze', priority: 1, dependencies: [] },
      { id: 'plan', title: 'Create Execution Plan', titleAr: 'إنشاء خطة التنفيذ', tool: 'mind.plan', priority: 2, dependencies: ['analyze'] },
      { id: 'execute', title: 'Execute Tasks', titleAr: 'تنفيذ المهام', tool: 'automation.execute', priority: 3, dependencies: ['plan'] },
      { id: 'verify', title: 'Verify Results', titleAr: 'التحقق من النتائج', tool: 'validation.verify', priority: 4, dependencies: ['execute'] }
    );
  }

  return {
    originalTask: task,
    subtasks,
    complexity,
    estimatedTime: subtasks.length * 1500,
    parallelizable: identifyParallelTasks(subtasks)
  };
};

const estimateComplexity = (task) => {
  const factors = {
    length: task.length > 100 ? 2 : 1,
    keywords: (task.match(/و|ثم|بعد|مع|أيضاً|and|then|after|also/g) || []).length,
    entities: (task.match(/\d+|#\w+/g) || []).length
  };
  const score = factors.length + factors.keywords * 0.5 + factors.entities * 0.3;
  return score > 5 ? 'high' : score > 2 ? 'medium' : 'low';
};

const identifyParallelTasks = (subtasks) => {
  const groups = [];
  const visited = new Set();
  
  subtasks.forEach(task => {
    if (visited.has(task.id)) return;
    const parallel = subtasks.filter(t => 
      !visited.has(t.id) && 
      t.priority === task.priority &&
      JSON.stringify(t.dependencies) === JSON.stringify(task.dependencies)
    );
    if (parallel.length > 1) {
      groups.push(parallel.map(t => t.id));
      parallel.forEach(t => visited.add(t.id));
    }
  });
  
  return groups;
};

// Feedback Storage
const getFeedbackHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('ai_feedback_history') || '[]');
  } catch { return []; }
};

const saveFeedback = (feedback) => {
  const history = getFeedbackHistory();
  history.push({ ...feedback, timestamp: Date.now() });
  localStorage.setItem('ai_feedback_history', JSON.stringify(history.slice(-100)));
};

// Learning from feedback
const applyLearnings = (plan, feedbackHistory) => {
  const taskFeedback = feedbackHistory.filter(f => f.taskType === plan.originalTask.split(' ')[0]);
  
  if (taskFeedback.length === 0) return plan;

  const avgRating = taskFeedback.reduce((sum, f) => sum + f.rating, 0) / taskFeedback.length;
  const corrections = taskFeedback.filter(f => f.correction).map(f => f.correction);
  
  // Apply learnings
  const adjustedPlan = { ...plan };
  
  if (avgRating < 3) {
    // Add extra validation steps
    adjustedPlan.subtasks = [
      { id: 'pre-validate', title: 'Pre-execution Validation', titleAr: 'تحقق مسبق', tool: 'validation.pre_check', priority: 0, dependencies: [] },
      ...plan.subtasks
    ];
  }

  // Track learning metadata
  adjustedPlan.learnings = {
    appliedFrom: taskFeedback.length,
    avgHistoricalRating: avgRating,
    corrections: corrections.slice(-3)
  };

  return adjustedPlan;
};

function SubtaskNode({ subtask, status, onRetry, onSkip, isActive, timing, isLongRunning }) {
  const statusStyles = {
    pending: { bg: 'bg-slate-100', border: 'border-slate-200', icon: Clock, iconColor: 'text-slate-400' },
    running: { bg: 'bg-blue-50', border: 'border-blue-300', icon: RefreshCw, iconColor: 'text-blue-500' },
    completed: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: CheckCircle, iconColor: 'text-emerald-500' },
    failed: { bg: 'bg-red-50', border: 'border-red-300', icon: XCircle, iconColor: 'text-red-500' },
    skipped: { bg: 'bg-amber-50', border: 'border-amber-300', icon: AlertTriangle, iconColor: 'text-amber-500' }
  };

  const style = statusStyles[status] || statusStyles.pending;
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: isActive ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none'
      }}
      className={`p-4 rounded-xl border-2 ${style.bg} ${style.border} transition-all relative overflow-hidden`}
    >
      {/* Running progress bar */}
      {status === 'running' && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-blue-500"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }}
        />
      )}
      
      {/* Long running alert */}
      {isLongRunning && status === 'running' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 right-2"
        >
          <Badge className="bg-orange-500 text-white text-xs animate-pulse">
            ⚠️ Long Running
          </Badge>
        </motion.div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div
              animate={status === 'running' ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: status === 'running' ? Infinity : 0, ease: 'linear' }}
            >
              <Icon className={`w-5 h-5 ${style.iconColor}`} />
            </motion.div>
            {status === 'running' && (
              <motion.div
                className="absolute -inset-1 rounded-full border-2 border-blue-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <div className="font-medium text-slate-900">{subtask.title}</div>
            <div className="text-xs text-slate-500">{subtask.titleAr}</div>
            <code className="text-xs text-slate-400 mt-1 block">{subtask.tool}</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Timing display */}
          {timing && (
            <div className="text-right">
              {timing.duration ? (
                <div className={`text-xs font-mono ${timing.duration > 3000 ? 'text-orange-600' : 'text-slate-500'}`}>
                  {(timing.duration / 1000).toFixed(2)}s
                </div>
              ) : timing.startTime && status === 'running' ? (
                <LiveTimer startTime={timing.startTime} />
              ) : null}
            </div>
          )}
          {subtask.requiresApproval && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">Approval</Badge>
          )}
          {status === 'failed' && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onRetry(subtask.id)} className="h-7 px-2">
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onSkip(subtask.id)} className="h-7 px-2">
                Skip
              </Button>
            </div>
          )}
        </div>
      </div>
      {subtask.dependencies.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          Depends on: {subtask.dependencies.join(', ')}
        </div>
      )}
    </motion.div>
  );
}

// Live timer component
function LiveTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <motion.div 
      className={`text-xs font-mono ${elapsed > 3000 ? 'text-orange-600 font-bold' : 'text-blue-600'}`}
      animate={elapsed > 3000 ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: elapsed > 3000 ? Infinity : 0 }}
    >
      {(elapsed / 1000).toFixed(1)}s
    </motion.div>
  );
}

// Real-time stats panel
function ExecutionStats({ statuses, timings, isExecuting, predictions }) {
  const stats = React.useMemo(() => {
    const completed = Object.values(statuses).filter(s => s === 'completed').length;
    const failed = Object.values(statuses).filter(s => s === 'failed').length;
    const running = Object.values(statuses).filter(s => s === 'running').length;
    const pending = Object.values(statuses).filter(s => s === 'pending').length;
    const skipped = Object.values(statuses).filter(s => s === 'skipped').length;
    const total = Object.keys(statuses).length;
    
    const completedTimings = Object.values(timings).filter(t => t.duration);
    const avgTime = completedTimings.length > 0 
      ? completedTimings.reduce((sum, t) => sum + t.duration, 0) / completedTimings.length 
      : 0;
    const totalTime = completedTimings.reduce((sum, t) => sum + t.duration, 0);

    return { completed, failed, running, pending, skipped, total, avgTime, totalTime };
  }, [statuses, timings]);

  return (
    <div className="space-y-2">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-6 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
      >
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">{stats.completed}</div>
          <div className="text-xs text-slate-500">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{stats.running}</div>
          <div className="text-xs text-slate-500">Running</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-400">{stats.pending}</div>
          <div className="text-xs text-slate-500">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-slate-500">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{stats.skipped}</div>
          <div className="text-xs text-slate-500">Skipped</div>
        </div>
        <div className="text-center border-l border-slate-200">
          <div className="text-lg font-bold text-purple-600">{(stats.totalTime / 1000).toFixed(1)}s</div>
          <div className="text-xs text-slate-500">Total Time</div>
        </div>
      </motion.div>
      
      {/* Predictions Panel */}
      {predictions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">AI Predictions</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Est. Success</div>
              <div className={`font-bold ${predictions.successRate >= 80 ? 'text-emerald-600' : predictions.successRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {predictions.successRate}%
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Est. Time Left</div>
              <div className="font-bold text-blue-600">{predictions.timeRemaining}s</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Risk Level</div>
              <div className={`font-bold ${predictions.riskLevel === 'low' ? 'text-emerald-600' : predictions.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                {predictions.riskLevel}
              </div>
            </div>
          </div>
          {predictions.alerts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-purple-200">
              {predictions.alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3" />
                  {alert}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function FeedbackPanel({ execution, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [correction, setCorrection] = useState('');
  const [specificFeedback, setSpecificFeedback] = useState({});

  const handleSubmit = () => {
    const feedback = {
      executionId: execution.id,
      taskType: execution.task.split(' ')[0],
      rating,
      correction: correction.trim() || null,
      specificFeedback,
      subtaskCount: execution.subtasks.length,
      completedCount: Object.values(execution.statuses).filter(s => s === 'completed').length
    };
    saveFeedback(feedback);
    onSubmit(feedback);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-6 h-6 text-purple-600" />
        <h4 className="font-semibold text-slate-900">Rate This Execution</h4>
      </div>

      {/* Overall Rating */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Overall Performance</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                rating >= star ? 'bg-purple-500 text-white' : 'bg-white border border-slate-200 text-slate-400'
              }`}
            >
              {star}
            </button>
          ))}
        </div>
      </div>

      {/* Per-subtask feedback */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Subtask Feedback (optional)</label>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {execution.subtasks.map(subtask => (
            <div key={subtask.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
              <span className="text-sm text-slate-700">{subtask.title}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSpecificFeedback({ ...specificFeedback, [subtask.id]: 'good' })}
                  className={`p-1.5 rounded ${specificFeedback[subtask.id] === 'good' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400'}`}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSpecificFeedback({ ...specificFeedback, [subtask.id]: 'bad' })}
                  className={`p-1.5 rounded ${specificFeedback[subtask.id] === 'bad' ? 'bg-red-100 text-red-600' : 'text-slate-400'}`}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Correction */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Correction or Suggestion (helps AI learn)
        </label>
        <Textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          placeholder="e.g., 'Should have checked vendor certifications first' or 'Skip step X when Y condition'"
          className="h-20 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={rating === 0} className="flex-1 bg-purple-600 hover:bg-purple-700">
          <Save className="w-4 h-4 mr-2" />
          Submit Feedback
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </motion.div>
  );
}

export default function AITaskPlanner({ initialTask = '', onExecutionComplete }) {
  const [task, setTask] = useState(initialTask);
  const [plan, setPlan] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [currentSubtask, setCurrentSubtask] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [timings, setTimings] = useState({});
  const [longRunningTasks, setLongRunningTasks] = useState(new Set());
  const [showLearningDashboard, setShowLearningDashboard] = useState(false);
  const [showMultiAgent, setShowMultiAgent] = useState(false);
  const [predictions, setPredictions] = useState(null);

  // Generate predictions based on plan
  const generatePredictions = useCallback((subtasks, currentStatuses, currentTimings) => {
    const completed = Object.values(currentStatuses).filter(s => s === 'completed').length;
    const failed = Object.values(currentStatuses).filter(s => s === 'failed').length;
    const pending = Object.values(currentStatuses).filter(s => s === 'pending' || s === 'running').length;
    const total = subtasks.length;
    
    const completedTimings = Object.values(currentTimings).filter(t => t.duration);
    const avgStepTime = completedTimings.length > 0
      ? completedTimings.reduce((sum, t) => sum + t.duration, 0) / completedTimings.length
      : 2000;
    
    const successRate = total > 0 ? Math.round(((completed / (completed + failed || 1)) * 100) * (1 - failed * 0.05)) : 85;
    const timeRemaining = ((pending * avgStepTime) / 1000).toFixed(1);
    
    const alerts = [];
    if (failed > 0) alerts.push(`${failed} step(s) failed - may affect overall success`);
    if (avgStepTime > 3000) alerts.push('Steps taking longer than expected');
    if (subtasks.some(s => s.requiresApproval && currentStatuses[s.id] === 'pending')) {
      alerts.push('Approval required - may cause delays');
    }
    
    const riskLevel = failed > 1 ? 'high' : failed === 1 || avgStepTime > 3000 ? 'medium' : 'low';
    
    return { successRate, timeRemaining, riskLevel, alerts };
  }, []);

  const generatePlan = useCallback(() => {
    if (!task.trim()) return;
    
    setIsPlanning(true);
    setTimeout(() => {
      const basePlan = decomposeTask(task);
      const feedbackHistory = getFeedbackHistory();
      const optimizedPlan = applyLearnings(basePlan, feedbackHistory);
      
      setPlan(optimizedPlan);
      setStatuses(Object.fromEntries(optimizedPlan.subtasks.map(s => [s.id, 'pending'])));
      setTimings({});
      setLongRunningTasks(new Set());
      setExecutionLog([]);
      setIsPlanning(false);
    }, 800);
  }, [task]);

  const executeStep = useCallback(async (subtaskId) => {
    const subtask = plan.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    const startTime = Date.now();
    setCurrentSubtask(subtaskId);
    setStatuses(prev => ({ ...prev, [subtaskId]: 'running' }));
    setTimings(prev => ({ ...prev, [subtaskId]: { startTime, duration: null } }));
    setExecutionLog(prev => [...prev, { type: 'start', subtaskId, timestamp: startTime }]);

    // Long running detection
    const longRunningTimeout = setTimeout(() => {
      setLongRunningTasks(prev => new Set([...prev, subtaskId]));
      setExecutionLog(prev => [...prev, { 
        type: 'warning', 
        subtaskId, 
        timestamp: Date.now(),
        message: `Task ${subtaskId} is taking longer than expected`
      }]);
    }, 3000);

    // Simulate execution with potential failure
    const executionTime = 1000 + Math.random() * 2500;
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    clearTimeout(longRunningTimeout);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const success = Math.random() > 0.15; // 85% success rate
    
    const newTimings = { ...timings, [subtaskId]: { startTime, duration } };
    setTimings(newTimings);
    setLongRunningTasks(prev => {
      const next = new Set(prev);
      next.delete(subtaskId);
      return next;
    });
    
    let newStatuses;
    if (success) {
      newStatuses = { ...statuses, [subtaskId]: 'completed' };
      setStatuses(newStatuses);
      setExecutionLog(prev => [...prev, { type: 'complete', subtaskId, timestamp: endTime, duration }]);
    } else {
      newStatuses = { ...statuses, [subtaskId]: 'failed' };
      setStatuses(newStatuses);
      setExecutionLog(prev => [...prev, { 
        type: 'error', 
        subtaskId, 
        timestamp: endTime,
        duration,
        error: 'Simulated failure for demo'
      }]);
    }

    // Update predictions after each step
    if (plan) {
      setPredictions(generatePredictions(plan.subtasks, newStatuses, newTimings));
    }

    setCurrentSubtask(null);
    return success;
  }, [plan, statuses, timings, generatePredictions]);

  const executeAll = useCallback(async () => {
    if (!plan) return;
    
    setIsExecuting(true);
    setIsPaused(false);
    
    for (const subtask of plan.subtasks) {
      if (isPaused) break;
      
      // Check dependencies
      const depsCompleted = subtask.dependencies.every(
        depId => statuses[depId] === 'completed' || statuses[depId] === 'skipped'
      );
      
      if (!depsCompleted) {
        setStatuses(prev => ({ ...prev, [subtask.id]: 'skipped' }));
        continue;
      }

      const success = await executeStep(subtask.id);
      
      // Dynamic plan adjustment on failure
      if (!success && !subtask.requiresApproval) {
        setExecutionLog(prev => [...prev, { 
          type: 'adjustment', 
          message: `Evaluating alternative paths for failed step: ${subtask.title}`,
          timestamp: Date.now()
        }]);
      }
    }

    setIsExecuting(false);
    setExecutionResult({
      id: `exec-${Date.now()}`,
      task,
      subtasks: plan.subtasks,
      statuses
    });
    setShowFeedback(true);
  }, [plan, statuses, isPaused, executeStep, task]);

  const retrySubtask = (subtaskId) => {
    setStatuses(prev => ({ ...prev, [subtaskId]: 'pending' }));
  };

  const skipSubtask = (subtaskId) => {
    setStatuses(prev => ({ ...prev, [subtaskId]: 'skipped' }));
  };

  const handleFeedbackSubmit = (feedback) => {
    setShowFeedback(false);
    onExecutionComplete?.({ ...executionResult, feedback });
  };

  const completedCount = Object.values(statuses).filter(s => s === 'completed').length;
  const totalCount = plan?.subtasks.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Task Input */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Task Planner
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showMultiAgent ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowMultiAgent(!showMultiAgent); setShowLearningDashboard(false); }}
                className={showMultiAgent ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              >
                <Users className="w-4 h-4 mr-1" />
                {showMultiAgent ? 'Hide' : 'Multi-Agent'}
              </Button>
              <Button
                variant={showLearningDashboard ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowLearningDashboard(!showLearningDashboard); setShowMultiAgent(false); }}
                className={showLearningDashboard ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <Settings className="w-4 h-4 mr-1" />
                {showLearningDashboard ? 'Hide' : 'Learning'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe your task in natural language (Arabic or English)...

Example: أريد شراء 50 جهاز كمبيوتر من مورد معتمد مع ضمان 3 سنوات"
              className="h-24"
              dir="auto"
            />
            <div className="flex gap-2">
              <Button 
                onClick={generatePlan} 
                disabled={!task.trim() || isPlanning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isPlanning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <GitBranch className="w-4 h-4 mr-2" />
                )}
                {isPlanning ? 'Planning...' : 'Generate Plan'}
              </Button>
              {plan && (
                <Button
                  onClick={executeAll}
                  disabled={isExecuting}
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {isExecuting ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {isExecuting ? 'Running...' : 'Execute Plan'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Visualization */}
      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Execution Plan
                    <Badge className={`ml-2 ${
                      plan.complexity === 'high' ? 'bg-red-100 text-red-700' :
                      plan.complexity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {plan.complexity} complexity
                    </Badge>
                  </CardTitle>
                  <div className="text-sm text-slate-500">
                    {completedCount}/{totalCount} completed
                  </div>
                </div>
                {isExecuting && (
                  <Progress value={progress} className="h-2 mt-3" />
                )}
              </CardHeader>
              <CardContent>
                {/* Real-time stats */}
                {(isExecuting || Object.values(statuses).some(s => s !== 'pending')) && (
                  <div className="mb-4">
                    <ExecutionStats statuses={statuses} timings={timings} isExecuting={isExecuting} predictions={predictions} />
                  </div>
                )}

                {/* Learnings indicator */}
                {plan.learnings && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 text-sm text-purple-700">
                      <Brain className="w-4 h-4" />
                      <span className="font-medium">AI learned from {plan.learnings.appliedFrom} previous executions</span>
                    </div>
                    {plan.learnings.corrections.length > 0 && (
                      <div className="mt-2 text-xs text-purple-600">
                        Applied corrections: {plan.learnings.corrections.join('; ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Subtask Tree */}
                <div className="space-y-3">
                  {plan.subtasks.map((subtask, idx) => (
                    <div key={subtask.id} className="relative">
                      {idx > 0 && (
                        <div className="absolute -top-3 left-6 w-0.5 h-3 bg-slate-200" />
                      )}
                      <SubtaskNode
                        subtask={subtask}
                        status={statuses[subtask.id]}
                        isActive={currentSubtask === subtask.id}
                        onRetry={retrySubtask}
                        onSkip={skipSubtask}
                        timing={timings[subtask.id]}
                        isLongRunning={longRunningTasks.has(subtask.id)}
                      />
                    </div>
                  ))}
                </div>

                {/* Parallel tasks indicator */}
                {plan.parallelizable.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium">
                        {plan.parallelizable.length} parallel execution groups detected
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Execution Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto text-sm font-mono">
              {executionLog.map((log, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-2 rounded flex items-center justify-between ${
                    log.type === 'error' ? 'bg-red-50 text-red-700' :
                    log.type === 'complete' ? 'bg-emerald-50 text-emerald-700' :
                    log.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                    log.type === 'adjustment' ? 'bg-purple-50 text-purple-700' :
                    'bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-xs opacity-60">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {' '}
                    {log.type === 'start' && `▶ Starting: ${log.subtaskId}`}
                    {log.type === 'complete' && `✓ Completed: ${log.subtaskId}`}
                    {log.type === 'error' && `✗ Failed: ${log.subtaskId} - ${log.error}`}
                    {log.type === 'warning' && `⚠ ${log.message}`}
                    {log.type === 'adjustment' && `⟳ ${log.message}`}
                  </div>
                  {log.duration && (
                    <span className={`text-xs font-bold ${log.duration > 3000 ? 'text-orange-600' : ''}`}>
                      {(log.duration / 1000).toFixed(2)}s
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Panel */}
      <AnimatePresence>
        {showFeedback && executionResult && (
          <FeedbackPanel
            execution={executionResult}
            onSubmit={handleFeedbackSubmit}
            onClose={() => setShowFeedback(false)}
          />
        )}
      </AnimatePresence>

      {/* Multi-Agent Workflow Generator */}
      <AnimatePresence>
        {showMultiAgent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <MultiAgentWorkflowGenerator />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Learning Dashboard */}
      <AnimatePresence>
        {showLearningDashboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AILearningDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}