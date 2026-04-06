// ============================================
// CYBERSECURITY & DATA PROTECTION (5)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_CYBERSECURITY: RegulatorDef[] = [
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
    regulatorId: "REG-KSA-DGA",
    nameEn: "Digital Government Authority",
    nameAr: "هيئة الحكومة الرقمية",
    acronym: "DGA",
    category: "digital",
    website: "https://dga.gov.sa",
    mandateNote: "Digital government transformation and e-services standards",
    sectors: ["SEC-KSA-GOV-MIN", "SEC-KSA-GOV-AUTH", "SEC-KSA-GOV-MUN"],
  },
  {
    regulatorId: "REG-KSA-NCSC",
    nameEn: "National Cyber Security Center",
    nameAr: "المركز الوطني للأمن السيبراني",
    acronym: "NCSC",
    category: "cybersecurity",
    website: "https://nca.gov.sa",
    mandateNote: "Operational cybersecurity monitoring and incident response coordination",
    sectors: ["all"],
  },
];
