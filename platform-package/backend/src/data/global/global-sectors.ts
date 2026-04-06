import { SectorDef } from "./ksa-sectors";

export const GLOBAL_SECTORS: SectorDef[] = [

  // ═══════════════════════════════════════════════════════════════
  // UAE — United Arab Emirates
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-UAE-GOV", nameEn: "UAE Government & Federal Entities", nameAr: "الجهات الحكومية والاتحادية الإماراتية", applicableRegulators: ["REG-UAE-TDRA","REG-UAE-NESA","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-NESA-IAS","INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-FIN-BANK", nameEn: "UAE Banking", nameAr: "القطاع المصرفي الإماراتي", applicableRegulators: ["REG-UAE-CBUAE","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-CBUAE-CIRM","INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-FIN-INS", nameEn: "UAE Insurance", nameAr: "قطاع التأمين الإماراتي", applicableRegulators: ["REG-UAE-CBUAE","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-CBUAE-CIRM","INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-FIN-CAPITAL", nameEn: "UAE Capital Markets", nameAr: "أسواق المال الإماراتية", applicableRegulators: ["REG-UAE-SCA","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-FIN-FINTECH", nameEn: "UAE FinTech", nameAr: "التقنية المالية الإماراتية", applicableRegulators: ["REG-UAE-CBUAE","REG-UAE-TDRA","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-CBUAE-CIRM","INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-FIN-FREEZONE", nameEn: "UAE Financial Free Zones (ADGM/DIFC)", nameAr: "المناطق المالية الحرة الإماراتية", applicableRegulators: ["REG-UAE-ADGM-FSRA","REG-UAE-ADGM-DP","REG-UAE-DIFC-DFSA","REG-UAE-DIFC-DP"], applicableFrameworks: ["INST-UAE-ADGM-DPR","INST-UAE-DIFC-DPL"] },
  { sectorId: "SEC-UAE-HEALTH", nameEn: "UAE Healthcare", nameAr: "القطاع الصحي الإماراتي", applicableRegulators: ["REG-UAE-DOH","REG-UAE-DHA","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-TELECOM", nameEn: "UAE Telecommunications", nameAr: "قطاع الاتصالات الإماراتي", applicableRegulators: ["REG-UAE-TDRA","REG-UAE-NESA"], applicableFrameworks: ["INST-UAE-NESA-IAS","INST-UAE-FPDL","INST-UAE-TDRA-CSS"] },
  { sectorId: "SEC-UAE-ENERGY", nameEn: "UAE Energy & Utilities", nameAr: "قطاع الطاقة والمرافق الإماراتي", applicableRegulators: ["REG-UAE-NESA","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-NESA-IAS","INST-UAE-FPDL"] },
  { sectorId: "SEC-UAE-TECH", nameEn: "UAE Technology & Digital", nameAr: "قطاع التكنولوجيا والرقمنة الإماراتي", applicableRegulators: ["REG-UAE-TDRA","REG-UAE-ICP"], applicableFrameworks: ["INST-UAE-FPDL","INST-UAE-TDRA-CSS"] },

  // ═══════════════════════════════════════════════════════════════
  // BAHRAIN
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-BHR-GOV", nameEn: "Bahrain Government", nameAr: "الجهات الحكومية البحرينية", applicableRegulators: ["REG-BHR-NCEA","REG-BHR-PDPA","REG-BHR-IGA"], applicableFrameworks: ["INST-BHR-NCEA-CSF","INST-BHR-PDPL"] },
  { sectorId: "SEC-BHR-FIN-BANK", nameEn: "Bahrain Banking", nameAr: "القطاع المصرفي البحريني", applicableRegulators: ["REG-BHR-CBB","REG-BHR-PDPA"], applicableFrameworks: ["INST-BHR-CBB-CIRM","INST-BHR-PDPL"] },
  { sectorId: "SEC-BHR-FIN-INS", nameEn: "Bahrain Insurance", nameAr: "قطاع التأمين البحريني", applicableRegulators: ["REG-BHR-CBB","REG-BHR-PDPA"], applicableFrameworks: ["INST-BHR-CBB-CIRM","INST-BHR-PDPL"] },
  { sectorId: "SEC-BHR-FIN-CAPITAL", nameEn: "Bahrain Capital Markets", nameAr: "أسواق المال البحرينية", applicableRegulators: ["REG-BHR-CBB","REG-BHR-PDPA"], applicableFrameworks: ["INST-BHR-PDPL"] },
  { sectorId: "SEC-BHR-HEALTH", nameEn: "Bahrain Healthcare", nameAr: "القطاع الصحي البحريني", applicableRegulators: ["REG-BHR-NHRA","REG-BHR-PDPA"], applicableFrameworks: ["INST-BHR-PDPL"] },
  { sectorId: "SEC-BHR-TELECOM", nameEn: "Bahrain Telecommunications", nameAr: "قطاع الاتصالات البحريني", applicableRegulators: ["REG-BHR-TRA","REG-BHR-NCEA"], applicableFrameworks: ["INST-BHR-NCEA-CSF","INST-BHR-PDPL"] },

  // ═══════════════════════════════════════════════════════════════
  // KUWAIT
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-KWT-GOV", nameEn: "Kuwait Government", nameAr: "الجهات الحكومية الكويتية", applicableRegulators: ["REG-KWT-CITRA"], applicableFrameworks: ["INST-KWT-CITRA-CSF","INST-KWT-DPL"] },
  { sectorId: "SEC-KWT-FIN-BANK", nameEn: "Kuwait Banking", nameAr: "القطاع المصرفي الكويتي", applicableRegulators: ["REG-KWT-CBK","REG-KWT-CITRA"], applicableFrameworks: ["INST-KWT-CBK-CIRM","INST-KWT-DPL"] },
  { sectorId: "SEC-KWT-FIN-INS", nameEn: "Kuwait Insurance", nameAr: "قطاع التأمين الكويتي", applicableRegulators: ["REG-KWT-CBK"], applicableFrameworks: ["INST-KWT-DPL"] },
  { sectorId: "SEC-KWT-FIN-CAPITAL", nameEn: "Kuwait Capital Markets", nameAr: "أسواق المال الكويتية", applicableRegulators: ["REG-KWT-CMA"], applicableFrameworks: ["INST-KWT-DPL"] },
  { sectorId: "SEC-KWT-HEALTH", nameEn: "Kuwait Healthcare", nameAr: "القطاع الصحي الكويتي", applicableRegulators: ["REG-KWT-MOH"], applicableFrameworks: ["INST-KWT-DPL"] },
  { sectorId: "SEC-KWT-ENERGY", nameEn: "Kuwait Energy", nameAr: "قطاع الطاقة الكويتي", applicableRegulators: ["REG-KWT-EPA","REG-KWT-CITRA"], applicableFrameworks: ["INST-KWT-CITRA-CSF","INST-KWT-DPL"] },
  { sectorId: "SEC-KWT-INDUSTRY", nameEn: "Kuwait Industry", nameAr: "القطاع الصناعي الكويتي", applicableRegulators: ["REG-KWT-EPA","REG-KWT-CITRA"], applicableFrameworks: ["INST-KWT-DPL"] },

  // ═══════════════════════════════════════════════════════════════
  // OMAN
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-OMN-GOV", nameEn: "Oman Government", nameAr: "الجهات الحكومية العمانية", applicableRegulators: ["REG-OMN-ITA","REG-OMN-TRA"], applicableFrameworks: ["INST-OMN-PDPL","INST-OMN-ITA-EGOV"] },
  { sectorId: "SEC-OMN-FIN-BANK", nameEn: "Oman Banking", nameAr: "القطاع المصرفي العماني", applicableRegulators: ["REG-OMN-CBO","REG-OMN-TRA"], applicableFrameworks: ["INST-OMN-CBO-CIRM","INST-OMN-PDPL"] },
  { sectorId: "SEC-OMN-FIN-INS", nameEn: "Oman Insurance", nameAr: "قطاع التأمين العماني", applicableRegulators: ["REG-OMN-CBO"], applicableFrameworks: ["INST-OMN-PDPL"] },
  { sectorId: "SEC-OMN-FIN-CAPITAL", nameEn: "Oman Capital Markets", nameAr: "أسواق المال العمانية", applicableRegulators: ["REG-OMN-CMA"], applicableFrameworks: ["INST-OMN-PDPL"] },
  { sectorId: "SEC-OMN-TECH", nameEn: "Oman Technology", nameAr: "قطاع التكنولوجيا العماني", applicableRegulators: ["REG-OMN-OPAL","REG-OMN-TRA"], applicableFrameworks: ["INST-OMN-PDPL"] },

  // ═══════════════════════════════════════════════════════════════
  // QATAR
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-QAT-GOV", nameEn: "Qatar Government", nameAr: "الجهات الحكومية القطرية", applicableRegulators: ["REG-QAT-CRA","REG-QAT-QDPA","REG-QAT-MOTC"], applicableFrameworks: ["INST-QAT-NIA","INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-FIN-BANK", nameEn: "Qatar Banking", nameAr: "القطاع المصرفي القطري", applicableRegulators: ["REG-QAT-QCB","REG-QAT-QDPA"], applicableFrameworks: ["INST-QAT-QCB-CIRM","INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-FIN-INS", nameEn: "Qatar Insurance", nameAr: "قطاع التأمين القطري", applicableRegulators: ["REG-QAT-QCB","REG-QAT-QDPA"], applicableFrameworks: ["INST-QAT-QCB-CIRM","INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-FIN-FINTECH", nameEn: "Qatar FinTech", nameAr: "التقنية المالية القطرية", applicableRegulators: ["REG-QAT-QCB","REG-QAT-CRA"], applicableFrameworks: ["INST-QAT-QCB-CIRM","INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-FIN-CAPITAL", nameEn: "Qatar Capital Markets", nameAr: "أسواق المال القطرية", applicableRegulators: ["REG-QAT-QSE","REG-QAT-QDPA"], applicableFrameworks: ["INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-FIN-FREEZONE", nameEn: "Qatar Financial Centre (QFC)", nameAr: "مركز قطر للمال", applicableRegulators: ["REG-QAT-QFCRA","REG-QAT-QDPA"], applicableFrameworks: ["INST-QAT-QFCRA-DP","INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-HEALTH", nameEn: "Qatar Healthcare", nameAr: "القطاع الصحي القطري", applicableRegulators: ["REG-QAT-MOPH","REG-QAT-QDPA"], applicableFrameworks: ["INST-QAT-PDPL"] },
  { sectorId: "SEC-QAT-TELECOM", nameEn: "Qatar Telecommunications", nameAr: "قطاع الاتصالات القطري", applicableRegulators: ["REG-QAT-CRA","REG-QAT-MOTC"], applicableFrameworks: ["INST-QAT-NIA","INST-QAT-PDPL"] },

  // ═══════════════════════════════════════════════════════════════
  // EGYPT
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-EGY-GOV", nameEn: "Egypt Government", nameAr: "الجهات الحكومية المصرية", applicableRegulators: ["REG-EGY-MCIT","REG-EGY-NCCSI","REG-EGY-DPA"], applicableFrameworks: ["INST-EGY-NCCSI-CSF","INST-EGY-PDPL"] },
  { sectorId: "SEC-EGY-FIN-BANK", nameEn: "Egypt Banking", nameAr: "القطاع المصرفي المصري", applicableRegulators: ["REG-EGY-CBE","REG-EGY-DPA"], applicableFrameworks: ["INST-EGY-CBE-CIRM","INST-EGY-PDPL"] },
  { sectorId: "SEC-EGY-FIN-FINTECH", nameEn: "Egypt FinTech", nameAr: "التقنية المالية المصرية", applicableRegulators: ["REG-EGY-CBE","REG-EGY-DPA"], applicableFrameworks: ["INST-EGY-CBE-CIRM","INST-EGY-PDPL"] },
  { sectorId: "SEC-EGY-FIN-INS", nameEn: "Egypt Insurance", nameAr: "قطاع التأمين المصري", applicableRegulators: ["REG-EGY-FRA","REG-EGY-DPA"], applicableFrameworks: ["INST-EGY-PDPL"] },
  { sectorId: "SEC-EGY-FIN-CAPITAL", nameEn: "Egypt Capital Markets", nameAr: "أسواق المال المصرية", applicableRegulators: ["REG-EGY-FRA","REG-EGY-EGX","REG-EGY-DPA"], applicableFrameworks: ["INST-EGY-FRA-GOV","INST-EGY-PDPL"] },
  { sectorId: "SEC-EGY-HEALTH", nameEn: "Egypt Healthcare", nameAr: "القطاع الصحي المصري", applicableRegulators: ["REG-EGY-MOH","REG-EGY-DPA"], applicableFrameworks: ["INST-EGY-PDPL"] },
  { sectorId: "SEC-EGY-TELECOM", nameEn: "Egypt Telecommunications", nameAr: "قطاع الاتصالات المصري", applicableRegulators: ["REG-EGY-NTRA","REG-EGY-MCIT"], applicableFrameworks: ["INST-EGY-NCCSI-CSF","INST-EGY-PDPL"] },

  // ═══════════════════════════════════════════════════════════════
  // TURKEY
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-TUR-GOV", nameEn: "Turkey Government", nameAr: "الجهات الحكومية التركية", applicableRegulators: ["REG-TUR-BTK","REG-TUR-KVKK"], applicableFrameworks: ["INST-TUR-BTK-CSF","INST-TUR-KVKK"] },
  { sectorId: "SEC-TUR-FIN-BANK", nameEn: "Turkey Banking", nameAr: "القطاع المصرفي التركي", applicableRegulators: ["REG-TUR-BDDK","REG-TUR-TCMB","REG-TUR-KVKK"], applicableFrameworks: ["INST-TUR-BDDK-CIRM","INST-TUR-KVKK"] },
  { sectorId: "SEC-TUR-FIN-FINTECH", nameEn: "Turkey FinTech", nameAr: "التقنية المالية التركية", applicableRegulators: ["REG-TUR-TCMB","REG-TUR-KVKK"], applicableFrameworks: ["INST-TUR-KVKK"] },
  { sectorId: "SEC-TUR-FIN-INS", nameEn: "Turkey Insurance", nameAr: "قطاع التأمين التركي", applicableRegulators: ["REG-TUR-SEDDK","REG-TUR-KVKK"], applicableFrameworks: ["INST-TUR-KVKK"] },
  { sectorId: "SEC-TUR-FIN-CAPITAL", nameEn: "Turkey Capital Markets", nameAr: "أسواق المال التركية", applicableRegulators: ["REG-TUR-SPK","REG-TUR-KVKK"], applicableFrameworks: ["INST-TUR-SPK-GOV","INST-TUR-KVKK"] },
  { sectorId: "SEC-TUR-HEALTH", nameEn: "Turkey Healthcare", nameAr: "القطاع الصحي التركي", applicableRegulators: ["REG-TUR-HSK","REG-TUR-KVKK"], applicableFrameworks: ["INST-TUR-KVKK"] },

  // ═══════════════════════════════════════════════════════════════
  // EUROPE — EU-Wide + Key National
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-EU-GOV", nameEn: "EU Government & Public Sector", nameAr: "القطاع الحكومي والعام الأوروبي", applicableRegulators: ["REG-EU-EDPB","REG-EU-ENISA"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-NIS2"] },
  { sectorId: "SEC-EU-FIN-BANK", nameEn: "EU Banking", nameAr: "القطاع المصرفي الأوروبي", applicableRegulators: ["REG-EU-EBA","REG-EU-EDPB"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-DORA","INST-EU-NIS2"] },
  { sectorId: "SEC-EU-FIN-INS", nameEn: "EU Insurance", nameAr: "قطاع التأمين الأوروبي", applicableRegulators: ["REG-EU-EBA","REG-EU-EDPB"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-DORA"] },
  { sectorId: "SEC-EU-FIN-CAPITAL", nameEn: "EU Capital Markets", nameAr: "أسواق المال الأوروبية", applicableRegulators: ["REG-EU-ESMA","REG-EU-EDPB"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-DORA"] },
  { sectorId: "SEC-EU-TECH", nameEn: "EU Technology & AI", nameAr: "قطاع التكنولوجيا والذكاء الاصطناعي الأوروبي", applicableRegulators: ["REG-EU-EC-AI","REG-EU-EDPB","REG-EU-ENISA"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-AI-ACT","INST-EU-NIS2"] },
  { sectorId: "SEC-EU-HEALTH", nameEn: "EU Healthcare", nameAr: "القطاع الصحي الأوروبي", applicableRegulators: ["REG-EU-EDPB","REG-EU-ENISA"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-NIS2"] },

  // UK
  { sectorId: "SEC-GBR-FIN-BANK", nameEn: "UK Banking", nameAr: "القطاع المصرفي البريطاني", applicableRegulators: ["REG-GBR-FCA","REG-GBR-ICO"], applicableFrameworks: ["INST-GBR-UKGDPR","INST-GBR-FCA-SYSC"] },
  { sectorId: "SEC-GBR-FIN-INS", nameEn: "UK Insurance", nameAr: "قطاع التأمين البريطاني", applicableRegulators: ["REG-GBR-FCA","REG-GBR-ICO"], applicableFrameworks: ["INST-GBR-UKGDPR","INST-GBR-FCA-SYSC"] },
  { sectorId: "SEC-GBR-FIN-CAPITAL", nameEn: "UK Capital Markets", nameAr: "أسواق المال البريطانية", applicableRegulators: ["REG-GBR-FCA","REG-GBR-ICO"], applicableFrameworks: ["INST-GBR-UKGDPR","INST-GBR-FCA-SYSC"] },
  { sectorId: "SEC-GBR-GOV", nameEn: "UK Government", nameAr: "القطاع الحكومي البريطاني", applicableRegulators: ["REG-GBR-ICO","REG-GBR-NCSC"], applicableFrameworks: ["INST-GBR-UKGDPR","INST-GBR-CYBERESSENTIALS"] },
  { sectorId: "SEC-GBR-TECH", nameEn: "UK Technology", nameAr: "قطاع التكنولوجيا البريطاني", applicableRegulators: ["REG-GBR-ICO","REG-GBR-NCSC"], applicableFrameworks: ["INST-GBR-UKGDPR","INST-GBR-CYBERESSENTIALS"] },

  // Germany
  { sectorId: "SEC-DEU-GOV", nameEn: "Germany Government", nameAr: "القطاع الحكومي الألماني", applicableRegulators: ["REG-DEU-BSI","REG-EU-EDPB"], applicableFrameworks: ["INST-DEU-BSIG","INST-EU-GDPR","INST-EU-NIS2"] },
  { sectorId: "SEC-DEU-FIN", nameEn: "Germany Financial Services", nameAr: "الخدمات المالية الألمانية", applicableRegulators: ["REG-DEU-BAFIN","REG-EU-EBA","REG-EU-EDPB"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-DORA","INST-DEU-BSIG"] },

  // France
  { sectorId: "SEC-FRA-GOV", nameEn: "France Government", nameAr: "القطاع الحكومي الفرنسي", applicableRegulators: ["REG-FRA-ANSSI","REG-FRA-CNIL"], applicableFrameworks: ["INST-EU-GDPR","INST-EU-NIS2"] },

  // ═══════════════════════════════════════════════════════════════
  // UNITED STATES
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-USA-GOV", nameEn: "US Federal Government", nameAr: "الحكومة الفيدرالية الأمريكية", applicableRegulators: ["REG-USA-NIST","REG-USA-CISA","REG-USA-FEDRAMP"], applicableFrameworks: ["INST-USA-NIST-SP800-53","INST-USA-FEDRAMP","INST-USA-NIST-CSF2"] },
  { sectorId: "SEC-USA-FIN-BANK", nameEn: "US Banking", nameAr: "القطاع المصرفي الأمريكي", applicableRegulators: ["REG-USA-FED","REG-USA-OCC","REG-USA-FTC"], applicableFrameworks: ["INST-USA-GLBA","INST-USA-FFIEC","INST-USA-NIST-CSF2"] },
  { sectorId: "SEC-USA-FIN-CAPITAL", nameEn: "US Capital Markets", nameAr: "أسواق المال الأمريكية", applicableRegulators: ["REG-USA-SEC","REG-USA-FTC"], applicableFrameworks: ["INST-USA-SOX","INST-USA-SEC-CYBER","INST-USA-NIST-CSF2"] },
  { sectorId: "SEC-USA-HEALTH", nameEn: "US Healthcare", nameAr: "القطاع الصحي الأمريكي", applicableRegulators: ["REG-USA-HHS-OCR","REG-USA-FTC"], applicableFrameworks: ["INST-USA-HIPAA","INST-USA-NIST-CSF2"] },
  { sectorId: "SEC-USA-DEFENSE", nameEn: "US Defense & Contractors", nameAr: "الدفاع والمقاولين الأمريكيين", applicableRegulators: ["REG-USA-DOD","REG-USA-NIST","REG-USA-CISA"], applicableFrameworks: ["INST-USA-CMMC","INST-USA-NIST-SP800-53","INST-USA-NIST-CSF2"] },
  { sectorId: "SEC-USA-CLOUD", nameEn: "US Cloud Services", nameAr: "خدمات السحابة الأمريكية", applicableRegulators: ["REG-USA-FEDRAMP","REG-USA-NIST","REG-USA-FTC"], applicableFrameworks: ["INST-USA-FEDRAMP","INST-USA-NIST-CSF2"] },
  { sectorId: "SEC-USA-TECH", nameEn: "US Technology", nameAr: "قطاع التكنولوجيا الأمريكي", applicableRegulators: ["REG-USA-FTC","REG-USA-CPPA","REG-USA-NIST"], applicableFrameworks: ["INST-USA-CCPA","INST-USA-NIST-CSF2"] },

  // ═══════════════════════════════════════════════════════════════
  // AUSTRALIA
  // ═══════════════════════════════════════════════════════════════
  { sectorId: "SEC-AUS-GOV", nameEn: "Australia Government", nameAr: "القطاع الحكومي الأسترالي", applicableRegulators: ["REG-AUS-ASD","REG-AUS-ACSC","REG-AUS-DTA","REG-AUS-OAIC"], applicableFrameworks: ["INST-AUS-ISM","INST-AUS-ESSENTIAL8","INST-AUS-PRIVACY-ACT"] },
  { sectorId: "SEC-AUS-FIN-BANK", nameEn: "Australia Banking", nameAr: "القطاع المصرفي الأسترالي", applicableRegulators: ["REG-AUS-APRA","REG-AUS-OAIC","REG-AUS-ACSC"], applicableFrameworks: ["INST-AUS-CPS234","INST-AUS-PRIVACY-ACT","INST-AUS-ESSENTIAL8"] },
  { sectorId: "SEC-AUS-FIN-INS", nameEn: "Australia Insurance", nameAr: "قطاع التأمين الأسترالي", applicableRegulators: ["REG-AUS-APRA","REG-AUS-OAIC"], applicableFrameworks: ["INST-AUS-CPS234","INST-AUS-PRIVACY-ACT"] },
  { sectorId: "SEC-AUS-FIN-CAPITAL", nameEn: "Australia Capital Markets", nameAr: "أسواق المال الأسترالية", applicableRegulators: ["REG-AUS-ASIC","REG-AUS-OAIC"], applicableFrameworks: ["INST-AUS-ASIC-RG271","INST-AUS-PRIVACY-ACT"] },
  { sectorId: "SEC-AUS-DEFENSE", nameEn: "Australia Defense", nameAr: "قطاع الدفاع الأسترالي", applicableRegulators: ["REG-AUS-ASD","REG-AUS-ACSC"], applicableFrameworks: ["INST-AUS-ISM","INST-AUS-ESSENTIAL8"] },
  { sectorId: "SEC-AUS-HEALTH", nameEn: "Australia Healthcare", nameAr: "القطاع الصحي الأسترالي", applicableRegulators: ["REG-AUS-OAIC"], applicableFrameworks: ["INST-AUS-PRIVACY-ACT"] },
];
