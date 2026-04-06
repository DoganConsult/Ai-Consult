import { base44 } from '@/api/base44Client';
import { triggerWorkflow, notifyApprovers, notifyRequester } from './WorkflowEngine';

/**
 * خدمة إدارة طلبات الموافقة التلقائية
 * تقوم بفحص القواعد وإنشاء طلبات الموافقة عند الحاجة
 * مع سجل تدقيق كامل وغير قابل للتغيير
 * ونظام سير عمل وإشعارات متكامل
 */

// توليد معرف فريد للسجل
function generateLogId() {
  return `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// توليد checksum للتحقق من سلامة السجل
function generateChecksum(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `CHK-${Math.abs(hash).toString(16).toUpperCase()}`;
}

// إنشاء سجل تدقيق جديد
function createAuditEntry({
  action,
  performedBy,
  performedByName = '',
  performedByRole = '',
  comment = '',
  previousStatus = '',
  newStatus = '',
  metadata = {}
}) {
  const entry = {
    log_id: generateLogId(),
    action,
    performed_by: performedBy,
    performed_by_name: performedByName,
    performed_by_role: performedByRole,
    timestamp: new Date().toISOString(),
    comment,
    previous_status: previousStatus,
    new_status: newStatus,
    metadata
  };
  entry.checksum = generateChecksum(entry);
  return entry;
}

// ختم SBG
function createSBGStamp() {
  return {
    branded_by: 'SBG Saudi Business Gate',
    powered_by: 'Dogan Consult',
    portal_url: 'www.saudibusinessgate.com',
    consult_url: 'www.doganconsult.com',
    created_at: new Date().toISOString()
  };
}

export async function createApprovalRequest({
  operationType,
  title,
  description,
  amount,
  requesterEmail,
  requesterName,
  referenceId,
  metadata = {}
}) {
  // جلب جميع البوابات النشطة لهذا النوع
  const gates = await base44.entities.ApprovalGate.filter({
    operation_type: operationType,
    is_active: true
  });

  if (gates.length === 0) {
    return { requiresApproval: false, reason: 'no_gate_configured' };
  }

  // البحث عن البوابة المناسبة بناءً على المبلغ
  let selectedGate = null;
  
  for (const gate of gates) {
    // إذا كان المبلغ أقل من حد الموافقة التلقائية، لا حاجة للموافقة
    if (gate.auto_approve_below && amount && amount < gate.auto_approve_below) {
      return { 
        requiresApproval: false, 
        reason: 'auto_approved',
        autoApproveThreshold: gate.auto_approve_below
      };
    }

    // إذا كان المبلغ يتجاوز الحد المطلوب للموافقة
    if (gate.threshold_amount) {
      if (amount && amount >= gate.threshold_amount) {
        selectedGate = gate;
        break;
      }
    } else {
      // بوابة بدون حد مبلغ - تنطبق على جميع العمليات
      selectedGate = gate;
    }
  }

  if (!selectedGate) {
    // استخدام أول بوابة متاحة إذا لم يتم العثور على بوابة مناسبة
    selectedGate = gates[0];
  }

  // حساب تاريخ الاستحقاق بناءً على ساعات التصعيد
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + (selectedGate.escalation_hours || 24));

  // إنشاء سجل التدقيق الأولي
  const initialAuditEntry = createAuditEntry({
    action: 'created',
    performedBy: requesterEmail,
    performedByName: requesterName,
    comment: `تم إنشاء طلب الموافقة: ${title}`,
    newStatus: 'pending',
    metadata: { gate_name: selectedGate.name, amount, operation_type: operationType }
  });

  // إنشاء طلب الموافقة مع سجل التدقيق
  const request = await base44.entities.ApprovalRequest.create({
    gate_id: selectedGate.id,
    operation_type: operationType,
    title,
    description,
    amount,
    requester_email: requesterEmail,
    requester_name: requesterName,
    status: 'pending',
    approvals: [],
    due_date: dueDate.toISOString(),
    reference_id: referenceId,
    metadata,
    audit_log: [initialAuditEntry],
    audit_checksum: generateChecksum([initialAuditEntry]),
    sbg_stamp: createSBGStamp()
  });

  // إرسال إشعارات للموافقين عبر نظام الإشعارات المتكامل
  await notifyApprovers(request, selectedGate);

  // تشغيل قواعد سير العمل
  try {
    await triggerWorkflow(request, 'on_create');
  } catch (error) {
    console.error('Workflow trigger error:', error);
  }

  return {
    requiresApproval: true,
    requestId: request.id,
    gateId: selectedGate.id,
    gateName: selectedGate.name,
    approvers: selectedGate.approvers,
    dueDate: dueDate.toISOString()
  };
}

export async function checkApprovalStatus(requestId) {
  const request = await base44.entities.ApprovalRequest.get(requestId);
  if (!request) {
    return { found: false };
  }

  const gate = await base44.entities.ApprovalGate.get(request.gate_id);
  const minApprovals = gate?.min_approvals || 1;
  const approvedCount = (request.approvals || []).filter(a => a.action === 'approved').length;

  return {
    found: true,
    status: request.status,
    approvedCount,
    minApprovals,
    isFullyApproved: approvedCount >= minApprovals,
    approvals: request.approvals
  };
}

export async function approveRequest(requestId, approverEmail, comment = '', approverName = '', approverRole = '') {
  const request = await base44.entities.ApprovalRequest.get(requestId);
  if (!request || request.status !== 'pending') {
    throw new Error('طلب غير صالح أو تمت معالجته مسبقاً');
  }

  const gate = await base44.entities.ApprovalGate.get(request.gate_id);
  if (!gate?.approvers?.includes(approverEmail)) {
    throw new Error('ليس لديك صلاحية للموافقة على هذا الطلب');
  }

  const newApprovals = [
    ...(request.approvals || []),
    {
      email: approverEmail,
      action: 'approved',
      comment,
      date: new Date().toISOString()
    }
  ];

  const approvedCount = newApprovals.filter(a => a.action === 'approved').length;
  const isFullyApproved = approvedCount >= (gate.min_approvals || 1);
  const newStatus = isFullyApproved ? 'approved' : 'pending';

  // إضافة سجل تدقيق للموافقة
  const auditEntry = createAuditEntry({
    action: 'approved',
    performedBy: approverEmail,
    performedByName: approverName,
    performedByRole: approverRole,
    comment,
    previousStatus: request.status,
    newStatus,
    metadata: { approval_count: approvedCount, min_required: gate.min_approvals }
  });

  const updatedAuditLog = [...(request.audit_log || []), auditEntry];

  await base44.entities.ApprovalRequest.update(requestId, {
    approvals: newApprovals,
    status: newStatus,
    audit_log: updatedAuditLog,
    audit_checksum: generateChecksum(updatedAuditLog)
  });

  // إشعار مقدم الطلب عبر نظام الإشعارات
  if (isFullyApproved) {
    await notifyRequester(request, 'approved', comment);
    
    // تشغيل قواعد سير العمل
    try {
      await triggerWorkflow(request, 'on_approve');
    } catch (error) {
      console.error('Workflow trigger error:', error);
    }
  }

  return { success: true, isFullyApproved };
}

export async function rejectRequest(requestId, approverEmail, comment = '', approverName = '', approverRole = '') {
  const request = await base44.entities.ApprovalRequest.get(requestId);
  if (!request || request.status !== 'pending') {
    throw new Error('طلب غير صالح أو تمت معالجته مسبقاً');
  }

  const gate = await base44.entities.ApprovalGate.get(request.gate_id);
  if (!gate?.approvers?.includes(approverEmail)) {
    throw new Error('ليس لديك صلاحية لرفض هذا الطلب');
  }

  if (gate.require_comment && !comment) {
    throw new Error('يجب إضافة تعليق عند الرفض');
  }

  // إضافة سجل تدقيق للرفض
  const auditEntry = createAuditEntry({
    action: 'rejected',
    performedBy: approverEmail,
    performedByName: approverName,
    performedByRole: approverRole,
    comment,
    previousStatus: request.status,
    newStatus: 'rejected',
    metadata: { rejection_reason: comment }
  });

  const updatedAuditLog = [...(request.audit_log || []), auditEntry];

  await base44.entities.ApprovalRequest.update(requestId, {
    approvals: [
      ...(request.approvals || []),
      {
        email: approverEmail,
        action: 'rejected',
        comment,
        date: new Date().toISOString()
      }
    ],
    status: 'rejected',
    audit_log: updatedAuditLog,
    audit_checksum: generateChecksum(updatedAuditLog)
  });

  // إشعار مقدم الطلب عبر نظام الإشعارات
  await notifyRequester(request, 'rejected', comment);

  // تشغيل قواعد سير العمل
  try {
    await triggerWorkflow(request, 'on_reject');
  } catch (error) {
    console.error('Workflow trigger error:', error);
  }

  return { success: true };
}

// تصعيد الطلب
export async function escalateRequest(requestId, escalatorEmail, reason = '', escalatorName = '') {
  const request = await base44.entities.ApprovalRequest.get(requestId);
  if (!request) {
    throw new Error('طلب غير موجود');
  }

  const gate = await base44.entities.ApprovalGate.get(request.gate_id);
  
  const auditEntry = createAuditEntry({
    action: 'escalated',
    performedBy: escalatorEmail,
    performedByName: escalatorName,
    comment: reason,
    previousStatus: request.status,
    newStatus: 'escalated',
    metadata: { escalated_to: gate?.escalation_to }
  });

  const updatedAuditLog = [...(request.audit_log || []), auditEntry];

  await base44.entities.ApprovalRequest.update(requestId, {
    status: 'escalated',
    audit_log: updatedAuditLog,
    audit_checksum: generateChecksum(updatedAuditLog)
  });

  // إشعار المسؤول عن التصعيد
  if (gate?.escalation_to) {
    try {
      await base44.integrations.Core.SendEmail({
        to: gate.escalation_to,
        subject: `تصعيد طلب موافقة: ${request.title}`,
        body: `تم تصعيد الطلب "${request.title}" إليك.\n\nالسبب: ${reason}\n\nيرجى المراجعة واتخاذ الإجراء المناسب.`
      });
    } catch (error) {
      console.error('Error sending escalation notification:', error);
    }
  }

  return { success: true };
}

// البحث في سجلات التدقيق
export async function searchAuditLogs({ action, performedBy, fromDate, toDate, requestId }) {
  let requests;
  
  if (requestId) {
    const request = await base44.entities.ApprovalRequest.get(requestId);
    requests = request ? [request] : [];
  } else {
    requests = await base44.entities.ApprovalRequest.list();
  }

  const results = [];
  
  for (const request of requests) {
    const logs = (request.audit_log || []).filter(log => {
      if (action && log.action !== action) return false;
      if (performedBy && log.performed_by !== performedBy) return false;
      if (fromDate && new Date(log.timestamp) < new Date(fromDate)) return false;
      if (toDate && new Date(log.timestamp) > new Date(toDate)) return false;
      return true;
    });

    if (logs.length > 0) {
      results.push({
        request_id: request.id,
        request_title: request.title,
        operation_type: request.operation_type,
        logs
      });
    }
  }

  return results;
}

// التحقق من سلامة سجل التدقيق
export function verifyAuditIntegrity(request) {
  if (!request.audit_log || request.audit_log.length === 0) {
    return { valid: true, message: 'لا توجد سجلات تدقيق' };
  }

  // التحقق من checksum كل سجل
  for (const entry of request.audit_log) {
    const { checksum, ...entryData } = entry;
    const expectedChecksum = generateChecksum(entryData);
    if (checksum !== expectedChecksum) {
      return { 
        valid: false, 
        message: `سجل التدقيق ${entry.log_id} قد تم تعديله`,
        corrupted_entry: entry.log_id
      };
    }
  }

  // التحقق من checksum السجل الكامل
  const expectedFullChecksum = generateChecksum(request.audit_log);
  if (request.audit_checksum !== expectedFullChecksum) {
    return { 
      valid: false, 
      message: 'سجل التدقيق الكامل قد تم تعديله'
    };
  }

  return { valid: true, message: 'سجل التدقيق سليم ولم يتم التلاعب به' };
}

// تصدير الوظائف كـ hook للاستخدام في المكونات
export function useApprovalService() {
  return {
    createApprovalRequest,
    checkApprovalStatus,
    approveRequest,
    rejectRequest,
    escalateRequest,
    searchAuditLogs,
    verifyAuditIntegrity,
    createAuditEntry,
    generateChecksum
  };
}