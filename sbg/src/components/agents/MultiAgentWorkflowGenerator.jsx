import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Play, Pause, CheckCircle, Settings, Beaker, RefreshCw, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

// Agent types with capabilities
const AGENT_TYPES = {
  procurement: { name: 'Procurement Agent', icon: '📦', color: 'blue', capabilities: ['vendor_search', 'rfq_create', 'po_create', 'supplier_rank'] },
  grc: { name: 'GRC Agent', icon: '🛡️', color: 'emerald', capabilities: ['evidence_collect', 'compliance_check', 'gap_analysis', 'remediation'] },
  finance: { name: 'Finance Agent', icon: '💰', color: 'amber', capabilities: ['ledger_access', 'reconciliation', 'period_close', 'reporting'] },
  hr: { name: 'HR Agent', icon: '👥', color: 'purple', capabilities: ['candidate_screen', 'offer_create', 'onboarding', 'nitaqat_check'] },
  logistics: { name: 'Logistics Agent', icon: '🚚', color: 'sky', capabilities: ['shipment_track', 'route_optimize', 'inventory_check', 'delivery_schedule'] },
  service: { name: 'Service Desk Agent', icon: '🔧', color: 'rose', capabilities: ['ticket_classify', 'auto_resolve', 'escalation', 'knowledge_search'] }
};

// Goal to workflow mapping engine
function generateWorkflow(goal) {
  const goalLower = goal.toLowerCase();
  const workflow = {
    id: `wf-${Date.now()}`,
    goal,
    agents: [],
    stages: [],
    dependencies: [],
    estimatedTime: 0,
    complexity: 'medium',
    simulationParams: {}
  };

  // Analyze goal and determine required agents
  if (goalLower.includes('procure') || goalLower.includes('purchase') || goalLower.includes('vendor') || goalLower.includes('شراء') || goalLower.includes('مورد')) {
    workflow.agents.push('procurement');
    workflow.stages.push(
      { id: 's1', agent: 'procurement', action: 'Extract Requirements', tool: 'mind.extract', duration: 2 },
      { id: 's2', agent: 'procurement', action: 'Search Vendors', tool: 'vendor_search', duration: 3 },
      { id: 's3', agent: 'procurement', action: 'Create RFQ', tool: 'rfq_create', duration: 2 }
    );
  }

  if (goalLower.includes('compliance') || goalLower.includes('audit') || goalLower.includes('regulation') || goalLower.includes('امتثال')) {
    workflow.agents.push('grc');
    const startIdx = workflow.stages.length;
    workflow.stages.push(
      { id: `s${startIdx + 1}`, agent: 'grc', action: 'Collect Evidence', tool: 'evidence_collect', duration: 4 },
      { id: `s${startIdx + 2}`, agent: 'grc', action: 'Run Compliance Check', tool: 'compliance_check', duration: 3 },
      { id: `s${startIdx + 3}`, agent: 'grc', action: 'Generate Report', tool: 'report_generate', duration: 2 }
    );
  }

  if (goalLower.includes('finance') || goalLower.includes('payment') || goalLower.includes('budget') || goalLower.includes('مالي')) {
    workflow.agents.push('finance');
    const startIdx = workflow.stages.length;
    workflow.stages.push(
      { id: `s${startIdx + 1}`, agent: 'finance', action: 'Verify Budget', tool: 'budget_check', duration: 2 },
      { id: `s${startIdx + 2}`, agent: 'finance', action: 'Process Payment', tool: 'payment_process', duration: 3 }
    );
  }

  if (goalLower.includes('hire') || goalLower.includes('employee') || goalLower.includes('onboard') || goalLower.includes('توظيف')) {
    workflow.agents.push('hr');
    const startIdx = workflow.stages.length;
    workflow.stages.push(
      { id: `s${startIdx + 1}`, agent: 'hr', action: 'Screen Candidates', tool: 'candidate_screen', duration: 4 },
      { id: `s${startIdx + 2}`, agent: 'hr', action: 'Nitaqat Verification', tool: 'nitaqat_check', duration: 2 },
      { id: `s${startIdx + 3}`, agent: 'hr', action: 'Create Offer', tool: 'offer_create', duration: 2 }
    );
  }

  if (goalLower.includes('ship') || goalLower.includes('deliver') || goalLower.includes('logistics') || goalLower.includes('شحن')) {
    workflow.agents.push('logistics');
    const startIdx = workflow.stages.length;
    workflow.stages.push(
      { id: `s${startIdx + 1}`, agent: 'logistics', action: 'Check Inventory', tool: 'inventory_check', duration: 2 },
      { id: `s${startIdx + 2}`, agent: 'logistics', action: 'Optimize Route', tool: 'route_optimize', duration: 3 },
      { id: `s${startIdx + 3}`, agent: 'logistics', action: 'Schedule Delivery', tool: 'delivery_schedule', duration: 2 }
    );
  }

  // Default workflow if no specific match
  if (workflow.stages.length === 0) {
    workflow.agents.push('service');
    workflow.stages.push(
      { id: 's1', agent: 'service', action: 'Analyze Request', tool: 'request_analyze', duration: 2 },
      { id: 's2', agent: 'service', action: 'Execute Task', tool: 'task_execute', duration: 4 },
      { id: 's3', agent: 'service', action: 'Verify Completion', tool: 'verify_complete', duration: 2 }
    );
  }

  // Generate dependencies
  for (let i = 1; i < workflow.stages.length; i++) {
    workflow.dependencies.push({
      from: workflow.stages[i - 1].id,
      to: workflow.stages[i].id,
      type: 'sequential'
    });
  }

  // Calculate totals
  workflow.estimatedTime = workflow.stages.reduce((sum, s) => sum + s.duration, 0);
  workflow.complexity = workflow.agents.length > 2 ? 'high' : workflow.agents.length > 1 ? 'medium' : 'low';

  // Simulation parameters
  workflow.simulationParams = {
    resourceAvailability: 60,
    taskComplexity: workflow.complexity === 'high' ? 70 : workflow.complexity === 'medium' ? 50 : 30,
    externalDependencyRisk: workflow.agents.length * 15,
    parallelExecution: workflow.agents.length > 1,
    approvalDelay: 25,
    teamExperience: 65
  };

  return workflow;
}

