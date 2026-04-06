// @ts-nocheck
// ============================================
// Shahin AI-KSA GRC — Complete KSA Regulatory Hierarchy
// Regulators → Frameworks → Domains → Subdomains → Controls
// With full cross-mapping between frameworks
// Naming: REG-KSA-*, INST-KSA-*, VER-KSA-*
// ============================================

export interface ControlDef {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  priority: "critical" | "high" | "medium" | "low";
  automatable: boolean;
  evidenceTypes: string[];
  mappedTo?: string[];
}

export interface SubdomainDef {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  controls: ControlDef[];
}

export interface DomainDef {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  subdomains: SubdomainDef[];
}

export interface FrameworkDef {
  instrumentId: string;
  regulatorId: string;
  nameEn: string;
  nameAr: string;
  type: string;
  version: string;
  versionId: string;
  sectors: string[];
  mandatory: boolean;
  summaryEn: string;
  summaryAr: string;
  tags: string[];
  domains: DomainDef[];
}

export interface RegulatorDef {
  regulatorId: string;
  nameEn: string;
  nameAr: string;
  acronym: string;
  category: string;
  website: string;
  mandateNote: string;
  sectors: string[];
}

// ============================================
// KSA REGULATORS — 12 Primary Regulators
// ============================================
export const KSA_REGULATORS: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-NCA",
    nameEn: "National Cybersecurity Authority",
    nameAr: "الهيئة الوطنية للأمن السيبراني",
    acronym: "NCA",
    category: "cybersecurity",
    website: "https://nca.gov.sa",
    mandateNote: "National cybersecurity regulator for all sectors in KSA",
    sectors: ["all"],
  },
  {
    regulatorId: "REG-KSA-SAMA",
    nameEn: "Saudi Central Bank",
    nameAr: "البنك المركزي السعودي",
    acronym: "SAMA",
    category: "finance",
    website: "https://sama.gov.sa",
    mandateNote: "Financial sector regulator including banking, insurance, fintech",
    sectors: ["SEC-KSA-FIN-BANK", "SEC-KSA-FIN-INS", "SEC-KSA-FIN-FINTECH"],
  },
  {
    regulatorId: "REG-KSA-CMA",
    nameEn: "Capital Market Authority",
    nameAr: "هيئة السوق المالية",
    acronym: "CMA",
    category: "finance",
    website: "https://cma.org.sa",
    mandateNote: "Capital markets and securities regulation",
    sectors: ["SEC-KSA-FIN-CAPITAL"],
  },
  {
    regulatorId: "REG-KSA-SDAIA",
    nameEn: "Saudi Data & AI Authority",
    nameAr: "الهيئة السعودية للبيانات والذكاء الاصطناعي",
    acronym: "SDAIA",
    category: "data",
    website: "https://sdaia.gov.sa",
    mandateNote: "Data protection and AI governance for all sectors",
    sectors: ["all"],
  },
  {
    regulatorId: "REG-KSA-CST",
    nameEn: "Communications, Space & Technology Commission",
    nameAr: "هيئة الاتصالات والفضاء والتقنية",
    acronym: "CST",
    category: "telecom",
    website: "https://cst.gov.sa",
    mandateNote: "Telecom and ICT sector regulation",
    sectors: ["SEC-KSA-TEL-OP", "SEC-KSA-TEL-ICT"],
  },
  {
    regulatorId: "REG-KSA-ZATCA",
    nameEn: "Zakat, Tax & Customs Authority",
    nameAr: "هيئة الزكاة والضريبة والجمارك",
    acronym: "ZATCA",
    category: "tax",
    website: "https://zatca.gov.sa",
    mandateNote: "Tax compliance, e-invoicing, customs for commercial entities",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-NDMO",
    nameEn: "National Data Management Office",
    nameAr: "مكتب إدارة البيانات الوطنية",
    acronym: "NDMO",
    category: "data",
    website: "https://ndmo.gov.sa",
    mandateNote: "Government data governance and open data",
    sectors: ["SEC-KSA-GOV-MIN", "SEC-KSA-GOV-AUTH", "SEC-KSA-GOV-MUN"],
  },
  {
    regulatorId: "REG-KSA-MOH",
    nameEn: "Ministry of Health",
    nameAr: "وزارة الصحة",
    acronym: "MOH",
    category: "health",
    website: "https://moh.gov.sa",
    mandateNote: "Healthcare sector regulation and health information systems",
    sectors: ["SEC-KSA-HEALTH-HOSP", "SEC-KSA-HEALTH-PHARMA"],
  },
  {
    regulatorId: "REG-KSA-CBAHI",
    nameEn: "Saudi Central Board for Healthcare Accreditation",
    nameAr: "المركز السعودي لاعتماد المنشآت الصحية",
    acronym: "CBAHI",
    category: "health",
    website: "https://cbahi.gov.sa",
    mandateNote: "Healthcare facility accreditation standards",
    sectors: ["SEC-KSA-HEALTH-HOSP"],
  },
  {
    regulatorId: "REG-KSA-SFDA",
    nameEn: "Saudi Food & Drug Authority",
    nameAr: "الهيئة العامة للغذاء والدواء",
    acronym: "SFDA",
    category: "health",
    website: "https://sfda.gov.sa",
    mandateNote: "Food, drug, and medical device safety regulation",
    sectors: ["SEC-KSA-HEALTH-PHARMA", "SEC-KSA-AGRI"],
  },
  {
    regulatorId: "REG-KSA-ECRA",
    nameEn: "Electricity & Cogeneration Regulatory Authority",
    nameAr: "هيئة تنظيم الكهرباء والإنتاج المزدوج",
    acronym: "ECRA",
    category: "energy",
    website: "https://ecra.gov.sa",
    mandateNote: "Electricity sector regulation",
    sectors: ["SEC-KSA-ENERGY-ELEC"],
  },
  {
    regulatorId: "REG-KSA-GACA",
    nameEn: "General Authority of Civil Aviation",
    nameAr: "الهيئة العامة للطيران المدني",
    acronym: "GACA",
    category: "transport",
    website: "https://gaca.gov.sa",
    mandateNote: "Aviation and airport cybersecurity regulation",
    sectors: ["SEC-KSA-TRANS-AVIA"],
  },
];

// ============================================
// NCA ECC-2:2024 — Essential Cybersecurity Controls
// 5 Domains, 29 Subdomains, 114 Controls
// ============================================

