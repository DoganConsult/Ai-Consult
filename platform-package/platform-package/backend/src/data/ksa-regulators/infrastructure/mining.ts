// ============================================
// MINING & INDUSTRY (5)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_MINING: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MIM",
    nameEn: "Ministry of Industry & Mineral Resources",
    nameAr: "وزارة الصناعة والثروة المعدنية",
    acronym: "MIM",
    category: "mining",
    website: "https://mim.gov.sa",
    mandateNote: "Mining permits, industrial licensing, and factory compliance standards",
    sectors: ["SEC-KSA-MINING", "SEC-KSA-INDUSTRY"],
  },
  {
    regulatorId: "REG-KSA-MAADEN",
    nameEn: "Ma'aden (Saudi Arabian Mining Company) Regulatory",
    nameAr: "الشؤون التنظيمية لشركة التعدين العربية السعودية (معادن)",
    acronym: "MAADEN",
    category: "mining",
    website: "https://maaden.com.sa",
    mandateNote: "Mining OT/SCADA cybersecurity, environmental monitoring, and safety systems",
    sectors: ["SEC-KSA-MINING"],
  },
  {
    regulatorId: "REG-KSA-NIDLP",
    nameEn: "National Industrial Development & Logistics Program",
    nameAr: "برنامج تطوير الصناعة الوطنية والخدمات اللوجستية",
    acronym: "NIDLP",
    category: "mining",
    website: "https://vision2030.gov.sa",
    mandateNote: "Industrial strategy compliance, supply chain digitization, and logistics standards",
    sectors: ["SEC-KSA-INDUSTRY", "SEC-KSA-TRANS-LOG"],
  },
  {
    regulatorId: "REG-KSA-SARI",
    nameEn: "Saudi Arabian Regulatory & Inspection Authority",
    nameAr: "الهيئة السعودية للرقابة والتفتيش",
    acronym: "SARI",
    category: "mining",
    website: "https://saso.gov.sa",
    mandateNote: "Industrial inspection, safety systems, and quality control automation",
    sectors: ["SEC-KSA-INDUSTRY", "SEC-KSA-ENERGY-OG"],
  },
  {
    regulatorId: "REG-KSA-SABIC",
    nameEn: "SABIC Regulatory & Compliance Division",
    nameAr: "قسم الالتزام التنظيمي لسابك",
    acronym: "SABIC",
    category: "mining",
    website: "https://sabic.com",
    mandateNote: "Petrochemical plant OT cybersecurity, process safety, and export controls",
    sectors: ["SEC-KSA-INDUSTRY"],
  },
];