function AgentBadge({ agentType }) {
  const agent = AGENT_TYPES[agentType];
  if (!agent) return null;

  const colors = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <Badge className={`${colors[agent.color]} border`}>
      <span className="mr-1">{agent.icon}</span>
      {agent.name}
    </Badge>
  );
}

function WorkflowStage({ stage, index, status, isActive }) {
  const agent = AGENT_TYPES[stage.agent];
  
  const statusStyles = {
    pending: 'border-slate-200 bg-slate-50',
    running: 'border-blue-300 bg-blue-50 ring-2 ring-blue-200',
    completed: 'border-emerald-300 bg-emerald-50',
    failed: 'border-red-300 bg-red-50'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-4 rounded-xl border-2 ${statusStyles[status]} transition-all`}
    >
      {status === 'running' && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-xl"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: stage.duration, ease: 'linear' }}
        />
      )}
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
            status === 'completed' ? 'bg-emerald-200' : 
            status === 'running' ? 'bg-blue-200' : 'bg-slate-200'
          }`}>
            {status === 'completed' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : agent?.icon}
          </div>
          <div>
            <div className="font-medium text-slate-900">{stage.action}</div>
            <div className="text-xs text-slate-500">{stage.tool} • {stage.duration}s</div>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{stage.agent}</Badge>
      </div>
    </motion.div>
  );
}

function WorkflowVisualization({ workflow, stageStatuses, currentStage }) {
  return (
    <div className="space-y-3">
      {workflow.stages.map((stage, idx) => (
        <div key={stage.id} className="relative">
          {idx > 0 && (
            <div className="absolute -top-3 left-4 w-0.5 h-3 bg-slate-300" />
          )}
          <WorkflowStage
            stage={stage}
            index={idx}
            status={stageStatuses[stage.id] || 'pending'}
            isActive={currentStage === stage.id}
          />
        </div>
      ))}
    </div>
  );
}