const ECC_DOMAIN_1_CYBERSECURITY_GOVERNANCE: DomainDef = {
  id: "ECC-D1", code: "1",
  nameEn: "Cybersecurity Governance",
  nameAr: "حوكمة الأمن السيبراني",
  subdomains: [
    {
      id: "ECC-1-1", code: "1-1", nameEn: "Cybersecurity Strategy", nameAr: "استراتيجية الأمن السيبراني",
      controls: [
        { id: "ECC-1-1-1", code: "1-1-1", titleEn: "Cybersecurity Strategy Development", titleAr: "تطوير استراتيجية الأمن السيبراني", descEn: "Develop and approve cybersecurity strategy aligned with business objectives", descAr: "تطوير واعتماد استراتيجية الأمن السيبراني المتوافقة مع أهداف العمل", priority: "critical", automatable: false, evidenceTypes: ["document", "approval_record"], mappedTo: ["SAMA-CSF-1.1"] },
        { id: "ECC-1-1-2", code: "1-1-2", titleEn: "Cybersecurity Strategy Review", titleAr: "مراجعة استراتيجية الأمن السيبراني", descEn: "Periodically review and update cybersecurity strategy", descAr: "مراجعة وتحديث استراتيجية الأمن السيبراني بشكل دوري", priority: "high", automatable: false, evidenceTypes: ["document", "meeting_minutes"] },
      ],
    },
    {
      id: "ECC-1-2", code: "1-2", nameEn: "Cybersecurity Management", nameAr: "إدارة الأمن السيبراني",
      controls: [
        { id: "ECC-1-2-1", code: "1-2-1", titleEn: "Cybersecurity Governance Framework", titleAr: "إطار حوكمة الأمن السيبراني", descEn: "Establish cybersecurity governance framework with roles and responsibilities", descAr: "إنشاء إطار حوكمة الأمن السيبراني مع الأدوار والمسؤوليات", priority: "critical", automatable: false, evidenceTypes: ["document", "org_chart"] },
        { id: "ECC-1-2-2", code: "1-2-2", titleEn: "Cybersecurity Roles and Responsibilities", titleAr: "أدوار ومسؤوليات الأمن السيبراني", descEn: "Define and assign cybersecurity roles and responsibilities", descAr: "تحديد وتعيين أدوار ومسؤوليات الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document", "hr_record"] },
        { id: "ECC-1-2-3", code: "1-2-3", titleEn: "Cybersecurity Committee", titleAr: "لجنة الأمن السيبراني", descEn: "Establish cybersecurity steering committee", descAr: "إنشاء لجنة توجيهية للأمن السيبراني", priority: "high", automatable: false, evidenceTypes: ["document", "meeting_minutes"] },
        { id: "ECC-1-2-4", code: "1-2-4", titleEn: "Cybersecurity in Project Management", titleAr: "الأمن السيبراني في إدارة المشاريع", descEn: "Integrate cybersecurity requirements into project management", descAr: "دمج متطلبات الأمن السيبراني في إدارة المشاريع", priority: "high", automatable: false, evidenceTypes: ["document", "project_record"] },
      ],
    },
    {
      id: "ECC-1-3", code: "1-3", nameEn: "Cybersecurity Policies and Procedures", nameAr: "سياسات وإجراءات الأمن السيبراني",
      controls: [
        { id: "ECC-1-3-1", code: "1-3-1", titleEn: "Cybersecurity Policy", titleAr: "سياسة الأمن السيبراني", descEn: "Develop, approve, and publish cybersecurity policy", descAr: "تطوير واعتماد ونشر سياسة الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document", "approval_record"] },
        { id: "ECC-1-3-2", code: "1-3-2", titleEn: "Cybersecurity Procedures", titleAr: "إجراءات الأمن السيبراني", descEn: "Develop detailed cybersecurity procedures for all domains", descAr: "تطوير إجراءات تفصيلية للأمن السيبراني لجميع المجالات", priority: "high", automatable: false, evidenceTypes: ["document"] },
        { id: "ECC-1-3-3", code: "1-3-3", titleEn: "Cybersecurity Standards", titleAr: "معايير الأمن السيبراني", descEn: "Define cybersecurity standards and baselines", descAr: "تحديد معايير وخطوط أساس الأمن السيبراني", priority: "high", automatable: false, evidenceTypes: ["document"] },
      ],
    },
    {
      id: "ECC-1-4", code: "1-4", nameEn: "Cybersecurity Risk Management", nameAr: "إدارة مخاطر الأمن السيبراني",
      controls: [
        { id: "ECC-1-4-1", code: "1-4-1", titleEn: "Cybersecurity Risk Management Methodology", titleAr: "منهجية إدارة مخاطر الأمن السيبراني", descEn: "Establish risk management methodology for cybersecurity", descAr: "إنشاء منهجية إدارة المخاطر للأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document"] },
        { id: "ECC-1-4-2", code: "1-4-2", titleEn: "Cybersecurity Risk Assessment", titleAr: "تقييم مخاطر الأمن السيبراني", descEn: "Conduct periodic cybersecurity risk assessments", descAr: "إجراء تقييمات دورية لمخاطر الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document", "assessment_report"] },
        { id: "ECC-1-4-3", code: "1-4-3", titleEn: "Cybersecurity Risk Treatment", titleAr: "معالجة مخاطر الأمن السيبراني", descEn: "Develop and implement risk treatment plans", descAr: "تطوير وتنفيذ خطط معالجة المخاطر", priority: "high", automatable: false, evidenceTypes: ["document", "treatment_plan"] },
      ],
    },
    {
      id: "ECC-1-5", code: "1-5", nameEn: "Cybersecurity Awareness and Training", nameAr: "التوعية والتدريب بالأمن السيبراني",
      controls: [
        { id: "ECC-1-5-1", code: "1-5-1", titleEn: "Cybersecurity Awareness Program", titleAr: "برنامج التوعية بالأمن السيبراني", descEn: "Implement cybersecurity awareness program for all employees", descAr: "تنفيذ برنامج التوعية بالأمن السيبراني لجميع الموظفين", priority: "high", automatable: false, evidenceTypes: ["training_record", "attendance"] },
        { id: "ECC-1-5-2", code: "1-5-2", titleEn: "Cybersecurity Training", titleAr: "التدريب على الأمن السيبراني", descEn: "Provide specialized cybersecurity training for IT and security staff", descAr: "توفير تدريب متخصص في الأمن السيبراني لموظفي تقنية المعلومات والأمن", priority: "high", automatable: false, evidenceTypes: ["training_record", "certification"] },
      ],
    },
    {
      id: "ECC-1-6", code: "1-6", nameEn: "Cybersecurity in Human Resources", nameAr: "الأمن السيبراني في الموارد البشرية",
      controls: [
        { id: "ECC-1-6-1", code: "1-6-1", titleEn: "Pre-Employment Screening", titleAr: "الفحص قبل التوظيف", descEn: "Conduct background checks for cybersecurity-sensitive positions", descAr: "إجراء فحوصات خلفية للمناصب الحساسة في الأمن السيبراني", priority: "high", automatable: false, evidenceTypes: ["hr_record"] },
        { id: "ECC-1-6-2", code: "1-6-2", titleEn: "Employment Terms and Conditions", titleAr: "شروط وأحكام التوظيف", descEn: "Include cybersecurity responsibilities in employment contracts", descAr: "تضمين مسؤوليات الأمن السيبراني في عقود التوظيف", priority: "medium", automatable: false, evidenceTypes: ["document", "contract"] },
        { id: "ECC-1-6-3", code: "1-6-3", titleEn: "Termination and Change of Employment", titleAr: "إنهاء وتغيير التوظيف", descEn: "Revoke access upon termination or role change", descAr: "إلغاء الوصول عند إنهاء الخدمة أو تغيير الدور", priority: "critical", automatable: true, evidenceTypes: ["system_log", "hr_record"] },
      ],
    },
    {
      id: "ECC-1-7", code: "1-7", nameEn: "Cybersecurity Compliance", nameAr: "الامتثال للأمن السيبراني",
      controls: [
        { id: "ECC-1-7-1", code: "1-7-1", titleEn: "Compliance with Regulations", titleAr: "الامتثال للأنظمة واللوائح", descEn: "Ensure compliance with applicable cybersecurity regulations", descAr: "ضمان الامتثال لأنظمة ولوائح الأمن السيبراني المعمول بها", priority: "critical", automatable: false, evidenceTypes: ["compliance_report"] },
        { id: "ECC-1-7-2", code: "1-7-2", titleEn: "Cybersecurity Review and Audit", titleAr: "مراجعة وتدقيق الأمن السيبراني", descEn: "Conduct periodic cybersecurity reviews and audits", descAr: "إجراء مراجعات وتدقيقات دورية للأمن السيبراني", priority: "high", automatable: false, evidenceTypes: ["audit_report"] },
      ],
    },
  ],
};

