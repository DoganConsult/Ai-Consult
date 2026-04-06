// ============================================
// LABOR & SOCIAL DEVELOPMENT (6)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_LABOR: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MHRSD",
    nameEn: "Ministry of Human Resources & Social Development",
    nameAr: "وزارة الموارد البشرية والتنمية الاجتماعية",
    acronym: "MHRSD",
    category: "labor",
    website: "https://hrsd.gov.sa",
    mandateNote: "Labor law compliance, Saudization (Nitaqat), and worker welfare",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-HRDF",
    nameEn: "Human Resources Development Fund (Hadaf)",
    nameAr: "صندوق تنمية الموارد البشرية (هدف)",
    acronym: "HRDF",
    category: "labor",
    website: "https://hrdf.org.sa",
    mandateNote: "Workforce training compliance and skills development programs",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-MUSANED",
    nameEn: "Musaned Domestic Labor Platform",
    nameAr: "منصة مساند",
    acronym: "MUSANED",
    category: "labor",
    website: "https://musaned.com.sa",
    mandateNote: "Domestic labor recruitment compliance and contract management",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-QIWA",
    nameEn: "Qiwa Labor Platform",
    nameAr: "منصة قوى",
    acronym: "QIWA",
    category: "labor",
    website: "https://qiwa.sa",
    mandateNote: "Digital labor market compliance, e-contracts, and mobility management",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-GAZT",
    nameEn: "General Authority for Zakat (historical)",
    nameAr: "الهيئة العامة للزكاة (تاريخي)",
    acronym: "GAZT",
    category: "labor",
    website: "https://zatca.gov.sa",
    mandateNote: "Historical zakat obligations; now merged into ZATCA",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-CSC",
    nameEn: "Civil Service Commission",
    nameAr: "وزارة الخدمة المدنية",
    acronym: "CSC",
    category: "labor",
    website: "https://hrsd.gov.sa",
    mandateNote: "Government employee management, grading, and digital HR systems",
    sectors: ["SEC-KSA-GOV-MIN", "SEC-KSA-GOV-AUTH"],
  },
];
