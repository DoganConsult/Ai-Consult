import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScenarioEditor from './ScenarioEditor';
import ScenarioAnalyticsDashboard from '../analytics/ScenarioAnalyticsDashboard';
import AITaskPlanner from '../agents/AITaskPlanner';
import { Cpu, BarChart3, Shield, Brain, Cog, Package, Users, FileText, Wrench, Play, CheckCircle, Clock, AlertTriangle, Copy, X, ChevronRight, Truck, HeartHandshake, FolderKanban, Building2, ShieldAlert, Star, MessageSquare, ThumbsUp, Plus, Pencil, Trash2, LineChart, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Scenarios data - Saudi Vision 2030 aligned
const scenarios = [
  {
    id: "procurement-autopilot",
    name: "وكيل المشتريات الذكي",
    nameEn: "Smart Procurement Agent",
    domain: "المشتريات",
    icon: Package,
    color: "from-blue-500 to-cyan-500",
    oneLiner: "من طلب العروض إلى أمر الشراء — تلقائياً وبحوكمة كاملة",
    promptExample: "أبغى أفضل مورد سعودي معتمد لـ 50 جهاز خادم Dell مع ضمان 3 سنوات، وأنشئ أمر الشراء بعد موافقة المدير المالي.",
    steps: [
      { id: "p1", title: "استخراج المتطلبات والمواصفات", tool: "mind.extract_requirements", requiresApproval: false },
      { id: "p2", title: "إنشاء طلب عروض أسعار", tool: "erpnext.rfq_create", requiresApproval: false },
      { id: "p3", title: "تصنيف الموردين حسب الأداء والمحتوى المحلي", tool: "procurement.supplier_rank", requiresApproval: false },
      { id: "p4", title: "بوابة الموافقة — إنشاء أمر الشراء", tool: "governance.approval", requiresApproval: true },
      { id: "p5", title: "إصدار أمر الشراء", tool: "erpnext.po_create", requiresApproval: true },
      { id: "p6", title: "إشعار المورد المعتمد", tool: "comms.send_email", requiresApproval: false },
    ],
  },
  {
    id: "grc-evidenceops",
    name: "وكيل الحوكمة والامتثال",
    nameEn: "GRC & Compliance Agent",
    domain: "الحوكمة",
    icon: Shield,
    color: "from-emerald-500 to-teal-500",
    oneLiner: "امتثال NCA وساما وهيئة الزكاة — أدلة موثقة وتقارير فورية",
    promptExample: "جهّز ملف الامتثال لمعايير الهيئة الوطنية للأمن السيبراني NCA-ECC مع تحليل الفجوات وخطة المعالجة التلقائية.",
    steps: [
      { id: "g1", title: "جمع الأدلة والمستندات", tool: "grc.ingest_documents", requiresApproval: false },
      { id: "g2", title: "التعرف الضوئي والتصنيف الذكي", tool: "grc.ocr_classify", requiresApproval: false },
      { id: "g3", title: "ربط الأدلة بالضوابط التنظيمية", tool: "grc.map_controls", requiresApproval: false },
      { id: "g4", title: "تحليل الفجوات والملاحظات", tool: "grc.findings_generate", requiresApproval: false },
      { id: "g5", title: "بوابة الموافقة — خطة المعالجة", tool: "governance.approval", requiresApproval: true },
      { id: "g6", title: "إنشاء خطة الإجراءات التصحيحية", tool: "grc.capa_autocreate", requiresApproval: true },
    ],
  },
  {
    id: "finance-close",
    name: "وكيل الإقفال المالي",
    nameEn: "Financial Close Agent",
    domain: "المالية",
    icon: BarChart3,
    color: "from-amber-500 to-orange-500",
    oneLiner: "إقفال شهري متوافق مع معايير IFRS وهيئة الزكاة والضريبة",
    promptExample: "أقفل الفترة المالية لشهر ذي القعدة 1446 مع تقرير التسويات والمؤشرات المالية حسب معايير ZATCA.",
    steps: [
      { id: "f1", title: "سحب بيانات دفتر الأستاذ", tool: "finance.ledger_snapshot", requiresApproval: false },
      { id: "f2", title: "تشغيل التسويات البنكية", tool: "finance.reconcile", requiresApproval: false },
      { id: "f3", title: "تحليل الاستثناءات والفروقات", tool: "finance.explain_exceptions", requiresApproval: false },
      { id: "f4", title: "بوابة الموافقة — إقفال الفترة", tool: "governance.approval", requiresApproval: true },
      { id: "f5", title: "إقفال الفترة المحاسبية", tool: "finance.close_period", requiresApproval: true },
      { id: "f6", title: "إصدار حزمة المؤشرات المالية", tool: "finance.kpi_pack", requiresApproval: false },
    ],
  },
  {
    id: "hr-ops",
    name: "وكيل الموارد البشرية",
    nameEn: "HR Operations Agent",
    domain: "الموارد البشرية",
    icon: Users,
    color: "from-purple-500 to-pink-500",
    oneLiner: "توظيف سعودي متوافق مع نطاقات وطاقات — من الإعلان للتعيين",
    promptExample: "عيّن محلل أمن سيبراني سعودي، تحقق من نطاقات، جهّز عرض العمل، وفعّل حساباته بعد موافقة مدير الموارد البشرية.",
    steps: [
      { id: "h1", title: "إنشاء طلب التوظيف", tool: "hr.job_create", requiresApproval: false },
      { id: "h2", title: "فرز المرشحين والتحقق من نطاقات", tool: "hr.candidate_screen", requiresApproval: false },
      { id: "h3", title: "إعداد عرض العمل", tool: "hr.offer_draft", requiresApproval: false },
      { id: "h4", title: "بوابة الموافقة — إرسال العرض", tool: "governance.approval", requiresApproval: true },
      { id: "h5", title: "إرسال عرض العمل الرسمي", tool: "comms.send_email", requiresApproval: true },
      { id: "h6", title: "تفعيل الصلاحيات والحسابات", tool: "iam.provision_access", requiresApproval: false },
    ],
  },
  {
    id: "robotics-ops",
    name: "وكيل الروبوتات والأتمتة",
    nameEn: "Robotics & IoT Agent",
    domain: "الروبوتات",
    icon: Cpu,
    color: "from-rose-500 to-red-500",
    oneLiner: "تشغيل المستودعات الذكية — من الأمر للتسليم بدون تدخل بشري",
    promptExample: "شغّل روبوت المستودع لتجهيز طلب العميل #SO-2024-1002 مع تحديث حالة التسليم في النظام.",
    steps: [
      { id: "r1", title: "فحص السلامة المسبق", tool: "robotics.safety_check", requiresApproval: false },
      { id: "r2", title: "تعيين مهمة الالتقاط", tool: "robotics.assign_pick", requiresApproval: false },
      { id: "r3", title: "مراقبة تنفيذ المهمة", tool: "robotics.monitor_task", requiresApproval: false },
      { id: "r4", title: "بوابة الموافقة — تأكيد المخزون", tool: "governance.approval", requiresApproval: true },
      { id: "r5", title: "تحديث إشعار التسليم", tool: "erpnext.delivery_note", requiresApproval: true },
    ],
  },
  {
    id: "service-desk",
    name: "وكيل الدعم الفني الذكي",
    nameEn: "Smart Service Desk Agent",
    domain: "الدعم الفني",
    icon: Wrench,
    color: "from-indigo-500 to-blue-500",
    oneLiner: "حل التذاكر تلقائياً — تصنيف، معالجة، إغلاق مع سجل تدقيق كامل",
    promptExample: "حل جميع تذاكر إعادة تعيين كلمة المرور للموظفين تلقائياً مع توثيق كامل للتدقيق.",
    steps: [
      { id: "d1", title: "استلام التذكرة", tool: "servicedesk.ticket_ingest", requiresApproval: false },
      { id: "d2", title: "التصنيف والتوجيه الذكي", tool: "servicedesk.classify_route", requiresApproval: false },
      { id: "d3", title: "تنفيذ الحل الآلي", tool: "iam.password_reset", requiresApproval: false },
      { id: "d4", title: "إغلاق التذكرة مع التوثيق", tool: "servicedesk.ticket_close", requiresApproval: false },
    ],
  },
  {
    id: "logistics-supply",
    name: "وكيل اللوجستيات وسلسلة الإمداد",
    nameEn: "Logistics & Supply Chain Agent",
    domain: "اللوجستيات",
    icon: Truck,
    color: "from-sky-500 to-blue-600",
    oneLiner: "تتبع الشحنات وتحسين المسارات — من المستودع للعميل بكفاءة عالية",
    promptExample: "تتبع شحنة #SHP-2024-5001 وأعد توجيهها للمسار الأسرع مع إشعار العميل بموعد التسليم المحدث.",
    steps: [
      { id: "l1", title: "تتبع موقع الشحنة", tool: "logistics.track_shipment", requiresApproval: false },
      { id: "l2", title: "تحليل المسارات البديلة", tool: "logistics.route_optimize", requiresApproval: false },
      { id: "l3", title: "التحقق من توفر السائقين", tool: "logistics.driver_availability", requiresApproval: false },
      { id: "l4", title: "بوابة الموافقة — إعادة التوجيه", tool: "governance.approval", requiresApproval: true },
      { id: "l5", title: "تحديث المسار في النظام", tool: "logistics.update_route", requiresApproval: true },
      { id: "l6", title: "إشعار العميل بالتحديث", tool: "comms.send_sms", requiresApproval: false },
    ],
  },
  {
    id: "crm-agent",
    name: "وكيل علاقات العملاء",
    nameEn: "CRM & Customer Success Agent",
    domain: "العملاء",
    icon: HeartHandshake,
    color: "from-pink-500 to-rose-600",
    oneLiner: "إدارة العملاء من الاستفسار للولاء — تحليل ذكي ومتابعة آلية",
    promptExample: "حلل شكاوى العملاء لهذا الأسبوع، صنّفها حسب الأولوية، وجدول مكالمات المتابعة للعملاء VIP.",
    steps: [
      { id: "c1", title: "جمع شكاوى العملاء", tool: "crm.fetch_complaints", requiresApproval: false },
      { id: "c2", title: "تحليل المشاعر والتصنيف", tool: "crm.sentiment_analysis", requiresApproval: false },
      { id: "c3", title: "تحديد العملاء ذوي الأولوية", tool: "crm.prioritize_vip", requiresApproval: false },
      { id: "c4", title: "جدولة مكالمات المتابعة", tool: "crm.schedule_callbacks", requiresApproval: false },
      { id: "c5", title: "بوابة الموافقة — عروض التعويض", tool: "governance.approval", requiresApproval: true },
      { id: "c6", title: "إرسال عروض الولاء", tool: "crm.send_offers", requiresApproval: true },
    ],
  },
  {
    id: "project-mgmt",
    name: "وكيل إدارة المشاريع",
    nameEn: "Project Management Agent",
    domain: "المشاريع",
    icon: FolderKanban,
    color: "from-violet-500 to-purple-600",
    oneLiner: "متابعة المشاريع من التخطيط للتسليم — تقارير آلية وتنبيهات استباقية",
    promptExample: "راجع حالة مشروع #PRJ-2024-100، حدد المهام المتأخرة، وأرسل تنبيهات للمسؤولين مع تحديث الجدول الزمني.",
    steps: [
      { id: "pm1", title: "سحب بيانات المشروع", tool: "pm.fetch_project", requiresApproval: false },
      { id: "pm2", title: "تحليل المهام المتأخرة", tool: "pm.analyze_delays", requiresApproval: false },
      { id: "pm3", title: "حساب التأثير على الجدول", tool: "pm.recalculate_timeline", requiresApproval: false },
      { id: "pm4", title: "إعداد تقرير الحالة", tool: "pm.generate_report", requiresApproval: false },
      { id: "pm5", title: "بوابة الموافقة — تعديل الجدول", tool: "governance.approval", requiresApproval: true },
      { id: "pm6", title: "إشعار أصحاب المصلحة", tool: "comms.send_email", requiresApproval: true },
    ],
  },
  {
    id: "gov-services",
    name: "وكيل الخدمات الحكومية الرقمية",
    nameEn: "Digital Government Services Agent",
    domain: "الخدمات الحكومية",
    icon: Building2,
    color: "from-emerald-600 to-green-700",
    oneLiner: "إدارة التأشيرات والتصاريح — تكامل مع وزارة الخارجية والحج والعمرة",
    promptExample: "جهّز ملفات تأشيرات العمرة لمجموعة الحجاج من إندونيسيا، تحقق من الوثائق، وأرسلها لوزارة الخارجية.",
    steps: [
      { id: "g1", title: "استلام طلبات التأشيرات", tool: "gov.fetch_visa_requests", requiresApproval: false },
      { id: "g2", title: "التحقق من الوثائق المطلوبة", tool: "gov.verify_documents", requiresApproval: false },
      { id: "g3", title: "التحقق من نظام مقيم", tool: "gov.muqeem_check", requiresApproval: false },
      { id: "g4", title: "إعداد ملف التأشيرة", tool: "gov.prepare_visa_file", requiresApproval: false },
      { id: "g5", title: "بوابة الموافقة — الإرسال للوزارة", tool: "governance.approval", requiresApproval: true },
      { id: "g6", title: "رفع الملفات لنظام إنجاز", tool: "gov.submit_enjaz", requiresApproval: true },
      { id: "g7", title: "إشعار مكتب السفريات", tool: "comms.send_email", requiresApproval: false },
    ],
  },
  {
    id: "cybersec-incident",
    name: "وكيل الاستجابة للحوادث السيبرانية",
    nameEn: "Cybersecurity Incident Response Agent",
    domain: "الأمن السيبراني",
    icon: ShieldAlert,
    color: "from-red-600 to-rose-700",
    oneLiner: "كشف التهديدات والاستجابة الفورية — متوافق مع ضوابط NCA",
    promptExample: "اكتشف محاولة اختراق من IP مشبوه، عزل الجهاز المصاب، وأبلغ فريق الأمن مع تقرير الحادثة.",
    steps: [
      { id: "cs1", title: "تحليل التنبيه الأمني", tool: "soc.analyze_alert", requiresApproval: false },
      { id: "cs2", title: "تحديد نطاق التهديد", tool: "soc.threat_scope", requiresApproval: false },
      { id: "cs3", title: "عزل الأجهزة المتأثرة", tool: "soc.isolate_endpoints", requiresApproval: false },
      { id: "cs4", title: "جمع الأدلة الجنائية", tool: "soc.collect_forensics", requiresApproval: false },
      { id: "cs5", title: "بوابة الموافقة — الإبلاغ للجهات", tool: "governance.approval", requiresApproval: true },
      { id: "cs6", title: "إنشاء تقرير الحادثة NCA", tool: "soc.generate_nca_report", requiresApproval: true },
      { id: "cs7", title: "تفعيل خطة التعافي", tool: "soc.initiate_recovery", requiresApproval: false },
    ],
  },
];

// Mock execution
function generateMockExecution(scenario, dryRun, approvals) {
  const runId = `RUN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const evidences = [];
  const steps = [];
  let pendingApprovalStepId = null;

  for (const step of scenario.steps) {
    if (step.requiresApproval && !approvals.includes(step.id) && !dryRun) {
      const evId = `EV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      evidences.push({ id: evId, type: 'approval', title: 'Approval requested' });
      steps.push({
        stepId: step.id,
        title: step.title,
        tool: step.tool,
        status: 'pending_approval',
        result: { ok: true, summary: 'Approval required', evidences: [{ id: evId }] }
      });
      pendingApprovalStepId = step.id;
      break;
    }

    if (dryRun) {
      steps.push({ stepId: step.id, title: step.title, tool: step.tool, status: 'dry_run' });
    } else {
      const evId = `EV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      evidences.push({ id: evId, type: 'db', title: step.title });
      steps.push({
        stepId: step.id,
        title: step.title,
        tool: step.tool,
        status: 'done',
        result: { ok: true, summary: `${step.title} completed successfully`, evidences: [{ id: evId }] }
      });
    }
  }

  const mindReport = {
    title: `${scenario.name} — Mind Report`,
    facts: steps.filter(s => s.status === 'done').map(s => ({
      statement: `${s.title}: ${s.result?.summary || 'Completed'}`,
      evidenceIds: s.result?.evidences?.map(e => e.id) || []
    })),
    analysis: [{ statement: `Execution produced ${evidences.length} evidence items.`, evidenceIds: evidences.slice(0, 3).map(e => e.id), confidence: 0.9 }],
    actions: [{ action: 'Export Mind Report JSON as audit artifact.', evidenceIds: evidences.slice(0, 2).map(e => e.id), owner: 'Operations' }],
    risks: steps.filter(s => s.status === 'pending_approval').map(s => ({
      risk: `Pending approval: ${s.title}`,
      mitigation: 'Collect approvals and re-run.',
      evidenceIds: s.result?.evidences?.map(e => e.id) || []
    })),
  };

  return { runId, scenarioId: scenario.id, dryRun, pendingApprovalStepId, steps, evidences, mindReport };
}

const iconMap = {
  Package, Shield, BarChart3, Users, Cpu, Wrench, Truck, HeartHandshake, FolderKanban, Building2, ShieldAlert
};

function ScenarioCard({ scenario, onOpen, isPreferred = false, onEdit, onDelete }) {
  const Icon = typeof scenario.icon === 'string' ? (iconMap[scenario.icon] || Package) : scenario.icon;
  return (
    <div
      className={`text-right group rounded-2xl border bg-white/70 backdrop-blur-sm hover:bg-white hover:shadow-xl hover:border-emerald-300 transition-all p-5 w-full ${isPreferred ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-200'} ${scenario.isCustom ? 'ring-1 ring-amber-100' : ''}`}
      dir="rtl"
    >
      <div className="flex items-start gap-4">
        <button onClick={() => onOpen(scenario)} className="flex items-start gap-4 flex-1 text-right">
          <div className={`w-14 h-14 bg-gradient-to-br ${scenario.color} rounded-2xl flex items-center justify-center shrink-0 shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{scenario.domain}</span>
              {scenario.isCustom && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">مخصص</span>
              )}
            </div>
            <div className="text-lg font-bold text-slate-900">{scenario.name}</div>
            <div className="text-xs text-slate-500 mb-2">{scenario.nameEn}</div>
            <div className="text-sm text-slate-600 leading-relaxed">{scenario.oneLiner}</div>
          </div>
        </button>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onEdit(scenario)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="تعديل"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {scenario.isCustom && (
            <button
              onClick={() => onDelete(scenario.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <button onClick={() => onOpen(scenario)} className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 w-full text-right hover:bg-slate-100 transition-colors">
        <div className="text-xs text-slate-500 mb-1">💬 مثال على الأمر:</div>
        <div className="text-sm text-slate-700 font-medium leading-relaxed">{scenario.promptExample}</div>
      </button>
    </div>
  );
}

function DemoDrawer({ scenario, onClose, defaultDryRun = true }) {
  const [dryRun, setDryRun] = useState(defaultDryRun);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 0, accuracy: 0, comment: '', submitted: false });

  if (!scenario) return null;

  const plan = {
    scenarioId: scenario.id,
    goal: scenario.name,
    steps: scenario.steps.map(s => ({ id: s.id, title: s.title, tool: s.tool, requiresApproval: s.requiresApproval }))
  };

  const run = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    const res = generateMockExecution(scenario, dryRun, approvals);
    setResult(res);
    setLoading(false);
  };

  const approvePending = () => {
    if (result?.pendingApprovalStepId && !approvals.includes(result.pendingApprovalStepId)) {
      setApprovals([...approvals, result.pendingApprovalStepId]);
    }
  };

  const Icon = scenario.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl overflow-y-auto"
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${scenario.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">{scenario.domain}</div>
                <h2 className="text-2xl font-bold text-slate-900">{scenario.name}</h2>
                <p className="text-sm text-slate-600 mt-1">{scenario.oneLiner}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">Mind</Badge>
            <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">Robotic Muscles</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Evidence</Badge>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Approval Gate</Badge>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Plan & Controls */}
            <div className="space-y-4">
              {/* Plan JSON */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">Plan (JSON)</span>
                </div>
                <pre className="text-xs text-slate-700 bg-white p-3 rounded-lg overflow-x-auto border border-slate-200 max-h-48">
                  {JSON.stringify(plan, null, 2)}
                </pre>
              </div>

              {/* Controls */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-900">Actions</span>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <Checkbox checked={dryRun} onCheckedChange={setDryRun} />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Dry-Run Mode</span>
                      <p className="text-xs text-slate-500">Simulate without executing</p>
                    </div>
                  </label>
                  <Button onClick={run} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base">
                    {loading ? (
                      <span className="flex items-center gap-2"><Clock className="w-5 h-5 animate-spin" /> Running...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Play className="w-5 h-5" /> {dryRun ? 'Simulate Execution' : 'Execute Now'}</span>
                    )}
                  </Button>
                  {result?.pendingApprovalStepId && !dryRun && (
                    <Button onClick={approvePending} variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 h-12">
                      <AlertTriangle className="w-5 h-5 mr-2" /> Approve Step: {result.pendingApprovalStepId}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Execution Results */}
            <div className="space-y-4">
              {/* Execution Steps */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">Execution Steps</span>
                  {result && (
                    <span className="text-xs text-slate-500">
                      Run: {result.runId} • {result.evidences.length} Evidence
                    </span>
                  )}
                </div>

                {!result && !loading ? (
                  <div className="text-center py-8">
                    <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Run the demo to see step-by-step execution</p>
                  </div>
                ) : loading ? (
                  <div className="space-y-2">
                    {scenario.steps.map((step, idx) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0.3, scale: 0.98 }}
                        animate={{ 
                          opacity: [0.3, 1, 0.3], 
                          scale: [0.98, 1, 0.98],
                          borderColor: ['#e2e8f0', '#10b981', '#e2e8f0']
                        }}
                        transition={{ 
                          duration: 1.5, 
                          delay: idx * 0.25,
                          repeat: Infinity,
                          repeatDelay: scenario.steps.length * 0.25
                        }}
                        className="rounded-lg border-2 p-3 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${scenario.color} flex items-center justify-center`}>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Cog className="w-4 h-4 text-white" />
                            </motion.div>
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-900">{step.title}</span>
                            <div className="text-xs text-slate-500">{step.tool}</div>
                          </div>
                          {step.requiresApproval && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Approval</Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {result.steps.map((s, idx) => (
                      <motion.div 
                        key={s.stepId} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`rounded-lg border p-3 ${s.status === 'done' ? 'border-emerald-200 bg-emerald-50/50' : s.status === 'pending_approval' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {s.status === 'done' && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: idx * 0.1 }}>
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              </motion.div>
                            )}
                            {s.status === 'dry_run' && <Clock className="w-5 h-5 text-blue-600" />}
                            {s.status === 'pending_approval' && (
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                              </motion.div>
                            )}
                            <span className="text-sm font-medium text-slate-900">{s.stepId}: {s.title}</span>
                          </div>
                          <Badge className={`text-xs ${s.status === 'done' ? 'bg-emerald-100 text-emerald-700' : s.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {s.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Tool: <code className="bg-slate-100 px-1 rounded">{s.tool}</code></div>
                        {s.result?.summary && <div className="text-xs text-slate-600 mt-1 font-medium">{s.result.summary}</div>}
                        {s.result?.evidences?.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ delay: idx * 0.1 + 0.2 }}
                            className="flex gap-1 mt-2"
                          >
                            {s.result.evidences.map(e => (
                              <Badge key={e.id} variant="outline" className="text-xs bg-white">{e.id}</Badge>
                            ))}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mind Report - Full Width */}
          {result && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-900">Mind Report (Grounded)</span>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(result.mindReport, null, 2))}>
                  <Copy className="w-4 h-4 mr-1" /> Copy JSON
                </Button>
              </div>

              {/* Evidence Summary */}
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-semibold text-slate-900">سجل الأدلة ({result.evidences.length})</span>
                </div>
                <div className="grid gap-2">
                  {result.evidences.map((ev, idx) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                        ev.type === 'approval' 
                          ? 'bg-amber-50 border-amber-200' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        ev.type === 'approval' 
                          ? 'bg-amber-200 text-amber-800' 
                          : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-purple-700">{ev.id}</code>
                          {ev.type === 'approval' && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">موافقة</Badge>
                          )}
                          {ev.type === 'db' && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">سجل</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{ev.title}</p>
                      </div>
                      <CheckCircle className={`w-4 h-4 shrink-0 ${
                        ev.type === 'approval' ? 'text-amber-500' : 'text-emerald-500'
                      }`} />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Facts with Evidence Links */}
              <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold text-slate-900">الحقائق المستخلصة</span>
                </div>
                <div className="space-y-2">
                  {result.mindReport.facts.map((fact, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-sm text-slate-700 mb-2">{fact.statement}</p>
                      <div className="flex flex-wrap gap-1">
                        {fact.evidenceIds.map(evId => (
                          <span key={evId} className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                            {evId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw JSON (Collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                  عرض JSON الخام
                </summary>
                <pre className="text-xs text-slate-700 bg-white p-4 rounded-lg overflow-x-auto border border-slate-200 max-h-48 mt-2">
                  {JSON.stringify(result.mindReport, null, 2)}
                </pre>
              </details>

              <p className="text-xs text-slate-500 mt-3 text-center">
                كل fact مرتبط بـ Evidence IDs — No hallucinations by design.
              </p>
            </div>
          )}

          {/* Feedback Section */}
          {result && !feedback.submitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 mt-6"
              dir="rtl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">شاركنا رأيك</h4>
                  <p className="text-sm text-slate-600">ساعدنا في تحسين السيناريوهات والنماذج الذكية</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Relevance Rating */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">مدى ملاءمة السيناريو لاحتياجاتك</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedback({ ...feedback, rating: star })}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${feedback.rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accuracy Rating */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">دقة خطوات التنفيذ</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedback({ ...feedback, accuracy: star })}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${feedback.accuracy >= star ? 'text-emerald-400 fill-emerald-400' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    value={feedback.comment}
                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                    placeholder="اكتب ملاحظاتك هنا..."
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <Button
                  onClick={() => setFeedback({ ...feedback, submitted: true })}
                  disabled={feedback.rating === 0 || feedback.accuracy === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
                >
                  <ThumbsUp className="w-4 h-4 ml-2" />
                  إرسال التقييم
                </Button>
              </div>
            </motion.div>
          )}

          {/* Feedback Thank You */}
          {result && feedback.submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 mt-6 text-center"
              dir="rtl"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-slate-900 text-lg mb-2">شكراً لك!</h4>
              <p className="text-sm text-slate-600">تقييمك يساعدنا في تحسين تجربة المستخدم وتطوير النماذج الذكية</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// User Preferences Management
const defaultPreferences = {
  dryRunDefault: true,
  preferredCompliance: [],
  preferredDomains: [],
};

const getStoredPreferences = () => {
  try {
    const stored = localStorage.getItem('autopilot_preferences');
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
};

const savePreferences = (prefs) => {
  try {
    localStorage.setItem('autopilot_preferences', JSON.stringify(prefs));
  } catch {}
};

const complianceOptions = [
  { id: 'nca', label: 'NCA الأمن السيبراني', labelEn: 'NCA Cybersecurity' },
  { id: 'sama', label: 'ساما SAMA', labelEn: 'SAMA' },
  { id: 'zatca', label: 'ZATCA الزكاة والضريبة', labelEn: 'ZATCA' },
  { id: 'nitaqat', label: 'نطاقات Nitaqat', labelEn: 'Nitaqat' },
  { id: 'ifrs', label: 'IFRS المعايير الدولية', labelEn: 'IFRS' },
  { id: 'iso27001', label: 'ISO 27001', labelEn: 'ISO 27001' },
];

const domainOptions = [
  { id: 'procurement', label: 'المشتريات' },
  { id: 'grc', label: 'الحوكمة' },
  { id: 'finance', label: 'المالية' },
  { id: 'hr', label: 'الموارد البشرية' },
  { id: 'robotics', label: 'الروبوتات' },
  { id: 'service', label: 'الدعم الفني' },
  { id: 'logistics', label: 'اللوجستيات' },
  { id: 'crm', label: 'العملاء' },
  { id: 'projects', label: 'المشاريع' },
  { id: 'gov', label: 'الخدمات الحكومية' },
  { id: 'cybersec', label: 'الأمن السيبراني' },
];

function PreferencesPanel({ preferences, onUpdate, onClose }) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const toggleCompliance = (id) => {
    const updated = localPrefs.preferredCompliance.includes(id)
      ? localPrefs.preferredCompliance.filter(c => c !== id)
      : [...localPrefs.preferredCompliance, id];
    setLocalPrefs({ ...localPrefs, preferredCompliance: updated });
  };

  const toggleDomain = (id) => {
    const updated = localPrefs.preferredDomains.includes(id)
      ? localPrefs.preferredDomains.filter(d => d !== id)
      : [...localPrefs.preferredDomains, id];
    setLocalPrefs({ ...localPrefs, preferredDomains: updated });
  };

  const handleSave = () => {
    onUpdate(localPrefs);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 p-4"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-900">تفضيلاتي</h4>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Dry Run Default */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={localPrefs.dryRunDefault}
            onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, dryRunDefault: checked })}
          />
          <div>
            <span className="text-sm font-medium text-slate-900">وضع المحاكاة افتراضياً</span>
            <p className="text-xs text-slate-500">Dry-Run Mode</p>
          </div>
        </label>
      </div>

      {/* Preferred Compliance */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">معايير الامتثال المفضلة</label>
        <div className="flex flex-wrap gap-1.5">
          {complianceOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => toggleCompliance(opt.id)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                localPrefs.preferredCompliance.includes(opt.id)
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Domains */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">المجالات المفضلة</label>
        <div className="flex flex-wrap gap-1.5">
          {domainOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => toggleDomain(opt.id)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                localPrefs.preferredDomains.includes(opt.id)
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
        حفظ التفضيلات
      </Button>
    </motion.div>
  );
}

// Custom scenarios storage
const getCustomScenarios = () => {
  try {
    const stored = localStorage.getItem('autopilot_custom_scenarios');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCustomScenarios = (scenarios) => {
  try {
    localStorage.setItem('autopilot_custom_scenarios', JSON.stringify(scenarios));
  } catch {}
};

export default function AutopilotDemo() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [preferences, setPreferences] = useState(getStoredPreferences);
  const [showPreferences, setShowPreferences] = useState(false);
  const [customScenarios, setCustomScenarios] = useState(getCustomScenarios);
  const [editingScenario, setEditingScenario] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  const updatePreferences = (newPrefs) => {
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const handleSaveScenario = (scenario) => {
    const isExistingCustom = customScenarios.some(s => s.id === scenario.id);
    let updatedCustom;
    
    if (isExistingCustom) {
      updatedCustom = customScenarios.map(s => s.id === scenario.id ? scenario : s);
    } else {
      updatedCustom = [...customScenarios, { ...scenario, isCustom: true }];
    }
    
    setCustomScenarios(updatedCustom);
    saveCustomScenarios(updatedCustom);
    setEditingScenario(null);
    setIsCreatingNew(false);
  };

  const handleDeleteCustomScenario = (scenarioId) => {
    const updatedCustom = customScenarios.filter(s => s.id !== scenarioId);
    setCustomScenarios(updatedCustom);
    saveCustomScenarios(updatedCustom);
  };

  const handleEditScenario = (scenario) => {
    setEditingScenario(scenario);
    setIsCreatingNew(false);
  };

  // Combine and sort scenarios based on user preferences
  const sortedScenarios = React.useMemo(() => {
    const allScenarios = [...scenarios, ...customScenarios];
    if (preferences.preferredDomains.length === 0) return allScenarios;
    
    return [...allScenarios].sort((a, b) => {
      const aMatch = preferences.preferredDomains.some(d => a.id.includes(d) || a.domain.includes(d));
      const bMatch = preferences.preferredDomains.some(d => b.id.includes(d) || b.domain.includes(d));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [preferences.preferredDomains, customScenarios]);

  return (
    <section className="py-16">
      {/* Saudi AI Platform Section - Enterprise Grade */}
      <div className="mb-16 md:mb-24 px-4 md:px-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          {/* Main Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 md:p-14 shadow-2xl"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500 rounded-full blur-3xl" />
            </div>
            
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
            
            <div className="relative z-10">

              
              {/* Main Headline */}
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-center text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
              >
                حلول ذكية…{' '}
                <span className="bg-gradient-to-l from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  بروح سعودية
                </span>
              </motion.h2>
              
              {/* Main Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-center text-lg md:text-xl text-slate-300 leading-[2] max-w-3xl mx-auto mb-8"
              >
                منصة تفهم أسلوب عملك، وتحوّل أوامرك بالعربي إلى تنفيذٍ منظم عبر أنظمة الأعمال والأنظمة الذاتية
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-center text-base text-slate-400 leading-[2] max-w-2xl mx-auto mb-12"
              >
                نظامُ ذكاءٍ اصطناعي سعودي متكامل يحوّل أوامرك باللغة العربية الطبيعية إلى خططٍ تنفيذيةٍ محكمة، ثم إلى إجراءاتٍ فعلية عبر أنظمة الـERP والروبوتات وواجهات البرمجة
              </motion.p>
              
              {/* Features Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
              >
                {[
                  { title: 'تشغيلٌ شبه ذاتي', desc: 'أتمتة كاملة للعمليات', icon: Cpu },
                  { title: 'تقاريرُ موثقة', desc: 'أدلة قابلة للتدقيق', icon: FileText },
                  { title: 'بواباتُ حوكمة', desc: 'موافقات محكمة', icon: Shield },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                  >
                    <item.icon className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </motion.div>
              
              {/* Compliance Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="pt-8 border-t border-white/10"
              >
                <p className="text-center text-xs text-slate-500 mb-5">متوافقٌ مع الجهات التنظيمية السعودية</p>
                <div className="relative overflow-hidden h-8">
                  <motion.div
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{ 
                      duration: 30, 
                      ease: "linear", 
                      repeat: Infinity 
                    }}
                    className="flex items-center gap-10 md:gap-14 whitespace-nowrap absolute"
                  >
                    {[...Array(2)].map((_, setIdx) => (
                      <React.Fragment key={setIdx}>
                        {[
                          'NCA', 'SAMA', 'ZATCA', 'CMA', 'CITC', 'MISA', 
                          'NUPCO', 'SFDA', 'MOH', 'MOMRAH', 'HRSD', 'MC',
                          'GACA', 'SAIP', 'NCBE', 'GAZT'
                        ].map((badge, idx) => (
                          <span 
                            key={`${setIdx}-${idx}`}
                            className="text-sm text-slate-500 font-semibold tracking-widest hover:text-emerald-400 transition-colors cursor-default"
                          >
                            {badge}
                          </span>
                        ))}
                      </React.Fragment>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scenarios Section - Collapsible */}
      <div className="mb-4" dir="rtl">
        <button
          onClick={() => setShowScenarios(!showScenarios)}
          className="w-full flex items-center justify-between py-4 px-6 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="text-right">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900">سيناريوهات التشغيل الذكي</h3>
            <p className="text-xs text-slate-500 mt-0.5">اكتشف كيف يعمل الوكيل الذكي</p>
          </div>
          <motion.div
            animate={{ rotate: showScenarios ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-slate-500 rotate-90" />
          </motion.div>
        </button>
      </div>

      {/* Collapsible Scenarios Content */}
      <AnimatePresence>
        {showScenarios && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 mb-6" dir="rtl">
              <Button
                variant={showAIPlanner ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowAIPlanner(!showAIPlanner); setShowAnalytics(false); }}
                className={`flex items-center gap-2 ${showAIPlanner ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              >
                <Sparkles className="w-4 h-4" />
                {showAIPlanner ? 'إخفاء المخطط' : 'مخطط المهام الذكي'}
              </Button>
              <Button
                variant={showAnalytics ? "default" : "outline"}
                size="sm"
                onClick={() => { setShowAnalytics(!showAnalytics); setShowAIPlanner(false); }}
                className={`flex items-center gap-2 ${showAnalytics ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                <LineChart className="w-4 h-4" />
                {showAnalytics ? 'إخفاء التحليلات' : 'تحليلات الأداء'}
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="flex items-center gap-2"
                >
                  <Cog className="w-4 h-4" />
                  تفضيلاتي
                  {(preferences.preferredCompliance.length > 0 || preferences.preferredDomains.length > 0) && (
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  )}
                </Button>
                <AnimatePresence>
                  {showPreferences && (
                    <PreferencesPanel
                      preferences={preferences}
                      onUpdate={updatePreferences}
                      onClose={() => setShowPreferences(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {preferences.preferredDomains.length > 0 && (
              <div className="flex items-center gap-2 mb-4" dir="rtl">
                <span className="text-xs text-slate-500">مرتب حسب:</span>
                {preferences.preferredDomains.slice(0, 3).map(d => (
                  <Badge key={d} className="bg-purple-100 text-purple-700 text-xs">{domainOptions.find(o => o.id === d)?.label}</Badge>
                ))}
                {preferences.preferredDomains.length > 3 && (
                  <span className="text-xs text-slate-500">+{preferences.preferredDomains.length - 3}</span>
                )}
              </div>
            )}

            {/* AI Task Planner */}
            <AnimatePresence>
              {showAIPlanner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8 overflow-hidden"
                >
                  <AITaskPlanner />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analytics Dashboard */}
            <AnimatePresence>
              {showAnalytics && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8 overflow-hidden"
                >
                  <ScenarioAnalyticsDashboard />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create Custom Scenario Button */}
            <div className="mb-6">
              <button
                onClick={() => { setIsCreatingNew(true); setEditingScenario(null); }}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors flex items-center justify-center gap-3 text-emerald-700"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">إنشاء سيناريو مخصص</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {sortedScenarios.map(s => (
                <ScenarioCard 
                  key={s.id} 
                  scenario={s} 
                  onOpen={setSelectedScenario} 
                  isPreferred={preferences.preferredDomains.some(d => s.id.includes(d) || s.domain.includes(d))}
                  onEdit={handleEditScenario}
                  onDelete={handleDeleteCustomScenario}
                />
              ))}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Note - Collapsible */}
      <div className="mt-4" dir="rtl">
        <button
          onClick={() => setShowScenarios(!showScenarios)}
          className={`w-full flex items-center justify-between py-3 px-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all group ${showScenarios ? 'hidden' : ''}`}
        >
          <p className="text-sm text-slate-600 text-right">
            <span className="font-semibold text-emerald-600">بدون هلوسات بالتصميم:</span> كل نتيجة مرتبطة بمعرّفات الأدلة
          </p>
          <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
        </button>
      </div>

      <AnimatePresence>
        {selectedScenario && (
          <DemoDrawer scenario={selectedScenario} onClose={() => setSelectedScenario(null)} defaultDryRun={preferences.dryRunDefault} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(editingScenario || isCreatingNew) && (
          <ScenarioEditor
            scenario={editingScenario}
            isNew={isCreatingNew}
            onSave={handleSaveScenario}
            onClose={() => { setEditingScenario(null); setIsCreatingNew(false); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}