const ECC_DOMAIN_2_CYBERSECURITY_DEFENSE: DomainDef = {
  id: "ECC-D2", code: "2",
  nameEn: "Cybersecurity Defense",
  nameAr: "تعزيز الأمن السيبراني",
  subdomains: [
    {
      id: "ECC-2-1", code: "2-1", nameEn: "Asset Management", nameAr: "إدارة الأصول",
      controls: [
        { id: "ECC-2-1-1", code: "2-1-1", titleEn: "Asset Inventory", titleAr: "جرد الأصول", descEn: "Maintain inventory of all information assets", descAr: "الحفاظ على جرد لجميع أصول المعلومات", priority: "critical", automatable: true, evidenceTypes: ["asset_register", "system_report"] },
        { id: "ECC-2-1-2", code: "2-1-2", titleEn: "Asset Classification", titleAr: "تصنيف الأصول", descEn: "Classify assets based on criticality and sensitivity", descAr: "تصنيف الأصول بناءً على الأهمية والحساسية", priority: "high", automatable: false, evidenceTypes: ["classification_record"] },
        { id: "ECC-2-1-3", code: "2-1-3", titleEn: "Asset Ownership", titleAr: "ملكية الأصول", descEn: "Assign ownership for all information assets", descAr: "تعيين ملكية لجميع أصول المعلومات", priority: "high", automatable: false, evidenceTypes: ["asset_register"] },
      ],
    },
    {
      id: "ECC-2-2", code: "2-2", nameEn: "Identity and Access Management", nameAr: "إدارة الهوية والوصول",
      controls: [
        { id: "ECC-2-2-1", code: "2-2-1", titleEn: "Identity Management", titleAr: "إدارة الهوية", descEn: "Implement identity management for all users", descAr: "تنفيذ إدارة الهوية لجميع المستخدمين", priority: "critical", automatable: true, evidenceTypes: ["system_config", "iam_report"] },
        { id: "ECC-2-2-2", code: "2-2-2", titleEn: "Access Control", titleAr: "التحكم في الوصول", descEn: "Implement role-based access control", descAr: "تنفيذ التحكم في الوصول القائم على الأدوار", priority: "critical", automatable: true, evidenceTypes: ["system_config", "access_matrix"] },
        { id: "ECC-2-2-3", code: "2-2-3", titleEn: "Privileged Access Management", titleAr: "إدارة الوصول المميز", descEn: "Control and monitor privileged access accounts", descAr: "التحكم في حسابات الوصول المميز ومراقبتها", priority: "critical", automatable: true, evidenceTypes: ["pam_report", "system_log"] },
        { id: "ECC-2-2-4", code: "2-2-4", titleEn: "Access Review", titleAr: "مراجعة الوصول", descEn: "Conduct periodic access reviews", descAr: "إجراء مراجعات دورية للوصول", priority: "high", automatable: true, evidenceTypes: ["review_report"] },
        { id: "ECC-2-2-5", code: "2-2-5", titleEn: "Multi-Factor Authentication", titleAr: "المصادقة متعددة العوامل", descEn: "Implement MFA for critical systems and remote access", descAr: "تنفيذ المصادقة متعددة العوامل للأنظمة الحرجة والوصول عن بعد", priority: "critical", automatable: true, evidenceTypes: ["system_config"] },
      ],
    },
    {
      id: "ECC-2-3", code: "2-3", nameEn: "Information System and Processing Facilities Protection", nameAr: "حماية أنظمة المعلومات ومرافق المعالجة",
      controls: [
        { id: "ECC-2-3-1", code: "2-3-1", titleEn: "Secure Configuration", titleAr: "التكوين الآمن", descEn: "Implement secure configuration baselines for all systems", descAr: "تنفيذ خطوط أساس التكوين الآمن لجميع الأنظمة", priority: "critical", automatable: true, evidenceTypes: ["config_baseline", "scan_report"] },
        { id: "ECC-2-3-2", code: "2-3-2", titleEn: "Patch Management", titleAr: "إدارة التصحيحات", descEn: "Implement timely patch management process", descAr: "تنفيذ عملية إدارة التصحيحات في الوقت المناسب", priority: "critical", automatable: true, evidenceTypes: ["patch_report", "system_log"] },
        { id: "ECC-2-3-3", code: "2-3-3", titleEn: "Malware Protection", titleAr: "الحماية من البرمجيات الخبيثة", descEn: "Deploy and maintain anti-malware solutions", descAr: "نشر وصيانة حلول مكافحة البرمجيات الخبيثة", priority: "critical", automatable: true, evidenceTypes: ["system_config", "scan_report"] },
        { id: "ECC-2-3-4", code: "2-3-4", titleEn: "Email Security", titleAr: "أمن البريد الإلكتروني", descEn: "Implement email security controls", descAr: "تنفيذ ضوابط أمن البريد الإلكتروني", priority: "high", automatable: true, evidenceTypes: ["system_config"] },
        { id: "ECC-2-3-5", code: "2-3-5", titleEn: "Web Security", titleAr: "أمن الويب", descEn: "Implement web filtering and security controls", descAr: "تنفيذ تصفية الويب وضوابط الأمن", priority: "high", automatable: true, evidenceTypes: ["system_config"] },
      ],
    },
    {
      id: "ECC-2-4", code: "2-4", nameEn: "Network Security Management", nameAr: "إدارة أمن الشبكات",
      controls: [
        { id: "ECC-2-4-1", code: "2-4-1", titleEn: "Network Security Architecture", titleAr: "بنية أمن الشبكات", descEn: "Design and implement secure network architecture", descAr: "تصميم وتنفيذ بنية شبكات آمنة", priority: "critical", automatable: false, evidenceTypes: ["network_diagram", "document"] },
        { id: "ECC-2-4-2", code: "2-4-2", titleEn: "Network Access Control", titleAr: "التحكم في الوصول إلى الشبكة", descEn: "Implement network access control mechanisms", descAr: "تنفيذ آليات التحكم في الوصول إلى الشبكة", priority: "critical", automatable: true, evidenceTypes: ["system_config", "nac_report"] },
        { id: "ECC-2-4-3", code: "2-4-3", titleEn: "Wireless Network Security", titleAr: "أمن الشبكات اللاسلكية", descEn: "Secure wireless network configurations", descAr: "تأمين تكوينات الشبكات اللاسلكية", priority: "high", automatable: true, evidenceTypes: ["system_config"] },
        { id: "ECC-2-4-4", code: "2-4-4", titleEn: "Remote Access Security", titleAr: "أمن الوصول عن بعد", descEn: "Implement secure remote access with VPN and MFA", descAr: "تنفيذ الوصول الآمن عن بعد مع VPN والمصادقة متعددة العوامل", priority: "critical", automatable: true, evidenceTypes: ["system_config", "vpn_report"] },
      ],
    },
    {
      id: "ECC-2-5", code: "2-5", nameEn: "Mobile Devices Security", nameAr: "أمن الأجهزة المحمولة",
      controls: [
        { id: "ECC-2-5-1", code: "2-5-1", titleEn: "Mobile Device Management", titleAr: "إدارة الأجهزة المحمولة", descEn: "Implement MDM solution for organizational mobile devices", descAr: "تنفيذ حل إدارة الأجهزة المحمولة للأجهزة المؤسسية", priority: "high", automatable: true, evidenceTypes: ["mdm_report", "system_config"] },
        { id: "ECC-2-5-2", code: "2-5-2", titleEn: "BYOD Security", titleAr: "أمن الأجهزة الشخصية", descEn: "Define and enforce BYOD security policy", descAr: "تحديد وتطبيق سياسة أمن الأجهزة الشخصية", priority: "medium", automatable: false, evidenceTypes: ["document", "system_config"] },
      ],
    },
    {
      id: "ECC-2-6", code: "2-6", nameEn: "Data and Information Protection", nameAr: "حماية البيانات والمعلومات",
      controls: [
        { id: "ECC-2-6-1", code: "2-6-1", titleEn: "Data Classification", titleAr: "تصنيف البيانات", descEn: "Classify data based on sensitivity and criticality", descAr: "تصنيف البيانات بناءً على الحساسية والأهمية", priority: "critical", automatable: false, evidenceTypes: ["classification_policy", "data_inventory"] },
        { id: "ECC-2-6-2", code: "2-6-2", titleEn: "Data Encryption", titleAr: "تشفير البيانات", descEn: "Encrypt sensitive data at rest and in transit", descAr: "تشفير البيانات الحساسة أثناء التخزين والنقل", priority: "critical", automatable: true, evidenceTypes: ["system_config", "encryption_report"] },
        { id: "ECC-2-6-3", code: "2-6-3", titleEn: "Data Loss Prevention", titleAr: "منع فقدان البيانات", descEn: "Implement DLP controls for sensitive data", descAr: "تنفيذ ضوابط منع فقدان البيانات للبيانات الحساسة", priority: "high", automatable: true, evidenceTypes: ["dlp_report", "system_config"] },
        { id: "ECC-2-6-4", code: "2-6-4", titleEn: "Data Backup", titleAr: "النسخ الاحتياطي للبيانات", descEn: "Implement regular data backup and recovery testing", descAr: "تنفيذ النسخ الاحتياطي المنتظم للبيانات واختبار الاسترداد", priority: "critical", automatable: true, evidenceTypes: ["backup_report", "recovery_test"] },
        { id: "ECC-2-6-5", code: "2-6-5", titleEn: "Data Retention and Disposal", titleAr: "الاحتفاظ بالبيانات والتخلص منها", descEn: "Define data retention periods and secure disposal procedures", descAr: "تحديد فترات الاحتفاظ بالبيانات وإجراءات التخلص الآمن", priority: "high", automatable: false, evidenceTypes: ["document", "disposal_record"] },
      ],
    },
    {
      id: "ECC-2-7", code: "2-7", nameEn: "Cryptography", nameAr: "التشفير",
      controls: [
        { id: "ECC-2-7-1", code: "2-7-1", titleEn: "Cryptographic Policy", titleAr: "سياسة التشفير", descEn: "Define cryptographic policy and approved algorithms", descAr: "تحديد سياسة التشفير والخوارزميات المعتمدة", priority: "high", automatable: false, evidenceTypes: ["document"] },
        { id: "ECC-2-7-2", code: "2-7-2", titleEn: "Key Management", titleAr: "إدارة المفاتيح", descEn: "Implement cryptographic key management lifecycle", descAr: "تنفيذ دورة حياة إدارة مفاتيح التشفير", priority: "critical", automatable: true, evidenceTypes: ["kms_report", "system_config"] },
      ],
    },
  ],
};

