import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Play, CheckCircle, XCircle, Clock, AlertTriangle, Brain,
  Settings, RefreshCw, Target, TrendingUp, Shield, Cpu, Bot,
  ChevronRight, ChevronDown,
  Gauge, Activity, Wrench, Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Action Types
const ACTION_TYPES = {
  RESOURCE_OPTIMIZATION: 'resource_optimization',
  PROCESS_IMPROVEMENT: 'process_improvement',
  ANOMALY_REMEDIATION: 'anomaly_remediation',
  PREDICTIVE_SCALING: 'predictive_scaling',
  BOTTLENECK_RESOLUTION: 'bottleneck_resolution',
  COMPLIANCE_CHECK: 'compliance_check'
};

// Generate proactive actions based on analytics data
const generateProactiveActions = (dailyData, agentPerformance, bottlenecks, predictions) => {
  const actions = [];
  const now = Date.now();

  // Analyze recent trends
  const recentData = dailyData.slice(-7);
  const avgSuccessRate = recentData.reduce((s, d) => s + d.successRate, 0) / 7;
  const avgEfficiency = recentData.reduce((s, d) => s + d.efficiency, 0) / 7;
  const avgTime = recentData.reduce((s, d) => s + d.avgTime, 0) / 7;

  // Resource Optimization Actions
  agentPerformance.forEach(agent => {
    if (agent.efficiency < 70) {
      actions.push({
        id: `opt-${agent.id}-${now}`,
        type: ACTION_TYPES.RESOURCE_OPTIMIZATION,
        title: `Optimize ${agent.name} Resources`,
        titleAr: `تحسين موارد ${agent.name}`,
        description: `Agent efficiency at ${agent.efficiency.toFixed(1)}%. Reallocate compute resources to improve performance.`,
        impact: 'high',
        confidence: 85,
        agent: agent.id,
        agentName: agent.name,
        estimatedImprovement: '+15% efficiency',
        autoExecutable: true,
        riskLevel: 'low',
        steps: [
          { id: 1, action: 'Analyze current resource allocation', tool: 'resource.analyze' },
          { id: 2, action: 'Identify underutilized resources', tool: 'resource.find_idle' },
          { id: 3, action: 'Reallocate to high-demand agents', tool: 'resource.reallocate' },
          { id: 4, action: 'Verify performance improvement', tool: 'monitor.verify' }
        ],
        createdAt: now
      });
    }

    if (agent.avgTime > 4) {
      actions.push({
        id: `perf-${agent.id}-${now}`,
        type: ACTION_TYPES.PROCESS_IMPROVEMENT,
        title: `Reduce ${agent.name} Execution Time`,
        titleAr: `تقليل وقت تنفيذ ${agent.name}`,
        description: `Average execution time is ${agent.avgTime.toFixed(2)}s. Optimize workflow to reduce latency.`,
        impact: 'medium',
        confidence: 78,
        agent: agent.id,
        agentName: agent.name,
        estimatedImprovement: '-30% execution time',
        autoExecutable: true,
        riskLevel: 'low',
        steps: [
          { id: 1, action: 'Profile execution bottlenecks', tool: 'profiler.analyze' },
          { id: 2, action: 'Enable parallel processing', tool: 'workflow.parallelize' },
          { id: 3, action: 'Cache frequent operations', tool: 'cache.enable' },
          { id: 4, action: 'Monitor new performance', tool: 'monitor.track' }
        ],
        createdAt: now
      });
    }
  });

  // Anomaly Remediation Actions
  if (avgSuccessRate < 85) {
    actions.push({
      id: `anomaly-success-${now}`,
      type: ACTION_TYPES.ANOMALY_REMEDIATION,
      title: 'Address Success Rate Decline',
      titleAr: 'معالجة انخفاض معدل النجاح',
      description: `Success rate dropped to ${avgSuccessRate.toFixed(1)}%. Automated diagnosis and remediation recommended.`,
      impact: 'critical',
      confidence: 92,
      agent: 'system',
      agentName: 'All Agents',
      estimatedImprovement: '+10% success rate',
      autoExecutable: true,
      riskLevel: 'medium',
      steps: [
        { id: 1, action: 'Identify failing patterns', tool: 'diagnostics.pattern_analysis' },
        { id: 2, action: 'Check external dependencies', tool: 'health.check_dependencies' },
        { id: 3, action: 'Apply retry policies', tool: 'resilience.enable_retries' },
        { id: 4, action: 'Notify on-call team if critical', tool: 'alerts.escalate' }
      ],
      createdAt: now
    });
  }

  // Predictive Scaling Actions
  const execTrend = (recentData[6]?.executions - recentData[0]?.executions) / recentData[0]?.executions * 100;
  if (execTrend > 20) {
    actions.push({
      id: `scale-predict-${now}`,
      type: ACTION_TYPES.PREDICTIVE_SCALING,
      title: 'Scale Resources for Predicted Demand',
      titleAr: 'توسيع الموارد للطلب المتوقع',
      description: `Execution volume increasing by ${execTrend.toFixed(0)}%. Pre-scale infrastructure to handle load.`,
      impact: 'high',
      confidence: 88,
      agent: 'system',
      agentName: 'Infrastructure',
      estimatedImprovement: 'Prevent performance degradation',
      autoExecutable: true,
      riskLevel: 'low',
      steps: [
        { id: 1, action: 'Calculate required capacity', tool: 'capacity.forecast' },
        { id: 2, action: 'Provision additional resources', tool: 'infra.scale_up' },
        { id: 3, action: 'Configure load balancing', tool: 'lb.rebalance' },
        { id: 4, action: 'Set auto-scale policies', tool: 'autoscale.configure' }
      ],
      createdAt: now
    });
  }

  // Bottleneck Resolution Actions
  bottlenecks.forEach(bottleneck => {
    if (bottleneck.impact === 'high' || bottleneck.frequency > 30) {
      actions.push({
        id: `bottleneck-${bottleneck.id}-${now}`,
        type: ACTION_TYPES.BOTTLENECK_RESOLUTION,
        title: `Resolve ${bottleneck.name}`,
        titleAr: `حل مشكلة ${bottleneck.name}`,
        description: `Bottleneck occurring ${bottleneck.frequency} times with ${bottleneck.avgDelay.toFixed(1)}s average delay.`,
        impact: bottleneck.impact,
        confidence: 82,
        agent: bottleneck.affectedAgents[0] || 'system',
        agentName: bottleneck.affectedAgents.join(', '),
        estimatedImprovement: `-${(bottleneck.avgDelay * 0.7).toFixed(1)}s delay`,
        autoExecutable: bottleneck.impact !== 'high',
        riskLevel: bottleneck.impact === 'high' ? 'medium' : 'low',
        steps: [
          { id: 1, action: 'Analyze bottleneck root cause', tool: 'analysis.root_cause' },
          { id: 2, action: 'Implement optimization', tool: `fix.${bottleneck.id}` },
          { id: 3, action: 'Validate improvement', tool: 'test.validate' },
          { id: 4, action: 'Document resolution', tool: 'docs.update' }
        ],
        createdAt: now
      });
    }
  });

  // Compliance Check Action
  actions.push({
    id: `compliance-${now}`,
    type: ACTION_TYPES.COMPLIANCE_CHECK,
    title: 'Automated Compliance Verification',
    titleAr: 'التحقق التلقائي من الامتثال',
    description: 'Scheduled compliance check for NCA, SAMA, and ZATCA requirements.',
    impact: 'medium',
    confidence: 95,
    agent: 'grc',
    agentName: 'GRC Agent',
    estimatedImprovement: 'Maintain compliance',
    autoExecutable: true,
    riskLevel: 'low',
    steps: [
      { id: 1, action: 'Gather compliance evidence', tool: 'grc.collect_evidence' },
      { id: 2, action: 'Check against control framework', tool: 'grc.check_controls' },
      { id: 3, action: 'Generate compliance report', tool: 'grc.generate_report' },
      { id: 4, action: 'Flag non-compliant items', tool: 'grc.flag_issues' }
    ],
    createdAt: now
  });

  return actions.sort((a, b) => {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
};

function ActionCard({ action, onExecute, onSchedule, onDismiss, isExecuting }) {
  const [expanded, setExpanded] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});

  const impactStyles = {
    critical: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: 'text-red-600' },
    high: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-600' },
    medium: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-600' },
    low: { bg: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-700', icon: 'text-slate-600' }
  };

  const typeIcons = {
    [ACTION_TYPES.RESOURCE_OPTIMIZATION]: Cpu,
    [ACTION_TYPES.PROCESS_IMPROVEMENT]: TrendingUp,
    [ACTION_TYPES.ANOMALY_REMEDIATION]: Shield,
    [ACTION_TYPES.PREDICTIVE_SCALING]: Gauge,
    [ACTION_TYPES.BOTTLENECK_RESOLUTION]: Wrench,
    [ACTION_TYPES.COMPLIANCE_CHECK]: CheckCircle
  };

  const style = impactStyles[action.impact] || impactStyles.medium;
  const TypeIcon = typeIcons[action.type] || Zap;

  const handleExecute = async () => {
    for (const step of action.steps) {
      setStepStatuses(prev => ({ ...prev, [step.id]: 'running' }));
      await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
      setStepStatuses(prev => ({ ...prev, [step.id]: 'completed' }));
    }
    onExecute(action.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`rounded-xl border-2 ${style.bg} overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${style.icon}`}>
            <TypeIcon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={style.badge}>{action.impact}</Badge>
              <Badge variant="outline" className="text-xs">{action.confidence}% confidence</Badge>
              {action.autoExecutable && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Auto-executable</Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-900">{action.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{action.description}</p>
            
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" /> {action.agentName}
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" /> {action.estimatedImprovement}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {action.riskLevel} risk
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isExecuting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              {isExecuting ? 'Running' : 'Execute'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSchedule(action.id)}>
              <Clock className="w-4 h-4 mr-1" /> Schedule
            </Button>
          </div>
        </div>

        {/* Expandable Steps */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-4 text-sm text-slate-600 hover:text-slate-900"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          View {action.steps.length} execution steps
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {action.steps.map((step, idx) => {
                const status = stepStatuses[step.id];
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      status === 'completed' ? 'bg-emerald-100' :
                      status === 'running' ? 'bg-blue-100' :
                      'bg-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      status === 'completed' ? 'bg-emerald-500 text-white' :
                      status === 'running' ? 'bg-blue-500 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                       status === 'running' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                       idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-700">{step.action}</div>
                      <code className="text-xs text-slate-500">{step.tool}</code>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AutomationSettings({ settings, onUpdate }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          Automation Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Enable Proactive Actions</div>
            <div className="text-xs text-slate-500">Allow AI to suggest and execute optimizations</div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => onUpdate({ ...settings, enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Auto-Execute Low Risk</div>
            <div className="text-xs text-slate-500">Automatically run low-risk optimizations</div>
          </div>
          <Switch
            checked={settings.autoExecuteLowRisk}
            onCheckedChange={(checked) => onUpdate({ ...settings, autoExecuteLowRisk: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-700">Require Approval for High Impact</div>
            <div className="text-xs text-slate-500">Manual approval for critical actions</div>
          </div>
          <Switch
            checked={settings.requireApprovalHighImpact}
            onCheckedChange={(checked) => onUpdate({ ...settings, requireApprovalHighImpact: checked })}
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Confidence Threshold</span>
            <span className="text-sm font-medium">{settings.confidenceThreshold}%</span>
          </div>
          <Slider
            value={[settings.confidenceThreshold]}
            onValueChange={([value]) => onUpdate({ ...settings, confidenceThreshold: value })}
            min={50}
            max={95}
            step={5}
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>More Actions</span>
            <span>Higher Certainty</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Action Frequency</label>
          <Select
            value={settings.frequency}
            onValueChange={(value) => onUpdate({ ...settings, frequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutionHistory({ history }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Recent Executions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No actions executed yet
            </div>
          ) : (
            history.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-3 rounded-lg border ${
                  item.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                  item.status === 'failed' ? 'bg-red-50 border-red-200' :
                  'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : item.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="text-sm font-medium text-slate-700">{item.title}</span>
                  </div>
                  <span className="text-xs text-slate-500">{item.timestamp}</span>
                </div>
                {item.result && (
                  <p className="text-xs text-slate-600 mt-1 ml-6">{item.result}</p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProactiveActionsPanel({ dailyData, agentPerformance, bottlenecks }) {
  const [settings, setSettings] = useState({
    enabled: true,
    autoExecuteLowRisk: false,
    requireApprovalHighImpact: true,
    confidenceThreshold: 75,
    frequency: 'hourly'
  });
  const [executingActions, setExecutingActions] = useState(new Set());
  const [completedActions, setCompletedActions] = useState([]);
  const [filter, setFilter] = useState('all');

  // Generate actions based on analytics
  const actions = useMemo(() => {
    return generateProactiveActions(dailyData, agentPerformance, bottlenecks, {})
      .filter(a => a.confidence >= settings.confidenceThreshold);
  }, [dailyData, agentPerformance, bottlenecks, settings.confidenceThreshold]);

  const filteredActions = useMemo(() => {
    if (filter === 'all') return actions;
    return actions.filter(a => a.type === filter);
  }, [actions, filter]);

  const handleExecute = (actionId) => {
    const action = actions.find(a => a.id === actionId);
    setExecutingActions(prev => new Set([...prev].filter(id => id !== actionId)));
    setCompletedActions(prev => [{
      id: actionId,
      title: action.title,
      status: 'success',
      result: action.estimatedImprovement,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 10));
  };

  const handleSchedule = (actionId) => {
    // Schedule logic would go here
    console.log('Scheduling action:', actionId);
  };

  // Stats
  const stats = useMemo(() => ({
    total: actions.length,
    critical: actions.filter(a => a.impact === 'critical').length,
    autoExecutable: actions.filter(a => a.autoExecutable).length,
    executed: completedActions.length
  }), [actions, completedActions]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pending Actions', value: stats.total, icon: Lightbulb, color: 'blue' },
          { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'red' },
          { label: 'Auto-Executable', value: stats.autoExecutable, icon: Zap, color: 'amber' },
          { label: 'Executed Today', value: stats.executed, icon: CheckCircle, color: 'emerald' }
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Actions List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Filter:</span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value={ACTION_TYPES.RESOURCE_OPTIMIZATION}>Resource Optimization</SelectItem>
                  <SelectItem value={ACTION_TYPES.PROCESS_IMPROVEMENT}>Process Improvement</SelectItem>
                  <SelectItem value={ACTION_TYPES.ANOMALY_REMEDIATION}>Anomaly Remediation</SelectItem>
                  <SelectItem value={ACTION_TYPES.PREDICTIVE_SCALING}>Predictive Scaling</SelectItem>
                  <SelectItem value={ACTION_TYPES.BOTTLENECK_RESOLUTION}>Bottleneck Resolution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">{filteredActions.length} actions</Badge>
          </div>

          {/* Actions */}
          <AnimatePresence>
            {filteredActions.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No actions match your criteria</p>
                <p className="text-sm text-slate-500">Adjust confidence threshold or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActions.map(action => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onExecute={handleExecute}
                    onSchedule={handleSchedule}
                    onDismiss={() => {}}
                    isExecuting={executingActions.has(action.id)}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <AutomationSettings settings={settings} onUpdate={setSettings} />
          <ExecutionHistory history={completedActions} />
        </div>
      </div>
    </div>
  );
}