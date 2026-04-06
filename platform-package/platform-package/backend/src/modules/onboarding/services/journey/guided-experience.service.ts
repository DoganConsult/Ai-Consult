// @ts-nocheck
// ============================================
// Shahin — Guided Experience Service
// Eliminates ALL user questions by providing:
//
// 1. Workspace Setup Progress Tracker
//    "Your workspace is 45% set up. Next: add team members."
//
// 2. Role-Based "What To Do Next" Engine
//    "You are a Control Owner. Do THIS now."
//
// 3. Team Setup Wizard Steps
//    "Step 1: Invite your team. Step 2: Assign roles."
//
// 4. Contextual Help Per Hub/Page
//    "This page is for X. Here's how to use it."
//
// 5. Getting-Started Checklist Per Role
//    "As an Auditor, complete these 5 things first."
//
// 6. Common Q&A Per Context
//    "How do I add a team member?" → answer + route
//
// Zero GRC experience needed. Zero support questions.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SetupStep {
  id: string;
  order: number;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  route: string;
  icon: string;
  checkQuery?: string;
  completed: boolean;
  category: 'workspace' | 'team' | 'governance' | 'compliance' | 'operations';
}

export interface SetupProgress {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  currentStep: SetupStep | null;
  steps: SetupStep[];
  phase: 'not_started' | 'initial_setup' | 'team_setup' | 'framework_setup' | 'operational' | 'mature';
}

export interface NextAction {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  route: string;
  icon: string;
  category: string;
  estimatedMinutes: number;
}

export interface PageHelp {
  pageId: string;
  route: string;
  title: string;
  titleAr: string;
  purpose: string;
  purposeAr: string;
  howToUse: string[];
  howToUseAr: string[];
  commonActions: Array<{ label: string; labelAr: string; description: string; descriptionAr: string; route?: string }>;
  relatedPages: Array<{ route: string; label: string; labelAr: string }>;
  faq: Array<{ question: string; questionAr: string; answer: string; answerAr: string }>;
}

export interface GettingStartedItem {
  id: string;
  order: number;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  route: string;
  icon: string;
  completed: boolean;
}

export interface TeamSetupStep {
  id: string;
  order: number;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  route: string;
  action: string;
  completed: boolean;
}

// ── Workspace Setup Steps ────────────────────────────────────────────────────

const SETUP_STEPS: Omit<SetupStep, 'completed'>[] = [
  // Workspace
  { id: 'complete-onboarding', order: 1, label: 'Complete Onboarding', labelAr: 'إكمال الإعداد الأولي', description: 'Answer onboarding questions to configure your workspace', descriptionAr: 'أجب على أسئلة الإعداد لتهيئة مساحة العمل', route: '/onboarding', icon: 'rocket', category: 'workspace' },
  { id: 'review-profile', order: 2, label: 'Review Organization Profile', labelAr: 'مراجعة ملف المنظمة', description: 'Verify your organization name, industry, and compliance requirements', descriptionAr: 'تحقق من اسم المنظمة والقطاع ومتطلبات الامتثال', route: '/tenant-config', icon: 'building', category: 'workspace' },

  // Team
  { id: 'invite-team', order: 3, label: 'Add Team Members', labelAr: 'إضافة أعضاء الفريق', description: 'Go to Admin Hub → Administration tab to add users to your workspace', descriptionAr: 'اذهب إلى مركز الإدارة ← تبويب الإدارة لإضافة مستخدمين لمساحة العمل', route: '/admin-hub', icon: 'users', category: 'team' },
  { id: 'assign-roles', order: 4, label: 'Assign Roles to Team Members', labelAr: 'تعيين الأدوار لأعضاء الفريق', description: 'Go to Team Hub → Members & Org tab → click a user → Change Role', descriptionAr: 'اذهب إلى مركز الفريق ← تبويب الأعضاء ← انقر على مستخدم ← تغيير الدور', route: '/team-hub?tab=members', icon: 'shield', category: 'team' },
  { id: 'create-teams', order: 5, label: 'Create Teams', labelAr: 'إنشاء الفرق', description: 'Go to Team Hub → Teams & RACI tab → click "New Team" to create teams for task distribution', descriptionAr: 'اذهب إلى مركز الفريق ← تبويب الفرق ← انقر "فريق جديد" لإنشاء فرق لتوزيع المهام', route: '/team-hub?tab=teams', icon: 'users', category: 'team' },

  // Governance
  { id: 'review-frameworks', order: 6, label: 'Review Selected Frameworks', labelAr: 'مراجعة الأطر المختارة', description: 'Confirm which frameworks apply (NCA ECC, SAMA CSF, ISO 27001, PDPL)', descriptionAr: 'أكّد الأطر المطبقة (NCA ECC, SAMA CSF, ISO 27001, PDPL)', route: '/framework-hub', icon: 'book', category: 'governance' },
  { id: 'review-policies', order: 7, label: 'Review Auto-Generated Policies', labelAr: 'مراجعة السياسات المولّدة تلقائياً', description: 'Review and approve the policies generated during onboarding', descriptionAr: 'راجع واعتمد السياسات المولّدة أثناء الإعداد', route: '/governance-hub', icon: 'file-text', category: 'governance' },
  { id: 'assign-control-owners', order: 8, label: 'Assign Control Owners', labelAr: 'تعيين مالكي الضوابط', description: 'Go to Compliance Hub → click a control → assign an owner from your team', descriptionAr: 'اذهب إلى مركز الامتثال ← انقر على ضابط ← عيّن مالكاً من فريقك', route: '/compliance-hub', icon: 'user-check', category: 'governance' },

  // Compliance
  { id: 'baseline-assessment', order: 9, label: 'Run Baseline Assessment', labelAr: 'تشغيل التقييم الأساسي', description: 'Assess current control implementation status across frameworks', descriptionAr: 'قيّم حالة تنفيذ الضوابط الحالية عبر الأطر', route: '/compliance-hub', icon: 'clipboard-check', category: 'compliance' },
  { id: 'upload-evidence', order: 10, label: 'Submit Initial Evidence', labelAr: 'تقديم الأدلة الأولية', description: 'Go to Evidence Hub → click "Submit Evidence" to upload policies, certifications, and evidence documents', descriptionAr: 'اذهب إلى مركز الأدلة ← انقر "تقديم دليل" لرفع السياسات والشهادات والأدلة', route: '/evidence-hub', icon: 'upload', category: 'compliance' },
  { id: 'risk-register', order: 11, label: 'Populate Risk Register', labelAr: 'ملء سجل المخاطر', description: 'Review auto-generated risks and add any additional risks', descriptionAr: 'راجع المخاطر المولّدة تلقائياً وأضف أي مخاطر إضافية', route: '/risk-hub', icon: 'alert-triangle', category: 'compliance' },

  // Operations
  { id: 'review-90day', order: 12, label: 'Review 90-Day Plan', labelAr: 'مراجعة خطة 90 يوماً', description: 'Review the auto-generated 90-day implementation roadmap', descriptionAr: 'راجع خريطة التنفيذ المولّدة تلقائياً لمدة 90 يوماً', route: '/ninety-day-plan', icon: 'calendar', category: 'operations' },
  { id: 'configure-cadence', order: 13, label: 'Configure Review Cadence', labelAr: 'تهيئة دورة المراجعة', description: 'Set up recurring review schedules (weekly, monthly, quarterly)', descriptionAr: 'أعدّ جداول المراجعة المتكررة (أسبوعية، شهرية، ربع سنوية)', route: '/cadence-calendar', icon: 'clock', category: 'operations' },
  { id: 'setup-notifications', order: 14, label: 'Configure Notifications', labelAr: 'تهيئة الإشعارات', description: 'Set notification preferences for your team', descriptionAr: 'أعدّ تفضيلات الإشعارات لفريقك', route: '/notification-preferences', icon: 'bell', category: 'operations' },
];

// ── Contextual Help Per Hub ──────────────────────────────────────────────────

