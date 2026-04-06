import React from 'react';
import { Plus, Trash2, GitBranch, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

const STEP_TYPES = [
  { id: 'action', label: 'Action', color: 'bg-blue-500' },
  { id: 'condition', label: 'Condition', color: 'bg-amber-500' },
  { id: 'approval', label: 'Approval Gate', color: 'bg-purple-500' },
  { id: 'notification', label: 'Notification', color: 'bg-emerald-500' },
  { id: 'integration', label: 'External Integration', color: 'bg-indigo-500' },
  { id: 'delay', label: 'Wait/Delay', color: 'bg-slate-500' },
];

const STEP_ACTIONS = {
  procurement: ['Create RFQ', 'Send to Vendors', 'Rank Bids', 'Generate PO', 'Update ERP'],
  grc: ['Run Compliance Check', 'Generate Report', 'Flag Violation', 'Request Evidence', 'Update Risk Score'],
  financial: ['Pull Transactions', 'Reconcile Accounts', 'Generate Journal Entry', 'Close Period', 'Generate Reports'],
  hr: ['Post Job', 'Screen Applicants', 'Check Nitaqat', 'Generate Offer', 'Onboard Employee'],
  robotics: ['Check Inventory', 'Trigger Reorder', 'Update WMS', 'Schedule Maintenance', 'Generate Alert'],
  service_desk: ['Parse Ticket', 'Classify Issue', 'Route to Team', 'Auto-Resolve', 'Escalate'],
};

export default function WorkflowEditor({ workflows, onChange, agentType }) {
  const actions = STEP_ACTIONS[agentType] || STEP_ACTIONS.procurement;

  const addWorkflow = () => {
    onChange([...workflows, {
      id: Date.now().toString(),
      name: `Workflow ${workflows.length + 1}`,
      description: '',
      is_active: true,
      trigger: 'manual',
      steps: []
    }]);
  };

  const updateWorkflow = (wfId, updates) => {
    onChange(workflows.map(w => w.id === wfId ? { ...w, ...updates } : w));
  };

  const deleteWorkflow = (wfId) => {
    onChange(workflows.filter(w => w.id !== wfId));
  };

  const addStep = (wfId) => {
    const wf = workflows.find(w => w.id === wfId);
    updateWorkflow(wfId, {
      steps: [...wf.steps, {
        id: Date.now().toString(),
        type: 'action',
        name: actions[0],
        config: {}
      }]
    });
  };

  const updateStep = (wfId, stepId, updates) => {
    const wf = workflows.find(w => w.id === wfId);
    updateWorkflow(wfId, {
      steps: wf.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    });
  };

  const deleteStep = (wfId, stepId) => {
    const wf = workflows.find(w => w.id === wfId);
    updateWorkflow(wfId, {
      steps: wf.steps.filter(s => s.id !== stepId)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Custom Workflows</h3>
          <p className="text-sm text-slate-500">Define step-by-step automation sequences</p>
        </div>
        <Button onClick={addWorkflow} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" /> Add Workflow
        </Button>
      </div>

      <AnimatePresence>
        {workflows.map((workflow) => (
          <motion.div
            key={workflow.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <GitBranch className="w-5 h-5 text-emerald-600" />
                  <Input
                    value={workflow.name}
                    onChange={(e) => updateWorkflow(workflow.id, { name: e.target.value })}
                    className="flex-1 font-medium"
                    placeholder="Workflow name"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Active</span>
                    <Switch 
                      checked={workflow.is_active} 
                      onCheckedChange={(v) => updateWorkflow(workflow.id, { is_active: v })} 
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteWorkflow(workflow.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500">Trigger</label>
                  <Select value={workflow.trigger} onValueChange={(v) => updateWorkflow(workflow.id, { trigger: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Trigger</SelectItem>
                      <SelectItem value="schedule">Scheduled</SelectItem>
                      <SelectItem value="event">On Event</SelectItem>
                      <SelectItem value="condition">When Condition Met</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">Steps</p>
                  {workflow.steps.map((step, index) => {
                    const stepType = STEP_TYPES.find(t => t.id === step.type);
                    return (
                      <div key={step.id}>
                        {index > 0 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                          <div className={`w-2 h-8 ${stepType?.color} rounded-full`} />
                          <span className="text-xs font-medium text-slate-500 w-16">{index + 1}.</span>
                          <Select value={step.type} onValueChange={(v) => updateStep(workflow.id, step.id, { type: v })}>
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STEP_TYPES.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {step.type === 'action' && (
                            <Select value={step.name} onValueChange={(v) => updateStep(workflow.id, step.id, { name: v })}>
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {actions.map(a => (
                                  <SelectItem key={a} value={a}>{a}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          
                          {step.type === 'approval' && (
                            <Input
                              value={step.config?.approver || ''}
                              onChange={(e) => updateStep(workflow.id, step.id, { config: { ...step.config, approver: e.target.value } })}
                              placeholder="Approver email"
                              className="flex-1"
                            />
                          )}
                          
                          {step.type === 'notification' && (
                            <Input
                              value={step.config?.recipient || ''}
                              onChange={(e) => updateStep(workflow.id, step.id, { config: { ...step.config, recipient: e.target.value } })}
                              placeholder="Recipient email"
                              className="flex-1"
                            />
                          )}
                          
                          {step.type === 'delay' && (
                            <Input
                              type="number"
                              value={step.config?.hours || 1}
                              onChange={(e) => updateStep(workflow.id, step.id, { config: { ...step.config, hours: parseInt(e.target.value) } })}
                              placeholder="Hours"
                              className="w-24"
                            />
                          )}
                          
                          {step.type === 'condition' && (
                            <Input
                              value={step.config?.condition || ''}
                              onChange={(e) => updateStep(workflow.id, step.id, { config: { ...step.config, condition: e.target.value } })}
                              placeholder="e.g., amount > 50000"
                              className="flex-1"
                            />
                          )}

                          <Button variant="ghost" size="sm" onClick={() => deleteStep(workflow.id, step.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <Button variant="outline" size="sm" onClick={() => addStep(workflow.id)} className="w-full mt-2">
                    <Plus className="w-3 h-3 mr-1" /> Add Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {workflows.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-slate-500">
            <GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No custom workflows defined. Click "Add Workflow" to create one.
          </CardContent>
        </Card>
      )}
    </div>
  );
}