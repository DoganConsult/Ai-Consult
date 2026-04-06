// ============================================
// HAJJ & RELIGIOUS AFFAIRS (5)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_HAJJ: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MOHU",
    nameEn: "Ministry of Hajj & Umrah",
    nameAr: "وزارة الحج والعمرة",
    acronym: "MOHU",
    category: "hajj",
    website: "https://haj.gov.sa",
    mandateNote: "Pilgrim data management, crowd analytics, and Hajj digital services",
    sectors: ["SEC-KSA-HAJJ"],
  },
  {
    regulatorId: "REG-KSA-MOIA",
    nameEn: "Ministry of Islamic Affairs",
    nameAr: "وزارة الشؤون الإسلامية",
    acronym: "MOIA",
    category: "hajj",
    website: "https://moia.gov.sa",
    mandateNote: "Mosque management systems, Quran digital platforms, and religious affairs IT",
    sectors: ["SEC-KSA-HAJJ"],
  },
  {
    regulatorId: "REG-KSA-GPHA",
    nameEn: "General Presidency for the Two Holy Mosques",
    nameAr: "الرئاسة العامة لشؤون الحرمين الشريفين",
    acronym: "GPHA",
    category: "hajj",
    website: "https://gph.gov.sa",
    mandateNote: "Holy Mosques smart systems, crowd management IoT, and pilgrim safety technology",
    sectors: ["SEC-KSA-HAJJ"],
  },
  {
    regulatorId: "REG-KSA-RCZM",
    nameEn: "Royal Commission for Makkah & Holy Sites",
    nameAr: "الهيئة الملكية لمكة المكرمة والمشاعر المقدسة",
    acronym: "RCZM",
    category: "hajj",
    website: "https://rcmc.gov.sa",
    mandateNote: "Makkah smart city infrastructure, transport systems, and crowd analytics",
    sectors: ["SEC-KSA-HAJJ", "SEC-KSA-SPECIAL-ZONES"],
  },
  {
    regulatorId: "REG-KSA-AWQAF",
    nameEn: "General Authority for Awqaf",
    nameAr: "الهيئة العامة للأوقاف",
    acronym: "AWQAF",
    category: "hajj",
    website: "https://awqaf.gov.sa",
    mandateNote: "Endowment fund digital governance and charitable asset management systems",
    sectors: ["SEC-KSA-NONPROFIT"],
  },
];
