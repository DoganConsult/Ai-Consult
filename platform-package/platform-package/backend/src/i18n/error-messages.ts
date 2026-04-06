import { Request } from 'express';
import { SupportedLang } from '../platform/dos/http/middleware/module-stack';

interface BilingualMessage {
  en: string;
  ar: string;
}

/**
 * Bilingual error message dictionary.
 * Keys are UPPER_SNAKE_CASE error codes.
 */
export const ERROR_MESSAGES: Record<string, BilingualMessage> = {
  // ── Auth ──
  MISSING_FIELDS: { en: 'Missing required fields', ar: 'حقول مطلوبة مفقودة' },
  INVALID_CREDENTIALS: { en: 'Invalid credentials', ar: 'بيانات الاعتماد غير صالحة' },
  EMAIL_REGISTERED: { en: 'Email already registered', ar: 'البريد الإلكتروني مسجل بالفعل' },
  INVALID_EMAIL: { en: 'Invalid email format', ar: 'صيغة البريد الإلكتروني غير صالحة' },
  WEAK_PASSWORD: { en: 'Password does not meet requirements', ar: 'كلمة المرور لا تستوفي المتطلبات' },
  ACCOUNT_LOCKED: { en: 'Account is locked. Try again later', ar: 'الحساب مقفل. حاول مرة أخرى لاحقاً' },
  INVALID_TOKEN: { en: 'Invalid or expired token', ar: 'رمز غير صالح أو منتهي الصلاحية' },
  INVALID_REFRESH_TOKEN: { en: 'Invalid refresh token', ar: 'رمز التحديث غير صالح' },
  SESSION_EXPIRED: { en: 'Session has expired. Please log in again', ar: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى' },
  UNAUTHORIZED: { en: 'Unauthorized', ar: 'غير مصرح' },
  FORBIDDEN: { en: 'Access denied', ar: 'تم رفض الوصول' },
  MFA_REQUIRED: { en: 'MFA verification required', ar: 'مطلوب التحقق بالعامل الثنائي' },
  INVALID_MFA_CODE: { en: 'Invalid MFA code', ar: 'رمز التحقق الثنائي غير صالح' },
  PASSWORD_RESET_EXPIRED: { en: 'Reset link has expired. Please request a new password reset', ar: 'انتهت صلاحية رابط إعادة التعيين. يرجى طلب إعادة تعيين جديدة' },

  // ── Validation ──
  VALIDATION_FAILED: { en: 'Validation failed', ar: 'فشل التحقق من الصحة' },
  INVALID_INPUT: { en: 'Invalid input', ar: 'مدخلات غير صالحة' },
  REQUIRED_FIELD: { en: 'This field is required', ar: 'هذا الحقل مطلوب' },
  INVALID_FORMAT: { en: 'Invalid format', ar: 'صيغة غير صالحة' },
  NO_FIELDS_TO_UPDATE: { en: 'No fields to update', ar: 'لا توجد حقول للتحديث' },

  // ── Resources ──
  NOT_FOUND: { en: 'Resource not found', ar: 'المورد غير موجود' },
  ALREADY_EXISTS: { en: 'Resource already exists', ar: 'المورد موجود بالفعل' },
  CONFLICT: { en: 'Data conflict', ar: 'تعارض في البيانات' },
  DUPLICATE_ENTRY: { en: 'Duplicate entry', ar: 'إدخال مكرر' },

  // ── Tenant ──
  TENANT_NOT_FOUND: { en: 'Tenant not found', ar: 'المستأجر غير موجود' },
  TENANT_ISOLATION: { en: 'Tenant isolation violation', ar: 'انتهاك عزل المستأجر' },
  WORKSPACE_NOT_ACTIVE: { en: 'Workspace is not active', ar: 'مساحة العمل غير نشطة' },

  // ── Rate Limiting ──
  RATE_LIMIT_EXCEEDED: { en: 'Too many requests. Please try again later', ar: 'عدد كبير جداً من الطلبات. حاول مرة أخرى لاحقاً' },

  // ── Server ──
  INTERNAL_ERROR: { en: 'An unexpected error occurred', ar: 'حدث خطأ غير متوقع' },
  SERVICE_UNAVAILABLE: { en: 'Service temporarily unavailable', ar: 'الخدمة غير متاحة مؤقتاً' },
  DATABASE_ERROR: { en: 'Database operation failed', ar: 'فشلت عملية قاعدة البيانات' },

  // ── Provisioning ──
  PROVISIONING_FAILED: { en: 'Workspace provisioning failed', ar: 'فشل تهيئة مساحة العمل' },
  PROVISIONING_IN_PROGRESS: { en: 'Provisioning is already in progress', ar: 'التهيئة قيد التنفيذ بالفعل' },

  // ── Trial ──
  TRIAL_EXPIRED: { en: 'Trial period has expired', ar: 'انتهت فترة التجربة' },
  TRIAL_EXTENSION_DENIED: { en: 'Trial extension request denied', ar: 'تم رفض طلب تمديد الفترة التجريبية' },

  // ── Evidence ──
  EVIDENCE_NOT_FOUND: { en: 'Evidence not found', ar: 'الدليل غير موجود' },
  EVIDENCE_UPLOAD_FAILED: { en: 'Evidence upload failed', ar: 'فشل رفع الدليل' },

  // ── Workflow ──
  WORKFLOW_INVALID_TRANSITION: { en: 'Invalid workflow transition', ar: 'انتقال سير العمل غير صالح' },
  WORKFLOW_ALREADY_COMPLETE: { en: 'Workflow is already complete', ar: 'سير العمل مكتمل بالفعل' },

  // ── Approval ──
  APPROVAL_NOT_FOUND: { en: 'Approval request not found', ar: 'طلب الموافقة غير موجود' },
  APPROVAL_ALREADY_PROCESSED: { en: 'Approval has already been processed', ar: 'تمت معالجة الموافقة بالفعل' },
  CANNOT_APPROVE_OWN: { en: 'Cannot approve your own request', ar: 'لا يمكنك الموافقة على طلبك الخاص' },

  // ── Generic CRUD ──
  CREATE_FAILED: { en: 'Failed to create resource', ar: 'فشل في إنشاء المورد' },
  UPDATE_FAILED: { en: 'Failed to update resource', ar: 'فشل في تحديث المورد' },
  DELETE_FAILED: { en: 'Failed to delete resource', ar: 'فشل في حذف المورد' },
  FETCH_FAILED: { en: 'Failed to fetch data', ar: 'فشل في جلب البيانات' },

  // ── File / Upload ──
  FILE_TOO_LARGE: { en: 'File size exceeds the maximum limit', ar: 'حجم الملف يتجاوز الحد الأقصى' },
  INVALID_FILE_TYPE: { en: 'Invalid file type', ar: 'نوع الملف غير صالح' },

  // ── Integration ──
  INTEGRATION_ERROR: { en: 'Integration error', ar: 'خطأ في التكامل' },
  WEBHOOK_DELIVERY_FAILED: { en: 'Webhook delivery failed', ar: 'فشل تسليم الإشعار التلقائي' },

  // ── Governance ──
  CIRCULAR_DEPENDENCY: { en: 'Circular dependency detected', ar: 'تم اكتشاف تبعية دائرية' },
  POLICY_VIOLATION: { en: 'Policy violation', ar: 'مخالفة سياسة' },

  // ── Assessment ──
  ASSESSMENT_NOT_FOUND: { en: 'Assessment not found', ar: 'التقييم غير موجود' },
  ASSESSMENT_LOCKED: { en: 'Assessment is locked', ar: 'التقييم مقفل' },

  // ── Subscription / Entitlement ──
  SUBSCRIPTION_REQUIRED: { en: 'Active subscription required', ar: 'يلزم اشتراك نشط' },
  FEATURE_NOT_AVAILABLE: { en: 'This feature is not available in your plan', ar: 'هذه الميزة غير متاحة في خطتك' },
};

/**
 * Get a localized error message based on request language.
 * Falls back to English if the code isn't found.
 */
export function errMsg(code: string, req: Request, _context?: Record<string, any>): string {
  const lang: SupportedLang = (req.lang as SupportedLang) || 'ar';
  const entry = ERROR_MESSAGES[code];
  if (!entry) return code;
  return entry[lang] || entry.en || code;
}

/**
 * Get both en/ar messages for a given code (useful for AppError construction).
 */
export function getBilingualError(code: string): { en: string; ar: string } {
  return ERROR_MESSAGES[code] || { en: code, ar: code };
}
