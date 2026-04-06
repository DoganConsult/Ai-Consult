// ============================================
// NONPROFIT, CHARITY & SOCIAL (3)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_NONPROFIT: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-NCNP",
    nameEn: "National Center for Non-Profit Sector",
    nameAr: "المركز الوطني لتنمية القطاع غير الربحي",
    acronym: "NCNP",
    category: "nonprofit",
    website: "https://ncnp.gov.sa",
    mandateNote: "Nonprofit governance, donor data protection, and charitable transparency",
    sectors: ["SEC-KSA-NONPROFIT"],
  },
  {
    regulatorId: "REG-KSA-SRCA",
    nameEn: "Saudi Red Crescent Authority",
    nameAr: "هيئة الهلال الأحمر السعودي",
    acronym: "SRCA",
    category: "nonprofit",
    website: "https://srca.org.sa",
    mandateNote: "Emergency medical data governance, ambulance telemetry, and patient data protection",
    sectors: ["SEC-KSA-HEALTH-HOSP", "SEC-KSA-NONPROFIT"],
  },
  {
    regulatorId: "REG-KSA-KSR",
    nameEn: "King Salman Humanitarian Aid & Relief",
    nameAr: "مركز الملك سلمان للإغاثة والأعمال الإنسانية",
    acronym: "KSR",
    category: "nonprofit",
    website: "https://ksrelief.org",
    mandateNote: "Humanitarian data governance, beneficiary tracking, and international aid compliance",
    sectors: ["SEC-KSA-NONPROFIT"],
  },
];
