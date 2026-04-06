import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow, Plus, Pencil, Trash2, Play, Pause, ChevronDown, ChevronUp,
  Zap, Bell, ArrowRight, CheckCircle, XCircle, AlertTriangle, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import PublicHeader from '@/components/shared/PublicHeader';
import { hasPermission, PERMISSIONS } from '@/components/approval/RolePermissions';

const triggerTypes = {
  on_create: { label: 'عند إنشاء الطلب', icon: Plus, color: 'blue' },
  on_approve: { label: 'عند الموافقة', icon: CheckCircle, color: 'green' },
  on_reject: { label: 'عند الرفض', icon: XCircle, color: 'red' },
  on_escalate: { label: 'عند التصعيد', icon: AlertTriangle, color: 'amber' },
  on_amount_threshold: { label: 'حد المبلغ', icon: Zap, color: 'purple' },
};

const actionTypes = {
  assign_gate: { label: 'تعيين بوابة', icon: ArrowRight },
  add_approver: { label: 'إضافة موافق', icon: Plus },
  send_notification: { label: 'إرسال إشعار', icon: Bell },
  escalate: { label: 'تصعيد', icon: AlertTriangle },
  auto_approve: { label: 'موافقة تلقائية', icon: CheckCircle },
  auto_reject: { label: 'رفض تلقائي', icon: XCircle },
};

const operationTypes = [
  { value: 'purchase_order', label: 'أوامر الشراء' },
  { value: 'job_offer', label: 'عروض العمل' },
  { value: 'financial_close', label: 'الإقفال المالي' },
  { value: 'compliance_report', label: 'تقارير الامتثال' },
  { value: 'vendor_approval', label: 'اعتماد الموردين' },
  { value: 'budget_request', label: 'طلبات الميزانية' },
  { value: 'contract_signing', label: 'توقيع العقود' },
];

