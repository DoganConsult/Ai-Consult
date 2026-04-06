// ============================================
// DIGITAL ECONOMY & FINTECH (5)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_DIGITAL: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-FINTECH",
    nameEn: "Fintech Saudi",
    nameAr: "التقنية المالية السعودية",
    acronym: "FINTECH",
    category: "digital",
    website: "https://fintechsaudi.com",
    mandateNote: "Fintech sandbox regulation, open banking standards, and digital payment compliance",
    sectors: ["SEC-KSA-FIN-FINTECH"],
  },
  {
    regulatorId: "REG-KSA-MADA",
    nameEn: "Saudi Payments (mada)",
    nameAr: "المدفوعات السعودية (مدى)",
    acronym: "MADA",
    category: "digital",
    website: "https://mada.com.sa",
    mandateNote: "Payment network cybersecurity, PCI compliance, and transaction data governance",
    sectors: ["SEC-KSA-FIN-FINTECH", "SEC-KSA-FIN-BANK"],
  },
  {
    regulatorId: "REG-KSA-SIMAH",
    nameEn: "Saudi Credit Bureau (SIMAH)",
    nameAr: "الشركة السعودية للمعلومات الائتمانية (سمة)",
    acronym: "SIMAH",
    category: "digital",
    website: "https://simah.com",
    mandateNote: "Credit data governance, consumer financial data protection, and reporting standards",
    sectors: ["SEC-KSA-FIN-BANK", "SEC-KSA-FIN-FINTECH"],
  },
  {
    regulatorId: "REG-KSA-VAC",
    nameEn: "Virtual Assets Regulatory Authority",
    nameAr: "هيئة تنظيم الأصول الافتراضية",
    acronym: "VAC",
    category: "digital",
    website: "https://sama.gov.sa",
    mandateNote: "Cryptocurrency regulation, blockchain governance, and AML for virtual assets",
    sectors: ["SEC-KSA-FIN-FINTECH", "SEC-KSA-FIN-CAPITAL"],
  },
  {
    regulatorId: "REG-KSA-OBF",
    nameEn: "Open Banking Framework Authority",
    nameAr: "هيئة إطار الخدمات المصرفية المفتوحة",
    acronym: "OBF",
    category: "digital",
    website: "https://sama.gov.sa",
    mandateNote: "Open banking API standards, consent management, and third-party provider compliance",
    sectors: ["SEC-KSA-FIN-BANK", "SEC-KSA-FIN-FINTECH"],
  },
];
