// ============================================
// Shahin AI-KSA GRC — Environment Sector Frameworks
// MEWA, NCM, NCWCD
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const MEWA_ENV: FrameworkDef = FW({
  id:"INST-KSA-MEWA-ENV",reg:"REG-KSA-MEWA",nEn:"Environmental Compliance & Monitoring Standards",nAr:"معايير الامتثال والمراقبة البيئية",
  type:"standard",ver:"1.0",verId:"VER-KSA-MEWA-ENV-1-0",
  sectors:["SEC-KSA-AGRI","SEC-KSA-ENERGY-WATER","SEC-KSA-INDUSTRY"],mandatory:true,
  sumEn:"MEWA environmental compliance standards including emissions monitoring, water quality, and environmental data governance.",
  sumAr:"معايير الامتثال البيئي لوزارة البيئة والمياه والزراعة.",
  tags:["environment","water","agriculture","monitoring"],
  domains:[
    D("MENV-D1","1","Environmental Monitoring","المراقبة البيئية",[
      S("MENV-1-1","1.1","Monitoring Systems","أنظمة المراقبة",controls([
        ["MENV-1.1.1","1.1.1","CEMS Security","أمن أنظمة المراقبة المستمرة","Secure Continuous Emissions Monitoring Systems","تأمين أنظمة المراقبة المستمرة للانبعاثات","critical",true,["system_config"]],
        ["MENV-1.1.2","1.1.2","Water Quality Sensors","مستشعرات جودة المياه","Secure water quality IoT monitoring sensors","تأمين مستشعرات IoT لمراقبة جودة المياه","high",true,["system_config"]],
        ["MENV-1.1.3","1.1.3","Environmental Data Integrity","سلامة البيانات البيئية","Ensure integrity of environmental monitoring data","ضمان سلامة بيانات المراقبة البيئية","critical",true,["integrity_report"]],
        ["MENV-1.1.4","1.1.4","Reporting Compliance","امتثال التقارير","Automated environmental reporting to MEWA","التقارير البيئية الآلية لوزارة البيئة","critical",true,["report"]],
      ])),
      S("MENV-1-2","1.2","Agricultural Systems","الأنظمة الزراعية",controls([
        ["MENV-1.2.1","1.2.1","Precision Agriculture","الزراعة الدقيقة","Secure precision agriculture IoT and drone systems","تأمين أنظمة IoT والطائرات المسيرة للزراعة الدقيقة","high",true,["system_config"]],
        ["MENV-1.2.2","1.2.2","Irrigation SCADA","SCADA الري","Secure irrigation SCADA and water distribution systems","تأمين أنظمة SCADA للري وتوزيع المياه","critical",true,["system_config"]],
        ["MENV-1.2.3","1.2.3","Food Traceability","تتبع الغذاء","Secure food supply chain traceability systems","تأمين أنظمة تتبع سلسلة الإمداد الغذائي","high",true,["system_config"]],
        ["MENV-1.2.4","1.2.4","Livestock Tracking","تتبع الماشية","Secure livestock tracking and health monitoring","تأمين تتبع الماشية ومراقبة الصحة","medium",true,["system_config"]],
      ])),
    ]),
    D("MENV-D2","2","Environmental Data","البيانات البيئية",[
      S("MENV-2-1","2.1","Data Governance","حوكمة البيانات",controls([
        ["MENV-2.1.1","2.1.1","Environmental Data Catalogue","كتالوج البيانات البيئية","Maintain environmental data catalogue per NDMO standards","الحفاظ على كتالوج البيانات البيئية وفقاً لمعايير NDMO","high",true,["data_catalogue"]],
        ["MENV-2.1.2","2.1.2","Climate Data Sharing","مشاركة بيانات المناخ","Secure sharing of climate and weather data","المشاركة الآمنة لبيانات المناخ والطقس","high",true,["system_config"]],
        ["MENV-2.1.3","2.1.3","GIS Data Protection","حماية بيانات GIS","Protect geospatial environmental data","حماية البيانات الجغرافية المكانية البيئية","high",true,["system_config"]],
        ["MENV-2.1.4","2.1.4","Carbon Tracking","تتبع الكربون","Secure carbon emissions tracking and reporting systems","تأمين أنظمة تتبع والإبلاغ عن انبعاثات الكربون","high",true,["system_config"]],
      ])),
    ]),
  ],
});

export const ENVIRONMENT_FRAMEWORKS: FrameworkDef[] = [MEWA_ENV];
