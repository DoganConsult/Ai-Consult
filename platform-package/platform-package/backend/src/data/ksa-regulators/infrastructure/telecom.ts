// ============================================
// TELECOMMUNICATIONS & ICT (6)
// ============================================

import { RegulatorDef } from "../ksa-frameworks";

export const REGS_TELECOM: RegulatorDef[] = [
  {
    regulatorId: "REG-KSA-CST",
    nameEn: "Communications, Space & Technology Commission",
    nameAr: "هيئة الاتصالات والفضاء والتقنية",
    acronym: "CST",
    category: "telecom",
    website: "https://cst.gov.sa",
    mandateNote: "Telecom and ICT sector regulation",
    sectors: ["SEC-KSA-TEL-OP", "SEC-KSA-TEL-ICT"],
  },
  {
    regulatorId: "REG-KSA-MCIT",
    nameEn: "Ministry of Communications & Information Technology",
    nameAr: "وزارة الاتصالات وتقنية المعلومات",
    acronym: "MCIT",
    category: "telecom",
    website: "https://mcit.gov.sa",
    mandateNote: "National ICT policy, digital economy, and cloud-first strategy",
    sectors: ["SEC-KSA-TEL-OP", "SEC-KSA-TEL-ICT", "SEC-KSA-DIGITAL"],
  },
  {
    regulatorId: "REG-KSA-SSC",
    nameEn: "Saudi Space Commission",
    nameAr: "الهيئة السعودية للفضاء",
    acronym: "SSC",
    category: "telecom",
    website: "https://saudispace.gov.sa",
    mandateNote: "Space technology, satellite communications, and orbital asset regulation",
    sectors: ["SEC-KSA-TEL-ICT", "SEC-KSA-SPACE"],
  },
  {
    regulatorId: "REG-KSA-YESSER",
    nameEn: "Yesser e-Government Program",
    nameAr: "برنامج يسّر للتعاملات الإلكترونية الحكومية",
    acronym: "YESSER",
    category: "digital",
    website: "https://yesser.gov.sa",
    mandateNote: "E-government interoperability and integration standards",
    sectors: ["SEC-KSA-GOV-MIN", "SEC-KSA-GOV-AUTH"],
  },
  {
    regulatorId: "REG-KSA-CITC",
    nameEn: "Cloud Computing Regulatory Program",
    nameAr: "البرنامج التنظيمي للحوسبة السحابية",
    acronym: "CITC",
    category: "telecom",
    website: "https://cst.gov.sa",
    mandateNote: "Cloud service provider licensing and data localization enforcement",
    sectors: ["SEC-KSA-TEL-ICT"],
  },
  {
    regulatorId: "REG-KSA-IOT",
    nameEn: "IoT Regulatory Sandbox",
    nameAr: "البيئة التنظيمية التجريبية لإنترنت الأشياء",
    acronym: "IOT",
    category: "telecom",
    website: "https://cst.gov.sa",
    mandateNote: "Internet of Things device certification and spectrum allocation",
    sectors: ["SEC-KSA-TEL-ICT"],
  },
];
