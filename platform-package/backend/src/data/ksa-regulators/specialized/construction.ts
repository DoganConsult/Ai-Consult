// ============================================
// CONSTRUCTION, HOUSING & REAL ESTATE (5)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_CONSTRUCTION: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-REGA",
    nameEn: "Real Estate General Authority",
    nameAr: "الهيئة العامة للعقار",
    acronym: "REGA",
    category: "construction",
    website: "https://rega.gov.sa",
    mandateNote: "Real estate registration, PropTech regulation, and property data governance",
    sectors: ["SEC-KSA-CONST"],
  },
  {
    regulatorId: "REG-KSA-NHC",
    nameEn: "National Housing Company",
    nameAr: "شركة الإسكان الوطنية",
    acronym: "NHC",
    category: "construction",
    website: "https://nhc.sa",
    mandateNote: "Housing project compliance, smart home standards, and BIM data governance",
    sectors: ["SEC-KSA-CONST"],
  },
  {
    regulatorId: "REG-KSA-SCA",
    nameEn: "Saudi Contractors Authority",
    nameAr: "الهيئة السعودية للمقاولين",
    acronym: "SCA",
    category: "construction",
    website: "https://sca.sa",
    mandateNote: "Contractor classification, project management IT, and construction compliance",
    sectors: ["SEC-KSA-CONST"],
  },
  {
    regulatorId: "REG-KSA-RCJY",
    nameEn: "Royal Commission for Jubail & Yanbu",
    nameAr: "الهيئة الملكية للجبيل وينبع",
    acronym: "RCJY",
    category: "construction",
    website: "https://rcjy.gov.sa",
    mandateNote: "Industrial city infrastructure, environmental monitoring, and OT cybersecurity",
    sectors: ["SEC-KSA-INDUSTRY", "SEC-KSA-SPECIAL-ZONES"],
  },
  {
    regulatorId: "REG-KSA-MODON",
    nameEn: "Saudi Authority for Industrial Cities & Technology Zones (MODON)",
    nameAr: "الهيئة السعودية للمدن الصناعية ومناطق التقنية (مدن)",
    acronym: "MODON",
    category: "construction",
    website: "https://modon.gov.sa",
    mandateNote: "Industrial zone IT infrastructure, tenant compliance, and smart factory standards",
    sectors: ["SEC-KSA-INDUSTRY"],
  },
];