function RuleCard({ rule, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const trigger = triggerTypes[rule.trigger_type] || {};
  const TriggerIcon = trigger.icon || Zap;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border ${rule.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'} shadow-sm overflow-hidden`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 bg-${trigger.color}-100 rounded-lg flex items-center justify-center`}>
              <TriggerIcon className={`w-5 h-5 text-${trigger.color}-600`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{rule.name}</h3>
              <p className="text-sm text-slate-500">{rule.name_en}</p>
              <Badge className="mt-2" variant="outline">{trigger.label}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={rule.is_active} onCheckedChange={() => onToggle(rule)} />
            <Button size="icon" variant="ghost" onClick={() => onEdit(rule)}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(rule.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </div>
        </div>

        {rule.description && <p className="text-sm text-slate-600 mt-3">{rule.description}</p>}

        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mt-4">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'إخفاء' : 'عرض التفاصيل'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-2">الشروط:</p>
                {rule.conditions?.operation_types?.length > 0 && (
                  <p>أنواع العمليات: {rule.conditions.operation_types.join(', ')}</p>
                )}
                {rule.conditions?.min_amount && <p>الحد الأدنى: {rule.conditions.min_amount.toLocaleString()} ر.س</p>}
                {rule.conditions?.max_amount && <p>الحد الأقصى: {rule.conditions.max_amount.toLocaleString()} ر.س</p>}
              </div>
              <div>
                <p className="text-slate-500 mb-2">الإجراءات:</p>
                {rule.actions?.map((a, i) => (
                  <Badge key={i} variant="outline" className="mr-1 mb-1">{actionTypes[a.action_type]?.label}</Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RuleFormDialog({ open, onClose, rule, onSave, gates }) {
  const [form, setForm] = useState(rule || {
    name: '', name_en: '', description: '', is_active: true, priority: 0,
    trigger_type: 'on_create',
    conditions: { operation_types: [], min_amount: null, max_amount: null },
    actions: []
  });

  useEffect(() => {
    if (rule) setForm(rule);
    else setForm({ name: '', name_en: '', description: '', is_active: true, priority: 0, trigger_type: 'on_create', conditions: { operation_types: [] }, actions: [] });
  }, [rule]);

  const addAction = () => {
    setForm({ ...form, actions: [...(form.actions || []), { action_type: 'send_notification', target_emails: [] }] });
  };

  const updateAction = (idx, updates) => {
    const actions = [...(form.actions || [])];
    actions[idx] = { ...actions[idx], ...updates };
    setForm({ ...form, actions });
  };

  const removeAction = (idx) => {
    setForm({ ...form, actions: form.actions.filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{rule ? 'تعديل قاعدة' : 'إنشاء قاعدة جديدة'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input placeholder="اسم القاعدة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="English Name" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          </div>

          <Textarea placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">المحفز</label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerTypes).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الأولوية</label>
              <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">الشروط</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <Input type="number" placeholder="الحد الأدنى للمبلغ" value={form.conditions?.min_amount || ''} onChange={(e) => setForm({ ...form, conditions: { ...form.conditions, min_amount: e.target.value ? parseFloat(e.target.value) : null } })} />
              <Input type="number" placeholder="الحد الأقصى للمبلغ" value={form.conditions?.max_amount || ''} onChange={(e) => setForm({ ...form, conditions: { ...form.conditions, max_amount: e.target.value ? parseFloat(e.target.value) : null } })} />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">الإجراءات</h4>
              <Button size="sm" variant="outline" onClick={addAction}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
            </div>
            {form.actions?.map((action, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Select value={action.action_type} onValueChange={(v) => updateAction(idx, { action_type: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(actionTypes).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {action.action_type === 'assign_gate' && (
                    <Select value={action.target_gate_id} onValueChange={(v) => updateAction(idx, { target_gate_id: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="اختر البوابة" /></SelectTrigger>
                      <SelectContent>
                        {gates?.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => removeAction(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
                {(action.action_type === 'send_notification' || action.action_type === 'add_approver') && (
                  <Input placeholder="البريد الإلكتروني (فاصلة للتعدد)" value={action.target_emails?.join(', ') || ''} onChange={(e) => updateAction(idx, { target_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => { onSave(form); onClose(); }} disabled={!form.name}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowRules() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);

  const { data: rules = [] } = useQuery({ queryKey: ['workflow-rules'], queryFn: () => base44.entities.WorkflowRule.list() });
  const { data: gates = [] } = useQuery({ queryKey: ['approval-gates'], queryFn: () => base44.entities.ApprovalGate.list() });

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.WorkflowRule.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-rules'] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.WorkflowRule.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-rules'] }) });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.WorkflowRule.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-rules'] }) });

  const handleSave = (data) => {
    if (editingRule) updateMutation.mutate({ id: editingRule.id, data });
    else createMutation.mutate(data);
    setEditingRule(null);
  };

  const canManage = user?.role === 'admin' || hasPermission(user, PERMISSIONS.CREATE_GATE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      <PublicHeader />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Workflow className="w-8 h-8 text-emerald-600" />
              قواعد سير العمل
            </h1>
            <p className="text-slate-600 mt-1">إدارة المحفزات والإجراءات التلقائية</p>
          </div>
          {canManage && (
            <Button onClick={() => { setEditingRule(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 ml-2" />قاعدة جديدة
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {rules.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد قواعد سير عمل</p>
            </CardContent></Card>
          ) : (
            rules.map(rule => (
              <RuleCard key={rule.id} rule={rule}
                onEdit={(r) => { setEditingRule(r); setShowForm(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                onToggle={(r) => updateMutation.mutate({ id: r.id, data: { is_active: !r.is_active } })}
              />
            ))
          )}
        </div>
      </div>

      <RuleFormDialog open={showForm} onClose={() => { setShowForm(false); setEditingRule(null); }} rule={editingRule} gates={gates} onSave={handleSave} />
    </div>
  );
}