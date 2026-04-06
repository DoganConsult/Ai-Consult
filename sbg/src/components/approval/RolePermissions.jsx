/**
 * نظام الأدوار والصلاحيات لبوابات الموافقة
 * SBG Saudi Business Gate - Powered by Dogan Consult
 */

// تعريف الأدوار
export const ROLES = {
  GATE_ADMIN: 'gate_admin',      // مسؤول البوابة
  APPROVER: 'approver',          // موافق
  REQUESTER: 'requester',        // مقدم طلب
};

// تعريف الصلاحيات
export const PERMISSIONS = {
  // صلاحيات البوابات
  CREATE_GATE: 'create_gate',
  EDIT_GATE: 'edit_gate',
  DELETE_GATE: 'delete_gate',
  
  // صلاحيات الطلبات
  APPROVE_REQUESTS: 'approve_requests',
  REJECT_REQUESTS: 'reject_requests',
  ESCALATE_REQUESTS: 'escalate_requests',
  CREATE_REQUESTS: 'create_requests',
  
  // صلاحيات العرض
  VIEW_ALL_REQUESTS: 'view_all_requests',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // صلاحيات الإدارة
  MANAGE_USERS: 'manage_users',
};

// الصلاحيات الافتراضية لكل دور
export const ROLE_PERMISSIONS = {
  [ROLES.GATE_ADMIN]: [
    PERMISSIONS.CREATE_GATE,
    PERMISSIONS.EDIT_GATE,
    PERMISSIONS.DELETE_GATE,
    PERMISSIONS.APPROVE_REQUESTS,
    PERMISSIONS.REJECT_REQUESTS,
    PERMISSIONS.ESCALATE_REQUESTS,
    PERMISSIONS.CREATE_REQUESTS,
    PERMISSIONS.VIEW_ALL_REQUESTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_USERS,
  ],
  [ROLES.APPROVER]: [
    PERMISSIONS.APPROVE_REQUESTS,
    PERMISSIONS.REJECT_REQUESTS,
    PERMISSIONS.ESCALATE_REQUESTS,
    PERMISSIONS.CREATE_REQUESTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  [ROLES.REQUESTER]: [
    PERMISSIONS.CREATE_REQUESTS,
  ],
};

// أسماء الأدوار بالعربي والإنجليزي
export const ROLE_LABELS = {
  [ROLES.GATE_ADMIN]: { ar: 'مسؤول البوابة', en: 'Gate Admin' },
  [ROLES.APPROVER]: { ar: 'موافق', en: 'Approver' },
  [ROLES.REQUESTER]: { ar: 'مقدم طلب', en: 'Requester' },
};

// أسماء الصلاحيات بالعربي
export const PERMISSION_LABELS = {
  [PERMISSIONS.CREATE_GATE]: 'إنشاء بوابة',
  [PERMISSIONS.EDIT_GATE]: 'تعديل بوابة',
  [PERMISSIONS.DELETE_GATE]: 'حذف بوابة',
  [PERMISSIONS.APPROVE_REQUESTS]: 'الموافقة على الطلبات',
  [PERMISSIONS.REJECT_REQUESTS]: 'رفض الطلبات',
  [PERMISSIONS.ESCALATE_REQUESTS]: 'تصعيد الطلبات',
  [PERMISSIONS.CREATE_REQUESTS]: 'إنشاء طلبات',
  [PERMISSIONS.VIEW_ALL_REQUESTS]: 'عرض جميع الطلبات',
  [PERMISSIONS.VIEW_AUDIT_LOGS]: 'عرض سجلات التدقيق',
  [PERMISSIONS.MANAGE_USERS]: 'إدارة المستخدمين',
};

// التحقق من صلاحية المستخدم
export function hasPermission(user, permission) {
  if (!user) return false;
  
  // المستخدم admin له جميع الصلاحيات
  if (user.role === 'admin') return true;
  
  const userRole = user.approval_role || ROLES.REQUESTER;
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  const customPermissions = user.approval_permissions || [];
  
  return rolePermissions.includes(permission) || customPermissions.includes(permission);
}

// التحقق من عدة صلاحيات (أي منها)
export function hasAnyPermission(user, permissions) {
  return permissions.some(p => hasPermission(user, p));
}

// التحقق من جميع الصلاحيات
export function hasAllPermissions(user, permissions) {
  return permissions.every(p => hasPermission(user, p));
}

// الحصول على جميع صلاحيات المستخدم
export function getUserPermissions(user) {
  if (!user) return [];
  
  if (user.role === 'admin') {
    return Object.values(PERMISSIONS);
  }
  
  const userRole = user.approval_role || ROLES.REQUESTER;
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  const customPermissions = user.approval_permissions || [];
  
  return [...new Set([...rolePermissions, ...customPermissions])];
}

// التحقق من إمكانية الموافقة على طلب معين
export function canApproveRequest(user, request, gates) {
  if (!user || !request) return false;
  
  // admin يمكنه الموافقة على أي طلب
  if (user.role === 'admin') return true;
  
  // التحقق من صلاحية الموافقة
  if (!hasPermission(user, PERMISSIONS.APPROVE_REQUESTS)) return false;
  
  // التحقق من أن المستخدم ضمن الموافقين على البوابة
  const gate = gates?.find(g => g.id === request.gate_id);
  if (!gate) return false;
  
  return gate.approvers?.includes(user.email);
}

// التحقق من إمكانية إدارة بوابة معينة
export function canManageGate(user, gate) {
  if (!user) return false;
  
  if (user.role === 'admin') return true;
  
  if (!hasPermission(user, PERMISSIONS.EDIT_GATE)) return false;
  
  // التحقق من البوابات المخصصة للمستخدم
  if (user.assigned_gates?.includes(gate?.id)) return true;
  
  // مسؤول البوابة يمكنه إدارة جميع البوابات
  return user.approval_role === ROLES.GATE_ADMIN;
}