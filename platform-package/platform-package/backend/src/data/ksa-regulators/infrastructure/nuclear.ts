// ============================================
// NUCLEAR & SPACE (3)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_NUCLEAR: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-NRRC",
    nameEn: "Nuclear & Radiological Regulatory Commission",
    nameAr: "هيئة الرقابة النووية والإشعاعية",
    acronym: "NRRC",
    category: "nuclear",
    website: "https://nrrc.gov.sa",
    mandateNote: "Nuclear facility cybersecurity, radiological material tracking, and IAEA compliance",
    sectors: ["SEC-KSA-NUCLEAR"],
  },
  {
    regulatorId: "REG-KSA-KACSTSPACE",
    nameEn: "KACST Space Research Division",
    nameAr: "قسم أبحاث الفضاء في مدينة الملك عبدالعزيز",
    acronym: "KACSTSPACE",
    category: "nuclear",
    website: "https://kacst.edu.sa",
    mandateNote: "Satellite operations cybersecurity, ground station protection, and space data",
    sectors: ["SEC-KSA-SPACE"],
  },
  {
    regulatorId: "REG-KSA-SAUDISAT",
    nameEn: "Saudi Satellite Communications Company",
    nameAr: "شركة الاتصالات الفضائية السعودية",
    acronym: "SAUDISAT",
    category: "nuclear",
    website: "https://arabsat.com",
    mandateNote: "Satellite broadcast cybersecurity, transponder management, and uplink security",
    sectors: ["SEC-KSA-SPACE", "SEC-KSA-TEL-OP"],
  },
];
