import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

interface ChainDefinitionSeed {
  chainCode: string;
  nameEn: string;
  nameAr: string;
  steps: object[];
  sodRules: object[];
}

const CHAIN_DEFINITIONS: ChainDefinitionSeed[] = [
  {
    chainCode: 'risk_to_compliance_score',
    nameEn: 'Risk to Compliance Score Chain',
    nameAr: 'سلسلة المخاطر إلى درجة الامتثال',
    steps: [
      { stepNo: 1, moduleCode: 'risk', eventTrigger: 'risk.treatment_updated', taskType: 'risk_assessment', roleCode: 'risk_owner', slaHours: 48, nextEvent: 'control.linked' },
      { stepNo: 2, moduleCode: 'compliance', eventTrigger: 'control.linked', taskType: 'control_review', roleCode: 'control_owner', slaHours: 72, nextEvent: 'evidence.requested' },
      { stepNo: 3, moduleCode: 'evidence', eventTrigger: 'evidence.requested', taskType: 'evidence_request', roleCode: 'evidence_owner', slaHours: 120, nextEvent: 'evidence.collected' },
      { stepNo: 4, moduleCode: 'compliance', eventTrigger: 'evidence.collected', taskType: 'verification', roleCode: 'compliance_analyst', slaHours: 48, nextEvent: 'compliance.posture_changed' },
    ],
    sodRules: [{ roleA: 'risk_owner', moduleA: 'risk', roleB: 'evidence_owner', moduleB: 'evidence', level: 'warn' }],
  },
  {
    chainCode: 'incident_to_remediation',
    nameEn: 'Incident to Remediation Chain',
    nameAr: 'سلسلة الحوادث إلى المعالجة',
    steps: [
      { stepNo: 1, moduleCode: 'incident', eventTrigger: 'incident.escalated', taskType: 'incident_response', roleCode: 'incident_owner', slaHours: 4, nextEvent: 'governance.review_required', condition: { field: 'severity', op: 'gte', value: 'high' } },
      { stepNo: 2, moduleCode: 'governance', eventTrigger: 'governance.review_required', taskType: 'approval', roleCode: 'governance_manager', slaHours: 48, nextEvent: 'approval.completed' },
      { stepNo: 3, moduleCode: 'remediation', eventTrigger: 'approval.completed', taskType: 'remediation', roleCode: 'remediation_owner', slaHours: 120, nextEvent: 'remediation.completed' },
      { stepNo: 4, moduleCode: 'action', eventTrigger: 'remediation.completed', taskType: 'verification', roleCode: 'action_owner', slaHours: 72, nextEvent: 'incident.resolved' },
    ],
    sodRules: [],
  },
  {
    chainCode: 'audit_to_control_update',
    nameEn: 'Audit to Control Update Chain',
    nameAr: 'سلسلة التدقيق إلى تحديث الضوابط',
    steps: [
      { stepNo: 1, moduleCode: 'audit', eventTrigger: 'audit.finding.issued', taskType: 'audit_response', roleCode: 'auditee_owner', slaHours: 72, nextEvent: 'capa.planned' },
      { stepNo: 2, moduleCode: 'remediation', eventTrigger: 'capa.planned', taskType: 'remediation', roleCode: 'remediation_owner', slaHours: 120, nextEvent: 'evidence.requested' },
      { stepNo: 3, moduleCode: 'evidence', eventTrigger: 'evidence.requested', taskType: 'evidence_request', roleCode: 'evidence_owner', slaHours: 96, nextEvent: 'evidence.collected' },
      { stepNo: 4, moduleCode: 'audit', eventTrigger: 'evidence.collected', taskType: 'verification', roleCode: 'auditor', slaHours: 48, nextEvent: 'control.effectiveness_updated' },
    ],
    sodRules: [{ roleA: 'auditor', moduleA: 'audit', roleB: 'evidence_owner', moduleB: 'evidence', level: 'block' }],
  },
  {
    chainCode: 'policy_to_compliance_impact',
    nameEn: 'Policy to Compliance Impact Chain',
    nameAr: 'سلسلة السياسات إلى أثر الامتثال',
    steps: [
      { stepNo: 1, moduleCode: 'policy', eventTrigger: 'policy.published', taskType: 'verification', roleCode: 'document_controller', slaHours: 24, nextEvent: 'attestation.required' },
      { stepNo: 2, moduleCode: 'compliance', eventTrigger: 'attestation.required', taskType: 'verification', roleCode: 'compliance_analyst', slaHours: 168, nextEvent: 'attestation.completed_or_exception' },
      { stepNo: 3, moduleCode: 'exception', eventTrigger: 'exception.request.created', taskType: 'approval', roleCode: 'exception_approver', slaHours: 72, nextEvent: 'exception.decided' },
      { stepNo: 4, moduleCode: 'compliance', eventTrigger: 'compliance.recalculate', taskType: 'verification', roleCode: 'compliance_manager', slaHours: 48, nextEvent: 'compliance.posture_changed' },
    ],
    sodRules: [{ roleA: 'policy_author', moduleA: 'policy', roleB: 'exception_approver', moduleB: 'exception', level: 'warn' }],
  },
  {
    chainCode: 'vendor_to_bcp_impact',
    nameEn: 'Vendor to BCP Impact Chain',
    nameAr: 'سلسلة الموردين إلى أثر استمرارية الأعمال',
    steps: [
      { stepNo: 1, moduleCode: 'vendor', eventTrigger: 'vendor.dd_completed', taskType: 'vendor_risk_propagation', roleCode: 'vendor_assessor', slaHours: 48, nextEvent: 'risk.vendor_propagated' },
      { stepNo: 2, moduleCode: 'risk', eventTrigger: 'risk.vendor_propagated', taskType: 'risk_assessment', roleCode: 'risk_analyst', slaHours: 72, nextEvent: 'risk.assessed' },
      { stepNo: 3, moduleCode: 'bcp', eventTrigger: 'bcp.vendor_impact', taskType: 'verification', roleCode: 'bc_lead', slaHours: 96, nextEvent: 'bcp.updated' },
    ],
    sodRules: [{ roleA: 'vendor_assessor', moduleA: 'vendor', roleB: 'risk_approver', moduleB: 'risk', level: 'warn' }],
  },
  {
    chainCode: 'training_to_compliance',
    nameEn: 'Training Completion → Compliance Update',
    nameAr: 'سلسلة إكمال التدريب إلى تحديث الامتثال',
    steps: [
      { stepNo: 1, moduleCode: 'training', eventTrigger: 'training.completed', taskType: 'verification', roleCode: 'training_manager', slaHours: 48 },
      { stepNo: 2, moduleCode: 'compliance', eventTrigger: 'training.verified', taskType: 'control_review', roleCode: 'compliance_analyst', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'asset_to_risk',
    nameEn: 'Asset Classification → Risk Assessment',
    nameAr: 'سلسلة تصنيف الأصول إلى تقييم المخاطر',
    steps: [
      { stepNo: 1, moduleCode: 'asset', eventTrigger: 'asset.classified', taskType: 'risk_assessment', roleCode: 'asset_owner', slaHours: 48 },
      { stepNo: 2, moduleCode: 'risk', eventTrigger: 'asset.risk_linked', taskType: 'risk_assessment', roleCode: 'risk_analyst', slaHours: 168 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'exception_to_policy',
    nameEn: 'Exception Expiry → Policy Review',
    nameAr: 'سلسلة انتهاء الاستثناء إلى مراجعة السياسة',
    steps: [
      { stepNo: 1, moduleCode: 'exception', eventTrigger: 'exception.expired', taskType: 'verification', roleCode: 'compliance_lead', slaHours: 72 },
      { stepNo: 2, moduleCode: 'policy', eventTrigger: 'exception.review_needed', taskType: 'policy_creation', roleCode: 'policy_owner', slaHours: 336 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'compliance_gap_to_remediation',
    nameEn: 'Compliance Gap → Remediation Chain',
    nameAr: 'سلسلة فجوة الامتثال إلى المعالجة',
    steps: [
      { stepNo: 1, moduleCode: 'compliance', eventTrigger: 'compliance.gap_detected', taskType: 'control_review', roleCode: 'compliance_officer', slaHours: 48, nextEvent: 'remediation.required' },
      { stepNo: 2, moduleCode: 'remediation', eventTrigger: 'remediation.required', taskType: 'remediation', roleCode: 'remediation_owner', slaHours: 120, nextEvent: 'evidence.requested' },
      { stepNo: 3, moduleCode: 'evidence', eventTrigger: 'evidence.requested', taskType: 'evidence_request', roleCode: 'evidence_owner', slaHours: 96, nextEvent: 'compliance.posture_changed' },
    ],
    sodRules: [],
  },
  {
    chainCode: 'compliance_posture_to_reporting',
    nameEn: 'Compliance Posture Change → Board Report',
    nameAr: 'سلسلة تغير وضع الامتثال إلى تقرير مجلس الإدارة',
    steps: [
      { stepNo: 1, moduleCode: 'compliance', eventTrigger: 'compliance.posture_changed', taskType: 'verification', roleCode: 'compliance_manager', slaHours: 24, nextEvent: 'reporting.triggered' },
      { stepNo: 2, moduleCode: 'reporting', eventTrigger: 'reporting.triggered', taskType: 'report_generation', roleCode: 'admin', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'governance_charter_to_review',
    nameEn: 'Governance Charter Expiry → Review Chain',
    nameAr: 'سلسلة انتهاء ميثاق الحوكمة إلى المراجعة',
    steps: [
      { stepNo: 1, moduleCode: 'governance', eventTrigger: 'governance.charter_expired', taskType: 'approval', roleCode: 'governance_manager', slaHours: 72, nextEvent: 'policy.review_required' },
      { stepNo: 2, moduleCode: 'policy', eventTrigger: 'policy.review_required', taskType: 'policy_creation', roleCode: 'policy_owner', slaHours: 168 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'governance_mandate_to_compliance',
    nameEn: 'Governance Mandate Update → Compliance Check',
    nameAr: 'سلسلة تحديث التفويض إلى فحص الامتثال',
    steps: [
      { stepNo: 1, moduleCode: 'governance', eventTrigger: 'governance.mandate_updated', taskType: 'approval', roleCode: 'governance_manager', slaHours: 48, nextEvent: 'compliance.review_required' },
      { stepNo: 2, moduleCode: 'compliance', eventTrigger: 'compliance.review_required', taskType: 'control_review', roleCode: 'compliance_officer', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'bcp_activation_to_incident',
    nameEn: 'BCP Plan Activated → Incident & Governance Review',
    nameAr: 'سلسلة تفعيل خطة استمرارية الأعمال إلى الحوادث والحوكمة',
    steps: [
      { stepNo: 1, moduleCode: 'bcp', eventTrigger: 'bcp.plan_activated', taskType: 'incident_response', roleCode: 'bc_lead', slaHours: 4, nextEvent: 'governance.review_required' },
      { stepNo: 2, moduleCode: 'governance', eventTrigger: 'governance.review_required', taskType: 'approval', roleCode: 'governance_manager', slaHours: 24 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'bcp_crisis_to_escalation',
    nameEn: 'BCP Crisis Readiness Low → Escalation',
    nameAr: 'سلسلة انخفاض جاهزية الأزمات إلى التصعيد',
    steps: [
      { stepNo: 1, moduleCode: 'bcp', eventTrigger: 'bcp.crisis_readiness_low', taskType: 'verification', roleCode: 'bc_lead', slaHours: 24, nextEvent: 'risk.assessment_required' },
      { stepNo: 2, moduleCode: 'risk', eventTrigger: 'risk.assessment_required', taskType: 'risk_assessment', roleCode: 'risk_manager', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'foundation_scope_to_compliance',
    nameEn: 'Foundation Scope Change → Compliance Reassessment',
    nameAr: 'سلسلة تغيير النطاق إلى إعادة تقييم الامتثال',
    steps: [
      { stepNo: 1, moduleCode: 'foundation', eventTrigger: 'foundation.scope_changed', taskType: 'foundation_review', roleCode: 'admin', slaHours: 24, nextEvent: 'compliance.review_required' },
      { stepNo: 2, moduleCode: 'compliance', eventTrigger: 'compliance.review_required', taskType: 'control_review', roleCode: 'compliance_officer', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'integration_failure_to_review',
    nameEn: 'Integration Sync Failure → Health Check',
    nameAr: 'سلسلة فشل المزامنة إلى فحص السلامة',
    steps: [
      { stepNo: 1, moduleCode: 'integrations', eventTrigger: 'integrations.sync_failed', taskType: 'integration_health_check', roleCode: 'admin', slaHours: 4, nextEvent: 'admin.review_required' },
      { stepNo: 2, moduleCode: 'admin', eventTrigger: 'admin.review_required', taskType: 'admin_review', roleCode: 'admin', slaHours: 24 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'issue_to_remediation',
    nameEn: 'Issue Created → Triage → Remediation',
    nameAr: 'سلسلة إنشاء المشكلة إلى الفرز والمعالجة',
    steps: [
      { stepNo: 1, moduleCode: 'issues', eventTrigger: 'issues.created', taskType: 'issue_triage', roleCode: 'manager', slaHours: 24, nextEvent: 'remediation.required' },
      { stepNo: 2, moduleCode: 'remediation', eventTrigger: 'remediation.required', taskType: 'remediation', roleCode: 'remediation_owner', slaHours: 120 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'issue_escalation_to_governance',
    nameEn: 'Issue Escalated → Governance Review',
    nameAr: 'سلسلة تصعيد المشكلة إلى مراجعة الحوكمة',
    steps: [
      { stepNo: 1, moduleCode: 'issues', eventTrigger: 'issues.escalated', taskType: 'issue_triage', roleCode: 'manager', slaHours: 8, nextEvent: 'governance.review_required' },
      { stepNo: 2, moduleCode: 'governance', eventTrigger: 'governance.review_required', taskType: 'approval', roleCode: 'governance_manager', slaHours: 48 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'privacy_breach_to_notification',
    nameEn: 'Privacy Breach → Notification → Governance',
    nameAr: 'سلسلة خرق الخصوصية إلى الإخطار والحوكمة',
    steps: [
      { stepNo: 1, moduleCode: 'privacy', eventTrigger: 'privacy.breach_detected', taskType: 'privacy_breach_response', roleCode: 'compliance_officer', slaHours: 4, nextEvent: 'governance.review_required' },
      { stepNo: 2, moduleCode: 'governance', eventTrigger: 'governance.review_required', taskType: 'approval', roleCode: 'governance_manager', slaHours: 24, nextEvent: 'notification.required' },
      { stepNo: 3, moduleCode: 'notification', eventTrigger: 'notification.required', taskType: 'verification', roleCode: 'admin', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'privacy_dsr_to_compliance',
    nameEn: 'Privacy DSR → Compliance Review',
    nameAr: 'سلسلة طلب صاحب البيانات إلى مراجعة الامتثال',
    steps: [
      { stepNo: 1, moduleCode: 'privacy', eventTrigger: 'privacy.dsr_received', taskType: 'privacy_review', roleCode: 'compliance_officer', slaHours: 24, nextEvent: 'compliance.review_required' },
      { stepNo: 2, moduleCode: 'compliance', eventTrigger: 'compliance.review_required', taskType: 'control_review', roleCode: 'compliance_officer', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'records_disposal_to_governance',
    nameEn: 'Records Disposal Request → Governance Approval',
    nameAr: 'سلسلة طلب إتلاف السجلات إلى موافقة الحوكمة',
    steps: [
      { stepNo: 1, moduleCode: 'records', eventTrigger: 'records.disposal_requested', taskType: 'records_review', roleCode: 'manager', slaHours: 48, nextEvent: 'governance.approval_required' },
      { stepNo: 2, moduleCode: 'governance', eventTrigger: 'governance.approval_required', taskType: 'approval', roleCode: 'governance_manager', slaHours: 72 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'inbox_escalation_to_workflow',
    nameEn: 'Inbox Priority Escalation → Workflow Trigger',
    nameAr: 'سلسلة تصعيد الأولوية إلى تشغيل سير العمل',
    steps: [
      { stepNo: 1, moduleCode: 'inbox', eventTrigger: 'inbox.priority_escalated', taskType: 'workflow_trigger', roleCode: 'manager', slaHours: 8, nextEvent: 'workflow.triggered' },
      { stepNo: 2, moduleCode: 'workflow', eventTrigger: 'workflow.triggered', taskType: 'workflow_task', roleCode: 'admin', slaHours: 24 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'portal_access_denied_to_review',
    nameEn: 'Portal Access Denied → Security Review',
    nameAr: 'سلسلة رفض الوصول إلى مراجعة الأمن',
    steps: [
      { stepNo: 1, moduleCode: 'portals', eventTrigger: 'portals.access_denied', taskType: 'portal_review', roleCode: 'admin', slaHours: 12, nextEvent: 'admin.review_required' },
      { stepNo: 2, moduleCode: 'admin', eventTrigger: 'admin.review_required', taskType: 'admin_review', roleCode: 'admin', slaHours: 24 },
    ],
    sodRules: [],
  },
  {
    chainCode: 'portal_suspended_to_vendor',
    nameEn: 'Portal Suspended → Vendor Review',
    nameAr: 'سلسلة تعليق البوابة إلى مراجعة المورد',
    steps: [
      { stepNo: 1, moduleCode: 'portals', eventTrigger: 'portals.suspended', taskType: 'portal_review', roleCode: 'admin', slaHours: 4, nextEvent: 'vendor.review_required' },
      { stepNo: 2, moduleCode: 'vendor', eventTrigger: 'vendor.review_required', taskType: 'verification', roleCode: 'admin', slaHours: 48 },
    ],
    sodRules: [],
  },
];

export class ChainDefinitionSeedInstaller implements SeedInstaller {
  key = 'install_chain_definitions';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    const warnings: string[] = [];
    try {
      const result = await query(
        `SET search_path TO "${ctx.schemaName}", public; SELECT COUNT(*) as cnt FROM workflow_chain_definitions WHERE is_active = TRUE`
      );
      const count = parseInt(result.rows[0]?.cnt || '0', 10);
      if (count < 1) {
        warnings.push('No active chain definitions found after seeding');
      }
    } catch {
      warnings.push('workflow_chain_definitions table may not exist');
    }
    return { valid: true, errors: [], warnings };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const { schemaName } = ctx;
    let created = 0;
    const warnings: string[] = [];

    for (const def of CHAIN_DEFINITIONS) {
      try {
        const result = await query(
          `INSERT INTO "${schemaName}".workflow_chain_definitions
           (chain_code, name_en, name_ar, steps, sod_rules, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, TRUE, NOW(), NOW())
           ON CONFLICT (chain_code) DO NOTHING
           RETURNING chain_code`,
          [def.chainCode, def.nameEn, def.nameAr, JSON.stringify(def.steps), JSON.stringify(def.sodRules)]
        );
        if (result.rows?.length > 0) created++;
      } catch {
        warnings.push(`Failed to seed chain definition: ${def.chainCode}`);
      }
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      warnings,
      details: { chainDefinitionsSeeded: created, totalDefinitions: CHAIN_DEFINITIONS.length },
    };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    const codes = CHAIN_DEFINITIONS.map(d => d.chainCode);
    await query(
      `DELETE FROM "${ctx.schemaName}".workflow_chain_definitions WHERE chain_code = ANY($1)`,
      [codes]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}

export const CHAIN_DEFINITION_COUNT = CHAIN_DEFINITIONS.length;