const PAGE_HELP: Record<string, PageHelp> = {
  '/workspace-home': {
    pageId: 'workspace-home', route: '/workspace-home',
    title: 'Dashboard', titleAr: 'لوحة المعلومات',
    purpose: 'Your command center. See overall compliance score, top risks, overdue items, and team activity at a glance.',
    purposeAr: 'مركز التحكم الخاص بك. اطلع على نسبة الامتثال الإجمالية والمخاطر الرئيسية والعناصر المتأخرة ونشاط الفريق.',
    howToUse: ['Check the KPI cards at the top — Frameworks, Risks, Controls, Policies', 'Review the KSA Compliance Posture row (NCA ECC score, regulators)', 'Look at the D3 charts — Compliance donut, Risk bars, Control status', 'Scroll down to see your role-filtered dashboard widgets'],
    howToUseAr: ['تحقق من بطاقات مؤشرات الأداء في الأعلى — الأطر، المخاطر، الضوابط، السياسات', 'راجع صف وضع الامتثال السعودي (NCA ECC، الجهات التنظيمية)', 'انظر إلى مخططات D3 — دائرة الامتثال، أعمدة المخاطر، حالة الضوابط', 'انتقل لأسفل لمشاهدة لوحات المعلومات المصفاة حسب دورك'],
    commonActions: [
      { label: 'Go to Reports Hub', labelAr: 'الذهاب لمركز التقارير', description: 'Navigate to Reports Hub to generate PDF/Excel reports', descriptionAr: 'انتقل إلى مركز التقارير لإنشاء تقارير PDF/Excel' },
      { label: 'View AI Agent Network', labelAr: 'عرض شبكة وكلاء الذكاء الاصطناعي', description: 'See the 10 AI agents powering your GRC program', descriptionAr: 'شاهد 10 وكلاء ذكاء اصطناعي يديرون برنامج الحوكمة' },
    ],
    relatedPages: [
      { route: '/analytics-hub', label: 'Analytics Hub', labelAr: 'مركز التحليلات' },
      { route: '/reports-hub', label: 'Reports Hub', labelAr: 'مركز التقارير' },
    ],
    faq: [
      { question: 'Why is my compliance score low?', questionAr: 'لماذا نسبة الامتثال منخفضة؟', answer: 'The score reflects how many controls are fully implemented and have valid evidence. Go to Compliance Hub to see which controls need attention.', answerAr: 'النسبة تعكس عدد الضوابط المنفذة بالكامل والتي لديها أدلة صالحة. اذهب إلى مركز الامتثال لمعرفة الضوابط التي تحتاج اهتمام.' },
      { question: 'How do I add team members?', questionAr: 'كيف أضيف أعضاء الفريق؟', answer: 'Go to Admin Hub → Administration tab to add new users. Then go to Team Hub → Members & Org tab to change their roles.', answerAr: 'اذهب إلى مركز الإدارة ← تبويب الإدارة لإضافة مستخدمين جدد. ثم اذهب لمركز الفريق ← تبويب الأعضاء لتغيير أدوارهم.' },
    ],
  },

  '/team-hub': {
    pageId: 'team-hub', route: '/team-hub',
    title: 'Team Hub', titleAr: 'مركز الفريق',
    purpose: 'Three tabs: Teams & RACI (create teams, assign RACI roles), Members & Org (view members, change roles, org settings), Role Profiles (view role definitions and permissions).',
    purposeAr: 'ثلاث تبويبات: الفرق و RACI (إنشاء الفرق، تعيين أدوار RACI)، الأعضاء والمنظمة (عرض الأعضاء، تغيير الأدوار، إعدادات المنظمة)، ملفات الأدوار (عرض تعريفات الأدوار والصلاحيات).',
    howToUse: ['Teams & RACI tab: click "New Team" to create a team, use "Assign RACI role" to link teams to workflows', 'Members & Org tab: view all workspace members, click the edit icon on any user to change their role', 'Role Profiles tab: see all available roles, their permissions, and which members have each role', 'To ADD new users: go to Admin Hub → Administration tab instead (Team Hub only manages existing members)'],
    howToUseAr: ['تبويب الفرق و RACI: انقر "فريق جديد" لإنشاء فريق، استخدم "تعيين دور RACI" لربط الفرق بسير العمل', 'تبويب الأعضاء والمنظمة: عرض جميع أعضاء مساحة العمل، انقر أيقونة التعديل على أي مستخدم لتغيير دوره', 'تبويب ملفات الأدوار: شاهد جميع الأدوار المتاحة وصلاحياتها وأي الأعضاء لديهم كل دور', 'لإضافة مستخدمين جدد: اذهب إلى مركز الإدارة ← تبويب الإدارة بدلاً من ذلك (مركز الفريق يدير الأعضاء الحاليين فقط)'],
    commonActions: [
      { label: 'New Team', labelAr: 'فريق جديد', description: 'Teams & RACI tab → click "New Team" → enter bilingual name → Create', descriptionAr: 'تبويب الفرق ← انقر "فريق جديد" ← أدخل الاسم بلغتين ← إنشاء' },
      { label: 'Change Role', labelAr: 'تغيير الدور', description: 'Members & Org tab → click the pencil icon on a user → select new role → Save', descriptionAr: 'تبويب الأعضاء ← انقر أيقونة القلم على مستخدم ← اختر الدور الجديد ← حفظ' },
      { label: 'Assign RACI', labelAr: 'تعيين RACI', description: 'Teams & RACI tab → expand a team → click "Assign RACI role" → choose scope, role, notes', descriptionAr: 'تبويب الفرق ← وسّع فريقاً ← انقر "تعيين دور RACI" ← اختر النطاق والدور والملاحظات' },
    ],
    relatedPages: [
      { route: '/admin-hub', label: 'Admin Hub (add new users)', labelAr: 'مركز الإدارة (إضافة مستخدمين جدد)' },
      { route: '/operations-hub', label: 'Operations Hub', labelAr: 'مركز العمليات' },
    ],
    faq: [
      { question: 'How do I add a new user to the workspace?', questionAr: 'كيف أضيف مستخدم جديد لمساحة العمل؟', answer: 'Team Hub does NOT add users. Go to Admin Hub → Administration tab to create new user accounts. Once added, come back to Team Hub → Members & Org tab to change their role.', answerAr: 'مركز الفريق لا يضيف مستخدمين. اذهب إلى مركز الإدارة ← تبويب الإدارة لإنشاء حسابات جديدة. بعد الإضافة، ارجع لمركز الفريق ← تبويب الأعضاء لتغيير أدوارهم.' },
      { question: 'What role should I assign to my team members?', questionAr: 'أي دور أعيّنه لأعضاء فريقي؟', answer: 'Owner: top-level approver. Admin: full access. Compliance Officer: runs GRC program. Risk Manager: manages risks. Auditor: tests controls. User: implements controls and submits evidence. Viewer: read-only.', answerAr: 'المالك: الموافق الأعلى. المدير: وصول كامل. مسؤول الامتثال: يدير البرنامج. مدير المخاطر: يدير المخاطر. المدقق: يختبر الضوابط. المستخدم: ينفذ الضوابط. العارض: قراءة فقط.' },
      { question: 'Can I invite external consultants or auditors?', questionAr: 'هل يمكنني دعوة مستشارين أو مدققين خارجيين؟', answer: 'Yes! For vendors: use Vendor Hub to send questionnaires via magic-link. For external auditors/consultants: use the invitation system. They get scoped, time-limited access.', answerAr: 'نعم! للموردين: استخدم مركز الموردين لإرسال استبيانات عبر رابط سحري. للمدققين/المستشارين الخارجيين: استخدم نظام الدعوات. يحصلون على وصول محدود ومؤقت.' },
    ],
  },

  '/governance-hub': {
    pageId: 'governance-hub', route: '/governance-hub',
    title: 'Governance Hub', titleAr: 'مركز الحوكمة',
    purpose: 'Five tabs: Governance (structure overview), Policies (review/approve/edit), Policy Code (machine-readable rules), Ontology (entity catalog), Taxonomy (classification). Foundation of your GRC program.',
    purposeAr: 'خمس تبويبات: الحوكمة (هيكل عام)، السياسات (مراجعة/اعتماد/تعديل)، كود السياسات (قواعد آلية)، الأنطولوجيا (فهرس الكيانات)، التصنيف. أساس برنامج الحوكمة.',
    howToUse: ['Governance tab: review overall governance structure', 'Policies tab: review auto-generated policies — approve, edit, or reject each one', 'Policy Code tab: view machine-readable policy rules (policy-as-code)', 'Ontology tab: browse entity catalog and relationships', 'Taxonomy tab: manage classification hierarchies'],
    howToUseAr: ['تبويب الحوكمة: مراجعة هيكل الحوكمة العام', 'تبويب السياسات: مراجعة السياسات المولّدة — اعتمد أو عدّل أو ارفض', 'تبويب كود السياسات: عرض قواعد السياسات الآلية', 'تبويب الأنطولوجيا: تصفح فهرس الكيانات والعلاقات', 'تبويب التصنيف: إدارة التصنيفات الهرمية'],
    commonActions: [
      { label: 'Review Policy', labelAr: 'مراجعة سياسة', description: 'Policies tab → click a policy → review and approve or edit', descriptionAr: 'تبويب السياسات ← انقر على سياسة ← راجع واعتمد أو عدّل' },
      { label: 'View Policy Code', labelAr: 'عرض كود السياسات', description: 'Policy Code tab → browse machine-readable rules', descriptionAr: 'تبويب كود السياسات ← تصفح القواعد الآلية' },
    ],
    relatedPages: [
      { route: '/compliance-hub', label: 'Compliance Hub', labelAr: 'مركز الامتثال' },
      { route: '/framework-hub', label: 'Framework Hub', labelAr: 'مركز الأطر' },
    ],
    faq: [
      { question: 'Where did these policies come from?', questionAr: 'من أين جاءت هذه السياسات؟', answer: 'They were auto-generated based on your onboarding answers. The AI inferred which policies your organization needs based on your industry, size, and selected frameworks. Review and customize them.', answerAr: 'تم توليدها تلقائياً بناءً على إجاباتك في الإعداد. استنتج الذكاء الاصطناعي السياسات التي تحتاجها منظمتك. راجعها وخصصها.' },
    ],
  },

  '/compliance-hub': {
    pageId: 'compliance-hub', route: '/compliance-hub',
    title: 'Compliance Hub', titleAr: 'مركز الامتثال',
    purpose: 'Four tabs: Compliance (controls list and status), Assessments (formal evaluations), Templates (assessment templates), Findings (issues discovered). Track implementation across all frameworks.',
    purposeAr: 'أربع تبويبات: الامتثال (قائمة الضوابط والحالة)، التقييمات (التقييمات الرسمية)، القوالب (قوالب التقييمات)، النتائج (المشاكل المكتشفة). تتبع التنفيذ عبر جميع الأطر.',
    howToUse: ['Compliance tab: see all controls — click any control to update status or assign owner', 'Assessments tab: start and manage formal compliance assessments', 'Templates tab: create or edit assessment templates for reuse', 'Findings tab: track gaps and remediation tasks discovered during assessments'],
    howToUseAr: ['تبويب الامتثال: شاهد جميع الضوابط — انقر على أي ضابط لتحديث الحالة أو تعيين المالك', 'تبويب التقييمات: ابدأ وأدِر تقييمات الامتثال الرسمية', 'تبويب القوالب: أنشئ أو عدّل قوالب التقييمات لإعادة الاستخدام', 'تبويب النتائج: تتبع الفجوات ومهام المعالجة المكتشفة أثناء التقييمات'],
    commonActions: [
      { label: 'Update Control Status', labelAr: 'تحديث حالة الضابط', description: 'Compliance tab → click a control → change status to implemented/in-progress/not-started', descriptionAr: 'تبويب الامتثال ← انقر على ضابط ← غيّر الحالة إلى منفذ/قيد التنفيذ/لم يبدأ' },
      { label: 'Run Assessment', labelAr: 'تشغيل تقييم', description: 'Assessments tab → create a new assessment from a template', descriptionAr: 'تبويب التقييمات ← أنشئ تقييماً جديداً من قالب' },
    ],
    relatedPages: [
      { route: '/evidence-hub', label: 'Evidence Hub', labelAr: 'مركز الأدلة' },
      { route: '/governance-hub', label: 'Governance Hub', labelAr: 'مركز الحوكمة' },
    ],
    faq: [
      { question: 'What does "Not Started" mean for a control?', questionAr: 'ماذا تعني "لم يبدأ" للضابط؟', answer: 'It means no implementation work has been done yet. Click the control to add implementation notes and set a target date. Upload evidence once you implement it.', answerAr: 'تعني أنه لم يُنجز أي عمل تنفيذ بعد. انقر على الضابط لإضافة ملاحظات وتعيين تاريخ مستهدف. ارفع الأدلة بعد تنفيذه.' },
    ],
  },

  '/evidence-hub': {
    pageId: 'evidence-hub', route: '/evidence-hub',
    title: 'Evidence Hub', titleAr: 'مركز الأدلة',
    purpose: 'Three tabs: Evidence (submit & manage evidence items), Evidence Catalog (browse all evidence), Evidence Tasks (track evidence collection tasks). Proves your controls are implemented.',
    purposeAr: 'ثلاث تبويبات: الأدلة (تقديم وإدارة عناصر الأدلة)، فهرس الأدلة (تصفح جميع الأدلة)، مهام الأدلة (تتبع مهام جمع الأدلة). تثبت أن ضوابطك منفذة.',
    howToUse: ['Evidence tab: click "Submit Evidence" (upload icon) to submit a new evidence item linked to a control', 'Use the "Verify Chain" button to verify evidence integrity (blockchain-style hash chain)', 'Filter by evidence type using the dropdown', 'Check expiring evidence — items with yellow "Expiring" tags need renewal'],
    howToUseAr: ['تبويب الأدلة: انقر "تقديم دليل" (أيقونة الرفع) لتقديم عنصر أدلة جديد مرتبط بضابط', 'استخدم زر "التحقق من السلسلة" للتحقق من سلامة الأدلة (سلسلة تجزئة)', 'صفّي حسب نوع الأدلة باستخدام القائمة المنسدلة', 'تحقق من الأدلة المنتهية — العناصر ذات علامة "تنتهي قريباً" تحتاج تجديد'],
    commonActions: [
      { label: 'Submit Evidence', labelAr: 'تقديم دليل', description: 'Evidence tab → click "Submit Evidence" button → fill form with control ID, type, and content', descriptionAr: 'تبويب الأدلة ← انقر زر "تقديم دليل" ← املأ النموذج بمعرف الضابط والنوع والمحتوى' },
      { label: 'Verify Chain', labelAr: 'التحقق من السلسلة', description: 'Click "Verify" button to check evidence hash chain integrity', descriptionAr: 'انقر زر "التحقق" للتحقق من سلامة سلسلة تجزئة الأدلة' },
    ],
    relatedPages: [
      { route: '/compliance-hub', label: 'Compliance Hub', labelAr: 'مركز الامتثال' },
      { route: '/audit-hub', label: 'Audit Hub', labelAr: 'مركز التدقيق' },
    ],
    faq: [
      { question: 'What counts as evidence?', questionAr: 'ما الذي يعتبر دليلاً؟', answer: 'Anything that proves a control is working: approved policy documents, system configuration screenshots, access review logs, training completion records, penetration test reports, etc.', answerAr: 'أي شيء يثبت أن الضابط يعمل: مستندات سياسات معتمدة، لقطات تهيئة الأنظمة، سجلات مراجعة الوصول، سجلات التدريب، تقارير اختبار الاختراق.' },
    ],
  },

  '/risk-hub': {
    pageId: 'risk-hub', route: '/risk-hub',
    title: 'Risk Hub', titleAr: 'مركز المخاطر',
    purpose: 'Identify, assess, treat, and monitor risks across your organization.',
    purposeAr: 'تحديد وتقييم ومعالجة ومراقبة المخاطر عبر منظمتك.',
    howToUse: ['Review auto-identified risks from onboarding', 'Score each risk by likelihood and impact', 'Assign risk owners and treatment plans', 'Monitor the risk heatmap for trends'],
    howToUseAr: ['راجع المخاطر المحددة تلقائياً من الإعداد', 'قيّم كل خطر حسب الاحتمالية والتأثير', 'عيّن مالكي المخاطر وخطط المعالجة', 'راقب خريطة المخاطر الحرارية للاتجاهات'],
    commonActions: [
      { label: 'Add Risk', labelAr: 'إضافة خطر', description: 'Register a new risk', descriptionAr: 'تسجيل خطر جديد' },
      { label: 'Score Risk', labelAr: 'تقييم خطر', description: 'Set likelihood and impact for a risk', descriptionAr: 'تعيين الاحتمالية والتأثير لخطر' },
    ],
    relatedPages: [
      { route: '/vendor-hub', label: 'Vendor Hub', labelAr: 'مركز الموردين' },
      { route: '/incident-hub', label: 'Incident Hub', labelAr: 'مركز الحوادث' },
    ],
    faq: [
      { question: 'How do I decide the risk score?', questionAr: 'كيف أحدد درجة الخطر؟', answer: 'Score = Likelihood × Impact. Likelihood: how likely is it to happen (1-5). Impact: how bad would it be (1-5). Score ≥15 = Critical, 10-14 = High, 5-9 = Medium, 1-4 = Low.', answerAr: 'الدرجة = الاحتمالية × التأثير. الاحتمالية: ما مدى احتمال حدوثه (1-5). التأثير: ما مدى سوء الأثر (1-5). ≥15 = حرج، 10-14 = مرتفع، 5-9 = متوسط، 1-4 = منخفض.' },
    ],
  },

  '/vendor-hub': {
    pageId: 'vendor-hub', route: '/vendor-hub',
    title: 'Vendor Hub', titleAr: 'مركز الموردين',
    purpose: 'Manage vendor risk through questionnaires, evidence collection, and risk scoring.',
    purposeAr: 'إدارة مخاطر الموردين من خلال الاستبيانات وجمع الأدلة وتقييم المخاطر.',
    howToUse: ['Add your vendors and their contact information', 'Send due diligence questionnaires', 'Collect vendor evidence (SOC reports, certifications)', 'Review vendor risk scores and make accept/reject decisions'],
    howToUseAr: ['أضف مورديك ومعلومات التواصل معهم', 'أرسل استبيانات العناية الواجبة', 'اجمع أدلة الموردين (تقارير SOC، شهادات)', 'راجع درجات مخاطر الموردين واتخذ قرارات القبول/الرفض'],
    commonActions: [
      { label: 'Add Vendor', labelAr: 'إضافة مورد', description: 'Register a new vendor', descriptionAr: 'تسجيل مورد جديد' },
      { label: 'Send Questionnaire', labelAr: 'إرسال استبيان', description: 'Send a due diligence questionnaire to a vendor', descriptionAr: 'إرسال استبيان عناية واجبة لمورد' },
    ],
    relatedPages: [
      { route: '/risk-hub', label: 'Risk Hub', labelAr: 'مركز المخاطر' },
    ],
    faq: [
      { question: 'How do vendors respond to questionnaires?', questionAr: 'كيف يرد الموردون على الاستبيانات؟', answer: 'They receive a magic-link email invitation. They click the link, get scoped access to the Vendor Portal, answer the questionnaire, and upload their evidence. No account needed.', answerAr: 'يتلقون دعوة بريدية برابط سحري. ينقرون الرابط ويحصلون على وصول محدود لبوابة المورد ويجيبون على الاستبيان ويرفعون أدلتهم. لا يحتاجون حساب.' },
    ],
  },

  '/operations-hub': {
    pageId: 'operations-hub', route: '/operations-hub',
    title: 'Operations Hub', titleAr: 'مركز العمليات',
    purpose: 'Four tabs: Timeline (visual timeline of events), Messaging (team chat), Action Items (assigned action items), Activity Feed (real-time log of all actions).',
    purposeAr: 'أربع تبويبات: الجدول الزمني (عرض مرئي للأحداث)، المراسلة (محادثة الفريق)، عناصر الإجراءات (الإجراءات المعيّنة)، موجز النشاط (سجل مباشر لجميع الإجراءات).',
    howToUse: ['Timeline tab: see upcoming deadlines and past events in chronological order', 'Messaging tab: send messages to your team for collaboration', 'Action Items tab: view and update your assigned action items', 'Activity Feed tab: see a real-time log of everything happening in the workspace'],
    howToUseAr: ['تبويب الجدول الزمني: شاهد المواعيد النهائية القادمة والأحداث الماضية بالترتيب الزمني', 'تبويب المراسلة: أرسل رسائل لفريقك للتعاون', 'تبويب عناصر الإجراءات: اعرض وحدّث الإجراءات المعيّنة لك', 'تبويب موجز النشاط: شاهد سجلاً مباشراً لكل ما يحدث في مساحة العمل'],
    commonActions: [
      { label: 'View Action Items', labelAr: 'عرض عناصر الإجراءات', description: 'Action Items tab → see your assigned items and update their status', descriptionAr: 'تبويب عناصر الإجراءات ← شاهد العناصر المعيّنة لك وحدّث حالتها' },
      { label: 'Send Message', labelAr: 'إرسال رسالة', description: 'Messaging tab → type a message to your team', descriptionAr: 'تبويب المراسلة ← اكتب رسالة لفريقك' },
    ],
    relatedPages: [
      { route: '/incident-hub', label: 'Incident Hub', labelAr: 'مركز الحوادث' },
      { route: '/cadence-calendar', label: 'Cadence Calendar', labelAr: 'تقويم الدورات' },
    ],
    faq: [
      { question: 'How do I know what actions are assigned to me?', questionAr: 'كيف أعرف الإجراءات المعيّنة لي؟', answer: 'Go to the Action Items tab. Your assigned items are listed there. The system also sends notifications when new items are assigned to you.', answerAr: 'اذهب إلى تبويب عناصر الإجراءات. العناصر المعيّنة لك مدرجة هناك. النظام يرسل إشعارات أيضاً عند تعيين عناصر جديدة لك.' },
    ],
  },

  '/audit-hub': {
    pageId: 'audit-hub', route: '/audit-hub',
    title: 'Audit Hub', titleAr: 'مركز التدقيق',
    purpose: 'Four tabs: Audit (engagements & test plans), Audit Trail (chronological log of all changes), Audit Package (bundle evidence for regulators), Workpapers (working documents).',
    purposeAr: 'أربع تبويبات: التدقيق (المشاركات وخطط الاختبار)، مسار التدقيق (سجل زمني لجميع التغييرات)، حزمة التدقيق (تجميع الأدلة للجهات التنظيمية)، أوراق العمل (المستندات العاملة).',
    howToUse: ['Audit tab: manage audit engagements and create test plans for controls', 'Audit Trail tab: view a complete chronological log of all changes in the workspace', 'Audit Package tab: generate audit-ready packages bundling evidence, controls, and reports', 'Workpapers tab: manage supporting documents and working papers'],
    howToUseAr: ['تبويب التدقيق: إدارة مشاركات التدقيق وإنشاء خطط اختبار للضوابط', 'تبويب مسار التدقيق: عرض سجل زمني كامل لجميع التغييرات في مساحة العمل', 'تبويب حزمة التدقيق: إنشاء حزم جاهزة للتدقيق تجمع الأدلة والضوابط والتقارير', 'تبويب أوراق العمل: إدارة المستندات الداعمة وأوراق العمل'],
    commonActions: [
      { label: 'Generate Audit Package', labelAr: 'إنشاء حزمة تدقيق', description: 'Audit Package tab → generate a downloadable bundle of all evidence and controls', descriptionAr: 'تبويب حزمة التدقيق ← إنشاء حزمة قابلة للتحميل من جميع الأدلة والضوابط' },
      { label: 'View Audit Trail', labelAr: 'عرض مسار التدقيق', description: 'Audit Trail tab → see who changed what and when', descriptionAr: 'تبويب مسار التدقيق ← شاهد من غيّر ماذا ومتى' },
    ],
    relatedPages: [
      { route: '/evidence-hub', label: 'Evidence Hub', labelAr: 'مركز الأدلة' },
      { route: '/reports-hub', label: 'Reports Hub', labelAr: 'مركز التقارير' },
    ],
    faq: [
      { question: 'How do I prepare for an external audit?', questionAr: 'كيف أستعد لتدقيق خارجي؟', answer: 'Go to Audit Hub → Generate Audit Package. This bundles all evidence, control status, and compliance reports into a single downloadable package.', answerAr: 'اذهب إلى مركز التدقيق ← أنشئ حزمة تدقيق. هذا يجمع جميع الأدلة وحالة الضوابط وتقارير الامتثال في حزمة واحدة قابلة للتحميل.' },
    ],
  },

  '/reports-hub': {
    pageId: 'reports-hub', route: '/reports-hub',
    title: 'Reports Hub', titleAr: 'مركز التقارير',
    purpose: 'Four tabs: Report Center (quick reports), Report Hub (saved reports), Report Builder (custom report builder), Board Report (executive board reports). Bilingual Arabic/English output.',
    purposeAr: 'أربع تبويبات: مركز التقارير (تقارير سريعة)، محور التقارير (التقارير المحفوظة)، منشئ التقارير (بناء تقارير مخصصة)، تقرير مجلس الإدارة. إخراج ثنائي اللغة عربي/إنجليزي.',
    howToUse: ['Report Center tab: quick-access to common report types', 'Report Hub tab: browse and download previously generated reports', 'Report Builder tab: create custom reports by selecting scope, framework, and time period', 'Board Report tab: generate executive-level board reports'],
    howToUseAr: ['تبويب مركز التقارير: وصول سريع لأنواع التقارير الشائعة', 'تبويب محور التقارير: تصفح وتحميل التقارير المولّدة سابقاً', 'تبويب منشئ التقارير: إنشاء تقارير مخصصة باختيار النطاق والإطار والفترة', 'تبويب تقرير مجلس الإدارة: إنشاء تقارير على المستوى التنفيذي'],
    commonActions: [
      { label: 'Build Custom Report', labelAr: 'بناء تقرير مخصص', description: 'Report Builder tab → select scope and parameters → generate PDF/Excel', descriptionAr: 'تبويب منشئ التقارير ← اختر النطاق والمعايير ← أنشئ PDF/Excel' },
    ],
    relatedPages: [
      { route: '/analytics-hub', label: 'Analytics Hub', labelAr: 'مركز التحليلات' },
    ],
    faq: [],
  },

  '/admin-hub': {
    pageId: 'admin-hub', route: '/admin-hub',
    title: 'Admin Hub', titleAr: 'مركز الإدارة',
    purpose: 'Six tabs: Administration (user accounts), Field RBAC (field-level permissions), Inference Admin (AI configuration), Provisioning (system provisioning status), Bulk Import (CSV/Excel import), Training Data (AI training). This is where you ADD new users.',
    purposeAr: 'ست تبويبات: الإدارة (حسابات المستخدمين)، التحكم بالحقول (صلاحيات مستوى الحقل)، إدارة الاستدلال (تهيئة الذكاء الاصطناعي)، التزويد (حالة التزويد)، الاستيراد الجماعي (CSV/Excel)، بيانات التدريب. هنا تُضيف مستخدمين جدد.',
    howToUse: ['Administration tab: THIS is where you add new users to your workspace — create accounts and set initial roles', 'Field RBAC tab: configure field-level access controls for different roles', 'Bulk Import tab: import controls, risks, or policies from CSV/Excel files', 'Provisioning tab: view system provisioning jobs and their status'],
    howToUseAr: ['تبويب الإدارة: هنا تُضيف مستخدمين جدد لمساحة العمل — إنشاء حسابات وتعيين أدوار أولية', 'تبويب التحكم بالحقول: تهيئة ضوابط الوصول على مستوى الحقل لأدوار مختلفة', 'تبويب الاستيراد الجماعي: استيراد ضوابط أو مخاطر أو سياسات من ملفات CSV/Excel', 'تبويب التزويد: عرض حالة وظائف التزويد'],
    commonActions: [
      { label: 'Add User', labelAr: 'إضافة مستخدم', description: 'Administration tab → create a new user account with email, name, and role', descriptionAr: 'تبويب الإدارة ← إنشاء حساب مستخدم جديد بالبريد والاسم والدور', route: '/admin-hub?tab=admin' },
      { label: 'Bulk Import', labelAr: 'استيراد جماعي', description: 'Bulk Import tab → upload CSV/Excel to import controls, risks, or policies in bulk', descriptionAr: 'تبويب الاستيراد الجماعي ← رفع CSV/Excel لاستيراد ضوابط أو مخاطر أو سياسات بالجملة', route: '/admin-hub?tab=bulk' },
      { label: 'Manage Risks', labelAr: 'إدارة المخاطر', description: 'Navigate to Risk Hub to register, score, and treat risks', descriptionAr: 'انتقل إلى مركز المخاطر لتسجيل وتقييم ومعالجة المخاطر', route: '/risk-hub' },
      { label: 'Review Controls', labelAr: 'مراجعة الضوابط', description: 'Navigate to Compliance Hub to update control status and assign owners', descriptionAr: 'انتقل إلى مركز الامتثال لتحديث حالة الضوابط وتعيين المالكين', route: '/compliance-hub' },
      { label: 'Review Policies', labelAr: 'مراجعة السياسات', description: 'Navigate to Governance Hub to approve or edit auto-generated policies', descriptionAr: 'انتقل إلى مركز الحوكمة لاعتماد أو تعديل السياسات المولّدة', route: '/governance-hub' },
      { label: 'Collect Evidence', labelAr: 'جمع الأدلة', description: 'Navigate to Evidence Hub to submit and verify compliance evidence', descriptionAr: 'انتقل إلى مركز الأدلة لتقديم والتحقق من أدلة الامتثال', route: '/evidence-hub' },
    ],
    relatedPages: [
      { route: '/team-hub', label: 'Team Hub (manage roles & teams)', labelAr: 'مركز الفريق (إدارة الأدوار والفرق)' },
      { route: '/tenant-config', label: 'Tenant Config', labelAr: 'تهيئة المستأجر' },
      { route: '/risk-hub', label: 'Risk Hub', labelAr: 'مركز المخاطر' },
      { route: '/compliance-hub', label: 'Compliance Hub', labelAr: 'مركز الامتثال' },
      { route: '/governance-hub', label: 'Governance Hub', labelAr: 'مركز الحوكمة' },
      { route: '/evidence-hub', label: 'Evidence Hub', labelAr: 'مركز الأدلة' },
    ],
    faq: [
      { question: 'How do I add a new user to my workspace?', questionAr: 'كيف أضيف مستخدم جديد لمساحة العمل؟', answer: 'Admin Hub → Administration tab → create a new user account with their email and name. Then go to Team Hub → Members & Org tab to change their role if needed.', answerAr: 'مركز الإدارة ← تبويب الإدارة ← أنشئ حساب مستخدم جديد بالبريد والاسم. ثم اذهب لمركز الفريق ← تبويب الأعضاء لتغيير دوره إذا لزم الأمر.' },
    ],
  },

  '/foundation': {
    pageId: 'foundation', route: '/foundation',
    title: 'Foundation Center', titleAr: 'مركز الأساسيات',
    purpose: 'Manage your organization structure, business units, departments, users, roles, locations, and reference data. This is the bedrock of your GRC program.',
    purposeAr: 'إدارة الهيكل التنظيمي ووحدات الأعمال والأقسام والمستخدمين والأدوار والمواقع والبيانات المرجعية. هذا هو الأساس لبرنامج الحوكمة.',
    howToUse: [
      'Organization tab: view and edit your company profile and structure',
      'Business Units & Departments tabs: manage organizational hierarchy',
      'Users tab: view all users in the workspace',
      'Roles tab: manage roles and permissions assignments',
      'Locations tab: manage office and branch locations',
      'Reference Data tab: configure risk categories, policy categories, and other lookup data',
    ],
    howToUseAr: [
      'تبويب المنظمة: عرض وتعديل ملف الشركة والهيكل التنظيمي',
      'تبويبات وحدات الأعمال والأقسام: إدارة التسلسل الهرمي التنظيمي',
      'تبويب المستخدمون: عرض جميع المستخدمين في مساحة العمل',
      'تبويب الأدوار: إدارة الأدوار وتعيينات الصلاحيات',
      'تبويب المواقع: إدارة مواقع المكاتب والفروع',
      'تبويب البيانات المرجعية: تهيئة فئات المخاطر وفئات السياسات وبيانات البحث الأخرى',
    ],
    commonActions: [
      { label: 'Edit Organization Profile', labelAr: 'تعديل ملف المنظمة', description: 'Update company name, sector, and contact details', descriptionAr: 'تحديث اسم الشركة والقطاع وبيانات الاتصال', route: '/foundation/organization' },
      { label: 'Manage Departments', labelAr: 'إدارة الأقسام', description: 'Add or edit departments in your organizational structure', descriptionAr: 'إضافة أو تعديل الأقسام في هيكلك التنظيمي', route: '/foundation/departments' },
      { label: 'Configure Reference Data', labelAr: 'تهيئة البيانات المرجعية', description: 'Set up risk categories, policy categories, and lookup values', descriptionAr: 'إعداد فئات المخاطر وفئات السياسات وقيم البحث', route: '/foundation/reference-data' },
    ],
    relatedPages: [
      { route: '/admin-hub', label: 'Admin Hub (add users)', labelAr: 'مركز الإدارة (إضافة مستخدمين)' },
      { route: '/team-hub', label: 'Team Hub (teams & RACI)', labelAr: 'مركز الفريق (الفرق و RACI)' },
    ],
    faq: [
      { question: 'Where do I add new users?', questionAr: 'أين أضيف مستخدمين جدد؟', answer: 'New users are added in Admin Hub → Administration tab. Foundation Center shows existing users but user creation is in Admin Hub.', answerAr: 'يُضاف المستخدمون الجدد في مركز الإدارة ← تبويب الإدارة. مركز الأساسيات يعرض المستخدمين الحاليين لكن إنشاء المستخدمين في مركز الإدارة.' },
      { question: 'What are reference data categories used for?', questionAr: 'ما فائدة فئات البيانات المرجعية؟', answer: 'Risk categories and policy categories appear as dropdown options throughout the platform — in risk registers, policy editors, and compliance forms.', answerAr: 'تظهر فئات المخاطر وفئات السياسات كخيارات منسدلة في جميع أنحاء المنصة — في سجلات المخاطر ومحررات السياسات ونماذج الامتثال.' },
    ],
  },

  '/agent-hub': {
    pageId: 'agent-hub', route: '/agent-hub',
    title: 'Agent Operations Hub', titleAr: 'مركز عمليات الوكلاء',
    purpose: 'Five tabs: Proposals (review/approve AI-generated actions), Run History (track agent execution logs), Shadow Agents (manage per-user AI agents), Workflow Studio (visualize execution graphs), Delegation & Consent (PDPL compliance, daily limits, right-to-forget). Controls 10 AI agents across 4 platform modes.',
    purposeAr: 'خمس تبويبات: المقترحات (مراجعة/موافقة الإجراءات المولّدة بالذكاء الاصطناعي)، سجل التشغيلات (تتبع تنفيذ الوكلاء)، وكلاء الظل (إدارة وكلاء الذكاء الاصطناعي لكل مستخدم)، استوديو التدفقات (تصور مخططات التنفيذ)، التفويض والموافقة (امتثال PDPL، الحدود اليومية، حق النسيان). يتحكم بـ 10 وكلاء ذكاء اصطناعي عبر 4 أوضاع تشغيل.',
    howToUse: [
      'Proposals tab: review actions proposed by AI agents — approve or reject with comments',
      'Run History tab: see when each agent ran, how many actions were proposed vs executed, and duration',
      'Shadow Agents tab: enable/disable shadow AI for each user, set autonomy level and daily action limits',
      'Workflow Studio tab: select a run from history to visualize the swim-lane execution graph',
      'Delegation & Consent tab: manage PDPL consent, delegation rules, right-to-forget requests',
      'Use the Platform Mode badge (sidebar) to switch between Human / Hybrid / Shadow Agent / Full Autonomous modes',
    ],
    howToUseAr: [
      'تبويب المقترحات: مراجعة الإجراءات المقترحة من وكلاء الذكاء الاصطناعي — موافقة أو رفض مع تعليقات',
      'تبويب سجل التشغيلات: شاهد متى تشغّل كل وكيل وكم إجراء اقترح مقابل المنفذ والمدة',
      'تبويب وكلاء الظل: تفعيل/إيقاف الذكاء الاصطناعي الظلي لكل مستخدم وتعيين مستوى الاستقلالية والحد اليومي',
      'تبويب استوديو التدفقات: اختر تشغيلاً من السجل لتصور مخطط التنفيذ',
      'تبويب التفويض والموافقة: إدارة موافقة PDPL وقواعد التفويض وطلبات حق النسيان',
      'استخدم شارة وضع المنصة (القائمة الجانبية) للتبديل بين الأوضاع: بشري / هجين / وكيل ظل / ذاتي كامل',
    ],
    commonActions: [
      { label: 'Approve Proposal', labelAr: 'موافقة على مقترح', description: 'Proposals tab → click checkmark on a pending proposal → add optional comment → Approve', descriptionAr: 'تبويب المقترحات ← انقر علامة الصح على مقترح معلق ← أضف تعليقاً اختيارياً ← موافقة' },
      { label: 'Change Platform Mode', labelAr: 'تغيير وضع المنصة', description: 'Click the mode badge in the sidebar → select Human, Hybrid, Shadow Agent, or Full Autonomous', descriptionAr: 'انقر شارة الوضع في القائمة الجانبية ← اختر بشري أو هجين أو وكيل ظل أو ذاتي كامل' },
      { label: 'Configure Shadow Agent', labelAr: 'تهيئة وكيل الظل', description: 'Shadow Agents tab → enable for a user → set autonomy level (L0-L3) and daily limit', descriptionAr: 'تبويب وكلاء الظل ← فعّل لمستخدم ← عيّن مستوى الاستقلالية (L0-L3) والحد اليومي' },
      { label: 'Grant PDPL Consent', labelAr: 'منح موافقة PDPL', description: 'Delegation & Consent tab → click Grant Consent for a user to enable AI memory processing', descriptionAr: 'تبويب التفويض والموافقة ← انقر منح الموافقة لمستخدم لتمكين معالجة ذاكرة الذكاء الاصطناعي' },
    ],
    relatedPages: [
      { route: '/workspace-home', label: 'Dashboard', labelAr: 'لوحة المعلومات' },
      { route: '/admin-hub', label: 'Admin Hub', labelAr: 'مركز الإدارة' },
    ],
    faq: [
      { question: 'What are the 4 platform modes?', questionAr: 'ما هي أوضاع المنصة الأربعة؟', answer: 'Human (L0): all actions queued for approval. Hybrid (L1): low/medium auto-execute, high/critical queued. Shadow Agent (L2): all execute with full audit logging, human override window. Full Autonomous (L3): all execute with audit trail, exceptions only surfaced.', answerAr: 'بشري (L0): جميع الإجراءات تنتظر الموافقة. هجين (L1): منخفض/متوسط ينفذ تلقائياً، عالي/حرج ينتظر. وكيل ظل (L2): الكل ينفذ مع تسجيل تدقيقي كامل. ذاتي كامل (L3): الكل ينفذ مع مسار تدقيق.' },
      { question: 'Which actions always require approval?', questionAr: 'أي الإجراءات تتطلب موافقة دائماً؟', answer: '6 high-risk actions always require approval below L3: CHANGE_PATH, CLOSE_RISK, MODIFY_CONTROL, REASSIGN, ESCALATE, CREATE_POLICY. Only Full Autonomous (L3) can auto-execute these.', answerAr: '6 إجراءات عالية الخطورة تتطلب موافقة دائماً تحت L3: تغيير المسار، إغلاق المخاطر، تعديل الضوابط، إعادة التعيين، التصعيد، إنشاء السياسات. فقط الذاتي الكامل (L3) يمكنه تنفيذها تلقائياً.' },
      { question: 'What is Hyper-Role?', questionAr: 'ما هو الدور الهجين (Hyper-Role)؟', answer: 'Hyper-Role = Human RBAC ∩ Agent capability ∩ Tenant policy. An agent can only perform actions that the bound human user has permission for AND the agent is designed to do AND the tenant policy allows. This triple intersection ensures no privilege escalation.', answerAr: 'الدور الهجين = صلاحيات الإنسان ∩ قدرات الوكيل ∩ سياسات المؤسسة. الوكيل يمكنه فقط تنفيذ إجراءات يملك المستخدم المربوط صلاحياتها والوكيل مصمم لها وسياسة المؤسسة تسمح بها.' },
      { question: 'What does each AI agent do?', questionAr: 'ماذا يفعل كل وكيل ذكاء اصطناعي؟', answer: 'A01: Onboarding/Org profiling. A02: IAM/RBAC security. A03: Framework cross-mapping. A04: Control/policy drafting. A05: Evidence collection. A06: Gap remediation. A07: Risk scoring. A08: Policy lifecycle. A09: Vendor risk. A10: Audit reporting. A11: BCP continuity (proactive exercise scheduling, SPOF detection, RTO/RPO drift monitoring, incident learning). Each runs hourly, scanning tenant context and proposing/executing actions based on the current platform mode.', answerAr: 'A01: التهيئة. A02: أمن الهوية. A03: ربط الأطر. A04: صياغة الضوابط. A05: جمع الأدلة. A06: معالجة الفجوات. A07: تقييم المخاطر. A08: دورة السياسات. A09: مخاطر الموردين. A10: تقارير التدقيق. A11: استمرارية الأعمال (جدولة تمارين استباقية، كشف نقاط الفشل، مراقبة انحراف RTO/RPO، التعلم من الحوادث). كل وكيل يعمل كل ساعة ويفحص سياق المستأجر ويقترح/ينفذ إجراءات حسب وضع المنصة.' },
      { question: 'How are daily action limits enforced?', questionAr: 'كيف يتم تطبيق الحدود اليومية للإجراءات؟', answer: 'Each shadow agent has a max_actions_per_day limit. When actions_today reaches the limit, all further actions are immediately queued as proposals regardless of mode. The counter resets daily at midnight.', answerAr: 'كل وكيل ظل لديه حد أقصى يومي للإجراءات. عند وصول الإجراءات اليومية للحد، جميع الإجراءات اللاحقة تُدرج كمقترحات بغض النظر عن الوضع. يُعاد تعيين العداد يومياً عند منتصف الليل.' },
      { question: 'What governance safeguards are active?', questionAr: 'ما ضمانات الحوكمة النشطة؟', answer: '11 safeguards: (1) Hyper-Role intersection, (2) Daily action limits, (3) Delegation rules, (4) DB autonomy policies, (5) Prompt injection guard, (6) Output validation (Zod), (7) Full audit trail in all modes, (8) Circuit breaker, (9) Tenant budget caps, (10) PDPL consent, (11) PII redaction.', answerAr: '11 ضمانة: (1) تقاطع الدور الهجين، (2) حدود يومية، (3) قواعد تفويض، (4) سياسات استقلالية، (5) حماية حقن الأوامر، (6) تحقق المخرجات (Zod)، (7) مسار تدقيق كامل، (8) قاطع دائرة، (9) حدود ميزانية، (10) موافقة PDPL، (11) تنقيح البيانات الشخصية.' },
    ],
  },
};

