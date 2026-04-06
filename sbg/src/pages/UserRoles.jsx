import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Shield, Users, Search, Pencil, Save, X, CheckCircle,
  UserCog, Lock, Unlock, Building2, Phone, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import PublicHeader from '@/components/shared/PublicHeader';
import { RoleBadge, AccessDenied } from '@/components/approval/RoleGuard';
import { 
  ROLES, PERMISSIONS, ROLE_LABELS, PERMISSION_LABELS, 
  hasPermission, getUserPermissions 
} from '@/components/approval/RolePermissions';

function UserCard({ userData, onEdit, gates }) {
  const userPermissions = getUserPermissions(userData);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {userData.full_name?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{userData.full_name || 'مستخدم'}</h3>
            <p className="text-sm text-slate-500">{userData.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <RoleBadge role={userData.approval_role || 'requester'} />
              {userData.role === 'admin' && (
                <Badge className="bg-amber-100 text-amber-700">Admin</Badge>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onEdit(userData)}>
          <Pencil className="w-4 h-4 ml-1" />
          تعديل
        </Button>
      </div>
      
      {userData.department && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Building2 className="w-4 h-4" />
          {userData.department} {userData.job_title && `- ${userData.job_title}`}
        </div>
      )}
      
      {userPermissions.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2">الصلاحيات:</p>
          <div className="flex flex-wrap gap-1">
            {userPermissions.slice(0, 5).map(p => (
              <Badge key={p} variant="outline" className="text-xs">
                {PERMISSION_LABELS[p]}
              </Badge>
            ))}
            {userPermissions.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{userPermissions.length - 5}
              </Badge>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function EditUserDialog({ open, onClose, userData, onSave, gates }) {
  const [form, setForm] = useState({
    approval_role: userData?.approval_role || 'requester',
    approval_permissions: userData?.approval_permissions || [],
    assigned_gates: userData?.assigned_gates || [],
    department: userData?.department || '',
    job_title: userData?.job_title || '',
    phone: userData?.phone || '',
  });

  useEffect(() => {
    if (userData) {
      setForm({
        approval_role: userData.approval_role || 'requester',
        approval_permissions: userData.approval_permissions || [],
        assigned_gates: userData.assigned_gates || [],
        department: userData.department || '',
        job_title: userData.job_title || '',
        phone: userData.phone || '',
      });
    }
  }, [userData]);

  const togglePermission = (permission) => {
    const current = form.approval_permissions || [];
    const updated = current.includes(permission)
      ? current.filter(p => p !== permission)
      : [...current, permission];
    setForm({ ...form, approval_permissions: updated });
  };

  const toggleGate = (gateId) => {
    const current = form.assigned_gates || [];
    const updated = current.includes(gateId)
      ? current.filter(g => g !== gateId)
      : [...current, gateId];
    setForm({ ...form, assigned_gates: updated });
  };

  const handleSave = () => {
    onSave(userData.id, form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            تعديل صلاحيات: {userData?.full_name || userData?.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* الدور الأساسي */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">الدور في نظام الموافقات</label>
            <Select value={form.approval_role} onValueChange={(v) => setForm({ ...form, approval_role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLES).map(([key, value]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {ROLE_LABELS[value].ar} ({ROLE_LABELS[value].en})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* معلومات إضافية */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">القسم</label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="مثال: المشتريات"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">المسمى الوظيفي</label>
              <Input
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                placeholder="مثال: مدير المشتريات"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">رقم الهاتف</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+966..."
            />
          </div>

          {/* الصلاحيات الإضافية */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">صلاحيات إضافية</label>
            <div className="grid md:grid-cols-2 gap-2">
              {Object.entries(PERMISSIONS).map(([key, value]) => (
                <label
                  key={value}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <Switch
                    checked={form.approval_permissions?.includes(value)}
                    onCheckedChange={() => togglePermission(value)}
                  />
                  <div>
                    <span className="text-sm text-slate-700">{PERMISSION_LABELS[value]}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* البوابات المخصصة (للموافقين) */}
          {form.approval_role === 'approver' && gates?.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-3 block">البوابات المخصصة للموافقة</label>
              <div className="space-y-2">
                {gates.map(gate => (
                  <label
                    key={gate.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <Switch
                      checked={form.assigned_gates?.includes(gate.id)}
                      onCheckedChange={() => toggleGate(gate.id)}
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">{gate.name}</span>
                      <p className="text-xs text-slate-500">{gate.name_en}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 ml-2" />
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UserRoles() {
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser
  });

  const { data: gates = [] } = useQuery({
    queryKey: ['approval-gates'],
    queryFn: () => base44.entities.ApprovalGate.list()
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  // التحقق من صلاحية إدارة المستخدمين
  const canManageUsers = currentUser?.role === 'admin' || hasPermission(currentUser, PERMISSIONS.MANAGE_USERS);

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
        <PublicHeader />
        <AccessDenied permission={PERMISSIONS.MANAGE_USERS} />
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.includes(search) || 
                         user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || user.approval_role === filterRole;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.approval_role === 'gate_admin').length,
    approvers: users.filter(u => u.approval_role === 'approver').length,
    requesters: users.filter(u => u.approval_role === 'requester' || !u.approval_role).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      <PublicHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600" />
            إدارة أدوار المستخدمين
          </h1>
          <p className="text-slate-600 mt-1">تعيين الأدوار والصلاحيات لنظام بوابات الموافقة</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  <div className="text-sm text-slate-500">إجمالي المستخدمين</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.admins}</div>
                  <div className="text-sm text-slate-500">مسؤول بوابة</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.approvers}</div>
                  <div className="text-sm text-slate-500">موافق</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.requesters}</div>
                  <div className="text-sm text-slate-500">مقدم طلب</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="pr-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="الدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأدوار</SelectItem>
              {Object.entries(ROLES).map(([key, value]) => (
                <SelectItem key={value} value={value}>{ROLE_LABELS[value].ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredUsers.map(user => (
            <UserCard
              key={user.id}
              userData={user}
              gates={gates}
              onEdit={setEditingUser}
            />
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">لا يوجد مستخدمون</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>SBG Saudi Business Gate - www.saudibusinessgate.com</p>
          <p>Powered by Dogan Consult - www.doganconsult.com</p>
        </div>
      </div>

      <EditUserDialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        userData={editingUser}
        gates={gates}
        onSave={(id, data) => updateUserMutation.mutate({ id, data })}
      />
    </div>
  );
}