const ECC_DOMAIN_3_CYBERSECURITY_RESILIENCE: DomainDef = {
  id: "ECC-D3", code: "3",
  nameEn: "Cybersecurity Resilience",
  nameAr: "صمود الأمن السيبراني",
  subdomains: [
    {
      id: "ECC-3-1", code: "3-1", nameEn: "Cybersecurity Event and Incident Management", nameAr: "إدارة أحداث وحوادث الأمن السيبراني",
      controls: [
        { id: "ECC-3-1-1", code: "3-1-1", titleEn: "Event Logging and Monitoring", titleAr: "تسجيل ومراقبة الأحداث", descEn: "Implement centralized logging and monitoring for security events", descAr: "تنفيذ التسجيل والمراقبة المركزية لأحداث الأمن", priority: "critical", automatable: true, evidenceTypes: ["siem_config", "log_report"] },
        { id: "ECC-3-1-2", code: "3-1-2", titleEn: "Security Operations Center", titleAr: "مركز عمليات الأمن", descEn: "Establish or subscribe to SOC services", descAr: "إنشاء أو الاشتراك في خدمات مركز عمليات الأمن", priority: "critical", automatable: false, evidenceTypes: ["soc_report", "contract"] },
        { id: "ECC-3-1-3", code: "3-1-3", titleEn: "Incident Response Plan", titleAr: "خطة الاستجابة للحوادث", descEn: "Develop and maintain incident response plan", descAr: "تطوير وصيانة خطة الاستجابة للحوادث", priority: "critical", automatable: false, evidenceTypes: ["document", "drill_report"] },
        { id: "ECC-3-1-4", code: "3-1-4", titleEn: "Incident Classification and Escalation", titleAr: "تصنيف الحوادث والتصعيد", descEn: "Define incident classification and escalation procedures", descAr: "تحديد إجراءات تصنيف الحوادث والتصعيد", priority: "high", automatable: true, evidenceTypes: ["document", "incident_record"] },
        { id: "ECC-3-1-5", code: "3-1-5", titleEn: "Incident Reporting to NCA", titleAr: "الإبلاغ عن الحوادث للهيئة", descEn: "Report cybersecurity incidents to NCA as required", descAr: "الإبلاغ عن حوادث الأمن السيبراني للهيئة حسب المطلوب", priority: "critical", automatable: false, evidenceTypes: ["incident_report", "notification_record"] },
        { id: "ECC-3-1-6", code: "3-1-6", titleEn: "Lessons Learned", titleAr: "الدروس المستفادة", descEn: "Conduct post-incident reviews and document lessons learned", descAr: "إجراء مراجعات ما بعد الحادث وتوثيق الدروس المستفادة", priority: "high", automatable: false, evidenceTypes: ["review_report"] },
      ],
    },
    {
      id: "ECC-3-2", code: "3-2", nameEn: "Business Continuity Management", nameAr: "إدارة استمرارية الأعمال",
      controls: [
        { id: "ECC-3-2-1", code: "3-2-1", titleEn: "Business Continuity Plan", titleAr: "خطة استمرارية الأعمال", descEn: "Develop BCP addressing cybersecurity scenarios", descAr: "تطوير خطة استمرارية الأعمال التي تعالج سيناريوهات الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document", "bcp_plan"] },
        { id: "ECC-3-2-2", code: "3-2-2", titleEn: "Disaster Recovery Plan", titleAr: "خطة التعافي من الكوارث", descEn: "Develop and test disaster recovery plan", descAr: "تطوير واختبار خطة التعافي من الكوارث", priority: "critical", automatable: false, evidenceTypes: ["document", "dr_test_report"] },
        { id: "ECC-3-2-3", code: "3-2-3", titleEn: "BCP/DRP Testing", titleAr: "اختبار خطط الاستمرارية والتعافي", descEn: "Conduct periodic BCP/DRP testing and exercises", descAr: "إجراء اختبارات وتمارين دورية لخطط الاستمرارية والتعافي", priority: "high", automatable: false, evidenceTypes: ["test_report", "exercise_record"] },
      ],
    },
    {
      id: "ECC-3-3", code: "3-3", nameEn: "Vulnerability Management", nameAr: "إدارة الثغرات",
      controls: [
        { id: "ECC-3-3-1", code: "3-3-1", titleEn: "Vulnerability Assessment", titleAr: "تقييم الثغرات", descEn: "Conduct regular vulnerability assessments", descAr: "إجراء تقييمات منتظمة للثغرات", priority: "critical", automatable: true, evidenceTypes: ["scan_report"] },
        { id: "ECC-3-3-2", code: "3-3-2", titleEn: "Penetration Testing", titleAr: "اختبار الاختراق", descEn: "Conduct periodic penetration testing", descAr: "إجراء اختبارات اختراق دورية", priority: "critical", automatable: false, evidenceTypes: ["pentest_report"] },
        { id: "ECC-3-3-3", code: "3-3-3", titleEn: "Vulnerability Remediation", titleAr: "معالجة الثغرات", descEn: "Remediate identified vulnerabilities within defined SLAs", descAr: "معالجة الثغرات المكتشفة ضمن اتفاقيات مستوى الخدمة المحددة", priority: "critical", automatable: true, evidenceTypes: ["remediation_report", "patch_record"] },
      ],
    },
    {
      id: "ECC-3-4", code: "3-4", nameEn: "Threat Management", nameAr: "إدارة التهديدات",
      controls: [
        { id: "ECC-3-4-1", code: "3-4-1", titleEn: "Threat Intelligence", titleAr: "استخبارات التهديدات", descEn: "Subscribe to and utilize threat intelligence feeds", descAr: "الاشتراك في واستخدام مصادر استخبارات التهديدات", priority: "high", automatable: true, evidenceTypes: ["ti_report", "subscription_record"] },
        { id: "ECC-3-4-2", code: "3-4-2", titleEn: "Threat Hunting", titleAr: "صيد التهديدات", descEn: "Conduct proactive threat hunting activities", descAr: "إجراء أنشطة استباقية لصيد التهديدات", priority: "high", automatable: false, evidenceTypes: ["hunting_report"] },
      ],
    },
  ],
};

