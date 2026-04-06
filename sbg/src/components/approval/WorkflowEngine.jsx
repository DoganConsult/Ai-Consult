import { base44 } from '@/api/base44Client';

/**
 * محرك سير العمل التلقائي
 * SBG Saudi Business Gate - Powered by Dogan Consult
 */

// تقييم شرط واحد
function evaluateCondition(request, condition, user) {
  const { operation_types, min_amount, max_amount, departments, requester_roles } = condition;

  // فحص نوع العملية
  if (operation_types?.length > 0 && !operation_types.includes(request.operation_type)) {
    return false;
  }

  // فحص المبلغ
  if (min_amount !== undefined && (request.amount || 0) < min_amount) {
    return false;
  }
  if (max_amount !== undefined && (request.amount || 0) > max_amount) {
    return false;
  }

  // فحص القسم
  if (departments?.length > 0 && user?.department && !departments.includes(user.department)) {
    return false;
  }

  // فحص دور مقدم الطلب
  if (requester_roles?.length > 0 && user?.approval_role && !requester_roles.includes(user.approval_role)) {
    return false;
  }

  return true;
}

// الحصول على القواعد المطابقة
async function getMatchingRules(request, triggerType, user) {
  const rules = await base44.entities.WorkflowRule.filter({ is_active: true });
  
  return rules
    .filter(rule => rule.trigger_type === triggerType)
    .filter(rule => evaluateCondition(request, rule.conditions || {}, user))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

// إرسال إشعار
async function sendNotification({ userEmail, title, message, type, priority, referenceType, referenceId, actionUrl, sendEmail = true }) {
  // إنشاء إشعار في التطبيق
  const notification = await base44.entities.Notification.create({
    user_email: userEmail,
    title,
    message,
    type,
    priority: priority || 'medium',
    is_read: false,
    is_email_sent: false,
    reference_type: referenceType,
    reference_id: referenceId,
    action_url: actionUrl
  });

  // إرسال بريد إلكتروني
  if (sendEmail) {
    try {
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: `[SBG] ${title}`,
        body: `${message}\n\n${actionUrl ? `الرابط: ${actionUrl}` : ''}\n\n---\nSBG Saudi Business Gate\nwww.saudibusinessgate.com`
      });
      
      await base44.entities.Notification.update(notification.id, { is_email_sent: true });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  return notification;
}

// إشعار الموافقين
async function notifyApprovers(request, gate, message) {
  const approvers = gate?.approvers || [];
  const notifications = [];

  for (const email of approvers) {
    const notif = await sendNotification({
      userEmail: email,
      title: `طلب جديد بانتظار موافقتك`,
      message: message || `الطلب: ${request.title}\nالمبلغ: ${request.amount?.toLocaleString() || '-'} ر.س`,
      type: 'pending_approval',
      priority: request.amount > 100000 ? 'high' : 'medium',
      referenceType: 'approval_request',
      referenceId: request.id,
      actionUrl: `/ApprovalGates?request=${request.id}`
    });
    notifications.push(notif);
  }

  return notifications;
}

// إشعار مقدم الطلب بتغيير الحالة
async function notifyRequester(request, newStatus, comment = '') {
  const statusMessages = {
    approved: 'تمت الموافقة على طلبك',
    rejected: 'تم رفض طلبك',
    escalated: 'تم تصعيد طلبك',
    pending: 'طلبك قيد المراجعة'
  };

  return sendNotification({
    userEmail: request.requester_email,
    title: statusMessages[newStatus] || 'تحديث على طلبك',
    message: `الطلب: ${request.title}\n${comment ? `ملاحظة: ${comment}` : ''}`,
    type: newStatus,
    priority: newStatus === 'rejected' ? 'high' : 'medium',
    referenceType: 'approval_request',
    referenceId: request.id
  });
}

// تنفيذ إجراء واحد
async function executeAction(action, request, gates) {
  switch (action.action_type) {
    case 'assign_gate':
      if (action.target_gate_id) {
        await base44.entities.ApprovalRequest.update(request.id, {
          gate_id: action.target_gate_id
        });
        const targetGate = gates.find(g => g.id === action.target_gate_id);
        if (targetGate) {
          await notifyApprovers(request, targetGate, `تم تحويل الطلب إلى بوابة: ${targetGate.name}`);
        }
      }
      break;

    case 'add_approver':
      if (action.target_emails?.length > 0) {
        for (const email of action.target_emails) {
          await sendNotification({
            userEmail: email,
            title: 'تمت إضافتك كموافق',
            message: `تم تعيينك للموافقة على الطلب: ${request.title}`,
            type: 'assigned',
            priority: 'high',
            referenceType: 'approval_request',
            referenceId: request.id,
            actionUrl: `/ApprovalGates?request=${request.id}`
          });
        }
      }
      break;

    case 'send_notification':
      if (action.target_emails?.length > 0) {
        for (const email of action.target_emails) {
          await sendNotification({
            userEmail: email,
            title: 'إشعار سير العمل',
            message: action.notification_template || `إشعار بخصوص الطلب: ${request.title}`,
            type: 'info',
            referenceType: 'approval_request',
            referenceId: request.id
          });
        }
      }
      break;

    case 'escalate':
      await base44.entities.ApprovalRequest.update(request.id, { status: 'escalated' });
      await notifyRequester(request, 'escalated');
      break;

    case 'auto_approve':
      await base44.entities.ApprovalRequest.update(request.id, { 
        status: 'approved',
        approvals: [...(request.approvals || []), {
          email: 'system@sbg.auto',
          action: 'approved',
          comment: 'موافقة تلقائية بناءً على قواعد سير العمل',
          date: new Date().toISOString()
        }]
      });
      await notifyRequester(request, 'approved', 'موافقة تلقائية');
      break;

    case 'auto_reject':
      await base44.entities.ApprovalRequest.update(request.id, { 
        status: 'rejected',
        approvals: [...(request.approvals || []), {
          email: 'system@sbg.auto',
          action: 'rejected',
          comment: 'رفض تلقائي بناءً على قواعد سير العمل',
          date: new Date().toISOString()
        }]
      });
      await notifyRequester(request, 'rejected', 'رفض تلقائي');
      break;
  }
}

// تشغيل سير العمل
export async function triggerWorkflow(request, triggerType, user = null) {
  const gates = await base44.entities.ApprovalGate.list();
  const matchingRules = await getMatchingRules(request, triggerType, user);
  
  const results = [];

  for (const rule of matchingRules) {
    for (const action of (rule.actions || [])) {
      try {
        await executeAction(action, request, gates);
        results.push({ rule: rule.name, action: action.action_type, status: 'success' });
      } catch (error) {
        results.push({ rule: rule.name, action: action.action_type, status: 'error', error: error.message });
      }
    }
  }

  return results;
}

// التحقق من الطلبات المعلقة وإرسال تذكيرات
export async function processReminders() {
  const pendingRequests = await base44.entities.ApprovalRequest.filter({ status: 'pending' });
  const gates = await base44.entities.ApprovalGate.list();
  const now = new Date();
  const reminders = [];

  for (const request of pendingRequests) {
    const createdDate = new Date(request.created_date);
    const hoursElapsed = (now - createdDate) / (1000 * 60 * 60);
    const gate = gates.find(g => g.id === request.gate_id);

    // إرسال تذكير بعد 24 ساعة
    if (hoursElapsed >= 24 && hoursElapsed < 48) {
      for (const approverEmail of (gate?.approvers || [])) {
        await sendNotification({
          userEmail: approverEmail,
          title: 'تذكير: طلب بانتظار موافقتك',
          message: `الطلب "${request.title}" بانتظار موافقتك منذ ${Math.floor(hoursElapsed)} ساعة`,
          type: 'reminder',
          priority: 'high',
          referenceType: 'approval_request',
          referenceId: request.id,
          actionUrl: `/ApprovalGates?request=${request.id}`
        });
        reminders.push({ requestId: request.id, approver: approverEmail });
      }
    }

    // تصعيد تلقائي بعد وقت معين
    if (gate?.escalation_hours && hoursElapsed >= gate.escalation_hours) {
      await triggerWorkflow(request, 'on_escalate');
    }
  }

  return reminders;
}

// تصدير الوظائف
export {
  sendNotification,
  notifyApprovers,
  notifyRequester,
  getMatchingRules,
  evaluateCondition
};