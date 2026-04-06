import { query } from '../../../config/database/database';
import { BootstrapChecklistItem, BootstrapStatus } from '../provisioning/types';

export class BootstrapChecklistService {
  private schemaName = '';

  async getStatus(tenantId: string): Promise<BootstrapStatus> {
    const schemaName = `tenant_${tenantId}`;
    this.schemaName = schemaName;

    const tenantRes = await query(
      `SELECT status FROM public.tenants WHERE tenant_id = $1`,
      [tenantId]
    );
    const tenantStatus = tenantRes.rows[0]?.status ?? 'any';

    const items = await this.buildChecklist(schemaName);
    const requiredItems = items.filter((i) => i.required);
    const completedRequired = requiredItems.filter((i) => i.completed).length;

    return {
      tenantId,
      tenantStatus,
      firstLoginCompleted: requiredItems.length > 0 && completedRequired === requiredItems.length,
      completedRequired,
      totalRequired: requiredItems.length,
      items,
    };
  }

  private async buildChecklist(schemaName: string): Promise<BootstrapChecklistItem[]> {
    const definitions: BootstrapChecklistItem[] = [
      {
        key: 'organization_profile_confirmed',
        titleEn: 'Confirm organization profile',
        titleAr: 'تأكيد ملف الجهة',
        descriptionEn: 'Review and confirm the organization profile and workspace settings.',
        descriptionAr: 'راجع وأكد ملف الجهة وإعدادات مساحة العمل.',
        category: 'org',
        route: '/bootstrap/org-profile',
        required: true,
        completed: false,
        completionRule: { type: 'record_exists', table: `${schemaName}.workspace_profile` },
      },
      {
        key: 'roles_assigned',
        titleEn: 'Assign key roles',
        titleAr: 'إسناد الأدوار الرئيسية',
        descriptionEn: 'Assign at least the core governance and operational roles.',
        descriptionAr: 'قم بإسناد أدوار الحوكمة والتشغيل الأساسية.',
        category: 'roles',
        route: '/bootstrap/roles',
        required: true,
        completed: false,
        completionRule: { type: 'count_at_least', table: `${schemaName}.user_role_assignments`, minCount: 1 },
      },
      {
        key: 'frameworks_confirmed',
        titleEn: 'Confirm frameworks and content packs',
        titleAr: 'تأكيد الأطر وحزم المحتوى',
        descriptionEn: 'Confirm at least one framework or installed content pack.',
        descriptionAr: 'أكد إطارًا واحدًا على الأقل أو حزمة محتوى مثبتة.',
        category: 'frameworks',
        route: '/bootstrap/frameworks',
        required: true,
        completed: false,
        completionRule: { type: 'count_at_least', table: `${schemaName}.frameworks`, minCount: 1 },
      },
      {
        key: 'modules_confirmed',
        titleEn: 'Confirm enabled modules',
        titleAr: 'تأكيد الوحدات المفعّلة',
        descriptionEn: 'Review the modules enabled for your workspace and confirm they match your needs.',
        descriptionAr: 'راجع الوحدات المفعّلة لمساحة العمل وأكد أنها تتوافق مع احتياجاتك.',
        category: 'modules',
        route: '/bootstrap/modules',
        required: true,
        completed: false,
        completionRule: { type: 'flag_true', table: `${schemaName}.workspace_profile`, field: 'modules_confirmed' },
      },
      {
        key: 'workflows_ready',
        titleEn: 'Review workflow templates',
        titleAr: 'مراجعة قوالب سير العمل',
        descriptionEn: 'Review workflow templates and activation defaults.',
        descriptionAr: 'راجع قوالب سير العمل وإعدادات التفعيل الافتراضية.',
        category: 'workflows',
        route: '/bootstrap/workflows',
        required: true,
        completed: false,
        completionRule: { type: 'count_at_least', table: `${schemaName}.workflow_templates`, minCount: 1 },
      },
      {
        key: 'users_invited',
        titleEn: 'Invite core users',
        titleAr: 'دعوة المستخدمين الأساسيين',
        descriptionEn: 'Invite core team members to activate the workspace.',
        descriptionAr: 'ادعُ أعضاء الفريق الأساسيين لتفعيل مساحة العمل.',
        category: 'users',
        route: '/bootstrap/users',
        required: false,
        completed: false,
        completionRule: { type: 'count_at_least', table: `${schemaName}.user_role_assignments`, minCount: 3 },
      },
      {
        key: 'integrations_connected',
        titleEn: 'Connect at least one integration',
        titleAr: 'ربط تكامل واحد على الأقل',
        descriptionEn: 'Connect an operational integration such as SIEM, IAM, or ITSM if applicable.',
        descriptionAr: 'اربط تكاملًا تشغيليًا مثل SIEM أو IAM أو ITSM عند الحاجة.',
        category: 'integrations',
        route: '/bootstrap/integrations',
        required: false,
        completed: false,
        completionRule: { type: 'custom', customKey: 'any_integration_connected' },
      },
      {
        key: 'sla_policies_reviewed',
        titleEn: 'Review SLA policies',
        titleAr: 'مراجعة سياسات مستوى الخدمة',
        descriptionEn: 'Review the default SLA policies for evidence collection, risk treatment, and remediation.',
        descriptionAr: 'راجع سياسات مستوى الخدمة الافتراضية لجمع الأدلة ومعالجة المخاطر والتصحيح.',
        category: 'modules',
        route: '/bootstrap/sla-policies',
        required: false,
        completed: false,
        completionRule: { type: 'count_at_least', table: `${schemaName}.sla_policies`, minCount: 1 },
      },
      {
        key: 'notification_preferences_set',
        titleEn: 'Configure notification preferences',
        titleAr: 'إعداد تفضيلات الإشعارات',
        descriptionEn: 'Configure workspace-level notification preferences for alerts, reminders, and escalations.',
        descriptionAr: 'قم بإعداد تفضيلات الإشعارات على مستوى مساحة العمل للتنبيهات والتذكيرات والتصعيد.',
        category: 'org',
        route: '/bootstrap/notifications',
        required: false,
        completed: false,
        completionRule: { type: 'flag_true', table: `${schemaName}.workspace_profile`, field: 'notifications_configured' },
      },
      {
        key: 'data_classifications_set',
        titleEn: 'Set data classification levels',
        titleAr: 'تحديد مستويات تصنيف البيانات',
        descriptionEn: 'Define data classification levels (public, internal, confidential, restricted) for evidence and documents.',
        descriptionAr: 'حدد مستويات تصنيف البيانات (عام، داخلي، سري، مقيد) للأدلة والمستندات.',
        category: 'modules',
        route: '/bootstrap/data-classification',
        required: false,
        completed: false,
        completionRule: { type: 'count_at_least', table: `${schemaName}.data_classification_levels`, minCount: 1 },
      },
    ];

    for (const item of definitions) {
      item.completed = await this.evaluateRule(item.completionRule);
    }

    return definitions;
  }