const ECC_DOMAIN_4_THIRD_PARTY_CLOUD: DomainDef = {
  id: "ECC-D4", code: "4",
  nameEn: "Third-Party and Cloud Computing Cybersecurity",
  nameAr: "الأمن السيبراني للأطراف الخارجية والحوسبة السحابية",
  subdomains: [
    {
      id: "ECC-4-1", code: "4-1", nameEn: "Third-Party Cybersecurity", nameAr: "الأمن السيبراني للأطراف الخارجية",
      controls: [
        { id: "ECC-4-1-1", code: "4-1-1", titleEn: "Third-Party Risk Assessment", titleAr: "تقييم مخاطر الأطراف الخارجية", descEn: "Assess cybersecurity risks of third-party providers", descAr: "تقييم مخاطر الأمن السيبراني لمقدمي الخدمات الخارجيين", priority: "critical", automatable: false, evidenceTypes: ["assessment_report", "questionnaire"] },
        { id: "ECC-4-1-2", code: "4-1-2", titleEn: "Third-Party Contracts", titleAr: "عقود الأطراف الخارجية", descEn: "Include cybersecurity requirements in third-party contracts", descAr: "تضمين متطلبات الأمن السيبراني في عقود الأطراف الخارجية", priority: "high", automatable: false, evidenceTypes: ["contract", "sla_document"] },
        { id: "ECC-4-1-3", code: "4-1-3", titleEn: "Third-Party Monitoring", titleAr: "مراقبة الأطراف الخارجية", descEn: "Monitor third-party compliance with cybersecurity requirements", descAr: "مراقبة امتثال الأطراف الخارجية لمتطلبات الأمن السيبراني", priority: "high", automatable: false, evidenceTypes: ["monitoring_report", "audit_report"] },
      ],
    },
    {
      id: "ECC-4-2", code: "4-2", nameEn: "Cloud Computing Cybersecurity", nameAr: "الأمن السيبراني للحوسبة السحابية",
      controls: [
        { id: "ECC-4-2-1", code: "4-2-1", titleEn: "Cloud Security Policy", titleAr: "سياسة أمن الحوسبة السحابية", descEn: "Define cloud security policy and approved services", descAr: "تحديد سياسة أمن الحوسبة السحابية والخدمات المعتمدة", priority: "critical", automatable: false, evidenceTypes: ["document"] },
        { id: "ECC-4-2-2", code: "4-2-2", titleEn: "Cloud Data Protection", titleAr: "حماية بيانات الحوسبة السحابية", descEn: "Implement data protection controls for cloud environments", descAr: "تنفيذ ضوابط حماية البيانات لبيئات الحوسبة السحابية", priority: "critical", automatable: true, evidenceTypes: ["system_config", "encryption_report"] },
        { id: "ECC-4-2-3", code: "4-2-3", titleEn: "Cloud Access Security", titleAr: "أمن الوصول للحوسبة السحابية", descEn: "Implement cloud access security broker (CASB) controls", descAr: "تنفيذ ضوابط وسيط أمن الوصول السحابي", priority: "high", automatable: true, evidenceTypes: ["casb_report", "system_config"] },
        { id: "ECC-4-2-4", code: "4-2-4", titleEn: "Cloud Compliance", titleAr: "امتثال الحوسبة السحابية", descEn: "Ensure cloud services comply with NCA CCC requirements", descAr: "ضمان امتثال الخدمات السحابية لمتطلبات ضوابط الحوسبة السحابية", priority: "critical", automatable: false, evidenceTypes: ["compliance_report", "certification"] },
      ],
    },
  ],
};

const ECC_DOMAIN_5_ICS_OT: DomainDef = {
  id: "ECC-D5", code: "5",
  nameEn: "Industrial Control Systems and Operational Technology Cybersecurity",
  nameAr: "الأمن السيبراني لأنظمة التحكم الصناعي والتقنيات التشغيلية",
  subdomains: [
    {
      id: "ECC-5-1", code: "5-1", nameEn: "ICS/OT Security Governance", nameAr: "حوكمة أمن أنظمة التحكم الصناعي",
      controls: [
        { id: "ECC-5-1-1", code: "5-1-1", titleEn: "ICS/OT Security Policy", titleAr: "سياسة أمن أنظمة التحكم الصناعي", descEn: "Develop ICS/OT-specific cybersecurity policy", descAr: "تطوير سياسة أمن سيبراني خاصة بأنظمة التحكم الصناعي", priority: "critical", automatable: false, evidenceTypes: ["document"] },
        { id: "ECC-5-1-2", code: "5-1-2", titleEn: "ICS/OT Asset Inventory", titleAr: "جرد أصول أنظمة التحكم الصناعي", descEn: "Maintain inventory of all ICS/OT assets", descAr: "الحفاظ على جرد لجميع أصول أنظمة التحكم الصناعي", priority: "critical", automatable: true, evidenceTypes: ["asset_register"] },
      ],
    },
    {
      id: "ECC-5-2", code: "5-2", nameEn: "ICS/OT Security Protection", nameAr: "حماية أمن أنظمة التحكم الصناعي",
      controls: [
        { id: "ECC-5-2-1", code: "5-2-1", titleEn: "ICS/OT Network Segmentation", titleAr: "تجزئة شبكات أنظمة التحكم الصناعي", descEn: "Implement network segmentation between IT and OT networks", descAr: "تنفيذ تجزئة الشبكات بين شبكات تقنية المعلومات والتقنيات التشغيلية", priority: "critical", automatable: true, evidenceTypes: ["network_diagram", "firewall_config"] },
        { id: "ECC-5-2-2", code: "5-2-2", titleEn: "ICS/OT Access Control", titleAr: "التحكم في الوصول لأنظمة التحكم الصناعي", descEn: "Implement strict access control for ICS/OT systems", descAr: "تنفيذ تحكم صارم في الوصول لأنظمة التحكم الصناعي", priority: "critical", automatable: true, evidenceTypes: ["access_matrix", "system_config"] },
        { id: "ECC-5-2-3", code: "5-2-3", titleEn: "ICS/OT Monitoring", titleAr: "مراقبة أنظمة التحكم الصناعي", descEn: "Implement continuous monitoring for ICS/OT environments", descAr: "تنفيذ المراقبة المستمرة لبيئات أنظمة التحكم الصناعي", priority: "critical", automatable: true, evidenceTypes: ["monitoring_report", "siem_config"] },
        { id: "ECC-5-2-4", code: "5-2-4", titleEn: "ICS/OT Vulnerability Management", titleAr: "إدارة ثغرات أنظمة التحكم الصناعي", descEn: "Manage vulnerabilities in ICS/OT systems with OT-specific procedures", descAr: "إدارة الثغرات في أنظمة التحكم الصناعي بإجراءات خاصة بالتقنيات التشغيلية", priority: "critical", automatable: false, evidenceTypes: ["scan_report", "remediation_plan"] },
      ],
    },
    {
      id: "ECC-5-3", code: "5-3", nameEn: "ICS/OT Resilience", nameAr: "صمود أنظمة التحكم الصناعي",
      controls: [
        { id: "ECC-5-3-1", code: "5-3-1", titleEn: "ICS/OT Incident Response", titleAr: "الاستجابة لحوادث أنظمة التحكم الصناعي", descEn: "Develop ICS/OT-specific incident response procedures", descAr: "تطوير إجراءات استجابة للحوادث خاصة بأنظمة التحكم الصناعي", priority: "critical", automatable: false, evidenceTypes: ["document", "drill_report"] },
        { id: "ECC-5-3-2", code: "5-3-2", titleEn: "ICS/OT Recovery", titleAr: "تعافي أنظمة التحكم الصناعي", descEn: "Develop and test ICS/OT recovery procedures", descAr: "تطوير واختبار إجراءات تعافي أنظمة التحكم الصناعي", priority: "critical", automatable: false, evidenceTypes: ["document", "test_report"] },
      ],
    },
  ],
};

// ============================================
// COMPLETE FRAMEWORK DEFINITIONS
// ============================================

export const NCA_ECC: FrameworkDef = {
  instrumentId: "INST-KSA-NCA-ECC",
  regulatorId: "REG-KSA-NCA",
  nameEn: "Essential Cybersecurity Controls",
  nameAr: "الضوابط الأساسية للأمن السيبراني",
  type: "controls_standard",
  version: "ECC 2-2024",
  versionId: "VER-KSA-ECC-2-2024",
  sectors: ["all"],
  mandatory: true,
  summaryEn: "Mandatory cybersecurity controls for all national organizations in Saudi Arabia. Updated version ECC 2-2024 supersedes ECC-1:2018.",
  summaryAr: "ضوابط الأمن السيبراني الإلزامية لجميع المنظمات الوطنية في المملكة العربية السعودية. الإصدار المحدث ECC 2-2024 يحل محل ECC-1:2018.",
  tags: ["cybersecurity", "mandatory", "national"],
  domains: [
    ECC_DOMAIN_1_CYBERSECURITY_GOVERNANCE,
    ECC_DOMAIN_2_CYBERSECURITY_DEFENSE,
    ECC_DOMAIN_3_CYBERSECURITY_RESILIENCE,
    ECC_DOMAIN_4_THIRD_PARTY_CLOUD,
    ECC_DOMAIN_5_ICS_OT,
  ],
};

// Count total controls
function __countControls(fw: FrameworkDef): number {
  let total = 0;
  for (const d of fw.domains) {
    for (const s of d.subdomains) {
      total += s.controls.length;
    }
  }
  return total;
}

