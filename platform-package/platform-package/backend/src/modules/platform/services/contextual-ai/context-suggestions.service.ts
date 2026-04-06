/**
 * Context Suggestions Service — Pure Functions
 *
 * Route-based context building, rule-based suggestion generation,
 * suggestion validation, and session context helpers.
 * All functions are pure (no I/O) for testability.
 *
 * Requirements: 4.1, 4.2, 4.6, 4.7, 4.8
 * Tasks: 13.1, 13.3
 */

import type { PageContext, AISuggestion, AISession } from './contextual-ai.types';

// ============================================================================
// Route-to-Module Mapping
// ============================================================================

/** Module mapping from route segments */
const ROUTE_MODULE_MAP: Record<string, string> = {
  'risks': 'risk',
  'controls': 'control',
  'policies': 'policy',
  'frameworks': 'framework',
  'compliance': 'compliance',
  'incidents': 'incident',
  'vendors': 'vendor',
  'evidence': 'evidence',
  'audit': 'audit',
  'governance': 'governance',
  'workflows': 'workflow',
  'reports': 'report',
  'dashboard': 'dashboard',
  'workspace-home': 'dashboard',
  'ai-hub': 'ai',
  'registry': 'registry',
};

// ============================================================================
// Context Building
// ============================================================================

/**
 * Build a PageContext from a route string.
 * Extracts module, entity type, and entity ID from the route.
 * Pure function for testability.
 *
 * Requirements: 4.1, 4.8
 * Validates: Property 14 - AI Context Tracking
 */
