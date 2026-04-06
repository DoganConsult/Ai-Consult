// ============================================
// DEFENSE & SECURITY (5)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_DEFENSE: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MOD",
    nameEn: "Ministry of Defense",
    nameAr: "وزارة الدفاع",
    acronym: "MOD",
    category: "defense",
    website: "https://mod.gov.sa",
    mandateNote: "Defense systems cybersecurity, classified data, and military IT governance",
    sectors: ["SEC-KSA-DEFENSE"],
  },
  {
    regulatorId: "REG-KSA-PSS",
    nameEn: "Presidency of State Security",
    nameAr: "رئاسة أمن الدولة",
    acronym: "PSS",
    category: "defense",
    website: "https://pss.gov.sa",
    mandateNote: "National security intelligence systems and counter-terrorism data governance",
    sectors: ["SEC-KSA-DEFENSE"],
  },
  {
    regulatorId: "REG-KSA-GDIR",
    nameEn: "General Directorate of Intelligence & Research",
    nameAr: "الإدارة العامة للاستخبارات والأبحاث",
    acronym: "GDIR",
    category: "defense",
    website: "https://pss.gov.sa",
    mandateNote: "Signals intelligence systems, cyber espionage defense, and secure communications",
    sectors: ["SEC-KSA-DEFENSE"],
  },
  {
    regulatorId: "REG-KSA-GAMI",
    nameEn: "General Authority for Military Industries",
    nameAr: "الهيئة العامة للصناعات العسكرية",
    acronym: "GAMI",
    category: "defense",
    website: "https://gami.gov.sa",
    mandateNote: "Defense industry supply chain security, ITAR-like controls, and export compliance",
    sectors: ["SEC-KSA-DEFENSE", "SEC-KSA-INDUSTRY"],
  },
  {
    regulatorId: "REG-KSA-RBG",
    nameEn: "Royal Border Guard",
    nameAr: "حرس الحدود",
    acronym: "RBG",
    category: "defense",
    website: "https://moi.gov.sa",
    mandateNote: "Border surveillance systems, maritime security sensors, and biometric gates",
    sectors: ["SEC-KSA-DEFENSE"],
  },
];