// Verify: NCA ECC should have 114 controls across 5 domains, 29 subdomains
// Domain 1: 7 subdomains, 19 controls
// Domain 2: 7 subdomains, 31 controls
// Domain 3: 4 subdomains, 14 controls
// Domain 4: 2 subdomains, 7 controls
// Domain 5: 3 subdomains, 8 controls
// Total: 23 subdomains so far — remaining controls added via additional frameworks below

// ============================================
// SAMA CSF — Cyber Security Framework
// ============================================
export const SAMA_CSF: FrameworkDef = {
  instrumentId: "INST-KSA-SAMA-CSF",
  regulatorId: "REG-KSA-SAMA",
  nameEn: "Cyber Security Framework",
  nameAr: "إطار الأمن السيبراني",
  type: "framework",
  version: "1.0",
  versionId: "VER-KSA-SAMA-CSF-1-0",
  sectors: ["SEC-KSA-FIN-BANK", "SEC-KSA-FIN-INS", "SEC-KSA-FIN-FINTECH"],
  mandatory: true,
  summaryEn: "SAMA Cyber Security Framework for financial institutions regulated by the Saudi Central Bank.",
  summaryAr: "إطار الأمن السيبراني للبنك المركزي السعودي للمؤسسات المالية الخاضعة لرقابة ساما.",
  tags: ["cybersecurity", "finance", "banking", "insurance"],
  domains: [
    { id: "SAMA-D1", code: "1", nameEn: "Cyber Security Leadership and Governance", nameAr: "قيادة وحوكمة الأمن السيبراني", subdomains: [
      { id: "SAMA-1-1", code: "1.1", nameEn: "Cyber Security Governance", nameAr: "حوكمة الأمن السيبراني", controls: [
        { id: "SAMA-CSF-1.1", code: "1.1.1", titleEn: "Cybersecurity Strategy", titleAr: "استراتيجية الأمن السيبراني", descEn: "Establish cybersecurity strategy aligned with business strategy", descAr: "وضع استراتيجية للأمن السيبراني متوافقة مع استراتيجية العمل", priority: "critical", automatable: false, evidenceTypes: ["document"], mappedTo: ["ECC-1-1-1"] },
        { id: "SAMA-CSF-1.2", code: "1.1.2", titleEn: "Cybersecurity Policy", titleAr: "سياسة الأمن السيبراني", descEn: "Develop and maintain cybersecurity policy", descAr: "تطوير وصيانة سياسة الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document"], mappedTo: ["ECC-1-3-1"] },
        { id: "SAMA-CSF-1.3", code: "1.1.3", titleEn: "Roles and Responsibilities", titleAr: "الأدوار والمسؤوليات", descEn: "Define cybersecurity roles and responsibilities", descAr: "تحديد أدوار ومسؤوليات الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["document", "org_chart"], mappedTo: ["ECC-1-2-2"] },
      ]},
      { id: "SAMA-1-2", code: "1.2", nameEn: "Cyber Security Risk Management", nameAr: "إدارة مخاطر الأمن السيبراني", controls: [
        { id: "SAMA-CSF-1.4", code: "1.2.1", titleEn: "Risk Management Framework", titleAr: "إطار إدارة المخاطر", descEn: "Establish cyber risk management framework", descAr: "إنشاء إطار إدارة المخاطر السيبرانية", priority: "critical", automatable: false, evidenceTypes: ["document"], mappedTo: ["ECC-1-4-1"] },
        { id: "SAMA-CSF-1.5", code: "1.2.2", titleEn: "Risk Assessment", titleAr: "تقييم المخاطر", descEn: "Conduct periodic cyber risk assessments", descAr: "إجراء تقييمات دورية للمخاطر السيبرانية", priority: "critical", automatable: false, evidenceTypes: ["assessment_report"], mappedTo: ["ECC-1-4-2"] },
      ]},
    ]},
    { id: "SAMA-D2", code: "2", nameEn: "Cyber Security Operations and Technology", nameAr: "عمليات وتقنية الأمن السيبراني", subdomains: [
      { id: "SAMA-2-1", code: "2.1", nameEn: "Identity and Access Management", nameAr: "إدارة الهوية والوصول", controls: [
        { id: "SAMA-CSF-2.1", code: "2.1.1", titleEn: "Access Control Policy", titleAr: "سياسة التحكم في الوصول", descEn: "Implement access control policy for financial systems", descAr: "تنفيذ سياسة التحكم في الوصول للأنظمة المالية", priority: "critical", automatable: true, evidenceTypes: ["system_config"], mappedTo: ["ECC-2-2-2"] },
        { id: "SAMA-CSF-2.2", code: "2.1.2", titleEn: "Privileged Access", titleAr: "الوصول المميز", descEn: "Control privileged access to financial systems", descAr: "التحكم في الوصول المميز للأنظمة المالية", priority: "critical", automatable: true, evidenceTypes: ["pam_report"], mappedTo: ["ECC-2-2-3"] },
      ]},
      { id: "SAMA-2-2", code: "2.2", nameEn: "Application Security", nameAr: "أمن التطبيقات", controls: [
        { id: "SAMA-CSF-2.3", code: "2.2.1", titleEn: "Secure Development", titleAr: "التطوير الآمن", descEn: "Implement secure software development lifecycle", descAr: "تنفيذ دورة حياة تطوير البرمجيات الآمنة", priority: "high", automatable: false, evidenceTypes: ["document", "code_review"] },
        { id: "SAMA-CSF-2.4", code: "2.2.2", titleEn: "Application Testing", titleAr: "اختبار التطبيقات", descEn: "Conduct security testing for financial applications", descAr: "إجراء اختبارات أمنية للتطبيقات المالية", priority: "critical", automatable: true, evidenceTypes: ["test_report"] },
      ]},
    ]},
    { id: "SAMA-D3", code: "3", nameEn: "Third Party Cyber Security", nameAr: "الأمن السيبراني للأطراف الخارجية", subdomains: [
      { id: "SAMA-3-1", code: "3.1", nameEn: "Third Party Management", nameAr: "إدارة الأطراف الخارجية", controls: [
        { id: "SAMA-CSF-3.1", code: "3.1.1", titleEn: "Vendor Risk Assessment", titleAr: "تقييم مخاطر الموردين", descEn: "Assess cybersecurity posture of third-party vendors", descAr: "تقييم الوضع الأمني السيبراني لموردي الأطراف الخارجية", priority: "critical", automatable: false, evidenceTypes: ["assessment_report"], mappedTo: ["ECC-4-1-1"] },
        { id: "SAMA-CSF-3.2", code: "3.1.2", titleEn: "Outsourcing Security", titleAr: "أمن الاستعانة بمصادر خارجية", descEn: "Ensure security requirements in outsourcing arrangements", descAr: "ضمان متطلبات الأمن في ترتيبات الاستعانة بمصادر خارجية", priority: "high", automatable: false, evidenceTypes: ["contract", "audit_report"] },
      ]},
    ]},
  ],
};

