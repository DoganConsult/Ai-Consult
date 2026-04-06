// ============================================
// TOURISM, CULTURE & ENTERTAINMENT (7)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_TOURISM: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MOT",
    nameEn: "Ministry of Tourism",
    nameAr: "وزارة السياحة",
    acronym: "MOT",
    category: "tourism",
    website: "https://mt.gov.sa",
    mandateNote: "Tourism licensing, guest data protection, and hospitality standards",
    sectors: ["SEC-KSA-TOURISM"],
  },
  {
    regulatorId: "REG-KSA-GEA",
    nameEn: "General Entertainment Authority",
    nameAr: "الهيئة العامة للترفيه",
    acronym: "GEA",
    category: "tourism",
    website: "https://gea.gov.sa",
    mandateNote: "Entertainment event licensing, ticketing data, and venue cybersecurity",
    sectors: ["SEC-KSA-TOURISM", "SEC-KSA-MEDIA"],
  },
  {
    regulatorId: "REG-KSA-MOC_CULT",
    nameEn: "Ministry of Culture",
    nameAr: "وزارة الثقافة",
    acronym: "MOC_CULT",
    category: "tourism",
    website: "https://moc.gov.sa",
    mandateNote: "Cultural heritage digital preservation and intellectual property in arts",
    sectors: ["SEC-KSA-MEDIA"],
  },
  {
    regulatorId: "REG-KSA-HERITAGE",
    nameEn: "Heritage Authority",
    nameAr: "هيئة التراث",
    acronym: "HERITAGE",
    category: "tourism",
    website: "https://heritage.moc.gov.sa",
    mandateNote: "Archaeological data governance, site monitoring systems, and artifact tracking",
    sectors: ["SEC-KSA-TOURISM"],
  },
  {
    regulatorId: "REG-KSA-FILM",
    nameEn: "Film Commission",
    nameAr: "هيئة الأفلام",
    acronym: "FILM",
    category: "tourism",
    website: "https://film.moc.gov.sa",
    mandateNote: "Film production data governance, content classification, and distribution rights",
    sectors: ["SEC-KSA-MEDIA"],
  },
  {
    regulatorId: "REG-KSA-STA",
    nameEn: "Saudi Tourism Authority",
    nameAr: "الهيئة السعودية للسياحة",
    acronym: "STA",
    category: "tourism",
    website: "https://sta.gov.sa",
    mandateNote: "Tourism promotion platforms, visitor data analytics, and loyalty programs",
    sectors: ["SEC-KSA-TOURISM"],
  },
  {
    regulatorId: "REG-KSA-SCTH",
    nameEn: "Saudi Commission for Tourism & National Heritage",
    nameAr: "الهيئة العامة للسياحة والتراث الوطني",
    acronym: "SCTH",
    category: "tourism",
    website: "https://mt.gov.sa",
    mandateNote: "Tourism operator licensing, heritage site technology, and data standards",
    sectors: ["SEC-KSA-TOURISM"],
  },
];
