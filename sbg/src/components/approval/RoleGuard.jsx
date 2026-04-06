import React from 'react';
import { hasPermission, hasAnyPermission, PERMISSION_LABELS } from './RolePermissions';
import { Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * مكون حماية الصلاحيات - يخفي المحتوى إذا لم يكن للمستخدم الصلاحية
 */
export function RoleGuard({ user, permission, permissions, requireAll = false, children, fallback = null }) {
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(user, permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? permissions.every(p => hasPermission(user, p))
      : hasAnyPermission(user, permissions);
  }
  
  if (hasAccess) {
    return children;
  }
  
  return fallback;
}

/**
 * مكون عرض رسالة عدم الصلاحية
 */
export function AccessDenied({ permission, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" dir="rtl">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">غير مصرح</h2>
      <p className="text-slate-600 mb-2">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      {permission && (
        <p className="text-sm text-slate-500 mb-6">
          الصلاحية المطلوبة: <span className="font-medium">{PERMISSION_LABELS[permission] || permission}</span>
        </p>
      )}
      {onBack && (
        <Button onClick={onBack} variant="outline">
          العودة للصفحة السابقة
        </Button>
      )}
    </div>
  );
}

/**
 * مكون زر مع حماية الصلاحيات
 */
export function ProtectedButton({ user, permission, children, ...props }) {
  const hasAccess = hasPermission(user, permission);
  
  if (!hasAccess) {
    return null;
  }
  
  return <Button {...props}>{children}</Button>;
}

/**
 * مكون شارة الدور
 */
export function RoleBadge({ role, className = '' }) {
  const roleConfig = {
    gate_admin: { label: 'مسؤول البوابة', bg: 'bg-purple-100', text: 'text-purple-700', icon: Shield },
    approver: { label: 'موافق', bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield },
    requester: { label: 'مقدم طلب', bg: 'bg-slate-100', text: 'text-slate-700', icon: Shield },
  };
  
  const config = roleConfig[role] || roleConfig.requester;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}