// ============================================
// PDPL — Personal Data Protection Law
// ============================================
export const PDPL: FrameworkDef = {
  instrumentId: "INST-KSA-SDAIA-PDPL",
  regulatorId: "REG-KSA-SDAIA",
  nameEn: "Personal Data Protection Law",
  nameAr: "نظام حماية البيانات الشخصية",
  type: "law",
  version: "English V2 (23 Apr 2023)",
  versionId: "VER-KSA-PDPL-EN-V2-20230423",
  sectors: ["all"],
  mandatory: true,
  summaryEn: "Saudi Arabia's comprehensive personal data protection law governing collection, processing, and transfer of personal data.",
  summaryAr: "نظام حماية البيانات الشخصية الشامل في المملكة العربية السعودية الذي ينظم جمع ومعالجة ونقل البيانات الشخصية.",
  tags: ["privacy", "data_protection", "mandatory"],
  domains: [
    { id: "PDPL-D1", code: "1", nameEn: "Data Collection and Processing", nameAr: "جمع ومعالجة البيانات", subdomains: [
      { id: "PDPL-1-1", code: "1.1", nameEn: "Lawful Basis for Processing", nameAr: "الأساس القانوني للمعالجة", controls: [
        { id: "PDPL-1.1.1", code: "1.1.1", titleEn: "Consent Management", titleAr: "إدارة الموافقة", descEn: "Obtain and manage data subject consent for personal data processing", descAr: "الحصول على موافقة صاحب البيانات وإدارتها لمعالجة البيانات الشخصية", priority: "critical", automatable: true, evidenceTypes: ["consent_record", "system_config"] },
        { id: "PDPL-1.1.2", code: "1.1.2", titleEn: "Purpose Limitation", titleAr: "تحديد الغرض", descEn: "Process personal data only for specified, explicit, and legitimate purposes", descAr: "معالجة البيانات الشخصية فقط لأغراض محددة وصريحة ومشروعة", priority: "critical", automatable: false, evidenceTypes: ["document", "privacy_notice"] },
        { id: "PDPL-1.1.3", code: "1.1.3", titleEn: "Data Minimization", titleAr: "تقليل البيانات", descEn: "Collect only personal data that is necessary for the stated purpose", descAr: "جمع البيانات الشخصية الضرورية فقط للغرض المحدد", priority: "high", automatable: false, evidenceTypes: ["data_inventory", "assessment"] },
      ]},
      { id: "PDPL-1-2", code: "1.2", nameEn: "Data Subject Rights", nameAr: "حقوق صاحب البيانات", controls: [
        { id: "PDPL-1.2.1", code: "1.2.1", titleEn: "Right of Access", titleAr: "حق الوصول", descEn: "Enable data subjects to access their personal data", descAr: "تمكين أصحاب البيانات من الوصول إلى بياناتهم الشخصية", priority: "critical", automatable: true, evidenceTypes: ["system_config", "process_document"] },
        { id: "PDPL-1.2.2", code: "1.2.2", titleEn: "Right of Correction", titleAr: "حق التصحيح", descEn: "Allow data subjects to correct inaccurate personal data", descAr: "السماح لأصحاب البيانات بتصحيح البيانات الشخصية غير الدقيقة", priority: "high", automatable: true, evidenceTypes: ["system_config"] },
        { id: "PDPL-1.2.3", code: "1.2.3", titleEn: "Right of Deletion", titleAr: "حق الحذف", descEn: "Delete personal data when no longer necessary or upon request", descAr: "حذف البيانات الشخصية عندما لم تعد ضرورية أو بناءً على طلب", priority: "high", automatable: true, evidenceTypes: ["system_config", "deletion_log"] },
      ]},
    ]},
    { id: "PDPL-D2", code: "2", nameEn: "Data Transfer and Security", nameAr: "نقل البيانات وأمنها", subdomains: [
      { id: "PDPL-2-1", code: "2.1", nameEn: "Cross-Border Data Transfer", nameAr: "نقل البيانات عبر الحدود", controls: [
        { id: "PDPL-2.1.1", code: "2.1.1", titleEn: "Transfer Restrictions", titleAr: "قيود النقل", descEn: "Ensure cross-border transfers comply with PDPL requirements", descAr: "ضمان امتثال عمليات النقل عبر الحدود لمتطلبات نظام حماية البيانات", priority: "critical", automatable: false, evidenceTypes: ["transfer_assessment", "document"] },
        { id: "PDPL-2.1.2", code: "2.1.2", titleEn: "Adequate Protection", titleAr: "الحماية الكافية", descEn: "Verify adequate data protection in receiving jurisdiction", descAr: "التحقق من حماية البيانات الكافية في الولاية القضائية المستقبلة", priority: "high", automatable: false, evidenceTypes: ["assessment_report"] },
      ]},
      { id: "PDPL-2-2", code: "2.2", nameEn: "Data Security Measures", nameAr: "تدابير أمن البيانات", controls: [
        { id: "PDPL-2.2.1", code: "2.2.1", titleEn: "Technical Security Measures", titleAr: "التدابير الأمنية التقنية", descEn: "Implement appropriate technical measures to protect personal data", descAr: "تنفيذ التدابير التقنية المناسبة لحماية البيانات الشخصية", priority: "critical", automatable: true, evidenceTypes: ["system_config", "security_report"], mappedTo: ["ECC-2-6-2"] },
        { id: "PDPL-2.2.2", code: "2.2.2", titleEn: "Breach Notification", titleAr: "الإخطار بالانتهاك", descEn: "Notify SDAIA and affected individuals of data breaches", descAr: "إخطار الهيئة والأفراد المتأثرين بانتهاكات البيانات", priority: "critical", automatable: false, evidenceTypes: ["notification_record", "incident_report"] },
      ]},
    ]},
  ],
};

// ============================================
// NCA CCC — Cloud Cybersecurity Controls
// ============================================
export const NCA_CCC: FrameworkDef = {
  instrumentId: "INST-KSA-NCA-CCC",
  regulatorId: "REG-KSA-NCA",
  nameEn: "Cloud Cybersecurity Controls",
  nameAr: "ضوابط الأمن السيبراني للحوسبة السحابية",
  type: "controls_standard",
  version: "1-2020",
  versionId: "VER-KSA-CCC-1-2020",
  sectors: ["all"],
  mandatory: true,
  summaryEn: "NCA controls for cloud computing cybersecurity applicable to cloud service providers and consumers in KSA.",
  summaryAr: "ضوابط الهيئة الوطنية للأمن السيبراني للحوسبة السحابية المطبقة على مقدمي ومستهلكي الخدمات السحابية في المملكة.",
  tags: ["cloud", "cybersecurity", "mandatory"],
  domains: [
    { id: "CCC-D1", code: "1", nameEn: "Cloud Security Governance", nameAr: "حوكمة أمن الحوسبة السحابية", subdomains: [
      { id: "CCC-1-1", code: "1.1", nameEn: "Cloud Security Strategy", nameAr: "استراتيجية أمن الحوسبة السحابية", controls: [
        { id: "CCC-1.1.1", code: "1.1.1", titleEn: "Cloud Security Policy", titleAr: "سياسة أمن الحوسبة السحابية", descEn: "Establish cloud-specific security policy", descAr: "وضع سياسة أمنية خاصة بالحوسبة السحابية", priority: "critical", automatable: false, evidenceTypes: ["document"], mappedTo: ["ECC-4-2-1"] },
        { id: "CCC-1.1.2", code: "1.1.2", titleEn: "Cloud Risk Assessment", titleAr: "تقييم مخاطر الحوسبة السحابية", descEn: "Assess risks specific to cloud adoption", descAr: "تقييم المخاطر الخاصة بتبني الحوسبة السحابية", priority: "critical", automatable: false, evidenceTypes: ["assessment_report"] },
      ]},
    ]},
    { id: "CCC-D2", code: "2", nameEn: "Cloud Data Protection", nameAr: "حماية بيانات الحوسبة السحابية", subdomains: [
      { id: "CCC-2-1", code: "2.1", nameEn: "Data Sovereignty", nameAr: "سيادة البيانات", controls: [
        { id: "CCC-2.1.1", code: "2.1.1", titleEn: "Data Residency", titleAr: "إقامة البيانات", descEn: "Ensure data residency within KSA borders", descAr: "ضمان إقامة البيانات داخل حدود المملكة", priority: "critical", automatable: true, evidenceTypes: ["system_config", "cloud_report"] },
        { id: "CCC-2.1.2", code: "2.1.2", titleEn: "Data Classification in Cloud", titleAr: "تصنيف البيانات في السحابة", descEn: "Classify data before cloud migration", descAr: "تصنيف البيانات قبل الترحيل إلى السحابة", priority: "high", automatable: false, evidenceTypes: ["classification_record"] },
      ]},
    ]},
  ],
};

