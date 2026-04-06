// ============================================
// EDUCATION & RESEARCH (6)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_EDUCATION: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-MOE",
    nameEn: "Ministry of Education",
    nameAr: "وزارة التعليم",
    acronym: "MOE",
    category: "education",
    website: "https://moe.gov.sa",
    mandateNote: "K-12 and higher education regulation, e-learning standards",
    sectors: ["SEC-KSA-EDU-UNIV", "SEC-KSA-EDU-K12"],
  },
  {
    regulatorId: "REG-KSA-ETEC",
    nameEn: "Education & Training Evaluation Commission",
    nameAr: "هيئة تقويم التعليم والتدريب",
    acronym: "ETEC",
    category: "education",
    website: "https://etec.gov.sa",
    mandateNote: "Academic accreditation, testing standards, and quality assurance",
    sectors: ["SEC-KSA-EDU-UNIV", "SEC-KSA-EDU-K12"],
  },
  {
    regulatorId: "REG-KSA-NCEL",
    nameEn: "National Center for e-Learning",
    nameAr: "المركز الوطني للتعلم الإلكتروني",
    acronym: "NCEL",
    category: "education",
    website: "https://nelc.gov.sa",
    mandateNote: "E-learning platform standards and digital content governance",
    sectors: ["SEC-KSA-EDU-UNIV", "SEC-KSA-EDU-K12"],
  },
  {
    regulatorId: "REG-KSA-KACST",
    nameEn: "King Abdulaziz City for Science & Technology",
    nameAr: "مدينة الملك عبدالعزيز للعلوم والتقنية",
    acronym: "KACST",
    category: "education",
    website: "https://kacst.edu.sa",
    mandateNote: "Science and technology research policy, data sharing standards",
    sectors: ["SEC-KSA-EDU-UNIV"],
  },
  {
    regulatorId: "REG-KSA-TVTC",
    nameEn: "Technical & Vocational Training Corporation",
    nameAr: "المؤسسة العامة للتدريب التقني والمهني",
    acronym: "TVTC",
    category: "education",
    website: "https://tvtc.gov.sa",
    mandateNote: "Vocational training accreditation and cybersecurity skills programs",
    sectors: ["SEC-KSA-EDU-K12"],
  },
  {
    regulatorId: "REG-KSA-RACS",
    nameEn: "Research and Advisory Council for Science",
    nameAr: "المجلس الاستشاري للبحث العلمي",
    acronym: "RACS",
    category: "education",
    website: "https://kacst.edu.sa",
    mandateNote: "Research ethics, open science data, and academic integrity standards",
    sectors: ["SEC-KSA-EDU-UNIV"],
  },
];