// ── Team Setup Wizard ────────────────────────────────────────────────────────

const TEAM_SETUP_STEPS: Omit<TeamSetupStep, 'completed'>[] = [
  { id: 'ts-1', order: 1, label: 'Add Your First Team Member', labelAr: 'أضف أول عضو في فريقك', description: 'Go to Admin Hub → Administration tab → create a new user account with their email and name.', descriptionAr: 'اذهب إلى مركز الإدارة ← تبويب الإدارة ← أنشئ حساب مستخدم جديد بالبريد والاسم.', route: '/admin-hub', action: 'Admin Hub → Administration tab → create user' },
  { id: 'ts-2', order: 2, label: 'Assign the Compliance Officer Role', labelAr: 'عيّن دور مسؤول الامتثال', description: 'Go to Team Hub → Members & Org tab → click the pencil icon on a user → select "compliance_officer" → Save.', descriptionAr: 'اذهب إلى مركز الفريق ← تبويب الأعضاء ← انقر أيقونة القلم على مستخدم ← اختر "مسؤول الامتثال" ← حفظ.', route: '/team-hub?tab=members', action: 'Team Hub → Members tab → edit icon → Change Role' },
  { id: 'ts-3', order: 3, label: 'Create Your First Team', labelAr: 'أنشئ فريقك الأول', description: 'Go to Team Hub → Teams & RACI tab → click "New Team" → enter bilingual name → Create.', descriptionAr: 'اذهب إلى مركز الفريق ← تبويب الفرق ← انقر "فريق جديد" ← أدخل الاسم بلغتين ← إنشاء.', route: '/team-hub?tab=teams', action: 'Team Hub → Teams tab → "New Team" button' },
  { id: 'ts-4', order: 4, label: 'Link Workflows to Teams via RACI', labelAr: 'ربط سير العمل بالفرق عبر RACI', description: 'Team Hub → Teams & RACI tab → expand a team → click "Link workflow" or "Assign RACI role" to connect teams to workflows and controls.', descriptionAr: 'مركز الفريق ← تبويب الفرق ← وسّع فريقاً ← انقر "ربط سير عمل" أو "تعيين دور RACI" لربط الفرق بسير العمل والضوابط.', route: '/team-hub?tab=teams', action: 'Team Hub → Teams tab → expand team → "Link workflow" / "Assign RACI role"' },
  { id: 'ts-5', order: 5, label: 'Verify Everyone Can Log In', labelAr: 'تأكد أن الجميع يمكنهم تسجيل الدخول', description: 'Team Hub → Members & Org tab → check the Status column. "Active" means they logged in; "Pending" means they haven\'t yet.', descriptionAr: 'مركز الفريق ← تبويب الأعضاء ← تحقق من عمود الحالة. "نشط" يعني سجّل دخوله؛ "معلق" يعني لم يسجّل بعد.', route: '/team-hub?tab=members', action: 'Team Hub → Members tab → check Status column' },
];

