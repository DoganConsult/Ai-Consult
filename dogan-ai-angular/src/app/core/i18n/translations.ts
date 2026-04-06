export type Lang = 'en' | 'ar';
export type TranslationMap = Record<string, string>;

export const TRANSLATIONS: Record<Lang, TranslationMap> = {
  en: {
    'nav.brand': 'Dogan AI',
    'nav.home': 'Home',
    'nav.solutions': 'Solutions',
    'nav.demo': 'Interactive Demo',
    'nav.enterprise': 'Enterprise',
    'nav.contact': 'Contact Sales',
    'nav.parent': 'Dogan Consult',
    
    'hero.badge': 'ENTERPRISE AI PLATFORM',
    'hero.title1': 'Intelligence at the',
    'hero.title2': 'Speed of Thought',
    'hero.desc': 'Deploy one-of-a-kind enterprise AI agents, automated workflows, and custom LLM integrations tailored for the Saudi market. Powered by the Dogan Consult neural backend.',
    'hero.cta': 'Explore Solutions',
    'hero.demo': 'Try the Demo',
    
    'solutions.badge': 'CAPABILITIES',
    'solutions.title': 'Enterprise AI Workflows',
    'solutions.agent': 'Conversational AI Agents',
    'solutions.agent_desc': 'Autonomous customer service and internal helpdesk agents with contextual memory and multi-system API integration.',
    'solutions.doc': 'Document AI Processing',
    'solutions.doc_desc': 'Automated OCR, semantic extraction, and classification for complex legal and financial Saudi documents.',
    'solutions.llm': 'Custom LLM Integration',
    'solutions.llm_desc': 'Private, locally-hosted or dedicated cloud LLM deployments ensuring absolute data sovereignty for KSA enterprises.',
    
    'demo.badge': 'LIVE SANDBOX',
    'demo.title': 'Interact with Dogan AI',
    'demo.desc': 'Try our unified neural backend in real-time. This demo agent is connected to the live Dogan Consult knowledge base.',
    'demo.input': 'Ask anything...',
    'demo.send': 'Send',
    
    'enterprise.badge': 'TRUST & SCALE',
    'enterprise.title': 'Built for KSA Enterprises',
    'enterprise.desc': 'We understand the regulatory and scaling requirements of Saudi businesses. Security is not an add-on; it is our foundation.',
    'enterprise.sec1': 'Data Sovereignty',
    'enterprise.sec1_desc': 'All models and data can remain on local servers meeting KSA PDPL requirements.',
    'enterprise.sec2': 'Mission Critical Uptime',
    'enterprise.sec2_desc': '99.99% SLA supported by the DoganHub SOC/NOC operations center.',
    
    'contact.title': 'Ready to upgrade?',
    'contact.desc': 'Contact our enterprise technical sales team for a custom architecture review.',
    'contact.submit': 'Request Consultation'
  },
  ar: {
    'nav.brand': 'دوغان للذكاء الاصطناعي',
    'nav.home': 'الرئيسية',
    'nav.solutions': 'الحلول',
    'nav.demo': 'التجربة التفاعلية',
    'nav.enterprise': 'المؤسسات',
    'nav.contact': 'المبيعات',
    'nav.parent': 'دوغان كونسلت',
    
    'hero.badge': 'منصة الذكاء الاصطناعي المؤسسية',
    'hero.title1': 'ذكاء حقيقي',
    'hero.title2': 'بسرعة التفكير',
    'hero.desc': 'في السوق السعودي، نحن نبني وكلاء أذكياء، وسير عمل مؤتمت، وتكامل مخصص لنماذج اللغة. مدعوم بالخوادم المركزية لدوغان كونسلت.',
    'hero.cta': 'استكشف الحلول',
    'hero.demo': 'جرب المنصة',
    
    'solutions.badge': 'القدرات',
    'solutions.title': 'سير عمل الذكاء الاصطناعي',
    'solutions.agent': 'وكلاء المحادثة الأذكياء',
    'solutions.agent_desc': 'وكلاء خدمة عملاء موظفين ذوي ذاكرة سياقية وتكامل متعدد مع برمجة التطبيقات (API).',
    'solutions.doc': 'معالجة المستندات بالذكاء',
    'solutions.doc_desc': 'استخراج لغوي ذكي وتصنيف للمستندات السعودية المالية والقانونية المعقدة.',
    'solutions.llm': 'تكامل نماذج اللغة المخصصة',
    'solutions.llm_desc': 'نشر نماذج للغة السحابية أو المحلية لضمان السيادة المطلقة للبيانات السعودية.',
    
    'demo.badge': 'بيئة تجريبية',
    'demo.title': 'تفاعل مع الذكاء لدينا',
    'demo.desc': 'جرب الواجهة الخلفية لدينا فوراً. هذا الوكيل متصل مباشرة بقاعدة المعرفة الحية.',
    'demo.input': 'اسأل أي شيء...',
    'demo.send': 'إرسال',
    
    'enterprise.badge': 'الموثوقية',
    'enterprise.title': 'بُني للشركات السعودية',
    'enterprise.desc': 'نحن نفهم المتطلبات التنظيمية والمحلية. الأمان ليس إضافة؛ إنه الأساس.',
    'enterprise.sec1': 'سيادة البيانات',
    'enterprise.sec1_desc': 'يمكن أن تبقى النماذج والبيانات على الخوادم المحلية تلبية لنظام حماية البيانات (PDPL).',
    'enterprise.sec2': 'استقرار المهام الحرجة',
    'enterprise.sec2_desc': 'اتفاقية مستوى خدمة 99.99% مدعومة بمركز عمليات دوغان هب.',
    
    'contact.title': 'هل أنت مستعد للترقية؟',
    'contact.desc': 'تواصل مع فريق المبيعات الفنية لمراجعة البنية التقنية المطلوبة.',
    'contact.submit': 'طلب استشارة'
  }
};
