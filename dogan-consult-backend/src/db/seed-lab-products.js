import 'dotenv/config';
import pool from './pool.js';

const products = [
  {
    slug: 'shahin-ai',
    name_ar: 'شاهين AI',
    name_en: 'Shahin AI',
    tagline_ar: 'نظام الحوكمة والامتثال بالذكاء الاصطناعي',
    tagline_en: 'AI-Powered GRC & Governance OS',
    description_ar: 'منصة متكاملة للحوكمة وإدارة المخاطر والامتثال مدعومة بالذكاء الاصطناعي. تساعد المؤسسات على أتمتة عمليات الامتثال وتقييم المخاطر وإدارة السياسات بكفاءة عالية.',
    description_en: 'Comprehensive AI-powered Governance, Risk, and Compliance platform. Helps organizations automate compliance workflows, risk assessments, and policy management with high efficiency.',
    features_json: {
      en: ['Automated compliance monitoring', 'AI-driven risk assessment', 'Policy lifecycle management', 'Real-time audit trails', 'Multi-framework support'],
      ar: ['مراقبة الامتثال الآلية', 'تقييم المخاطر بالذكاء الاصطناعي', 'إدارة دورة حياة السياسات', 'سجلات تدقيق فورية', 'دعم أطر عمل متعددة']
    },
    use_cases_json: {
      en: ['Government regulatory compliance', 'Enterprise risk management', 'ISO/IEC certification readiness', 'Internal audit automation'],
      ar: ['الامتثال التنظيمي الحكومي', 'إدارة مخاطر المؤسسات', 'الاستعداد لشهادات ISO/IEC', 'أتمتة التدقيق الداخلي']
    },
    status: 'live', sort_order: 1,
  },
  {
    slug: 'dogan-ai',
    name_ar: 'دوغان AI',
    name_en: 'Dogan AI',
    tagline_ar: 'حلول الذكاء الاصطناعي المؤسسية',
    tagline_en: 'Enterprise AI Solutions & Agent Workflows',
    description_ar: 'حلول ذكاء اصطناعي متقدمة للمؤسسات تشمل وكلاء ذكية وأتمتة سير العمل وتحليل البيانات المتقدم. مصممة لتعزيز الإنتاجية وتسريع التحول الرقمي.',
    description_en: 'Advanced enterprise AI solutions including intelligent agents, workflow automation, and advanced data analytics. Designed to boost productivity and accelerate digital transformation.',
    features_json: {
      en: ['Intelligent agent workflows', 'Custom LLM integration', 'Document AI processing', 'Conversational AI assistants', 'Enterprise API gateway'],
      ar: ['سير عمل الوكلاء الأذكياء', 'تكامل نماذج لغوية مخصصة', 'معالجة المستندات بالذكاء الاصطناعي', 'مساعدين محادثة ذكية', 'بوابة API للمؤسسات']
    },
    use_cases_json: {
      en: ['Customer service automation', 'Document processing pipelines', 'Knowledge base management', 'Predictive analytics'],
      ar: ['أتمتة خدمة العملاء', 'خطوط معالجة المستندات', 'إدارة قواعد المعرفة', 'التحليلات التنبؤية']
    },
    status: 'live', sort_order: 2,
  },
  {
    slug: 'saudi-business-gate',
    name_ar: 'بوابة الأعمال السعودية',
    name_en: 'Saudi Business Gate',
    tagline_ar: 'منصة SaaS والسوق الرقمي',
    tagline_en: 'SaaS & Digital Marketplace Platform',
    description_ar: 'منصة رقمية شاملة تجمع بين خدمات SaaS والسوق الإلكتروني، مصممة لدعم الأعمال في المملكة العربية السعودية والمنطقة.',
    description_en: 'Comprehensive digital platform combining SaaS services and digital marketplace, designed to support businesses in Saudi Arabia and the region.',
    features_json: {
      en: ['Multi-vendor marketplace', 'SaaS subscription management', 'Payment gateway integration', 'Business analytics dashboard', 'Arabic-first UX'],
      ar: ['سوق متعدد البائعين', 'إدارة اشتراكات SaaS', 'تكامل بوابات الدفع', 'لوحة تحليلات الأعمال', 'تجربة مستخدم عربية أولاً']
    },
    use_cases_json: {
      en: ['B2B marketplace operations', 'Digital service delivery', 'SME enablement programs', 'Government service portals'],
      ar: ['عمليات السوق B2B', 'تقديم الخدمات الرقمية', 'برامج تمكين المنشآت الصغيرة', 'بوابات الخدمات الحكومية']
    },
    status: 'live', sort_order: 3,
  },
  {
    slug: 'doganhub',
    name_ar: 'دوغان هب',
    name_en: 'DoganHub',
    tagline_ar: 'منصة مراكز العمليات SOC/NOC',
    tagline_en: 'SOC / NOC Operations Platform',
    description_ar: 'منصة متكاملة لإدارة مراكز عمليات الأمن السيبراني (SOC) ومراكز عمليات الشبكات (NOC)، توفر رؤية شاملة وتنبيهات فورية وأتمتة الاستجابة.',
    description_en: 'Integrated platform for managing Security Operations Centers (SOC) and Network Operations Centers (NOC), providing comprehensive visibility, real-time alerts, and automated response.',
    features_json: {
      en: ['Unified SOC/NOC dashboard', 'Real-time threat monitoring', 'Incident response automation', 'Network performance analytics', 'Compliance reporting'],
      ar: ['لوحة SOC/NOC موحدة', 'مراقبة التهديدات الفورية', 'أتمتة الاستجابة للحوادث', 'تحليلات أداء الشبكة', 'تقارير الامتثال']
    },
    use_cases_json: {
      en: ['Enterprise security operations', 'Telecom NOC management', 'Critical infrastructure monitoring', 'Managed security services'],
      ar: ['عمليات أمن المؤسسات', 'إدارة NOC للاتصالات', 'مراقبة البنية التحتية الحرجة', 'خدمات الأمن المدارة']
    },
    status: 'beta', sort_order: 4,
  },
  {
    slug: 'poc-sandbox',
    name_ar: 'بيئة إثبات المفهوم',
    name_en: 'Custom POC Sandbox',
    tagline_ar: 'مختبرات تجريبية وبيئات إثبات القيمة',
    tagline_en: 'Tailored Pilots & Integration Labs',
    description_ar: 'بيئات تجريبية مخصصة لإثبات المفهوم والتكامل، تتيح للعملاء اختبار الحلول في بيئة آمنة ومحكومة قبل النشر الكامل.',
    description_en: 'Custom proof-of-concept and integration environments that allow clients to test solutions in a secure, controlled setting before full deployment.',
    features_json: {
      en: ['Isolated sandbox environments', 'Custom integration testing', 'Rapid prototype deployment', 'Performance benchmarking', 'Migration planning support'],
      ar: ['بيئات معزولة للاختبار', 'اختبار التكامل المخصص', 'نشر النماذج الأولية السريع', 'قياس الأداء المرجعي', 'دعم تخطيط الترحيل']
    },
    use_cases_json: {
      en: ['Technology evaluation', 'Vendor comparison studies', 'Integration feasibility', 'Capacity planning'],
      ar: ['تقييم التقنيات', 'دراسات مقارنة البائعين', 'جدوى التكامل', 'تخطيط السعة']
    },
    status: 'poc', sort_order: 5,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const p of products) {
      await client.query(`
        INSERT INTO lab_products (slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, features_json, pricing_json, use_cases_json, status, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (slug) DO UPDATE SET
          name_ar=EXCLUDED.name_ar, name_en=EXCLUDED.name_en,
          tagline_ar=EXCLUDED.tagline_ar, tagline_en=EXCLUDED.tagline_en,
          description_ar=EXCLUDED.description_ar, description_en=EXCLUDED.description_en,
          features_json=EXCLUDED.features_json, use_cases_json=EXCLUDED.use_cases_json,
          status=EXCLUDED.status, sort_order=EXCLUDED.sort_order,
          updated_at=NOW()
      `, [p.slug, p.name_ar, p.name_en, p.tagline_ar, p.tagline_en, p.description_ar, p.description_en,
          JSON.stringify(p.features_json), JSON.stringify({}), JSON.stringify(p.use_cases_json), p.status, p.sort_order]);
      console.log(`Seeded: ${p.slug}`);
    }
    console.log('All lab products seeded');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