export function buildContextFromRoute(route: string): PageContext {
  if (!route || route.trim().length === 0) {
    return { route: '/', module: 'dashboard' };
  }

  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  const segments = cleanRoute.split('/').filter(Boolean);

  const context: PageContext = { route: cleanRoute };

  if (segments.length === 0) {
    context.module = 'dashboard';
    return context;
  }

  // First segment is the module
  const moduleSegment = segments[0];
  context.module = ROUTE_MODULE_MAP[moduleSegment] || moduleSegment;

  // If there's a second segment, it could be an entity type or ID
  if (segments.length >= 2) {
    context.entityType = moduleSegment;
    context.entityId = segments[1];
  }

  return context;
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Get context-aware suggestions based on entity type, status, and live data.
 * Combines rule-based baseline suggestions with data-driven insights.
 *
 * Requirements: 4.2, 4.6
 */
export function getSuggestionsForContext(context: PageContext): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  if (!context.module) return suggestions;

  const data = context.additionalData || {};

  switch (context.module) {
    case 'risk':
      suggestions.push({
        id: 'risk-assess',
        text: 'Run a risk assessment for this entity',
        textAr: 'إجراء تقييم مخاطر لهذا الكيان',
        type: 'action',
        confidence: 0.85,
        reasoning: 'User is viewing a risk entity',
        entityType: context.entityType,
        entityId: context.entityId,
      });
      if (context.entityStatus === 'critical' || context.entityStatus === 'high') {
        suggestions.push({
          id: 'risk-escalate',
          text: 'Consider escalating this high-priority risk',
          textAr: 'فكر في تصعيد هذا الخطر ذو الأولوية العالية',
          type: 'warning',
          confidence: 0.92,
          reasoning: 'Risk has critical/high status',
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      if (data.treatmentStatus === 'none' || data.treatmentStatus === 'accepted') {
        suggestions.push({
          id: 'risk-treatment',
          text: 'This risk has no active treatment plan — define mitigation steps',
          textAr: 'هذا الخطر ليس لديه خطة معالجة نشطة — حدد خطوات التخفيف',
          type: 'warning',
          confidence: 0.90,
          reasoning: 'Risk lacks treatment plan',
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      if (data.linkedControlCount === 0) {
        suggestions.push({
          id: 'risk-link-controls',
          text: 'No controls are linked to this risk — map relevant controls',
          textAr: 'لا توجد ضوابط مرتبطة بهذا الخطر — قم بربط الضوابط ذات الصلة',
          type: 'recommendation',
          confidence: 0.88,
          reasoning: 'Risk has no linked controls',
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      break;

    case 'control':
      suggestions.push({
        id: 'control-evidence',
        text: 'Attach evidence to validate this control',
        textAr: 'إرفاق أدلة للتحقق من هذا الضابط',
        type: 'recommendation',
        confidence: 0.80,
        reasoning: 'Controls benefit from evidence attachment',
        entityType: context.entityType,
        entityId: context.entityId,
      });
      if (data.testStatus === 'failed' || data.testStatus === 'not_tested') {
        suggestions.push({
          id: 'control-test',
          text: 'This control has not passed testing — schedule a test cycle',
          textAr: 'هذا الضابط لم يجتز الاختبار — جدول دورة اختبار',
          type: 'warning',
          confidence: 0.91,
          reasoning: `Control test status: ${data.testStatus}`,
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      if (data.daysSinceUpdate && data.daysSinceUpdate > 180) {
        suggestions.push({
          id: 'control-stale',
          text: `This control hasn't been updated in ${data.daysSinceUpdate} days — review for relevance`,
          textAr: `لم يتم تحديث هذا الضابط منذ ${data.daysSinceUpdate} يوماً — راجع مدى ملاءمته`,
          type: 'insight',
          confidence: 0.82,
          reasoning: 'Control is stale',
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      break;

    case 'compliance':
      suggestions.push({
        id: 'compliance-gap',
        text: 'Review compliance gaps and remediation plans',
        textAr: 'مراجعة فجوات الامتثال وخطط المعالجة',
        type: 'insight',
        confidence: 0.78,
        reasoning: 'User is in compliance module',
      });
      if (data.gapCount && data.gapCount > 0) {
        suggestions.push({
          id: 'compliance-remediate',
          text: `${data.gapCount} compliance gaps detected — prioritize by regulatory impact`,
          textAr: `تم اكتشاف ${data.gapCount} فجوات امتثال — رتب حسب التأثير التنظيمي`,
          type: 'warning',
          confidence: 0.89,
          reasoning: `${data.gapCount} gaps found`,
        });
      }
      break;

    case 'policy':
      suggestions.push({
        id: 'policy-review',
        text: 'Check if this policy needs periodic review',
        textAr: 'تحقق مما إذا كانت هذه السياسة تحتاج إلى مراجعة دورية',
        type: 'recommendation',
        confidence: 0.75,
        reasoning: 'Policies require periodic review',
        entityType: context.entityType,
        entityId: context.entityId,
      });
      if (data.version === 1 || data.daysSinceReview > 365) {
        suggestions.push({
          id: 'policy-outdated',
          text: 'This policy may be outdated — initiate a review cycle',
          textAr: 'قد تكون هذه السياسة قديمة — ابدأ دورة مراجعة',
          type: 'warning',
          confidence: 0.86,
          reasoning: 'Policy has not been reviewed recently',
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      break;

    case 'incident':
      suggestions.push({
        id: 'incident-timeline',
        text: 'Generate incident timeline and root cause analysis',
        textAr: 'إنشاء جدول زمني للحادث وتحليل السبب الجذري',
        type: 'action',
        confidence: 0.88,
        reasoning: 'User is viewing an incident',
        entityType: context.entityType,
        entityId: context.entityId,
      });
      if (context.entityStatus === 'open' && data.daysSinceCreation > 14) {
        suggestions.push({
          id: 'incident-overdue',
          text: `Incident open for ${data.daysSinceCreation} days — consider escalation`,
          textAr: `الحادث مفتوح منذ ${data.daysSinceCreation} يوماً — فكر في التصعيد`,
          type: 'warning',
          confidence: 0.93,
          reasoning: 'Incident has been open too long',
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      break;

    case 'vendor':
      suggestions.push({
        id: 'vendor-assess',
        text: 'Review vendor risk assessment and SLA compliance',
        textAr: 'مراجعة تقييم مخاطر المورد والامتثال لاتفاقية مستوى الخدمة',
        type: 'action',
        confidence: 0.82,
        reasoning: 'User is viewing a vendor',
        entityType: context.entityType,
        entityId: context.entityId,
      });
      if (data.riskTier === 'critical' || data.riskTier === 'high') {
        suggestions.push({
          id: 'vendor-high-risk',
          text: 'High-risk vendor — ensure continuous monitoring is active',
          textAr: 'مورد عالي المخاطر — تأكد من تفعيل المراقبة المستمرة',
          type: 'warning',
          confidence: 0.91,
          reasoning: `Vendor risk tier: ${data.riskTier}`,
          entityType: context.entityType,
          entityId: context.entityId,
        });
      }
      break;

    case 'evidence':
      if (data.expiryDate) {
        const daysToExpiry = Math.floor((new Date(data.expiryDate).getTime() - Date.now()) / 86400000);
        if (daysToExpiry < 30 && daysToExpiry > 0) {
          suggestions.push({
            id: 'evidence-expiring',
            text: `Evidence expires in ${daysToExpiry} days — schedule renewal`,
            textAr: `تنتهي صلاحية الدليل خلال ${daysToExpiry} يوماً — جدول التجديد`,
            type: 'warning',
            confidence: 0.94,
            reasoning: 'Evidence is expiring soon',
            entityType: context.entityType,
            entityId: context.entityId,
          });
        } else if (daysToExpiry <= 0) {
          suggestions.push({
            id: 'evidence-expired',
            text: 'This evidence has expired — upload a fresh version',
            textAr: 'انتهت صلاحية هذا الدليل — ارفع نسخة جديدة',
            type: 'warning',
            confidence: 0.97,
            reasoning: 'Evidence has expired',
            entityType: context.entityType,
            entityId: context.entityId,
          });
        }
      }
      break;

    case 'dashboard':
      suggestions.push({
        id: 'dashboard-summary',
        text: 'Generate executive summary of current GRC posture',
        textAr: 'إنشاء ملخص تنفيذي لوضع الحوكمة والمخاطر والامتثال الحالي',
        type: 'action',
        confidence: 0.70,
        reasoning: 'User is on the dashboard',
      });
      break;
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a suggestion has proper structure.
 * Pure function for property testing.
 */
export function isValidSuggestion(suggestion: AISuggestion): boolean {
  if (!suggestion.id || suggestion.id.length === 0) return false;
  if (!suggestion.text || suggestion.text.length === 0) return false;
  if (!suggestion.textAr || suggestion.textAr.length === 0) return false;
  if (!['action', 'insight', 'warning', 'recommendation'].includes(suggestion.type)) return false;
  if (suggestion.confidence < 0 || suggestion.confidence > 1) return false;
  if (!suggestion.reasoning || suggestion.reasoning.length === 0) return false;
  return true;
}

// ============================================================================
// Session Helpers
// ============================================================================

/**
 * Merge session context with new page context.
 * Preserves conversation history while updating location.
 * Pure function for testability.
 *
 * Requirements: 4.7
 * Validates: Property 16 - AI Session Context Preservation
 */
export function mergeSessionContext(
  session: AISession,
  newContext: PageContext
): AISession {
  return {
    ...session,
    context: newContext,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add a message to a session.
 * Pure function that returns updated session.
 */
export function addMessageToSession(
  session: AISession,
  role: 'user' | 'assistant',
  content: string
): AISession {
  return {
    ...session,
    messages: [
      ...session.messages,
      { role, content, timestamp: new Date().toISOString() },
    ],
    updatedAt: new Date().toISOString(),
  };
}