  private quoteIdentifier(id: string): string {
    const stripped = id.replace(/[^a-zA-Z0-9_.]/g, '');
    if (!stripped || stripped.length !== id.length) {
      throw new Error(`Invalid SQL identifier: ${id}`);
    }
    return stripped
      .split('.')
      .map(part => `"${part}"`)
      .join('.');
  }

  private async evaluateRule(rule: BootstrapChecklistItem['completionRule']): Promise<boolean> {
    try {
      if (rule.type === 'record_exists' && rule.table) {
        const safeTable = this.quoteIdentifier(rule.table);
        const res = await query(`SELECT EXISTS (SELECT 1 FROM ${safeTable} LIMIT 1) AS exists_flag`);
        return !!res.rows[0]?.exists_flag;
      }
      if (rule.type === 'count_at_least' && rule.table) {
        const safeTable = this.quoteIdentifier(rule.table);
        const res = await query(`SELECT COUNT(*) AS cnt FROM ${safeTable}`);
        return parseInt(res.rows[0]?.cnt ?? '0', 10) >= (rule.minCount ?? 1);
      }
      if (rule.type === 'flag_true' && rule.table && rule.field) {
        const safeTable = this.quoteIdentifier(rule.table);
        const safeField = this.quoteIdentifier(rule.field);
        const res = await query(`SELECT ${safeField} AS val FROM ${safeTable} LIMIT 1`);
        return !!res.rows[0]?.val;
      }
      if (rule.type === 'custom') {
        return this.evaluateCustomRule(rule.customKey ?? '');
      }
    } catch {
      // table may not exist yet — treat as incomplete
    }
    return false;
  }

  private async evaluateCustomRule(customKey: string): Promise<boolean> {
    try {
      if (customKey === 'any_integration_connected') {
        const safeSchema = this.quoteIdentifier(this.schemaName);
        const res = await query(
          `SELECT COUNT(*) AS cnt FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = 'connector_configs'`,
          [this.schemaName],
        );
        if (parseInt(res.rows[0]?.cnt ?? '0', 10) === 0) return false;
        const countRes = await query(
          `SELECT COUNT(*) AS cnt FROM ${safeSchema}."connector_configs" WHERE status = 'active'`,
        );
        return parseInt(countRes.rows[0]?.cnt ?? '0', 10) > 0;
      }
    } catch { /* table may not exist */ }
    return false;
  }
}
