// ============================================
// MEDIA & SPORTS (6)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_MEDIA: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-GCAM",
    nameEn: "General Commission for Audiovisual Media",
    nameAr: "الهيئة العامة للإعلام المرئي والمسموع",
    acronym: "GCAM",
    category: "media",
    website: "https://gcam.gov.sa",
    mandateNote: "Broadcasting standards, content moderation, and media data governance",
    sectors: ["SEC-KSA-MEDIA"],
  },
  {
    regulatorId: "REG-KSA-MOS",
    nameEn: "Ministry of Sports",
    nameAr: "وزارة الرياضة",
    acronym: "MOS",
    category: "media",
    website: "https://mos.gov.sa",
    mandateNote: "Sports data analytics, athlete information systems, and venue cybersecurity",
    sectors: ["SEC-KSA-SPORTS"],
  },
  {
    regulatorId: "REG-KSA-SPL",
    nameEn: "Saudi Pro League",
    nameAr: "دوري المحترفين السعودي",
    acronym: "SPL",
    category: "media",
    website: "https://spl.com.sa",
    mandateNote: "Player data management, VAR technology governance, and ticketing systems",
    sectors: ["SEC-KSA-SPORTS"],
  },
  {
    regulatorId: "REG-KSA-SADC",
    nameEn: "Saudi Anti-Doping Committee",
    nameAr: "اللجنة السعودية لمكافحة المنشطات",
    acronym: "SADC",
    category: "media",
    website: "https://saadc.gov.sa",
    mandateNote: "Anti-doping test data governance, chain of custody IT, and WADA compliance",
    sectors: ["SEC-KSA-SPORTS"],
  },
  {
    regulatorId: "REG-KSA-MOM",
    nameEn: "Ministry of Media",
    nameAr: "وزارة الإعلام",
    acronym: "MOM",
    category: "media",
    website: "https://media.gov.sa",
    mandateNote: "Media licensing, press data governance, and social media compliance",
    sectors: ["SEC-KSA-MEDIA"],
  },
  {
    regulatorId: "REG-KSA-SOC",
    nameEn: "Saudi Olympic & Paralympic Committee",
    nameAr: "اللجنة الأولمبية والبارالمبية السعودية",
    acronym: "SOC",
    category: "media",
    website: "https://olympic.sa",
    mandateNote: "Olympic program data, international sports compliance, and athlete databases",
    sectors: ["SEC-KSA-SPORTS"],
  },
];