function SimulationPreview({ params, onOpenSimulator }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-cyan-600" />
          <span className="font-semibold text-slate-900">Simulation Parameters</span>
        </div>
        <Button size="sm" variant="outline" onClick={onOpenSimulator}>
          <Settings className="w-3 h-3 mr-1" />
          Open Simulator
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-slate-500">Resources</div>
          <div className="font-semibold">{params.resourceAvailability}%</div>
        </div>
        <div>
          <div className="text-slate-500">Complexity</div>
          <div className="font-semibold">{params.taskComplexity}%</div>
        </div>
        <div>
          <div className="text-slate-500">Risk</div>
          <div className="font-semibold">{params.externalDependencyRisk}%</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MultiAgentWorkflowGenerator({ onSimulate }) {
  const [goal, setGoal] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [stageStatuses, setStageStatuses] = useState({});
  const [currentStage, setCurrentStage] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);

  const handleGenerate = useCallback(() => {
    if (!goal.trim()) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      const newWorkflow = generateWorkflow(goal);
      setWorkflow(newWorkflow);
      setStageStatuses(Object.fromEntries(newWorkflow.stages.map(s => [s.id, 'pending'])));
      setExecutionLog([]);
      setIsGenerating(false);
    }, 800);
  }, [goal]);

  const handleExecute = useCallback(async () => {
    if (!workflow) return;
    
    setIsExecuting(true);
    setExecutionLog([{ type: 'start', message: 'Starting multi-agent workflow execution', timestamp: Date.now() }]);

    for (const stage of workflow.stages) {
      setCurrentStage(stage.id);
      setStageStatuses(prev => ({ ...prev, [stage.id]: 'running' }));
      setExecutionLog(prev => [...prev, { 
        type: 'agent', 
        agent: stage.agent,
        message: `${AGENT_TYPES[stage.agent]?.name} executing: ${stage.action}`,
        timestamp: Date.now()
      }]);

      await new Promise(resolve => setTimeout(resolve, stage.duration * 300));

      const success = Math.random() > 0.1;
      setStageStatuses(prev => ({ ...prev, [stage.id]: success ? 'completed' : 'failed' }));
      
      if (!success) {
        setExecutionLog(prev => [...prev, { 
          type: 'error',
          message: `Stage ${stage.action} failed - attempting recovery`,
          timestamp: Date.now()
        }]);
      }
    }

    setCurrentStage(null);
    setIsExecuting(false);
    setExecutionLog(prev => [...prev, { type: 'complete', message: 'Workflow execution completed', timestamp: Date.now() }]);
  }, [workflow]);

  const handleOpenSimulator = () => {
    if (onSimulate && workflow) {
      onSimulate(workflow.simulationParams);
    }
  };

  const completedStages = Object.values(stageStatuses).filter(s => s === 'completed').length;
  const totalStages = workflow?.stages.length || 0;
  const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Multi-Agent Workflow Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Input */}
        <div className="space-y-3">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe your high-level objective...

Example: Procure 50 laptops with compliance check and budget approval
مثال: شراء 50 جهاز كمبيوتر مع فحص الامتثال وموافقة الميزانية"
            className="h-20"
            dir="auto"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={!goal.trim() || isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Workflow'}
            </Button>
            {workflow && (
              <Button
                onClick={handleExecute}
                disabled={isExecuting}
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                {isExecuting ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            )}
          </div>
        </div>

        {/* Generated Workflow */}
        <AnimatePresence>
          {workflow && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Workflow Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-900">Workflow Summary</span>
                  <Badge className={`${
                    workflow.complexity === 'high' ? 'bg-red-100 text-red-700' :
                    workflow.complexity === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {workflow.complexity} complexity
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <div className="text-slate-500">Agents</div>
                    <div className="font-semibold">{workflow.agents.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Stages</div>
                    <div className="font-semibold">{workflow.stages.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Est. Time</div>
                    <div className="font-semibold">{workflow.estimatedTime}s</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workflow.agents.map(agent => (
                    <AgentBadge key={agent} agentType={agent} />
                  ))}
                </div>
              </div>

              {/* Progress */}
              {isExecuting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Execution Progress</span>
                    <span className="font-medium">{completedStages}/{totalStages}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Workflow Stages */}
              <WorkflowVisualization
                workflow={workflow}
                stageStatuses={stageStatuses}
                currentStage={currentStage}
              />

              {/* Simulation Preview */}
              <SimulationPreview
                params={workflow.simulationParams}
                onOpenSimulator={handleOpenSimulator}
              />

              {/* Execution Log */}
              {executionLog.length > 0 && (
                <div className="p-3 bg-slate-900 rounded-xl max-h-32 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {executionLog.map((log, idx) => (
                      <div key={idx} className={`${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'complete' ? 'text-emerald-400' :
                        log.type === 'agent' ? 'text-blue-400' :
                        'text-slate-400'
                      }`}>
                        <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}