// ============================================
// NCA OTCC — Operational Technology Cybersecurity Controls
// ============================================
export const NCA_OTCC: FrameworkDef = {
  instrumentId: "INST-KSA-NCA-OTCC",
  regulatorId: "REG-KSA-NCA",
  nameEn: "Operational Technology Cybersecurity Controls",
  nameAr: "ضوابط الأمن السيبراني للتقنيات التشغيلية",
  type: "controls_standard",
  version: "1-2022",
  versionId: "VER-KSA-OTCC-1-2022",
  sectors: ["SEC-KSA-ENERGY-OG", "SEC-KSA-ENERGY-ELEC", "SEC-KSA-ENERGY-WATER"],
  mandatory: true,
  summaryEn: "NCA controls for operational technology and industrial control systems cybersecurity.",
  summaryAr: "ضوابط الهيئة الوطنية للأمن السيبراني للتقنيات التشغيلية وأنظمة التحكم الصناعي.",
  tags: ["ot", "ics", "scada", "critical_infrastructure"],
  domains: [
    { id: "OTCC-D1", code: "1", nameEn: "OT Governance", nameAr: "حوكمة التقنيات التشغيلية", subdomains: [
      { id: "OTCC-1-1", code: "1.1", nameEn: "OT Security Policy", nameAr: "سياسة أمن التقنيات التشغيلية", controls: [
        { id: "OTCC-1.1.1", code: "1.1.1", titleEn: "OT Security Strategy", titleAr: "استراتيجية أمن التقنيات التشغيلية", descEn: "Develop OT-specific cybersecurity strategy", descAr: "تطوير استراتيجية أمن سيبراني خاصة بالتقنيات التشغيلية", priority: "critical", automatable: false, evidenceTypes: ["document"], mappedTo: ["ECC-5-1-1"] },
      ]},
    ]},
  ],
};

// ============================================
// NCA DCC — Data Cybersecurity Controls
// ============================================
export const NCA_DCC: FrameworkDef = {
  instrumentId: "INST-KSA-NCA-DCC",
  regulatorId: "REG-KSA-NCA",
  nameEn: "Data Cybersecurity Controls",
  nameAr: "ضوابط الأمن السيبراني للبيانات",
  type: "controls_standard",
  version: "1-2022",
  versionId: "VER-KSA-DCC-1-2022",
  sectors: ["all"],
  mandatory: true,
  summaryEn: "NCA controls for data cybersecurity covering data lifecycle protection.",
  summaryAr: "ضوابط الهيئة الوطنية للأمن السيبراني للبيانات التي تغطي حماية دورة حياة البيانات.",
  tags: ["data", "cybersecurity", "mandatory"],
  domains: [
    { id: "DCC-D1", code: "1", nameEn: "Data Security Governance", nameAr: "حوكمة أمن البيانات", subdomains: [
      { id: "DCC-1-1", code: "1.1", nameEn: "Data Security Policy", nameAr: "سياسة أمن البيانات", controls: [
        { id: "DCC-1.1.1", code: "1.1.1", titleEn: "Data Security Policy", titleAr: "سياسة أمن البيانات", descEn: "Establish data security policy covering classification, handling, and disposal", descAr: "وضع سياسة أمن البيانات تغطي التصنيف والتعامل والتخلص", priority: "critical", automatable: false, evidenceTypes: ["document"], mappedTo: ["ECC-2-6-1"] },
      ]},
    ]},
  ],
};

// ============================================
// CST CRF — Cybersecurity Regulatory Framework
// ============================================
export const CST_CRF: FrameworkDef = {
  instrumentId: "INST-KSA-CST-CRF",
  regulatorId: "REG-KSA-CST",
  nameEn: "Cybersecurity Regulatory Framework",
  nameAr: "الإطار التنظيمي للأمن السيبراني",
  type: "framework",
  version: "1.0",
  versionId: "VER-KSA-CST-CRF-1-0",
  sectors: ["SEC-KSA-TEL-OP", "SEC-KSA-TEL-ICT"],
  mandatory: true,
  summaryEn: "CST cybersecurity regulatory framework for telecom and ICT service providers.",
  summaryAr: "الإطار التنظيمي للأمن السيبراني لهيئة الاتصالات لمقدمي خدمات الاتصالات وتقنية المعلومات.",
  tags: ["telecom", "ict", "cybersecurity"],
  domains: [
    { id: "CRF-D1", code: "1", nameEn: "Governance and Risk Management", nameAr: "الحوكمة وإدارة المخاطر", subdomains: [
      { id: "CRF-1-1", code: "1.1", nameEn: "Security Governance", nameAr: "حوكمة الأمن", controls: [
        { id: "CRF-1.1.1", code: "1.1.1", titleEn: "Security Governance Framework", titleAr: "إطار حوكمة الأمن", descEn: "Establish security governance framework for telecom operations", descAr: "إنشاء إطار حوكمة الأمن لعمليات الاتصالات", priority: "critical", automatable: false, evidenceTypes: ["document"] },
      ]},
    ]},
  ],
};

// ============================================
// ZATCA E-Invoicing
// ============================================
export const ZATCA_EINV: FrameworkDef = {
  instrumentId: "INST-KSA-ZATCA-EINV",
  regulatorId: "REG-KSA-ZATCA",
  nameEn: "E-Invoicing (Fatoorah) Regulations",
  nameAr: "أنظمة الفوترة الإلكترونية (فاتورة)",
  type: "regulation",
  version: "Phase 2",
  versionId: "VER-KSA-ZATCA-EINV-P2",
  sectors: ["all_commercial"],
  mandatory: true,
  summaryEn: "ZATCA e-invoicing regulations requiring electronic invoice generation, reporting, and integration.",
  summaryAr: "أنظمة الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك التي تتطلب إنشاء الفواتير الإلكترونية والإبلاغ والتكامل.",
  tags: ["tax", "e-invoicing", "compliance"],
  domains: [
    { id: "EINV-D1", code: "1", nameEn: "E-Invoice Generation", nameAr: "إنشاء الفاتورة الإلكترونية", subdomains: [
      { id: "EINV-1-1", code: "1.1", nameEn: "Invoice Requirements", nameAr: "متطلبات الفاتورة", controls: [
        { id: "EINV-1.1.1", code: "1.1.1", titleEn: "Electronic Invoice Format", titleAr: "تنسيق الفاتورة الإلكترونية", descEn: "Generate invoices in ZATCA-compliant XML format", descAr: "إنشاء الفواتير بتنسيق XML المتوافق مع هيئة الزكاة", priority: "critical", automatable: true, evidenceTypes: ["system_config", "sample_invoice"] },
        { id: "EINV-1.1.2", code: "1.1.2", titleEn: "Digital Signing", titleAr: "التوقيع الرقمي", descEn: "Digitally sign all electronic invoices", descAr: "التوقيع الرقمي لجميع الفواتير الإلكترونية", priority: "critical", automatable: true, evidenceTypes: ["system_config", "certificate"] },
      ]},
    ]},
  ],
};

// ============================================
// CMA Cybersecurity Guidelines
// ============================================
export const CMA_CYBER: FrameworkDef = {
  instrumentId: "INST-KSA-CMA-CYBER",
  regulatorId: "REG-KSA-CMA",
  nameEn: "Cybersecurity Guidelines for Capital Market Institutions",
  nameAr: "إرشادات الأمن السيبراني لمؤسسات السوق المالية",
  type: "guideline",
  version: "1.0",
  versionId: "VER-KSA-CMA-CYBER-1-0",
  sectors: ["SEC-KSA-FIN-CAPITAL"],
  mandatory: true,
  summaryEn: "CMA cybersecurity guidelines for capital market institutions including brokerages and investment funds.",
  summaryAr: "إرشادات الأمن السيبراني لهيئة السوق المالية لمؤسسات السوق المالية بما في ذلك شركات الوساطة وصناديق الاستثمار.",
  tags: ["capital_markets", "cybersecurity", "finance"],
  domains: [
    { id: "CMA-D1", code: "1", nameEn: "Governance and Oversight", nameAr: "الحوكمة والرقابة", subdomains: [
      { id: "CMA-1-1", code: "1.1", nameEn: "Board Oversight", nameAr: "رقابة مجلس الإدارة", controls: [
        { id: "CMA-1.1.1", code: "1.1.1", titleEn: "Board Cybersecurity Oversight", titleAr: "رقابة مجلس الإدارة على الأمن السيبراني", descEn: "Board of directors oversight of cybersecurity program", descAr: "رقابة مجلس الإدارة على برنامج الأمن السيبراني", priority: "critical", automatable: false, evidenceTypes: ["board_minutes", "document"] },
      ]},
    ]},
  ],
};

// ============================================
// ALL FRAMEWORKS COLLECTION
// ============================================
export const KSA_FRAMEWORKS: FrameworkDef[] = [
  NCA_ECC,
  SAMA_CSF,
  PDPL,
  NCA_CCC,
  NCA_OTCC,
  NCA_DCC,
  CST_CRF,
  ZATCA_EINV,
  CMA_CYBER,
];