// ── Public API ───────────────────────────────────────────────────────────────

export async function getSetupProgress(tenantId: string): Promise<SetupProgress> {
  const schema = tenantSchema(tenantId);
  const steps: SetupStep[] = [];

  for (const step of SETUP_STEPS) {
    let completed = false;
    try {
      switch (step.id) {
        case 'complete-onboarding': {
          const r = await safeQuery(`SELECT onboarding_complete FROM users WHERE tenant_id = $1 AND onboarding_complete = TRUE LIMIT 1`, [tenantId]);
          completed = r.rows.length > 0;
          break;
        }
        case 'review-profile': {
          const r = await safeQuery(`SELECT org_name FROM "${schema}".workspace_profile WHERE org_name IS NOT NULL AND org_name != '' LIMIT 1`);
          completed = r.rows.length > 0;
          break;
        }
        case 'invite-team': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1`, [tenantId]);
          completed = (getFirstRow(r)?.c || 0) >= 2;
          break;
        }
        case 'assign-roles': {
          const r = await safeQuery(`SELECT COUNT(DISTINCT role)::int AS c FROM users WHERE tenant_id = $1 AND role != 'user'`, [tenantId]);
          completed = (getFirstRow(r)?.c || 0) >= 2;
          break;
        }
        case 'create-teams': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".teams`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'review-frameworks': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".frameworks`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'review-policies': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".policies WHERE status = 'approved'`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'assign-control-owners': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".controls WHERE owner IS NOT NULL AND owner != ''`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'baseline-assessment': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".controls WHERE implementation_status != 'not_started'`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'upload-evidence': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".evidence`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'risk-register': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".risks`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'review-90day': {
          completed = true; // auto-generated during onboarding
          break;
        }
        case 'configure-cadence':
        case 'setup-notifications': {
          completed = false; // manual steps
          break;
        }
      }
    } catch { completed = false; }

    steps.push({ ...step, completed });
  }

  const completedSteps = steps.filter(s => s.completed).length;
  const percentage = Math.round((completedSteps / steps.length) * 100);
  const currentStep = steps.find(s => !s.completed) || null;

  let phase: SetupProgress['phase'] = 'not_started';
  if (percentage >= 90) phase = 'mature';
  else if (percentage >= 60) phase = 'operational';
  else if (percentage >= 40) phase = 'framework_setup';
  else if (percentage >= 20) phase = 'team_setup';
  else if (percentage > 0) phase = 'initial_setup';

  return { totalSteps: steps.length, completedSteps, percentage, currentStep, steps, phase };
}

