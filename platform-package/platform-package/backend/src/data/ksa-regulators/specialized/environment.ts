// ============================================
// ENVIRONMENT & AGRICULTURE (6)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_ENVIRONMENT: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MEWA",
    nameEn: "Ministry of Environment, Water & Agriculture",
    nameAr: "وزارة البيئة والمياه والزراعة",
    acronym: "MEWA",
    category: "environment",
    website: "https://mewa.gov.sa",
    mandateNote: "Environmental regulation, water resource management, and agriculture standards",
    sectors: ["SEC-KSA-AGRI", "SEC-KSA-ENERGY-WATER"],
  },
  {
    regulatorId: "REG-KSA-NCM",
    nameEn: "National Center for Meteorology",
    nameAr: "المركز الوطني للأرصاد",
    acronym: "NCM",
    category: "environment",
    website: "https://ncm.gov.sa",
    mandateNote: "Weather data governance, climate monitoring systems, and IoT sensor networks",
    sectors: ["SEC-KSA-AGRI"],
  },
  {
    regulatorId: "REG-KSA-NCWCD",
    nameEn: "National Center for Wildlife Conservation & Development",
    nameAr: "المركز الوطني لتنمية الحياة الفطرية",
    acronym: "NCWCD",
    category: "environment",
    website: "https://ncw.gov.sa",
    mandateNote: "Biodiversity data, conservation area monitoring, and wildlife tracking systems",
    sectors: ["SEC-KSA-AGRI"],
  },
  {
    regulatorId: "REG-KSA-SASO",
    nameEn: "Saudi Standards, Metrology & Quality Organization",
    nameAr: "الهيئة السعودية للمواصفات والمقاييس والجودة",
    acronym: "SASO",
    category: "environment",
    website: "https://saso.gov.sa",
    mandateNote: "Product standards, quality certification, and conformity assessment",
    sectors: ["all_commercial"],
  },
  {
    regulatorId: "REG-KSA-PME",
    nameEn: "Presidency of Meteorology & Environment",
    nameAr: "الرئاسة العامة للأرصاد وحماية البيئة",
    acronym: "PME",
    category: "environment",
    website: "https://ncm.gov.sa",
    mandateNote: "Environmental impact assessment, emissions monitoring, and reporting",
    sectors: ["SEC-KSA-ENERGY-OG", "SEC-KSA-INDUSTRY"],
  },
  {
    regulatorId: "REG-KSA-NWC",
    nameEn: "National Water Company",
    nameAr: "شركة المياه الوطنية",
    acronym: "NWC",
    category: "environment",
    website: "https://nwc.com.sa",
    mandateNote: "Water utility SCADA cybersecurity, customer data protection, and billing systems",
    sectors: ["SEC-KSA-ENERGY-WATER"],
  },
];
