// ============================================
// INTERNATIONAL STANDARDS BODIES (referenced) (4)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_INTERNATIONAL: RegulatorDef[] = [
  {
    regulatorId: "REG-INTL-ISO",
    nameEn: "International Organization for Standardization",
    nameAr: "المنظمة الدولية للتوحيد القياسي",
    acronym: "ISO",
    category: "international",
    website: "https://iso.org",
    mandateNote: "International standards referenced by KSA regulators (ISO 27001, ISO 22301, etc.)",
    sectors: ["all"],
  },
  {
    regulatorId: "REG-INTL-NIST",
    nameEn: "National Institute of Standards & Technology",
    nameAr: "المعهد الوطني للمعايير والتقنية",
    acronym: "NIST",
    category: "international",
    website: "https://nist.gov",
    mandateNote: "NIST CSF and SP 800-53 referenced by NCA and SAMA frameworks",
    sectors: ["all"],
  },
  {
    regulatorId: "REG-INTL-PCI",
    nameEn: "Payment Card Industry Security Standards Council",
    nameAr: "مجلس معايير أمن صناعة بطاقات الدفع",
    acronym: "PCI",
    category: "international",
    website: "https://pcisecuritystandards.org",
    mandateNote: "PCI-DSS mandatory for all card-processing entities in KSA",
    sectors: ["SEC-KSA-FIN-BANK", "SEC-KSA-FIN-FINTECH", "SEC-KSA-RETAIL"],
  },
  {
    regulatorId: "REG-INTL-ISACA",
    nameEn: "ISACA (COBIT Framework)",
    nameAr: "جمعية تدقيق ومراقبة نظم المعلومات",
    acronym: "ISACA",
    category: "international",
    website: "https://isaca.org",
    mandateNote: "COBIT 2019 IT governance framework referenced by KSA government entities",
    sectors: ["all"],
  },
];
