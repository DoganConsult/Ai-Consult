// ============================================
// TAX, CUSTOMS & COMMERCE (7)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_TAX_COMMERCE: RegulatorDef[] = [
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
    regulatorId: "REG-KSA-MOC",
    nameEn: "Ministry of Commerce",
    nameAr: "وزارة التجارة",
    acronym: "MOC",
    category: "commerce",
    website: "https://mc.gov.sa",
    mandateNote: "Commercial registration, consumer protection, e-commerce regulation",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-MISA",
    nameEn: "Ministry of Investment",
    nameAr: "وزارة الاستثمار",
    acronym: "MISA",
    category: "commerce",
    website: "https://misa.gov.sa",
    mandateNote: "Foreign investment licensing and compliance",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-SAIP",
    nameEn: "Saudi Authority for Intellectual Property",
    nameAr: "الهيئة السعودية للملكية الفكرية",
    acronym: "SAIP",
    category: "commerce",
    website: "https://saip.gov.sa",
    mandateNote: "Intellectual property protection, patents, trademarks, and copyrights",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-GAC",
    nameEn: "General Authority for Competition",
    nameAr: "الهيئة العامة للمنافسة",
    acronym: "GAC",
    category: "commerce",
    website: "https://gac.gov.sa",
    mandateNote: "Anti-monopoly, fair competition, and merger control",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-SABER",
    nameEn: "SABER Product Conformity Program",
    nameAr: "نظام سابر للمطابقة",
    acronym: "SABER",
    category: "commerce",
    website: "https://saber.sa",
    mandateNote: "Product conformity certificates and import quality compliance",
    sectors: ["SEC-KSA-RETAIL", "SEC-KSA-INDUSTRY"],
  },
  {
    regulatorId: "REG-KSA-ECOM",
    nameEn: "E-Commerce Council",
    nameAr: "مجلس التجارة الإلكترونية",
    acronym: "ECOM",
    category: "commerce",
    website: "https://mc.gov.sa",
    mandateNote: "E-commerce regulation, consumer rights, and digital marketplace standards",
    sectors: ["SEC-KSA-RETAIL", "SEC-KSA-FIN-FINTECH"],
  },
];
