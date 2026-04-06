/**
 * Sector-Specific Guidance Content — Bilingual (en/ar)
 * Maps each KSA sector to a plain-language GRC explanation.
 * Requirement 1.2, 2.1
 */

export const SECTOR_GUIDANCE: Record<string, {
  sectorEn: string;
  sectorAr: string;
  descriptionEn: string;
  descriptionAr: string;
}> = {
  'SEC-BANKING': {
    sectorEn: 'Banking & Financial Services',
    sectorAr: 'الخدمات المصرفية والمالية',
    descriptionEn: 'Banks and financial institutions in Saudi Arabia must comply with SAMA Cybersecurity Framework, NCA ECC, and PDPL. Focus areas include data protection, transaction security, and anti-fraud controls.',
    descriptionAr: 'يجب على البنوك والمؤسسات المالية في المملكة العربية السعودية الامتثال لإطار الأمن السيبراني للبنك المركزي وضوابط الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية. تشمل مجالات التركيز حماية البيانات وأمن المعاملات وضوابط مكافحة الاحتيال.',
  },
  'SEC-INSURANCE': {
    sectorEn: 'Insurance',
    sectorAr: 'التأمين',
    descriptionEn: 'Insurance companies must comply with SAMA regulations, NCA ECC, and PDPL. Key areas include policyholder data protection, claims processing security, and actuarial data integrity.',
    descriptionAr: 'يجب على شركات التأمين الامتثال لأنظمة البنك المركزي وضوابط الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية. تشمل المجالات الرئيسية حماية بيانات حاملي الوثائق وأمن معالجة المطالبات وسلامة البيانات الاكتوارية.',
  },
  'SEC-HEALTHCARE': {
    sectorEn: 'Healthcare',
    sectorAr: 'الرعاية الصحية',
    descriptionEn: 'Healthcare organizations must protect patient data under PDPL and comply with MOH health information standards. Focus on electronic health records security, medical device safety, and patient privacy.',
    descriptionAr: 'يجب على مؤسسات الرعاية الصحية حماية بيانات المرضى بموجب نظام حماية البيانات الشخصية والامتثال لمعايير المعلومات الصحية لوزارة الصحة. التركيز على أمن السجلات الصحية الإلكترونية وسلامة الأجهزة الطبية وخصوصية المرضى.',
  },
  'SEC-TELECOM': {
    sectorEn: 'Telecommunications',
    sectorAr: 'الاتصالات',
    descriptionEn: 'Telecom operators must comply with CST regulations, NCA ECC, and PDPL. Critical areas include network security, subscriber data protection, and infrastructure resilience.',
    descriptionAr: 'يجب على مشغلي الاتصالات الامتثال لأنظمة هيئة الاتصالات وضوابط الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية. تشمل المجالات الحرجة أمن الشبكات وحماية بيانات المشتركين ومرونة البنية التحتية.',
  },
  'SEC-ENERGY': {
    sectorEn: 'Energy & Utilities',
    sectorAr: 'الطاقة والمرافق',
    descriptionEn: 'Energy companies must protect critical infrastructure under NCA CSCC and comply with Ministry of Energy regulations. Focus on OT/ICS security, SCADA protection, and environmental compliance.',
    descriptionAr: 'يجب على شركات الطاقة حماية البنية التحتية الحرجة بموجب ضوابط الأنظمة الحساسة والامتثال لأنظمة وزارة الطاقة. التركيز على أمن التقنيات التشغيلية وحماية أنظمة SCADA والامتثال البيئي.',
  },
  'SEC-GOVERNMENT': {
    sectorEn: 'Government',
    sectorAr: 'الحكومة',
    descriptionEn: 'Government entities must comply with NCA ECC as a mandatory requirement, along with PDPL and digital government standards. Focus on citizen data protection and e-government security.',
    descriptionAr: 'يجب على الجهات الحكومية الامتثال لضوابط الهيئة الوطنية للأمن السيبراني كمتطلب إلزامي، إلى جانب نظام حماية البيانات الشخصية ومعايير الحكومة الرقمية. التركيز على حماية بيانات المواطنين وأمن الحكومة الإلكترونية.',
  },
  'SEC-TECHNOLOGY': {
    sectorEn: 'Technology',
    sectorAr: 'التقنية',
    descriptionEn: 'Technology companies must comply with NCA ECC, PDPL, and SDAIA AI ethics principles. Focus areas include software security, cloud compliance, data privacy, and AI governance.',
    descriptionAr: 'يجب على شركات التقنية الامتثال لضوابط الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية ومبادئ أخلاقيات الذكاء الاصطناعي. تشمل مجالات التركيز أمن البرمجيات وامتثال السحابة وخصوصية البيانات وحوكمة الذكاء الاصطناعي.',
  },
  'SEC-EDUCATION': {
    sectorEn: 'Education',
    sectorAr: 'التعليم',
    descriptionEn: 'Educational institutions must protect student data under PDPL and comply with Ministry of Education digital standards. Focus on student privacy, e-learning security, and research data protection.',
    descriptionAr: 'يجب على المؤسسات التعليمية حماية بيانات الطلاب بموجب نظام حماية البيانات الشخصية والامتثال لمعايير وزارة التعليم الرقمية. التركيز على خصوصية الطلاب وأمن التعلم الإلكتروني وحماية بيانات البحث.',
  },
  'SEC-RETAIL': {
    sectorEn: 'Retail & E-Commerce',
    sectorAr: 'التجزئة والتجارة الإلكترونية',
    descriptionEn: 'Retail and e-commerce businesses must comply with PDPL for customer data, ZATCA for tax compliance, and NCA ECC. Focus on payment security, customer privacy, and supply chain risk.',
    descriptionAr: 'يجب على شركات التجزئة والتجارة الإلكترونية الامتثال لنظام حماية البيانات الشخصية لبيانات العملاء وهيئة الزكاة والضريبة للامتثال الضريبي وضوابط الهيئة الوطنية للأمن السيبراني. التركيز على أمن المدفوعات وخصوصية العملاء ومخاطر سلسلة التوريد.',
  },
  'SEC-TRANSPORT': {
    sectorEn: 'Transportation & Logistics',
    sectorAr: 'النقل والخدمات اللوجستية',
    descriptionEn: 'Transport companies must comply with TGA regulations, NCA ECC, and PDPL. Focus on fleet management security, passenger data protection, and critical infrastructure resilience.',
    descriptionAr: 'يجب على شركات النقل الامتثال لأنظمة الهيئة العامة للنقل وضوابط الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية. التركيز على أمن إدارة الأسطول وحماية بيانات الركاب ومرونة البنية التحتية الحرجة.',
  },
  'SEC-CAPITAL-MARKETS': {
    sectorEn: 'Capital Markets',
    sectorAr: 'أسواق المال',
    descriptionEn: 'Capital market participants must comply with CMA regulations, NCA ECC, and PDPL. Focus on trading system security, investor data protection, and market integrity.',
    descriptionAr: 'يجب على المشاركين في أسواق المال الامتثال لأنظمة هيئة السوق المالية وضوابط الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية. التركيز على أمن أنظمة التداول وحماية بيانات المستثمرين ونزاهة السوق.',
  },
};
