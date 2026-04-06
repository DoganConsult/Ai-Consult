// @ts-nocheck
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../http/error-handling/async-handler';
import { emptyResult, safeQuery } from '../../../../config/database/database';
import { authenticate } from '../../../dauth';
import { getLandingPainContent } from '../../services/content-packs/landing-content.service';
import * as fs from 'fs';
import * as path from 'path';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';
import { swallowDefault, EC } from '../../resilience/resilient-catch';

const router: Router = Router();

// ── Helper: load agent JSON files ──
function loadAgents(): any[] {
  const agentsDir = path.resolve(__dirname, '../../../agents');
  const indexPath = path.join(agentsDir, 'agents-index.json');
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    return (index.agents || []).map((entry: any) => {
      const filePath = path.join(agentsDir, `${entry.id}.json`);
      try {
        const agent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return {
          id: agent.id,
          name: agent.name,
          nameAr: agent.nameAr || agent.name,
          role: agent.role || '',
          summary: agent.summary || '',
          summaryAr: agent.summaryAr || '',
          roleAr: agent.roleAr || '',
          image: agent.falconImage || `agents/${agent.id}.png`,
          icon: agent.icon || 'pi-microchip-ai',
          color: agent.color || '#0ea5e9',
          domain: agent.domain || '',
          domainAr: agent.domainAr || '',
        };
      } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// ══════════════════════════════════════════════
// GET /api/public/agents — AI agent cards
// ══════════════════════════════════════════════
router.get('/agents', (_req: Request, res: Response) => {
  try {
    const agents = loadAgents();
    res.json({ agents });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ══════════════════════════════════════════════
// GET /api/public/report-templates — Report center catalog
// ══════════════════════════════════════════════
router.get('/report-templates', (_req: Request, res: Response) => {
  try {
    res.json({
      templates: [
        { id: 'nca-ecc', icon: 'pi-shield', titleEn: 'NCA ECC Compliance Report', titleAr: 'تقرير امتثال NCA ECC', descEn: 'Full 114-control assessment with domain scores, radar chart, and gap analysis', descAr: 'تقييم شامل لـ 114 ضابطاً مع النتائج حسب المجال والرادار وتحليل الفجوات', color: '#1e40af', formats: ['pdf', 'excel', 'html'], route: '/nca-assessment', category: 'compliance' },
        { id: 'regulator', icon: 'pi-chart-bar', titleEn: 'Regulator Posture Summary', titleAr: 'ملخص الوضع التنظيمي', descEn: 'Compliance heatmap across all 9 KSA regulators with domain breakdown', descAr: 'خريطة حرارية للامتثال عبر جميع الجهات التنظيمية التسع السعودية', color: '#0d9488', formats: ['pdf', 'excel', 'html'], route: '/regulator-heatmap', category: 'compliance' },
        { id: 'cross-mapping', icon: 'pi-sitemap', titleEn: 'Cross-Framework Efficiency', titleAr: 'كفاءة الأطر المتقاطعة', descEn: 'Control mapping matrix showing how one control satisfies multiple frameworks', descAr: 'مصفوفة ربط الضوابط توضح كيف يغطي ضابط واحد عدة أطر', color: '#7c3aed', formats: ['pdf', 'excel', 'html'], route: '/framework-mapping', category: 'efficiency' },
        { id: 'dpia', icon: 'pi-file-edit', titleEn: 'PDPL DPIA Report', titleAr: 'تقرير تقييم أثر حماية البيانات', descEn: 'Data Protection Impact Assessment ready for SDAIA submission', descAr: 'تقييم أثر حماية البيانات جاهز للتقديم لهيئة البيانات والذكاء الاصطناعي', color: '#9333ea', formats: ['pdf', 'excel', 'html'], route: '/dpia', category: 'privacy' },
        { id: 'executive', icon: 'pi-briefcase', titleEn: 'Executive Board Report', titleAr: 'تقرير مجلس الإدارة التنفيذي', descEn: 'High-level KPIs: compliance score, open risks, evidence coverage, remediations', descAr: 'مؤشرات عالية المستوى: نتيجة الامتثال، المخاطر المفتوحة، تغطية الأدلة، المعالجات', color: '#0369a1', formats: ['pdf', 'excel', 'html'], category: 'executive' },
        { id: 'risk', icon: 'pi-exclamation-triangle', titleEn: 'Risk Posture Report', titleAr: 'تقرير وضع المخاطر', descEn: 'Risk heatmap, distribution by severity, KRI trends, and mitigation status', descAr: 'خريطة المخاطر الحرارية، التوزيع حسب الخطورة، اتجاهات مؤشرات المخاطر', color: '#dc2626', formats: ['pdf', 'excel', 'html'], category: 'risk' },
        { id: 'audit', icon: 'pi-search', titleEn: 'Audit Readiness Report', titleAr: 'تقرير الاستعداد للتدقيق', descEn: 'Evidence coverage gaps, control testing status, and audit findings summary', descAr: 'فجوات تغطية الأدلة، حالة اختبار الضوابط، ملخص نتائج التدقيق', color: '#b45309', formats: ['pdf', 'excel', 'html'], category: 'audit' },
        { id: 'custom', icon: 'pi-cog', titleEn: 'Custom Report Builder', titleAr: 'منشئ التقارير المخصص', descEn: 'Pick and choose sections to build a tailored report for any audience', descAr: 'اختر الأقسام لبناء تقرير مخصص لأي جمهور', color: '#64748b', formats: ['pdf', 'excel', 'html'], category: 'custom' },
      ],
      categories: [
        { value: 'all', labelEn: 'All Reports', labelAr: 'جميع التقارير' },
        { value: 'compliance', labelEn: 'Compliance', labelAr: 'الامتثال' },
        { value: 'risk', labelEn: 'Risk', labelAr: 'المخاطر' },
        { value: 'privacy', labelEn: 'Privacy', labelAr: 'الخصوصية' },
        { value: 'executive', labelEn: 'Executive', labelAr: 'تنفيذي' },
        { value: 'audit', labelEn: 'Audit', labelAr: 'التدقيق' },
      ],
    });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ══════════════════════════════════════════════
// GET /api/public/stats — Live platform stats
// ══════════════════════════════════════════════
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    let regulators = 136, frameworks = 60, controls = 4000, crossMappings = 12000, sectors = 14, aiAgents = 10;
    try {
      const regResult = await safeQuery(`SELECT COUNT(DISTINCT regulator_en) AS cnt FROM instruments WHERE regulator_en IS NOT NULL`);
      if (getFirstRow(regResult)?.cnt) regulators = parseInt(getFirstRow(regResult)?.cnt, 10);
      const fwResult = await safeQuery(`SELECT COUNT(*) AS cnt FROM instruments`);
      if (getFirstRow(fwResult)?.cnt) frameworks = parseInt(getFirstRow(fwResult)?.cnt, 10);
      const ctrlResult = await safeQuery(`SELECT COUNT(*) AS cnt FROM regulatory_controls`);
      if (getFirstRow(ctrlResult)?.cnt) controls = parseInt(getFirstRow(ctrlResult)?.cnt, 10);
      const mapResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: crossMappings }]), safeQuery(`SELECT COUNT(*) AS cnt FROM control_mappings`), { operation: 'fallback query' });
      if (getFirstRow(mapResult)?.cnt) crossMappings = parseInt(getFirstRow(mapResult)?.cnt, 10);
      const secResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: sectors }]), safeQuery(`SELECT COUNT(DISTINCT sector_code) AS cnt FROM sector_authority_map`), { operation: 'fallback query' });
      if (getFirstRow(secResult)?.cnt) sectors = parseInt(getFirstRow(secResult)?.cnt, 10);
    } catch { /* use defaults */ }
    res.json({ regulators, frameworks, controls, crossMappings, sectors, aiAgents });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ══════════════════════════════════════════════
// GET /api/public/landing-content — All landing page content
// ══════════════════════════════════════════════
router.get('/landing-content', async (_req: Request, res: Response) => {
  try {
    // Fetch live regulator/framework data from DB for trust badges
    let ksaBadges: any[] = [];
    let internationalBadges: any[] = [];
    try {
      let regResult: unknown = { rows: [] };
      try {
        regResult = await safeQuery(
          `SELECT DISTINCT regulator_en, regulator_ar FROM instruments WHERE regulator_en IS NOT NULL ORDER BY regulator_en LIMIT 50`
        );
      } catch { /* DB unavailable — fall through to fallback */ }
      // Map known KSA regulators
      const ksaRegMap: Record<string, { code: string; color: string; status: string; highlight?: boolean }> = {
        'National Cybersecurity Authority': { code: 'NCA-ECC', color: '#1e40af', status: 'ready', highlight: true },
        'Saudi Arabian Monetary Authority': { code: 'SAMA-CSF', color: '#0d9488', status: 'ready', highlight: true },
        'Saudi Data & AI Authority': { code: 'PDPL', color: '#7c3aed', status: 'ready', highlight: true },
        'NCA Cloud Controls': { code: 'NCA-CCC', color: '#0284c7', status: 'ready' },
        'NCA OT Controls': { code: 'NCA-OTCC', color: '#064e3b', status: 'ready' },
        'Capital Market Authority': { code: 'CMA', color: '#b91c1c', status: 'aligned' },
        'Communications & IT Commission': { code: 'CST', color: '#0369a1', status: 'aligned' },
        'Zakat, Tax & Customs Authority': { code: 'ZATCA', color: '#15803d', status: 'aligned' },
        'Ministry of Health': { code: 'MOH', color: '#dc2626', status: 'aligned' },
        'Saudi Food & Drug Authority': { code: 'SFDA', color: '#ea580c', status: 'aligned' },
        'Electricity & Cogen Authority': { code: 'ECRA', color: '#ca8a04', status: 'aligned' },
        'Digital Government Authority': { code: 'DGA', color: '#0891b2', status: 'aligned' },
        'General Authority Civil Aviation': { code: 'GACA', color: '#4338ca', status: 'aligned' },
        'General Court of Audit': { code: 'ADAA', color: '#6d28d9', status: 'aligned' },
      };
      for (const row of regResult.rows) {
        const mapped = Object.entries(ksaRegMap).find(([key]) => row.regulator_en?.includes(key.split(' ')[0]));
        if (mapped) {
          const { code, color, status, highlight } = mapped[1];
          ksaBadges.push({ code, label: row.regulator_en, labelAr: row.regulator_ar || row.regulator_en, color, status, highlight });
        }
      }
      // Fallback if DB didn't return enough
      if (ksaBadges.length < 5) {
        ksaBadges = [
          { code: 'NCA-ECC', label: 'Essential Cybersecurity Controls', labelAr: 'الضوابط الأساسية للأمن السيبراني', color: '#1e40af', status: 'ready', highlight: true },
          { code: 'SAMA-CSF', label: 'Cyber Security Framework', labelAr: 'إطار الأمن السيبراني', color: '#0d9488', status: 'ready', highlight: true },
          { code: 'PDPL', label: 'Personal Data Protection', labelAr: 'حماية البيانات الشخصية', color: '#7c3aed', status: 'ready', highlight: true },
          { code: 'NCA-CCC', label: 'Cloud Cybersecurity Controls', labelAr: 'ضوابط الأمن السيبراني السحابي', color: '#0284c7', status: 'ready' },
          { code: 'NCA-OTCC', label: 'OT Cybersecurity Controls', labelAr: 'ضوابط الأمن السيبراني للتقنيات التشغيلية', color: '#064e3b', status: 'ready' },
          { code: 'CMA', label: 'Capital Market Authority', labelAr: 'هيئة السوق المالية', color: '#b91c1c', status: 'aligned' },
          { code: 'CST', label: 'Communications & IT Commission', labelAr: 'هيئة الاتصالات وتقنية المعلومات', color: '#0369a1', status: 'aligned' },
          { code: 'ZATCA', label: 'Zakat, Tax & Customs', labelAr: 'هيئة الزكاة والضريبة والجمارك', color: '#15803d', status: 'aligned' },
          { code: 'MOH', label: 'Ministry of Health', labelAr: 'وزارة الصحة', color: '#dc2626', status: 'aligned' },
          { code: 'SFDA', label: 'Food & Drug Authority', labelAr: 'هيئة الغذاء والدواء', color: '#ea580c', status: 'aligned' },
          { code: 'ECRA', label: 'Electricity & Cogen Authority', labelAr: 'هيئة تنظيم الكهرباء', color: '#ca8a04', status: 'aligned' },
          { code: 'DGA', label: 'Digital Government Authority', labelAr: 'هيئة الحكومة الرقمية', color: '#0891b2', status: 'aligned' },
          { code: 'GACA', label: 'General Authority Civil Aviation', labelAr: 'الهيئة العامة للطيران المدني', color: '#4338ca', status: 'aligned' },
          { code: 'ADAA', label: 'Performance & Financial Audit', labelAr: 'ديوان المراقبة العامة', color: '#6d28d9', status: 'aligned' },
        ];
      }
    } catch { /* use empty */ }

    internationalBadges = [
      { code: 'ISO-27001', label: 'Information Security', labelAr: 'أمن المعلومات', color: '#1d4ed8', status: 'certified', highlight: true },
      { code: 'NIST-CSF', label: 'Cybersecurity Framework 2.0', labelAr: 'إطار الأمن السيبراني 2.0', color: '#0f766e', status: 'ready', highlight: true },
      { code: 'PCI-DSS', label: 'Payment Card Industry v4', labelAr: 'معيار أمان بيانات الدفع v4', color: '#0891b2', status: 'ready' },
      { code: 'CIS-v8', label: 'CIS Controls v8', labelAr: 'ضوابط CIS الإصدار 8', color: '#374151', status: 'ready' },
      { code: 'COBIT', label: 'IT Governance COBIT 2019', labelAr: 'حوكمة تقنية المعلومات COBIT', color: '#ea580c', status: 'aligned' },
      { code: 'NIST-53', label: 'NIST 800-53 Rev5', labelAr: 'NIST 800-53 الإصدار 5', color: '#1e3a5f', status: 'aligned' },
      { code: 'GDPR', label: 'General Data Protection', labelAr: 'حماية البيانات العامة', color: '#6d28d9', status: 'aligned' },
    ];

    const agents = loadAgents();

    // Fetch pain points from DB via service
    const painContent = await getLandingPainContent();
    const painPoints = painContent.painPoints;
    const chartData = painContent.chartData;

    res.json({
      agents,
      painPoints,
      chartData,
      painResult: painContent.painResult,
      ksaBadges,
      internationalBadges,
      capabilities: [
        { icon: 'pi pi-building', titleEn: 'Governance & Policy Management', titleAr: 'الحوكمة وإدارة السياسات', descEn: 'Full policy lifecycle with versioning, multi-stage approval workflows, expiry alerts, and bilingual document generation. Board reporting with audit trails.', descAr: 'دورة حياة سياسات كاملة مع التحكم بالإصدارات وسير عمل الموافقة متعدد المراحل وتنبيهات الانتهاء وإنشاء وثائق ثنائية اللغة.' },
        { icon: 'pi pi-exclamation-triangle', titleEn: 'Risk Management', titleAr: 'إدارة المخاطر', descEn: '5×5 likelihood × impact scoring with interactive sliders, risk heat maps, treatment plans (Mitigate/Transfer/Accept/Avoid), KRI tracking, and trend analysis.', descAr: 'تقييم 5×5 للاحتمالية × الأثر مع مزلقات تفاعلية وخرائط حرارية وخطط معالجة وتتبع مؤشرات المخاطر الرئيسية وتحليل الاتجاهات.' },
        { icon: 'pi pi-check-circle', titleEn: 'Compliance & Control Mapping', titleAr: 'الامتثال وربط الضوابط', descEn: 'Map 4,000+ controls to 60+ frameworks across 136 regulators. Cross-framework mapping shows 60% effort reduction. Auto-assess gaps and generate remediation roadmaps.', descAr: 'ربط أكثر من 4,000 ضابط بأكثر من 60 إطارًا عبر 136 جهة رقابية. ربط الأطر المتقاطعة يوضح تقليل الجهد بنسبة 60%. تقييم تلقائي للفجوات.' },
        { icon: 'pi pi-search', titleEn: 'Audit & Evidence Management', titleAr: 'إدارة التدقيق والأدلة', descEn: 'Plan, execute, and track audits with AI-powered evidence collection. Document analysis, freshness tracking, quality validation, and automated audit readiness checklists.', descAr: 'تخطيط وتنفيذ وتتبع عمليات التدقيق مع جمع أدلة مدعوم بالذكاء الاصطناعي. تحليل الوثائق وتتبع الحداثة والتحقق من الجودة.' },
        { icon: 'pi pi-microchip-ai', titleEn: 'AI Agent Mesh — 10 Agents', titleAr: 'شبكة وكلاء الذكاء الاصطناعي — 10 وكلاء', descEn: 'Master Shahin orchestrates 10 specialized agents: onboarding, identity, framework mapping, control authoring, evidence, gap remediation, risk, policy, vendor risk, and audit reporting.', descAr: 'يقود الصقر الرئيسي 10 وكلاء متخصصين: التهيئة والهوية وربط الأطر وتأليف الضوابط والأدلة ومعالجة الثغرات والمخاطر والسياسات والموردين والتدقيق.' },
        { icon: 'pi pi-download', titleEn: 'Report Center — 3 Formats', titleAr: 'مركز التقارير — 3 صيغ', descEn: '8 report types exportable as PDF (Arabic RTL + branding), Excel (multi-sheet + conditional formatting), or Interactive HTML (offline, sortable, AR/EN toggle).', descAr: '8 أنواع تقارير قابلة للتصدير بصيغة PDF (عربية RTL + علامة تجارية) أو Excel (أوراق متعددة + تنسيق شرطي) أو HTML تفاعلي (بدون إنترنت).' },
      ],
      industries: [
        { icon: 'pi pi-wallet', nameEn: 'Banking & Finance', nameAr: 'البنوك والتمويل' },
        { icon: 'pi pi-heart', nameEn: 'Healthcare', nameAr: 'الرعاية الصحية' },
        { icon: 'pi pi-bolt', nameEn: 'Energy & Utilities', nameAr: 'الطاقة والمرافق' },
        { icon: 'pi pi-wifi', nameEn: 'Telecom', nameAr: 'الاتصالات' },
        { icon: 'pi pi-building', nameEn: 'Government', nameAr: 'القطاع الحكومي' },
        { icon: 'pi pi-book', nameEn: 'Education', nameAr: 'التعليم' },
      ],
      faqs: [
        { qEn: 'Is this real AI or just templates and mock data?', qAr: 'هل هذا ذكاء اصطناعي حقيقي أم مجرد قوالب وبيانات وهمية؟', aEn: 'Everything in Shahin-AI is powered by real AI. Our 10 specialized agents analyze your organization profile, map regulatory frameworks, draft policies, assess gaps, and generate recommendations — all dynamically. Every number you see on this landing page is fetched live from our database. Zero hardcoded stats, zero mock data.', aAr: 'كل شيء في Shahin-AI مدعوم بالذكاء الاصطناعي الحقيقي. 10 وكلاء متخصصين يحللون ملف مؤسستك، ويربطون الأطر التنظيمية، ويصوغون السياسات، ويقيّمون الثغرات، ويقدمون التوصيات — كل ذلك ديناميكيًا. كل رقم تراه على هذه الصفحة يتم جلبه مباشرة من قاعدة بياناتنا. صفر بيانات ثابتة، صفر بيانات وهمية.' },
        { qEn: 'Which Saudi regulators and frameworks are covered?', qAr: 'ما الجهات التنظيمية السعودية والأطر المغطاة؟', aEn: 'We cover 136+ regulators and 60+ frameworks including NCA ECC (114 controls), SAMA CSF, PDPL (Personal Data Protection Law), NCA CCC (Cloud Controls), NCA OTCC (OT Controls), plus international standards like ISO 27001, NIST CSF 2.0, PCI-DSS v4, CIS v8, and COBIT 2019. Cross-framework mapping shows you how one control satisfies multiple frameworks — saving up to 60% effort.', aAr: 'نغطي أكثر من 136 جهة رقابية وأكثر من 60 إطارًا تنظيميًا بما في ذلك NCA ECC (114 ضابطًا) و SAMA CSF و PDPL (نظام حماية البيانات الشخصية) و NCA CCC و NCA OTCC، بالإضافة إلى المعايير الدولية مثل ISO 27001 و NIST CSF 2.0 و PCI-DSS v4. ربط الأطر المتقاطعة يوضح كيف يستوفي ضابط واحد عدة أطر — مما يوفر حتى 60% من الجهد.' },
        { qEn: 'What reports can I generate and in which formats?', qAr: 'ما التقارير التي يمكنني إنشاؤها وبأي صيغ؟', aEn: '8 report types available in 3 formats each: PDF (with Arabic RTL support and your org branding), Excel (multi-sheet with conditional formatting), and Interactive HTML (works offline, sortable tables, Arabic/English toggle). Report types include: Executive GRC Summary, NCA ECC Assessment, Regulator Heatmap, DPIA Report, Risk Register, Control Matrix, Evidence Status, and Audit Readiness.', aAr: '8 أنواع تقارير متاحة بـ 3 صيغ لكل منها: PDF (مع دعم العربية RTL وعلامتك التجارية) و Excel (أوراق متعددة مع تنسيق شرطي) و HTML تفاعلي (يعمل بدون إنترنت، جداول قابلة للفرز). تشمل الأنواع: ملخص GRC التنفيذي، تقييم NCA ECC، خريطة الجهات التنظيمية، تقرير DPIA، سجل المخاطر، مصفوفة الضوابط، حالة الأدلة، وجاهزية التدقيق.' },
        { qEn: 'How does the AI onboarding work?', qAr: 'كيف تعمل عملية التهيئة بالذكاء الاصطناعي؟', aEn: 'Three phases: (1) Organization Setup — answer 5 questions about your industry, size, and IT landscape. (2) Domain Assessment — rate your maturity across GRC domains with guided questions. (3) AI Analysis — our agents identify applicable frameworks, generate a maturity score, recommend priorities, and build your complete workspace with risks, controls, policies, and compliance mappings pre-configured.', aAr: 'ثلاث مراحل: (1) إعداد المؤسسة — أجب عن 5 أسئلة عن قطاعك وحجمك وبنيتك التحتية. (2) تقييم المجالات — قيّم نضجك عبر مجالات الحوكمة. (3) تحليل الذكاء الاصطناعي — يحدد الوكلاء الأطر المطبقة ويولدون درجة نضج ويبنون مساحة عملك الكاملة مع المخاطر والضوابط والسياسات وخرائط الامتثال مسبقة التهيئة.' },
        { qEn: 'Is the platform available in Arabic?', qAr: 'هل المنصة متاحة بالعربية؟', aEn: 'Yes, Shahin-AI is fully bilingual (Arabic + English). Every screen, button, report, and AI-generated content works in both languages with full RTL support. You can switch languages instantly with one click. Reports can be exported in Arabic, English, or bilingual format.', aAr: 'نعم، Shahin-AI ثنائي اللغة بالكامل (العربية + الإنجليزية). كل شاشة وزر وتقرير ومحتوى مولّد بالذكاء الاصطناعي يعمل بكلتا اللغتين مع دعم RTL الكامل. يمكنك تبديل اللغة فورًا بنقرة واحدة. يمكن تصدير التقارير بالعربية أو الإنجليزية أو ثنائية اللغة.' },
        { qEn: 'What are the 10 AI agents and what do they do?', qAr: 'ما هم الوكلاء العشرة وماذا يفعلون؟', aEn: 'Master Shahin orchestrates 10 specialized agents: (1) Onboarding — collects your profile and recommends frameworks. (2) Identity — manages RBAC and SSO. (3) Framework Mapping — cross-maps controls across 60+ frameworks. (4) Control Authoring — drafts compliant controls with citations. (5) Evidence Collection — automates evidence gathering. (6) Gap Remediation — generates phased remediation plans. (7) Risk Register — scores and tracks enterprise risks. (8) Policy Lifecycle — manages policy drafting to retirement. (9) Third-Party Risk — assesses vendor security. (10) Audit Reporting — generates regulator-ready reports.', aAr: 'يقود الصقر الرئيسي 10 وكلاء متخصصين: (1) التهيئة — يجمع ملفك ويوصي بالأطر. (2) الهوية — يدير RBAC و SSO. (3) ربط الأطر — يربط الضوابط عبر 60+ إطارًا. (4) تأليف الضوابط — يصوغ ضوابط متوافقة. (5) جمع الأدلة — يؤتمت جمع الأدلة. (6) معالجة الثغرات — يولد خطط معالجة مرحلية. (7) سجل المخاطر — يقيّم ويتتبع المخاطر. (8) دورة السياسات — يدير السياسات من الصياغة للتقاعد. (9) مخاطر الأطراف الثالثة — يقيّم أمان الموردين. (10) تقارير التدقيق — ينشئ تقارير جاهزة للجهات التنظيمية.' },
        { qEn: 'Who is behind Shahin-AI?', qAr: 'من يقف وراء Shahin-AI؟', aEn: 'Shahin-AI is built by Dogan Consult — a consultancy specializing in AI, cybersecurity, and GRC for Saudi Arabia. The platform is designed from day one for the Saudi regulatory landscape, with native support for NCA, SAMA, SDAIA, and Vision 2030 objectives.', aAr: 'Shahin-AI مبني بواسطة Dogan Consult — استشارات متخصصة في الذكاء الاصطناعي والأمن السيبراني والحوكمة للمملكة العربية السعودية. المنصة مصممة من اليوم الأول للمشهد التنظيمي السعودي مع دعم أصلي لـ NCA و SAMA و SDAIA وأهداف رؤية 2030.' },
        { qEn: 'Can I try it before committing?', qAr: 'هل يمكنني تجربتها قبل الالتزام؟', aEn: 'Absolutely. Sign up for free and our AI will build your complete GRC workspace based on your organization profile. You can explore all modules, run an NCA ECC assessment, generate sample reports, and see real AI recommendations — all before any commitment.', aAr: 'بالتأكيد. سجّل مجانًا وسيبني الذكاء الاصطناعي مساحة عمل حوكمة كاملة بناءً على ملف مؤسستك. يمكنك استكشاف جميع الوحدات وإجراء تقييم NCA ECC وتوليد تقارير تجريبية ورؤية توصيات حقيقية — كل ذلك قبل أي التزام.' },
      ],
      ksaFeatures: [
        { icon: 'pi-shield', titleEn: 'NCA ECC Self-Assessment', titleAr: 'تقييم NCA ECC الذاتي', descEn: 'Walk through all 114 NCA Essential Cybersecurity Controls across 5 domains. Rate each control, track progress with live scoring, then export a board-ready report in PDF, Excel, or interactive HTML — in Arabic or English.', descAr: 'استعرض جميع الضوابط الأساسية للأمن السيبراني الـ 114 عبر 5 مجالات. قيّم كل ضابط، وتابع التقدم بالتسجيل المباشر، ثم صدّر تقريرًا جاهزًا لمجلس الإدارة بصيغة PDF أو Excel أو HTML تفاعلي.', color: '#1e40af', route: '/nca-assessment', stepsEn: ['Select domain (Governance, Defense, Resilience, Third-Party, ICS/OT)', 'Rate each control: Implemented / Partial / Not Implemented / N/A', 'View live radar chart + domain scores', 'Export PDF (Arabic/English), Excel, or Interactive HTML'], stepsAr: ['اختر المجال (الحوكمة، الدفاع، الصمود، الأطراف الخارجية، التقنيات التشغيلية)', 'قيّم كل ضابط: مطبق / جزئي / غير مطبق / غير قابل للتطبيق', 'عرض رادار مباشر + نتائج المجالات', 'تصدير PDF (عربي/إنجليزي) أو Excel أو HTML تفاعلي'], badgeEn: 'NCA ECC 2-2024 — 114 Controls', badgeAr: 'NCA ECC 2-2024 — 114 ضابطاً', exportFormats: ['PDF', 'Excel', 'HTML'], sampleReportKey: 'nca-ecc' },
        { icon: 'pi-chart-bar', titleEn: 'Regulator Compliance Heatmap', titleAr: 'خريطة حرارية للجهات التنظيمية', descEn: 'See your compliance posture against 14+ KSA regulators at a glance. Color-coded heatmap with drill-down per regulator and domain.', descAr: 'اعرض وضع الامتثال مقابل أكثر من 14 جهة تنظيمية سعودية بنظرة واحدة. خريطة حرارية ملونة مع إمكانية التعمق لكل جهة ومجال.', color: '#0d9488', route: '/regulator-heatmap', stepsEn: ['View 14+ regulators with compliance score rings', 'Heatmap grid: Regulators × Domains (color-coded)', 'Click any cell for drill-down details', 'Export full regulator posture report'], stepsAr: ['عرض أكثر من 14 جهة مع حلقات نتائج الامتثال', 'شبكة حرارية: جهات × مجالات (مرمزة بالألوان)', 'انقر على أي خلية للتفاصيل المعمقة', 'تصدير تقرير الوضع التنظيمي الكامل'], badgeEn: '14+ Regulators × 7 Domains', badgeAr: '14+ جهات × 7 مجالات', exportFormats: ['PDF', 'Excel', 'HTML'], sampleReportKey: 'regulator-heatmap' },
        { icon: 'pi-share-alt', titleEn: 'Cross-Framework Control Mapping', titleAr: 'ربط الأطر التنظيمية المتقاطعة', descEn: 'Discover how implementing one control satisfies multiple frameworks — save 60% effort across 60+ frameworks and 4,000+ controls.', descAr: 'اكتشف كيف أن تطبيق ضابط واحد يستوفي عدة أطر — وفر 60% من الجهد عبر أكثر من 60 إطارًا و4,000+ ضابط.', color: '#7c3aed', route: '/framework-mapping', stepsEn: ['See efficiency banner: unique controls → satisfied requirements', 'Matrix view with checkmarks across 60+ frameworks', 'Visual map: hover to see cross-framework connections', 'Top 10 highest-coverage controls ranked'], stepsAr: ['عرض لوحة الكفاءة: ضوابط فريدة ← متطلبات مستوفاة', 'عرض مصفوفة مع علامات عبر أكثر من 60 إطارًا', 'خريطة مرئية: مرر الماوس لعرض الروابط المتقاطعة', 'أعلى 10 ضوابط تغطية مصنفة'], badgeEn: 'Save 60% Cross-Framework Effort', badgeAr: 'وفّر 60% من الجهد المتقاطع', exportFormats: ['PDF', 'Excel', 'HTML'], sampleReportKey: 'cross-mapping' },
        { icon: 'pi-file-edit', titleEn: 'PDPL Data Protection Impact Assessment', titleAr: 'تقييم أثر حماية البيانات PDPL', descEn: 'Complete DPIA wizard aligned with Saudi PDPL Article 10. Assess data processing activities, evaluate risks, map mitigations to PDPL controls, and generate SDAIA-ready reports.', descAr: 'معالج DPIA كامل متوافق مع المادة 10 من نظام حماية البيانات الشخصية السعودي. قيّم أنشطة معالجة البيانات، وقيّم المخاطر، واربط التدابير بضوابط PDPL.', color: '#9333ea', route: '/dpia', stepsEn: ['Describe processing activity & data inventory', 'Select lawful basis (PDPL Article 10)', 'Assess risks with likelihood × impact sliders', 'Map mitigations to 9 PDPL controls', 'Get recommendation: Proceed / Conditions / Stop'], stepsAr: ['وصف نشاط المعالجة وجرد البيانات', 'اختيار الأساس القانوني (المادة 10)', 'تقييم المخاطر بمزلقات الاحتمالية × الأثر', 'ربط التدابير بـ 9 ضوابط PDPL', 'الحصول على التوصية: المتابعة / شروط / إيقاف'], badgeEn: 'SDAIA-Ready DPIA Report', badgeAr: 'تقرير DPIA جاهز لهيئة البيانات', exportFormats: ['PDF', 'Excel', 'HTML'], sampleReportKey: 'dpia' },
        { icon: 'pi-download', titleEn: 'Report Center — 8 Report Types × 3 Formats', titleAr: 'مركز التقارير — 8 أنواع × 3 صيغ', descEn: 'Generate any report in PDF (with Arabic RTL and org branding), Excel (multi-sheet with conditional formatting), or Interactive HTML (works offline, sortable tables, Arabic/English toggle).', descAr: 'أنشئ أي تقرير بصيغة PDF (مع دعم العربية RTL وعلامة المنظمة) أو Excel (أوراق متعددة مع تنسيق شرطي) أو HTML تفاعلي (يعمل بدون إنترنت، جداول قابلة للفرز، تبديل عربي/إنجليزي).', color: '#0369a1', route: '/report-center', stepsEn: ['Browse 8 report templates by category', 'Select language: English / Arabic / Bilingual', 'Choose format: PDF / Excel / Interactive HTML', 'Download instantly — share with board or auditor'], stepsAr: ['تصفح 8 قوالب تقارير حسب الفئة', 'اختر اللغة: إنجليزي / عربي / ثنائي', 'اختر الصيغة: PDF / Excel / HTML تفاعلي', 'تنزيل فوري — شارك مع مجلس الإدارة أو المدقق'], badgeEn: 'PDF + Excel + Interactive HTML', badgeAr: 'PDF + Excel + HTML تفاعلي', exportFormats: ['PDF', 'Excel', 'HTML'], sampleReportKey: 'executive-grc' },
      ],
    });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ══════════════════════════════════════════════
// GET /api/public/landing — Alias for landing-content
// ══════════════════════════════════════════════
router.get('/landing', asyncHandler(async (_req, res) => {
  const result = await safeQuery(
  `SELECT content_id, section, sort_order, title_en, title_ar, desc_en, desc_ar, viz_type, chart_data
  FROM public.landing_content
  WHERE active = true
  ORDER BY sort_order ASC`
  );
  res.json(result.rows);
}));

// ══════════════════════════════════════════════
// GET /api/public/pricing — Tiers + limits for pricing page
// ══════════════════════════════════════════════
router.get('/pricing', async (_req: Request, res: Response) => {
  try {
    const tiers = await safeQuery(
      `SELECT td.tier, td.features, td.limits, td.timeline,
              el.max_users, el.max_frameworks, el.max_assessments, el.features AS edition_features
       FROM public.tier_definitions td
       LEFT JOIN public.edition_limits el ON el.plan = td.tier
       ORDER BY el.max_users ASC NULLS LAST`
    );
    res.json({ tiers: tiers.rows });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ══════════════════════════════════════════════
// GET /api/public/tiers — Subscription tiers (legacy)
// ══════════════════════════════════════════════
router.get('/tiers', async (_req: Request, res: Response) => {
  try {
    const result = await safeQuery(
      `SELECT td.tier, td.features, td.limits, td.timeline,
              el.max_users, el.max_frameworks, el.max_assessments, el.features AS edition_features
       FROM public.tier_definitions td
       LEFT JOIN public.edition_limits el ON el.plan = td.tier
       ORDER BY el.max_users ASC NULLS LAST`
    );
    res.json({ tiers: result.rows });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ══════════════════════════════════════════════
// GET /api/public/category-labels — Onboarding category labels
// ══════════════════════════════════════════════
router.get('/category-labels', (_req: Request, res: Response) => {
  res.json({
    labels: {
      governance:  { en: 'Governance & Leadership',   ar: 'الحوكمة والقيادة',            icon: 'pi-building' },
      risk:        { en: 'Risk Management',           ar: 'إدارة المخاطر',              icon: 'pi-exclamation-triangle' },
      compliance:  { en: 'Compliance & Regulatory',   ar: 'الامتثال والتنظيم',           icon: 'pi-check-circle' },
      security:    { en: 'Information Security',      ar: 'أمن المعلومات',              icon: 'pi-shield' },
      bcp:         { en: 'Business Continuity',       ar: 'استمرارية الأعمال',           icon: 'pi-sync' },
      vendor:      { en: 'Vendor & Third Party',      ar: 'الموردون والأطراف الثالثة',    icon: 'pi-truck' },
      audit:       { en: 'Audit & Assurance',         ar: 'التدقيق والتأكيد',            icon: 'pi-search' },
      privacy:     { en: 'Privacy & Data Protection', ar: 'الخصوصية وحماية البيانات',    icon: 'pi-lock' },
      technology:  { en: 'Technology & Operations',   ar: 'التكنولوجيا والعمليات',       icon: 'pi-server' },
    },
  });
});

// ══════════════════════════════════════════════
// GET /api/public/dpia-config — DPIA wizard configuration
// ══════════════════════════════════════════════
router.get('/dpia-config', (_req: Request, res: Response) => {
  res.json({
    mitigations: [
      { controlId: 'PDPL-1.1.1', code: '1.1.1', titleEn: 'Consent Management', titleAr: 'إدارة الموافقة' },
      { controlId: 'PDPL-1.1.2', code: '1.1.2', titleEn: 'Purpose Limitation', titleAr: 'تحديد الغرض' },
      { controlId: 'PDPL-1.1.3', code: '1.1.3', titleEn: 'Data Minimization', titleAr: 'تقليل البيانات' },
      { controlId: 'PDPL-1.2.1', code: '1.2.1', titleEn: 'Right of Access', titleAr: 'حق الوصول' },
      { controlId: 'PDPL-1.2.2', code: '1.2.2', titleEn: 'Right of Correction', titleAr: 'حق التصحيح' },
      { controlId: 'PDPL-1.2.3', code: '1.2.3', titleEn: 'Right of Deletion', titleAr: 'حق الحذف' },
      { controlId: 'PDPL-2.1.1', code: '2.1.1', titleEn: 'Transfer Restrictions', titleAr: 'قيود النقل' },
      { controlId: 'PDPL-2.2.1', code: '2.2.1', titleEn: 'Technical Security Measures', titleAr: 'التدابير الأمنية التقنية' },
      { controlId: 'PDPL-2.2.2', code: '2.2.2', titleEn: 'Breach Notification', titleAr: 'الإخطار بالانتهاك' },
    ],
    lawfulBases: [
      { value: 'consent', labelEn: 'Consent', labelAr: 'الموافقة', descEn: 'Data subject has given explicit consent', descAr: 'أعطى صاحب البيانات موافقة صريحة', icon: 'pi pi-check-circle' },
      { value: 'contractual', labelEn: 'Contractual Obligation', labelAr: 'الالتزام التعاقدي', descEn: 'Processing necessary for contract performance', descAr: 'المعالجة ضرورية لتنفيذ العقد', icon: 'pi pi-file' },
      { value: 'legal', labelEn: 'Legal Obligation', labelAr: 'الالتزام القانوني', descEn: 'Required by Saudi law or regulation', descAr: 'مطلوب بموجب القانون أو اللوائح السعودية', icon: 'pi pi-book' },
      { value: 'vital', labelEn: 'Vital Interest', labelAr: 'المصلحة الحيوية', descEn: 'Necessary to protect vital interests', descAr: 'ضروري لحماية المصالح الحيوية', icon: 'pi pi-heart' },
      { value: 'public', labelEn: 'Public Interest', labelAr: 'المصلحة العامة', descEn: 'Processing in the public interest', descAr: 'المعالجة في المصلحة العامة', icon: 'pi pi-building' },
      { value: 'legitimate', labelEn: 'Legitimate Interest', labelAr: 'المصلحة المشروعة', descEn: 'Legitimate interest of the controller', descAr: 'المصلحة المشروعة للمتحكم', icon: 'pi pi-flag' },
    ],
    necessityQuestions: [
      { labelEn: 'Necessity of processing', labelAr: 'ضرورة المعالجة', score: 3 },
      { labelEn: 'Data minimization', labelAr: 'تقليل البيانات', score: 3 },
      { labelEn: 'Purpose limitation', labelAr: 'تحديد الغرض', score: 3 },
      { labelEn: 'Storage limitation', labelAr: 'تحديد التخزين', score: 3 },
    ],
    defaultRisks: [
      { category: 'Unauthorized Access', categoryAr: 'الوصول غير المصرح به', likelihood: 3, impact: 4, score: 12, residual: 6 },
      { category: 'Data Leak', categoryAr: 'تسريب البيانات', likelihood: 2, impact: 5, score: 10, residual: 5 },
      { category: 'Cross-Border Transfer', categoryAr: 'النقل عبر الحدود', likelihood: 2, impact: 4, score: 8, residual: 4 },
      { category: 'Excessive Processing', categoryAr: 'المعالجة المفرطة', likelihood: 3, impact: 3, score: 9, residual: 4 },
      { category: 'Consent Failure', categoryAr: 'فشل الموافقة', likelihood: 2, impact: 4, score: 8, residual: 3 },
    ],
    defaultDataCategories: [
      { name: 'Personal Identifiable Information (PII)', nameAr: 'معلومات التعريف الشخصية', source: 'Web forms', storage: 'Cloud DB', retention: '3 years' },
      { name: 'Financial Data', nameAr: 'البيانات المالية', source: 'Payment system', storage: 'Encrypted DB', retention: '7 years' },
    ],
  });
});

// ══════════════════════════════════════════════
// GET /api/profiles/me/permissions — Role permissions & processes (auth required)
// ══════════════════════════════════════════════
// NOTE: This is mounted on /api/public but needs auth. We'll add a separate mount in server.ts.

export default router;

// Separate authenticated permissions endpoint
export const permissionsRouter: Router = Router();

permissionsRouter.get('/me/permissions', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.userId!;
  const userResult = await safeQuery('SELECT role FROM users WHERE user_id = $1', [userId]);
  if (userResult.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  const role = getFirstRow(userResult)?.role || 'viewer';

  // Try to fetch from roles table first
  const roleResult = await safeQuery('SELECT permissions FROM roles WHERE role_id = $1', [role]);
  let permissions: string[] = [];
  if (roleResult.rows.length > 0 && getFirstRow(roleResult)?.permissions) {
  permissions = getFirstRow(roleResult)?.permissions;
  }

  const tenantId = req.tenantId;
  let userModules: string[] = [];
  try {
    const schema = `tenant_${tenantId}`;
    const { rows: rpRows } = await safeQuery(
      `SELECT modules FROM "${schema}".role_profiles WHERE role = $1 LIMIT 1`,
      [role],
    );
    const mods = rpRows[0]?.modules;
    if (Array.isArray(mods)) userModules = mods;
    else if (typeof mods === 'string') { try { userModules = JSON.parse(mods); } catch {} }
  } catch {}
  const moduleSet = new Set(userModules);

  const allProcesses = [
  { icon: 'pi pi-building', nameEn: 'Governance', nameAr: 'الحوكمة', phase: 'Plan', module: 'governance' },
  { icon: 'pi pi-exclamation-triangle', nameEn: 'Risk Management', nameAr: 'إدارة المخاطر', phase: 'Assess', module: 'risk' },
  { icon: 'pi pi-check-circle', nameEn: 'Compliance', nameAr: 'الامتثال', phase: 'Design', module: 'compliance' },
  { icon: 'pi pi-lock', nameEn: 'Controls', nameAr: 'الضوابط', phase: 'Implement', module: 'compliance' },
  { icon: 'pi pi-bell', nameEn: 'Incidents', nameAr: 'الحوادث', phase: 'Operate', module: 'incident' },
  { icon: 'pi pi-search', nameEn: 'Audit', nameAr: 'التدقيق', phase: 'Assure', module: 'audit' },
  { icon: 'pi pi-building', nameEn: 'Vendors', nameAr: 'الموردين', phase: 'Assess', module: 'vendor' },
  { icon: 'pi pi-file-edit', nameEn: 'Policies', nameAr: 'السياسات', phase: 'Design', module: 'policy' },
  ];
  const assignedProcesses = allProcesses.filter(p => moduleSet.has(p.module));

  res.json({ role, permissions, assignedProcesses });
}));