export async function getNextActions(
  tenantId: string,
  userId: string,
  systemRole: string,
): Promise<NextAction[]> {
  const schema = tenantSchema(tenantId);
  const actions: NextAction[] = [];

  try {
    // Check for overdue tasks
    const overdue = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${schema}".remediation_tasks
       WHERE status IN ('todo','in_progress') AND due_date < NOW()
       ${systemRole === 'user' ? `AND assigned_to = '${userId}'` : ''}`,
    ), { tenantId: tenantId, operation: 'query remediation_tasks' });

    if ((getFirstRow(overdue)?.c || 0) > 0) {
      actions.push({
        id: 'overdue-tasks', priority: 'critical',
        label: `${getFirstRow(overdue)?.c} Overdue Task(s)`, labelAr: `${getFirstRow(overdue)?.c} مهمة متأخرة`,
        description: 'Tasks past their due date need immediate attention', descriptionAr: 'مهام تجاوزت موعدها النهائي تحتاج اهتمام فوري',
        route: '/operations-hub', icon: 'alert-circle', category: 'tasks', estimatedMinutes: 15,
      });
    }

    // Check for evidence due/expiring
    const evidenceDue = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${schema}".evidence
       WHERE expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '7 days'`,
    ), { tenantId: tenantId, operation: 'query evidence' });

    if ((getFirstRow(evidenceDue)?.c || 0) > 0) {
      actions.push({
        id: 'evidence-expiring', priority: 'high',
        label: `${getFirstRow(evidenceDue)?.c} Evidence Item(s) Expiring`, labelAr: `${getFirstRow(evidenceDue)?.c} عنصر أدلة ينتهي قريباً`,
        description: 'Evidence items expiring within 7 days need renewal', descriptionAr: 'عناصر أدلة تنتهي خلال 7 أيام تحتاج تجديد',
        route: '/evidence-hub', icon: 'clock', category: 'evidence', estimatedMinutes: 30,
      });
    }

    // Check for unassigned controls
    if (['admin', 'owner', 'compliance_officer', 'manager'].includes(systemRole)) {
      const unassigned = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS c FROM "${schema}".controls WHERE owner IS NULL OR owner = ''`,
      ), { tenantId: tenantId, operation: 'query controls' });

      if ((getFirstRow(unassigned)?.c || 0) > 0) {
        actions.push({
          id: 'unassigned-controls', priority: 'high',
          label: `${getFirstRow(unassigned)?.c} Unassigned Control(s)`, labelAr: `${getFirstRow(unassigned)?.c} ضابط بدون مالك`,
          description: 'Controls without an owner will not be implemented', descriptionAr: 'ضوابط بدون مالك لن يتم تنفيذها',
          route: '/compliance-hub', icon: 'user-x', category: 'governance', estimatedMinutes: 20,
        });
      }
    }

    // Check for high risks without treatment
    const highRisks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS c FROM "${schema}".risks
       WHERE risk_score >= 15 AND (treatment_status IS NULL OR treatment_status = 'open')`,
    ), { tenantId: tenantId, operation: 'query risks' });

    if ((getFirstRow(highRisks)?.c || 0) > 0) {
      actions.push({
        id: 'untreated-risks', priority: 'high',
        label: `${getFirstRow(highRisks)?.c} High Risk(s) Without Treatment`, labelAr: `${getFirstRow(highRisks)?.c} خطر مرتفع بدون معالجة`,
        description: 'Critical/high risks need treatment plans', descriptionAr: 'مخاطر حرجة/مرتفعة تحتاج خطط معالجة',
        route: '/risk-hub', icon: 'flame', category: 'risk', estimatedMinutes: 30,
      });
    }

    // Check team size
    if (['admin', 'owner'].includes(systemRole)) {
      const users = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ c: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1`, [tenantId],
      ), { tenantId: tenantId, operation: 'fallback query' });

      if ((getFirstRow(users)?.c || 0) < 3) {
        actions.push({
          id: 'add-team', priority: 'medium',
          label: 'Add More Team Members', labelAr: 'أضف المزيد من أعضاء الفريق',
          description: 'A GRC program needs at least a few people: compliance officer, control owners, risk manager', descriptionAr: 'برنامج الحوكمة يحتاج على الأقل بضعة أشخاص: مسؤول امتثال، مالكي ضوابط، مدير مخاطر',
          route: '/team-hub', icon: 'user-plus', category: 'team', estimatedMinutes: 10,
        });
      }
    }

    // If no urgent actions, suggest weekly review items
    if (actions.length === 0) {
      actions.push({
        id: 'weekly-review', priority: 'low',
        label: 'Run Weekly Review', labelAr: 'تشغيل المراجعة الأسبوعية',
        description: 'Check your dashboard, review any changes, and generate a status report', descriptionAr: 'تحقق من لوحة المعلومات وراجع أي تغييرات وأنشئ تقرير حالة',
        route: '/workspace-home', icon: 'check-circle', category: 'review', estimatedMinutes: 15,
      });
    }
  } catch { /* best effort */ }

  return actions.sort((a, b) => {
    const p = { critical: 0, high: 1, medium: 2, low: 3 };
    return p[a.priority] - p[b.priority];
  });
}

export function getPageHelp(route: string): PageHelp | null {
  return PAGE_HELP[route] || null;
}

export function getAllPageHelp(): PageHelp[] {
  return Object.values(PAGE_HELP);
}

export async function getTeamSetupWizard(tenantId: string): Promise<TeamSetupStep[]> {
  const schema = tenantSchema(tenantId);
  const steps: TeamSetupStep[] = [];

  for (const step of TEAM_SETUP_STEPS) {
    let completed = false;
    try {
      switch (step.id) {
        case 'ts-1': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1`, [tenantId]);
          completed = (getFirstRow(r)?.c || 0) >= 2;
          break;
        }
        case 'ts-2': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1 AND role = 'compliance_officer'`, [tenantId]);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'ts-3': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".teams`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'ts-4': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".teams WHERE linked_control_groups IS NOT NULL AND array_length(linked_control_groups, 1) > 0`);
          completed = (getFirstRow(r)?.c || 0) >= 1;
          break;
        }
        case 'ts-5': {
          const r = await safeQuery(`SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1 AND last_login IS NOT NULL`, [tenantId]);
          completed = (getFirstRow(r)?.c || 0) >= 2;
          break;
        }
      }
    } catch { completed = false; }

    steps.push({ ...step, completed });
  }

  return steps;
}

