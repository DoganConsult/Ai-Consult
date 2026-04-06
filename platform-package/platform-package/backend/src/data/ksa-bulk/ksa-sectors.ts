// ============================================
// Shahin AI-KSA GRC — Complete KSA Sector Registry
// 30+ Sectors with regulator and framework mappings
// Naming: SEC-KSA-<CATEGORY>-<SUBCATEGORY>
// ============================================

export interface SectorDef {
  sectorId: string;
  nameEn: string;
  nameAr: string;
  parentSectorId?: string;
  applicableRegulators: string[];
  applicableFrameworks: string[];
}

export const KSA_SECTORS: SectorDef[] = [
  // === GOVERNMENT & PUBLIC SECTOR ===
  {
    sectorId: "SEC-KSA-GOV-MIN",
    nameEn: "Government Ministries",
    nameAr: "الوزارات الحكومية",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA", "REG-KSA-NDMO"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-DCC", "INST-KSA-SDAIA-PDPL"],
  },
  {
    sectorId: "SEC-KSA-GOV-AUTH",
    nameEn: "Government Authorities & Agencies",
    nameAr: "الهيئات والمؤسسات الحكومية",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA", "REG-KSA-NDMO"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-DCC", "INST-KSA-SDAIA-PDPL"],
  },
  {
    sectorId: "SEC-KSA-GOV-MUN",
    nameEn: "Municipalities & Regional Government",
    nameAr: "الأمانات والبلديات والحكم المحلي",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === FINANCIAL SECTOR ===
  {
    sectorId: "SEC-KSA-FIN-BANK",
    nameEn: "Banking & Financial Services",
    nameAr: "البنوك والخدمات المالية",
    applicableRegulators: ["REG-KSA-SAMA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-SAMA-CSF", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-CCC"],
  },
  {
    sectorId: "SEC-KSA-FIN-INS",
    nameEn: "Insurance",
    nameAr: "التأمين",
    applicableRegulators: ["REG-KSA-SAMA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-SAMA-CSF", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  {
    sectorId: "SEC-KSA-FIN-FINTECH",
    nameEn: "Fintech & Digital Payments",
    nameAr: "التقنية المالية والمدفوعات الرقمية",
    applicableRegulators: ["REG-KSA-SAMA", "REG-KSA-CMA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-SAMA-CSF", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-CCC"],
  },
  {
    sectorId: "SEC-KSA-FIN-CAPITAL",
    nameEn: "Capital Markets & Securities",
    nameAr: "أسواق المال والأوراق المالية",
    applicableRegulators: ["REG-KSA-CMA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-CMA-CYBER", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === HEALTHCARE ===
  {
    sectorId: "SEC-KSA-HEALTH-HOSP",
    nameEn: "Hospitals & Healthcare Providers",
    nameAr: "المستشفيات ومقدمي الرعاية الصحية",
    applicableRegulators: ["REG-KSA-MOH", "REG-KSA-CBAHI", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-DCC"],
  },
  {
    sectorId: "SEC-KSA-HEALTH-PHARMA",
    nameEn: "Pharmaceuticals & Life Sciences",
    nameAr: "الأدوية وعلوم الحياة",
    applicableRegulators: ["REG-KSA-SFDA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === ENERGY & UTILITIES ===
  {
    sectorId: "SEC-KSA-ENERGY-OG",
    nameEn: "Oil & Gas",
    nameAr: "النفط والغاز",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-NCA-CCC", "INST-KSA-SDAIA-PDPL"],
  },
  {
    sectorId: "SEC-KSA-ENERGY-ELEC",
    nameEn: "Electricity & Power Generation",
    nameAr: "الكهرباء وتوليد الطاقة",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-ECRA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC"],
  },
  {
    sectorId: "SEC-KSA-ENERGY-WATER",
    nameEn: "Water & Desalination",
    nameAr: "المياه والتحلية",
    applicableRegulators: ["REG-KSA-NCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC"],
  },
  {
    sectorId: "SEC-KSA-ENERGY-RENEW",
    nameEn: "Renewable Energy",
    nameAr: "الطاقة المتجددة",
    applicableRegulators: ["REG-KSA-NCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-NCA-CCC"],
  },
  // === TELECOMMUNICATIONS & ICT ===
  {
    sectorId: "SEC-KSA-TEL-OP",
    nameEn: "Telecommunications Operators",
    nameAr: "مشغلو الاتصالات",
    applicableRegulators: ["REG-KSA-CST", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-CST-CRF", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-CCC", "INST-KSA-NCA-DCC"],
  },
  {
    sectorId: "SEC-KSA-TEL-ICT",
    nameEn: "ICT & Cloud Service Providers",
    nameAr: "مزودو خدمات تقنية المعلومات والحوسبة السحابية",
    applicableRegulators: ["REG-KSA-CST", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-CCC", "INST-KSA-CST-CRF", "INST-KSA-SDAIA-PDPL"],
  },
  // === EDUCATION ===
  {
    sectorId: "SEC-KSA-EDU-UNIV",
    nameEn: "Universities & Higher Education",
    nameAr: "الجامعات والتعليم العالي",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-DCC"],
  },
  {
    sectorId: "SEC-KSA-EDU-K12",
    nameEn: "K-12 Education",
    nameAr: "التعليم العام",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === TRANSPORTATION & LOGISTICS ===
  {
    sectorId: "SEC-KSA-TRANS-AVIA",
    nameEn: "Aviation & Airports",
    nameAr: "الطيران والمطارات",
    applicableRegulators: ["REG-KSA-GACA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-SDAIA-PDPL"],
  },
  {
    sectorId: "SEC-KSA-TRANS-MARI",
    nameEn: "Maritime & Ports",
    nameAr: "النقل البحري والموانئ",
    applicableRegulators: ["REG-KSA-NCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC"],
  },
  {
    sectorId: "SEC-KSA-TRANS-RAIL",
    nameEn: "Railways & Metro",
    nameAr: "السكك الحديدية والمترو",
    applicableRegulators: ["REG-KSA-NCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC"],
  },
  {
    sectorId: "SEC-KSA-TRANS-LOG",
    nameEn: "Logistics & Supply Chain",
    nameAr: "الخدمات اللوجستية وسلاسل الإمداد",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-CCC"],
  },
  // === RETAIL & E-COMMERCE ===
  {
    sectorId: "SEC-KSA-RETAIL",
    nameEn: "E-Commerce & Retail",
    nameAr: "التجارة الإلكترونية والتجزئة",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA", "REG-KSA-ZATCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-ZATCA-EINV"],
  },
  // === CONSTRUCTION & REAL ESTATE ===
  {
    sectorId: "SEC-KSA-CONST",
    nameEn: "Construction & Real Estate",
    nameAr: "البناء والعقارات",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === TOURISM & HOSPITALITY ===
  {
    sectorId: "SEC-KSA-TOURISM",
    nameEn: "Tourism & Hospitality",
    nameAr: "السياحة والضيافة",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA", "REG-KSA-ZATCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-ZATCA-EINV"],
  },
  // === HAJJ & UMRAH ===
  {
    sectorId: "SEC-KSA-HAJJ",
    nameEn: "Hajj & Umrah Services",
    nameAr: "خدمات الحج والعمرة",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-CCC"],
  },
  // === DEFENSE & SECURITY ===
  {
    sectorId: "SEC-KSA-DEFENSE",
    nameEn: "Defense & Military",
    nameAr: "الدفاع والقوات المسلحة",
    applicableRegulators: ["REG-KSA-NCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-NCA-DCC"],
  },
  // === MEDIA & ENTERTAINMENT ===
  {
    sectorId: "SEC-KSA-MEDIA",
    nameEn: "Media & Entertainment",
    nameAr: "الإعلام والترفيه",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-CST", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-CST-CRF"],
  },
  // === MINING & MINERALS ===
  {
    sectorId: "SEC-KSA-MINING",
    nameEn: "Mining & Minerals",
    nameAr: "التعدين والمعادن",
    applicableRegulators: ["REG-KSA-NCA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-SDAIA-PDPL"],
  },
  // === AGRICULTURE & FOOD ===
  {
    sectorId: "SEC-KSA-AGRI",
    nameEn: "Agriculture & Food Security",
    nameAr: "الزراعة والأمن الغذائي",
    applicableRegulators: ["REG-KSA-SFDA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === NONPROFIT & CHARITY ===
  {
    sectorId: "SEC-KSA-NONPROFIT",
    nameEn: "Nonprofit & Charitable Organizations",
    nameAr: "المنظمات غير الربحية والخيرية",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === SPORTS ===
  {
    sectorId: "SEC-KSA-SPORTS",
    nameEn: "Sports & Athletics",
    nameAr: "الرياضة",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === INDUSTRY & MANUFACTURING ===
  {
    sectorId: "SEC-KSA-INDUSTRY",
    nameEn: "Industrial Manufacturing",
    nameAr: "الصناعات التحويلية",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-MIM", "REG-KSA-SASO"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-SDAIA-PDPL"],
  },
  // === NUCLEAR ===
  {
    sectorId: "SEC-KSA-NUCLEAR",
    nameEn: "Nuclear Energy & Radiological",
    nameAr: "الطاقة النووية والإشعاعية",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-NRRC", "REG-KSA-KACARE"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-NCA-CSCC"],
  },
  // === SPACE ===
  {
    sectorId: "SEC-KSA-SPACE",
    nameEn: "Space & Satellite",
    nameAr: "الفضاء والأقمار الاصطناعية",
    applicableRegulators: ["REG-KSA-SSC", "REG-KSA-NCA", "REG-KSA-CST"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-CCC", "INST-KSA-CST-CRF"],
  },
  // === DIGITAL ECONOMY ===
  {
    sectorId: "SEC-KSA-DIGITAL",
    nameEn: "Digital Economy & Tech Startups",
    nameAr: "الاقتصاد الرقمي والشركات الناشئة التقنية",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-MCIT", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-CCC", "INST-KSA-SDAIA-PDPL"],
  },
  // === SPECIAL ECONOMIC ZONES ===
  {
    sectorId: "SEC-KSA-SPECIAL-ZONES",
    nameEn: "Special Economic Zones & Mega Projects",
    nameAr: "المناطق الاقتصادية الخاصة والمشاريع الكبرى",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-NEOM", "REG-KSA-RSGA", "REG-KSA-DGDA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-CCC", "INST-KSA-SDAIA-PDPL", "INST-KSA-NCA-CSCC"],
  },
  // === CRYPTO & VIRTUAL ASSETS ===
  {
    sectorId: "SEC-KSA-CRYPTO",
    nameEn: "Cryptocurrency & Virtual Assets",
    nameAr: "العملات المشفرة والأصول الافتراضية",
    applicableRegulators: ["REG-KSA-SAMA", "REG-KSA-CMA", "REG-KSA-NCA", "REG-KSA-VAC"],
    applicableFrameworks: ["INST-KSA-SAMA-CSF", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === SMART CITIES ===
  {
    sectorId: "SEC-KSA-SMARTCITY",
    nameEn: "Smart Cities & Urban Technology",
    nameAr: "المدن الذكية وتقنية المدن",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-MOMRAH", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-NCA-CCC", "INST-KSA-SDAIA-PDPL"],
  },
  // === DIGITAL HEALTH ===
  {
    sectorId: "SEC-KSA-DIGITAL-HEALTH",
    nameEn: "Digital Health & HealthTech",
    nameAr: "الصحة الرقمية والتقنية الصحية",
    applicableRegulators: ["REG-KSA-MOH", "REG-KSA-SFDA", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-MOH-HIS", "INST-KSA-SFDA-MDS", "INST-KSA-SDAIA-PDPL"],
  },
  // === AUTONOMOUS SYSTEMS ===
  {
    sectorId: "SEC-KSA-AUTONOMOUS",
    nameEn: "Autonomous Systems & Robotics",
    nameAr: "الأنظمة المستقلة والروبوتات",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-SDAIA", "REG-KSA-CST"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-AIE", "INST-KSA-SDAIA-PDPL"],
  },
  // === FOOD PROCESSING ===
  {
    sectorId: "SEC-KSA-FOOD",
    nameEn: "Food Processing & Safety",
    nameAr: "تصنيع وسلامة الأغذية",
    applicableRegulators: ["REG-KSA-SFDA", "REG-KSA-NCA", "REG-KSA-SASO"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL", "INST-KSA-SASO-PRODUCT"],
  },
  // === PETROCHEMICALS ===
  {
    sectorId: "SEC-KSA-PETROCHEM",
    nameEn: "Petrochemicals & Chemicals",
    nameAr: "البتروكيماويات والكيماويات",
    applicableRegulators: ["REG-KSA-NCA", "REG-KSA-MEIM", "REG-KSA-SABIC"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-NCA-OTCC", "INST-KSA-MEIM-OG"],
  },
  // === OPEN BANKING ===
  {
    sectorId: "SEC-KSA-OPEN-BANKING",
    nameEn: "Open Banking & API Finance",
    nameAr: "الخدمات المصرفية المفتوحة وتمويل API",
    applicableRegulators: ["REG-KSA-SAMA", "REG-KSA-NCA", "REG-KSA-OBF"],
    applicableFrameworks: ["INST-KSA-SAMA-CSF", "INST-KSA-SAMA-FINTECH", "INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === LEGAL SERVICES ===
  {
    sectorId: "SEC-KSA-LEGAL",
    nameEn: "Legal Services & Law Firms",
    nameAr: "الخدمات القانونية ومكاتب المحاماة",
    applicableRegulators: ["REG-KSA-MOJ", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
  // === HUMANITARIAN ===
  {
    sectorId: "SEC-KSA-HUMANITARIAN",
    nameEn: "Humanitarian Aid & Relief",
    nameAr: "المساعدات الإنسانية والإغاثة",
    applicableRegulators: ["REG-KSA-KSR", "REG-KSA-NCA", "REG-KSA-SDAIA"],
    applicableFrameworks: ["INST-KSA-NCA-ECC", "INST-KSA-SDAIA-PDPL"],
  },
];