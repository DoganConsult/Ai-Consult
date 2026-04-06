import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Pencil, Trash2, Users, Clock, CheckCircle, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Bell, Settings, Search,
  Package, Briefcase, BarChart3, FileText, Building2, Wallet, FileSignature
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PublicHeader from '@/components/shared/PublicHeader';
import ApprovalRulesDemo from '@/components/approval/ApprovalRulesDemo';

const operationTypes = {
  purchase_order: { label: 'أوامر الشراء', labelEn: 'Purchase Orders', icon: Package, color: 'blue' },
  job_offer: { label: 'عروض العمل', labelEn: 'Job Offers', icon: Briefcase, color: 'purple' },
  financial_close: { label: 'الإقفال المالي', labelEn: 'Financial Close', icon: BarChart3, color: 'amber' },
  compliance_report: { label: 'تقارير الامتثال', labelEn: 'Compliance Reports', icon: Shield, color: 'emerald' },
  vendor_approval: { label: 'اعتماد الموردين', labelEn: 'Vendor Approval', icon: Building2, color: 'cyan' },
  budget_request: { label: 'طلبات الميزانية', labelEn: 'Budget Requests', icon: Wallet, color: 'rose' },
  contract_signing: { label: 'توقيع العقود', labelEn: 'Contract Signing', icon: FileSignature, color: 'indigo' },
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

function GateCard({ gate, onEdit, onDelete, onToggle, pendingCount }) {
  const [expanded, setExpanded] = useState(false);
  const opType = operationTypes[gate.operation_type] || {};
  const Icon = opType.icon || Shield;
  const color = opType.color || 'blue';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border ${gate.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'} shadow-sm overflow-hidden`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{gate.name}</h3>
                {pendingCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 animate-pulse">
                    {pendingCount} بانتظار الموافقة
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500">{gate.name_en}</p>
              <Badge className={`mt-2 ${colorClasses[color]}`}>{opType.label}</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={gate.is_active}
              onCheckedChange={() => onToggle(gate)}
            />
            <Button size="icon" variant="ghost" onClick={() => onEdit(gate)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(gate.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {gate.description && (
          <p className="text-sm text-slate-600 mt-3">{gate.description}</p>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mt-4"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 bg-slate-50 px-5 py-4"
          >
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500 mb-1">الموافقون</div>
                <div className="flex flex-wrap gap-1">
                  {gate.approvers?.map((email, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">الحد الأدنى للموافقات</div>
                <span className="font-medium">{gate.min_approvals || 1}</span>
              </div>
              {gate.threshold_amount && (
                <div>
                  <div className="text-slate-500 mb-1">حد المبلغ</div>
                  <span className="font-medium">{gate.threshold_amount.toLocaleString()} ر.س</span>
                </div>
              )}
              {gate.auto_approve_below && (
                <div>
                  <div className="text-slate-500 mb-1">موافقة تلقائية أقل من</div>
                  <span className="font-medium">{gate.auto_approve_below.toLocaleString()} ر.س</span>
                </div>
              )}
              <div>
                <div className="text-slate-500 mb-1">التصعيد بعد</div>
                <span className="font-medium">{gate.escalation_hours || 24} ساعة</span>
              </div>
              {gate.escalation_to && (
                <div>
                  <div className="text-slate-500 mb-1">التصعيد إلى</div>
                  <span className="font-medium">{gate.escalation_to}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GateFormDialog({ open, onClose, gate, onSave }) {
  const [form, setForm] = useState(gate || {
    name: '',
    name_en: '',
    operation_type: 'purchase_order',
    description: '',
    approvers: [],
    min_approvals: 1,
    threshold_amount: null,
    auto_approve_below: null,
    escalation_hours: 24,
    escalation_to: '',
    is_active: true,
    require_comment: false,
  });
  const [approverInput, setApproverInput] = useState('');

  const handleAddApprover = () => {
    if (approverInput && !form.approvers?.includes(approverInput)) {
      setForm({ ...form, approvers: [...(form.approvers || []), approverInput] });
      setApproverInput('');
    }
  };

  const handleRemoveApprover = (email) => {
    setForm({ ...form, approvers: form.approvers.filter(a => a !== email) });
  };

  const handleSubmit = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{gate ? 'تعديل بوابة الموافقة' : 'إنشاء بوابة موافقة جديدة'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">الاسم بالعربي *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="موافقة أوامر الشراء"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">الاسم بالإنجليزي</label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="Purchase Order Approval"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">نوع العملية *</label>
            <Select value={form.operation_type} onValueChange={(v) => setForm({ ...form, operation_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(operationTypes).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <val.icon className="w-4 h-4" />
                      {val.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">الوصف</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="وصف بوابة الموافقة..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">الموافقون *</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={approverInput}
                onChange={(e) => setApproverInput(e.target.value)}
                placeholder="البريد الإلكتروني للموافق"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddApprover())}
              />
              <Button type="button" onClick={handleAddApprover} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.approvers?.map((email, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {email}
                  <button onClick={() => handleRemoveApprover(email)} className="hover:text-red-500">
                    <XCircle className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">الحد الأدنى للموافقات</label>
              <Input
                type="number"
                min="1"
                value={form.min_approvals}
                onChange={(e) => setForm({ ...form, min_approvals: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">ساعات قبل التصعيد</label>
              <Input
                type="number"
                min="1"
                value={form.escalation_hours}
                onChange={(e) => setForm({ ...form, escalation_hours: parseInt(e.target.value) || 24 })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">حد المبلغ (ر.س)</label>
              <Input
                type="number"
                value={form.threshold_amount || ''}
                onChange={(e) => setForm({ ...form, threshold_amount: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">موافقة تلقائية أقل من (ر.س)</label>
              <Input
                type="number"
                value={form.auto_approve_below || ''}
                onChange={(e) => setForm({ ...form, auto_approve_below: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="اختياري"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">التصعيد إلى</label>
            <Input
              value={form.escalation_to}
              onChange={(e) => setForm({ ...form, escalation_to: e.target.value })}
              placeholder="البريد الإلكتروني للتصعيد"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.require_comment}
                onCheckedChange={(v) => setForm({ ...form, require_comment: v })}
              />
              <span className="text-sm text-slate-700">يتطلب تعليق عند الرفض</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.approvers?.length}>
            {gate ? 'حفظ التعديلات' : 'إنشاء البوابة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingRequestCard({ request, onApprove, onReject }) {
  const opType = operationTypes[request.operation_type] || {};
  const Icon = opType.icon || Shield;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{request.title}</h4>
            <p className="text-sm text-slate-500">{request.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>من: {request.requester_name || request.requester_email}</span>
              {request.amount && (
                <Badge variant="outline">{request.amount.toLocaleString()} ر.س</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onReject(request.id)} className="text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="w-4 h-4 ml-1" />
            رفض
          </Button>
          <Button size="sm" onClick={() => onApprove(request.id)} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="w-4 h-4 ml-1" />
            موافقة
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ApprovalGates() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGate, setEditingGate] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: gates = [] } = useQuery({
    queryKey: ['approval-gates'],
    queryFn: () => base44.entities.ApprovalGate.list()
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: () => base44.entities.ApprovalRequest.filter({ status: 'pending' })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ApprovalGate.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-gates'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ApprovalGate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-gates'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ApprovalGate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-gates'] })
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (id) => {
      const request = requests.find(r => r.id === id);
      const newApprovals = [...(request.approvals || []), {
        email: user?.email,
        action: 'approved',
        date: new Date().toISOString()
      }];
      return base44.entities.ApprovalRequest.update(id, {
        approvals: newApprovals,
        status: 'approved'
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.ApprovalRequest.update(id, {
        status: 'rejected',
        approvals: [...(requests.find(r => r.id === id)?.approvals || []), {
          email: user?.email,
          action: 'rejected',
          date: new Date().toISOString()
        }]
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-requests'] })
  });

  const handleSave = (data) => {
    if (editingGate) {
      updateMutation.mutate({ id: editingGate.id, data });
    } else {
      createMutation.mutate(data);
    }
    setEditingGate(null);
  };

  const filteredGates = gates.filter(gate => {
    const matchesSearch = gate.name.includes(search) || gate.name_en?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || gate.operation_type === filterType;
    return matchesSearch && matchesType;
  });

  const pendingByGate = requests.reduce((acc, req) => {
    acc[req.gate_id] = (acc[req.gate_id] || 0) + 1;
    return acc;
  }, {});

  const myPendingRequests = requests.filter(req => {
    const gate = gates.find(g => g.id === req.gate_id);
    return gate?.approvers?.includes(user?.email);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      <PublicHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-emerald-600" />
              إدارة بوابات الموافقة
            </h1>
            <p className="text-slate-600 mt-1">تكوين الموافقين وقواعد التصعيد لمختلف العمليات</p>
          </div>
          <Button onClick={() => { setEditingGate(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 ml-2" />
            بوابة جديدة
          </Button>
        </div>

        {/* Pending Requests for Current User */}
        {myPendingRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-slate-900">طلبات بانتظار موافقتك ({myPendingRequests.length})</h2>
            </div>
            <div className="space-y-3">
              {myPendingRequests.map(req => (
                <PendingRequestCard
                  key={req.id}
                  request={req}
                  onApprove={(id) => approveRequestMutation.mutate(id)}
                  onReject={(id) => rejectRequestMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{gates.length}</div>
                  <div className="text-sm text-slate-500">بوابة موافقة</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{requests.length}</div>
                  <div className="text-sm text-slate-500">طلب معلق</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {new Set(gates.flatMap(g => g.approvers || [])).size}
                  </div>
                  <div className="text-sm text-slate-500">موافق نشط</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {gates.filter(g => g.is_active).length}
                  </div>
                  <div className="text-sm text-slate-500">بوابة نشطة</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="gates" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="gates">البوابات</TabsTrigger>
            <TabsTrigger value="test">اختبار القواعد</TabsTrigger>
          </TabsList>

          <TabsContent value="gates" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث في البوابات..."
                  className="pr-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="نوع العملية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {Object.entries(operationTypes).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gates List */}
            <div className="space-y-4">
              {filteredGates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بوابات موافقة</p>
                  <Button onClick={() => setShowForm(true)} variant="link" className="mt-2">
                    إنشاء بوابة جديدة
                  </Button>
                </div>
              ) : (
                filteredGates.map(gate => (
                  <GateCard
                    key={gate.id}
                    gate={gate}
                    pendingCount={pendingByGate[gate.id] || 0}
                    onEdit={(g) => { setEditingGate(g); setShowForm(true); }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onToggle={(g) => updateMutation.mutate({ id: g.id, data: { is_active: !g.is_active } })}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="test">
            <ApprovalRulesDemo />
          </TabsContent>
        </Tabs>
      </div>

      <GateFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingGate(null); }}
        gate={editingGate}
        onSave={handleSave}
      />
    </div>
  );
}