export function getCommonQuestions(): Array<{
  id: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  route: string;
  category: string;
}> {
  return [
    { id: 'q1', category: 'team', question: 'How do I add team members to my workspace?', questionAr: 'كيف أضيف أعضاء الفريق لمساحة العمل؟', answer: 'Go to Admin Hub → Administration tab → create a new user account with email and name. Then go to Team Hub → Members & Org tab if you need to change their role.', answerAr: 'اذهب إلى مركز الإدارة ← تبويب الإدارة ← أنشئ حساب مستخدم جديد بالبريد والاسم. ثم اذهب لمركز الفريق ← تبويب الأعضاء إذا أردت تغيير دوره.', route: '/admin-hub' },
    { id: 'q2', category: 'team', question: 'What role should I give each person?', questionAr: 'أي دور أعطي لكل شخص؟', answer: 'Owner: approves risk appetite. Compliance Officer: runs GRC program. Risk Manager: manages risks. Auditor: tests controls. User: implements controls + uploads evidence. Viewer: read-only.', answerAr: 'المالك: يعتمد تقبل المخاطر. مسؤول الامتثال: يدير البرنامج. مدير المخاطر: يدير المخاطر. المدقق: يختبر الضوابط. المستخدم: ينفذ الضوابط. العارض: قراءة فقط.', route: '/team-hub' },
    { id: 'q3', category: 'team', question: 'How do team members know what to do?', questionAr: 'كيف يعرف أعضاء الفريق ماذا يفعلون؟', answer: 'Each role gets: (1) a personalized dashboard with role-filtered widgets, (2) a sidebar that only shows pages relevant to their role, (3) a weekly checklist from the Role Experience API, (4) "What to do next" guidance from the Guided Experience API. The lifecycle bar at the top guides them through Plan → Assess → Implement → Operate → Assure → Improve stages.', answerAr: 'كل دور يحصل على: (1) لوحة معلومات مخصصة بلوحات مصفاة حسب الدور، (2) قائمة جانبية تعرض الصفحات المتعلقة بدوره فقط، (3) قائمة مهام أسبوعية من واجهة تجربة الدور، (4) إرشاد "ماذا تفعل بعد ذلك" من واجهة التجربة الموجهة. شريط دورة الحياة في الأعلى يوجههم عبر مراحل التخطيط والتقييم والتنفيذ والتشغيل والتأكيد والتحسين.', route: '/workspace-home' },
    { id: 'q4', category: 'getting-started', question: 'Where do I start after onboarding?', questionAr: 'من أين أبدأ بعد الإعداد؟', answer: '1. Add team members (Admin Hub → Administration tab). 2. Assign roles (Team Hub → Members & Org tab → edit icon → Change Role). 3. Review auto-generated policies (Governance Hub → Policies tab). 4. Assign control owners (Compliance Hub → click a control). 5. Submit existing evidence (Evidence Hub → "Submit Evidence" button).', answerAr: '1. أضف أعضاء الفريق (مركز الإدارة ← تبويب الإدارة). 2. عيّن الأدوار (مركز الفريق ← تبويب الأعضاء ← أيقونة التعديل ← تغيير الدور). 3. راجع السياسات المولّدة (مركز الحوكمة ← تبويب السياسات). 4. عيّن مالكي الضوابط (مركز الامتثال ← انقر على ضابط). 5. قدّم الأدلة الموجودة (مركز الأدلة ← زر "تقديم دليل").', route: '/workspace-home' },
    { id: 'q5', category: 'getting-started', question: 'How do I invite external auditors or consultants?', questionAr: 'كيف أدعو مدققين خارجيين أو مستشارين؟', answer: 'For vendors: Vendor Hub → Vendors tab → add vendor → send due diligence questionnaire (they get a magic-link, no account needed). For external auditors: use the invitation system (they get scoped, time-limited access to audit and evidence data only).', answerAr: 'للموردين: مركز الموردين ← تبويب الموردين ← أضف مورد ← أرسل استبيان عناية واجبة (يحصلون على رابط سحري، لا يحتاجون حساب). للمدققين الخارجيين: استخدم نظام الدعوات (يحصلون على وصول محدود ومؤقت لبيانات التدقيق والأدلة فقط).', route: '/vendor-hub' },
    { id: 'q6', category: 'compliance', question: 'How do I submit evidence?', questionAr: 'كيف أقدم الأدلة؟', answer: 'Go to Evidence Hub → Evidence tab → click the "Submit Evidence" button (upload icon) → fill in the control ID, evidence type, and content → Submit. You can also verify the evidence chain integrity using the "Verify" button.', answerAr: 'اذهب إلى مركز الأدلة ← تبويب الأدلة ← انقر زر "تقديم دليل" (أيقونة الرفع) ← املأ معرف الضابط ونوع الأدلة والمحتوى ← تقديم. يمكنك أيضاً التحقق من سلامة سلسلة الأدلة باستخدام زر "التحقق".', route: '/evidence-hub' },
    { id: 'q7', category: 'compliance', question: 'What is a control and how do I implement one?', questionAr: 'ما هو الضابط وكيف أنفذه؟', answer: 'A control is a safeguard that protects your organization (e.g. "Enable MFA for all users"). To implement: do the actual work (enable MFA), then update the control status to "Implemented" and upload evidence (screenshot of MFA settings).', answerAr: 'الضابط هو إجراء حماية (مثل "تفعيل المصادقة الثنائية"). للتنفيذ: نفّذ العمل الفعلي، ثم حدّث حالة الضابط إلى "منفذ" وارفع الدليل (لقطة شاشة للإعدادات).', route: '/compliance-hub' },
    { id: 'q8', category: 'workspace', question: 'Can I change my organization profile after onboarding?', questionAr: 'هل يمكنني تغيير ملف المنظمة بعد الإعداد؟', answer: 'Yes. Go to Tenant Config to update your organization name, industry, size, and compliance requirements. Changes will be reflected in future reports.', answerAr: 'نعم. اذهب إلى تهيئة المستأجر لتحديث اسم المنظمة والقطاع والحجم ومتطلبات الامتثال. التغييرات ستظهر في التقارير المستقبلية.', route: '/tenant-config' },
    { id: 'q9', category: 'workspace', question: 'How do I see what the system did automatically?', questionAr: 'كيف أرى ما فعله النظام تلقائياً؟', answer: 'Go to AGRC-OS to see the autonomous engine status, actions taken, and health metrics. The Activity Feed shows a real-time log of all system and user actions.', answerAr: 'اذهب إلى AGRC-OS لرؤية حالة المحرك الذاتي والإجراءات المتخذة ومقاييس الصحة. موجز النشاط يعرض سجلاً مباشراً لجميع الإجراءات.', route: '/agrc-os' },
    { id: 'q10', category: 'reports', question: 'How do I generate a report for management?', questionAr: 'كيف أنشئ تقريراً للإدارة؟', answer: 'Go to Reports Hub → select "Executive Summary" template → choose scope → click Generate. Reports are available in Arabic, English, or bilingual PDF/Excel.', answerAr: 'اذهب إلى مركز التقارير ← اختر قالب "الملخص التنفيذي" ← اختر النطاق ← انقر إنشاء. التقارير متاحة بالعربية أو الإنجليزية أو ثنائية اللغة.', route: '/reports-hub' },
  ];
}
