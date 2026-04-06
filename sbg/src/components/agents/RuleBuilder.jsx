import React from 'react';
import { Plus, Trash2, GripVertical, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

const CONDITIONS = {
  procurement: [
    { id: 'amount_greater', label: 'Amount greater than', type: 'number' },
    { id: 'amount_less', label: 'Amount less than', type: 'number' },
    { id: 'vendor_is', label: 'Vendor is', type: 'text' },
    { id: 'category_is', label: 'Category is', type: 'text' },
    { id: 'urgency_is', label: 'Urgency level is', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  ],
  grc: [
    { id: 'risk_score_above', label: 'Risk score above', type: 'number' },
    { id: 'compliance_type', label: 'Compliance type is', type: 'select', options: ['NCA', 'SAMA', 'ZATCA', 'Nitaqat'] },
    { id: 'violation_count', label: 'Violation count above', type: 'number' },
  ],
  financial: [
    { id: 'transaction_amount', label: 'Transaction amount above', type: 'number' },
    { id: 'account_type', label: 'Account type is', type: 'text' },
    { id: 'variance_percent', label: 'Variance percentage above', type: 'number' },
  ],
  hr: [
    { id: 'employee_count', label: 'Employee count above', type: 'number' },
    { id: 'department_is', label: 'Department is', type: 'text' },
    { id: 'nationality_quota', label: 'Nationality quota below', type: 'number' },
  ],
  robotics: [
    { id: 'inventory_below', label: 'Inventory level below', type: 'number' },
    { id: 'machine_status', label: 'Machine status is', type: 'select', options: ['online', 'offline', 'maintenance', 'error'] },
  ],
  service_desk: [
    { id: 'keyword_contains', label: 'Keyword contains', type: 'text' },
    { id: 'priority_is', label: 'Priority is', type: 'select', options: ['P1', 'P2', 'P3', 'P4'] },
    { id: 'wait_time_above', label: 'Wait time above (hours)', type: 'number' },
  ],
};

const ACTIONS = [
  { id: 'escalate_to', label: 'Escalate to', type: 'text', placeholder: 'Email address' },
  { id: 'notify', label: 'Send notification to', type: 'text', placeholder: 'Email address' },
  { id: 'require_approval', label: 'Require approval from', type: 'text', placeholder: 'Approver email' },
  { id: 'block', label: 'Block and alert', type: 'none' },
  { id: 'auto_approve', label: 'Auto-approve', type: 'none' },
  { id: 'add_tag', label: 'Add tag', type: 'text', placeholder: 'Tag name' },
];

export default function RuleBuilder({ rules, onChange, agentType }) {
  const conditions = CONDITIONS[agentType] || CONDITIONS.procurement;

  const addRule = () => {
    onChange([...rules, {
      id: Date.now().toString(),
      name: `Rule ${rules.length + 1}`,
      conditions: [{ id: Date.now().toString(), type: conditions[0].id, value: '' }],
      actions: [{ id: Date.now().toString(), type: 'notify', value: '' }],
      is_active: true
    }]);
  };

  const updateRule = (ruleId, updates) => {
    onChange(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const deleteRule = (ruleId) => {
    onChange(rules.filter(r => r.id !== ruleId));
  };

  const addCondition = (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    updateRule(ruleId, {
      conditions: [...rule.conditions, { id: Date.now().toString(), type: conditions[0].id, value: '' }]
    });
  };

  const updateCondition = (ruleId, conditionId, updates) => {
    const rule = rules.find(r => r.id === ruleId);
    updateRule(ruleId, {
      conditions: rule.conditions.map(c => c.id === conditionId ? { ...c, ...updates } : c)
    });
  };

  const deleteCondition = (ruleId, conditionId) => {
    const rule = rules.find(r => r.id === ruleId);
    updateRule(ruleId, {
      conditions: rule.conditions.filter(c => c.id !== conditionId)
    });
  };

  const addAction = (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    updateRule(ruleId, {
      actions: [...rule.actions, { id: Date.now().toString(), type: 'notify', value: '' }]
    });
  };

  const updateAction = (ruleId, actionId, updates) => {
    const rule = rules.find(r => r.id === ruleId);
    updateRule(ruleId, {
      actions: rule.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
    });
  };

  const deleteAction = (ruleId, actionId) => {
    const rule = rules.find(r => r.id === ruleId);
    updateRule(ruleId, {
      actions: rule.actions.filter(a => a.id !== actionId)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Custom Rules</h3>
          <p className="text-sm text-slate-500">Define conditions and actions for automated handling</p>
        </div>
        <Button onClick={addRule} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <AnimatePresence>
        {rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Input
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                    className="flex-1 font-medium"
                    placeholder="Rule name"
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>

                {/* Conditions */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">IF (Conditions)</p>
                  <div className="space-y-2 pl-4 border-l-2 border-amber-300">
                    {rule.conditions.map((condition, ci) => {
                      const condDef = conditions.find(c => c.id === condition.type);
                      return (
                        <div key={condition.id} className="flex items-center gap-2">
                          {ci > 0 && <span className="text-xs text-slate-400">AND</span>}
                          <Select value={condition.type} onValueChange={(v) => updateCondition(rule.id, condition.id, { type: v })}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {conditions.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {condDef?.type === 'select' ? (
                            <Select value={condition.value} onValueChange={(v) => updateCondition(rule.id, condition.id, { value: v })}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {condDef.options.map(o => (
                                  <SelectItem key={o} value={o}>{o}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={condDef?.type || 'text'}
                              value={condition.value}
                              onChange={(e) => updateCondition(rule.id, condition.id, { value: e.target.value })}
                              className="w-32"
                              placeholder="Value"
                            />
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteCondition(rule.id, condition.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button variant="ghost" size="sm" onClick={() => addCondition(rule.id)} className="text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Condition
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">THEN (Actions)</p>
                  <div className="space-y-2 pl-4 border-l-2 border-emerald-300">
                    {rule.actions.map((action) => {
                      const actionDef = ACTIONS.find(a => a.id === action.type);
                      return (
                        <div key={action.id} className="flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-emerald-500" />
                          <Select value={action.type} onValueChange={(v) => updateAction(rule.id, action.id, { type: v })}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTIONS.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {actionDef?.type === 'text' && (
                            <Input
                              value={action.value}
                              onChange={(e) => updateAction(rule.id, action.id, { value: e.target.value })}
                              className="w-48"
                              placeholder={actionDef.placeholder}
                            />
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteAction(rule.id, action.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button variant="ghost" size="sm" onClick={() => addAction(rule.id)} className="text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Action
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {rules.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No custom rules defined. Click "Add Rule" to create one.
          </CardContent>
        </Card>
      )}
    </div>
  );
}