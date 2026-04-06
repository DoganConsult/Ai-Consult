// ============================================
// Shahin AI-KSA GRC — Transport Sector Frameworks
// GACA, Mawani, TGA, SAR
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const GACA_AVIA: FrameworkDef = FW({
  id:"INST-KSA-GACA-AVIA",reg:"REG-KSA-GACA",nEn:"Aviation Cybersecurity Framework",nAr:"إطار الأمن السيبراني للطيران",
  type:"framework",ver:"1.0",verId:"VER-KSA-GACA-AVIA-1-0",
  sectors:["SEC-KSA-TRANS-AVIA"],mandatory:true,
  sumEn:"GACA cybersecurity framework for airports, airlines, and aviation service providers aligned with ICAO Annex 17.",
  sumAr:"إطار الأمن السيبراني للهيئة العامة للطيران المدني للمطارات وشركات الطيران.",
  tags:["aviation","airport","cybersecurity"],
  domains:[
    D("GAVIA-D1","1","Aviation CS Governance","حوكمة الأمن السيبراني للطيران",[
      S("GAVIA-1-1","1.1","Aviation Security Policy","سياسة أمن الطيران",controls([
        ["GAVIA-1.1.1","1.1.1","Aviation CS Policy","سياسة الأمن السيبراني للطيران","Establish aviation-specific cybersecurity policy aligned with ICAO","وضع سياسة أمن سيبراني خاصة بالطيران متوافقة مع إيكاو","critical",false,["document"]],
        ["GAVIA-1.1.2","1.1.2","Aviation Risk Assessment","تقييم مخاطر الطيران","Conduct cybersecurity risk assessment for aviation systems","إجراء تقييم مخاطر الأمن السيبراني لأنظمة الطيران","critical",false,["risk_assessment"]],
        ["GAVIA-1.1.3","1.1.3","Aviation CS Officer","مسؤول أمن الطيران السيبراني","Appoint aviation cybersecurity officer","تعيين مسؤول الأمن السيبراني للطيران","critical",false,["appointment_record"]],
        ["GAVIA-1.1.4","1.1.4","ICAO Compliance","امتثال إيكاو","Comply with ICAO Annex 17 cyber provisions","الامتثال لأحكام الأمن السيبراني في ملحق إيكاو 17","critical",false,["compliance_report"]],
      ])),
    ]),
    D("GAVIA-D2","2","Airport System Security","أمن أنظمة المطارات",[
      S("GAVIA-2-1","2.1","Airport OT Security","أمن OT المطارات",controls([
        ["GAVIA-2.1.1","2.1.1","BHS Security","أمن نظام مناولة الأمتعة","Secure baggage handling system controls","تأمين ضوابط نظام مناولة الأمتعة","critical",true,["system_config"]],
        ["GAVIA-2.1.2","2.1.2","ATC System Security","أمن أنظمة الحركة الجوية","Protect air traffic control communication systems","حماية أنظمة اتصالات مراقبة الحركة الجوية","critical",true,["system_config"]],
        ["GAVIA-2.1.3","2.1.3","Runway Systems","أنظمة المدرج","Secure runway lighting and navigation aid systems","تأمين أنظمة إضاءة المدرج ومساعدات الملاحة","critical",true,["system_config"]],
        ["GAVIA-2.1.4","2.1.4","Airport Building Mgmt","إدارة مباني المطار","Secure BMS (HVAC, fire, access) from cyber threats","تأمين أنظمة إدارة المباني من التهديدات السيبرانية","high",true,["system_config"]],
        ["GAVIA-2.1.5","2.1.5","Passenger Processing","معالجة الركاب","Secure passenger processing systems (check-in, boarding, immigration)","تأمين أنظمة معالجة الركاب","critical",true,["system_config"]],
      ])),
      S("GAVIA-2-2","2.2","Airline System Security","أمن أنظمة الطيران",controls([
        ["GAVIA-2.2.1","2.2.1","EFB Security","أمن الحقيبة الإلكترونية","Secure Electronic Flight Bags","تأمين الحقائب الإلكترونية للطيران","high",true,["system_config"]],
        ["GAVIA-2.2.2","2.2.2","Reservation System","نظام الحجز","Protect reservation and ticketing systems","حماية أنظمة الحجز والتذاكر","critical",true,["system_config"]],
        ["GAVIA-2.2.3","2.2.3","Aircraft Connectivity","اتصال الطائرات","Secure in-flight connectivity and entertainment systems","تأمين أنظمة الاتصال والترفيه على متن الطائرة","high",true,["system_config"]],
        ["GAVIA-2.2.4","2.2.4","Cargo Systems","أنظمة الشحن","Secure air cargo management and tracking systems","تأمين أنظمة إدارة وتتبع الشحن الجوي","high",true,["system_config"]],
      ])),
    ]),
    D("GAVIA-D3","3","Aviation Resilience","مرونة الطيران",[
      S("GAVIA-3-1","3.1","Aviation IR","الاستجابة لحوادث الطيران",controls([
        ["GAVIA-3.1.1","3.1.1","Aviation IR Plan","خطة استجابة الطيران","Aviation-specific cyber incident response plan","خطة استجابة للحوادث السيبرانية خاصة بالطيران","critical",false,["ir_plan"]],
        ["GAVIA-3.1.2","3.1.2","GACA Reporting","الإبلاغ للهيئة","Report aviation cyber incidents to GACA immediately","الإبلاغ عن حوادث الطيران السيبرانية للهيئة فوراً","critical",false,["incident_report"]],
        ["GAVIA-3.1.3","3.1.3","Airport BCP","خطة استمرارية المطار","Airport operations continuity under cyber attack","استمرارية عمليات المطار أثناء الهجمات السيبرانية","critical",false,["bcp_plan"]],
        ["GAVIA-3.1.4","3.1.4","Aviation Cyber Exercise","تمرين سيبراني للطيران","Annual aviation cybersecurity exercise","تمرين سنوي للأمن السيبراني للطيران","high",false,["exercise_report"]],
      ])),
    ]),
  ],
});

export const MAWANI_PORT: FrameworkDef = FW({
  id:"INST-KSA-MAWANI-PORT",reg:"REG-KSA-MAWANI",nEn:"Port Cybersecurity Standards",nAr:"معايير الأمن السيبراني للموانئ",
  type:"standard",ver:"1.0",verId:"VER-KSA-MAWANI-PORT-1-0",
  sectors:["SEC-KSA-TRANS-MARI"],mandatory:true,
  sumEn:"Mawani cybersecurity standards for port operations, terminal systems, and maritime logistics.",
  sumAr:"معايير الأمن السيبراني لموانئ لعمليات الموانئ وأنظمة المحطات واللوجستيات البحرية.",
  tags:["maritime","port","logistics","cybersecurity"],
  domains:[
    D("MPORT-D1","1","Port OT Security","أمن OT الموانئ",[
      S("MPORT-1-1","1.1","Terminal Systems","أنظمة المحطات",controls([
        ["MPORT-1.1.1","1.1.1","TOS Security","أمن نظام تشغيل المحطة","Secure Terminal Operating System","تأمين نظام تشغيل محطة الحاويات","critical",true,["system_config"]],
        ["MPORT-1.1.2","1.1.2","Crane Control","التحكم في الرافعات","Secure crane automation and control systems","تأمين أنظمة أتمتة والتحكم في الرافعات","critical",true,["system_config"]],
        ["MPORT-1.1.3","1.1.3","Gate Systems","أنظمة البوابات","Secure port gate automation and OCR systems","تأمين أنظمة أتمتة بوابات الميناء والتعرف البصري","high",true,["system_config"]],
        ["MPORT-1.1.4","1.1.4","VTS Security","أمن خدمات حركة السفن","Secure Vessel Traffic Services systems","تأمين أنظمة خدمات حركة السفن","critical",true,["system_config"]],
      ])),
      S("MPORT-1-2","1.2","Maritime Communications","الاتصالات البحرية",controls([
        ["MPORT-1.2.1","1.2.1","AIS Security","أمن AIS","Protect AIS (Automatic Identification System) from spoofing","حماية نظام التعريف التلقائي من الانتحال","critical",true,["system_config"]],
        ["MPORT-1.2.2","1.2.2","GMDSS Security","أمن GMDSS","Secure Global Maritime Distress and Safety System","تأمين النظام العالمي للاستغاثة والسلامة البحرية","critical",true,["system_config"]],
        ["MPORT-1.2.3","1.2.3","Ship-Shore Interface","واجهة السفينة-الشاطئ","Secure ship-shore data exchange","تأمين تبادل البيانات بين السفينة والشاطئ","high",true,["system_config"]],
      ])),
    ]),
    D("MPORT-D2","2","Port Logistics Security","أمن لوجستيات الموانئ",[
      S("MPORT-2-1","2.1","Supply Chain","سلسلة التوريد",controls([
        ["MPORT-2.1.1","2.1.1","Cargo Tracking","تتبع الشحنات","Secure cargo tracking and manifest systems","تأمين أنظمة تتبع الشحنات والبيانات","critical",true,["system_config"]],
        ["MPORT-2.1.2","2.1.2","Customs Integration","تكامل الجمارك","Secure integration with ZATCA customs systems","التكامل الآمن مع أنظمة الجمارك لهيئة الزكاة","critical",true,["system_config"]],
        ["MPORT-2.1.3","2.1.3","Single Window","النافذة الواحدة","Secure single window maritime trade platform","تأمين منصة النافذة الواحدة للتجارة البحرية","high",true,["system_config"]],
        ["MPORT-2.1.4","2.1.4","ISPS Code","رمز ISPS","Comply with ISPS Code cybersecurity requirements","الامتثال لمتطلبات الأمن السيبراني لرمز ISPS","critical",false,["compliance_report"]],
      ])),
    ]),
    D("MPORT-D3","3","Port Resilience","مرونة الموانئ",[
      S("MPORT-3-1","3.1","Port Continuity","استمرارية الموانئ",controls([
        ["MPORT-3.1.1","3.1.1","Port BCP","خطة استمرارية الميناء","Port operations BCP under cyber attack","خطة استمرارية عمليات الميناء أثناء الهجمات السيبرانية","critical",false,["bcp_plan"]],
        ["MPORT-3.1.2","3.1.2","Mawani Reporting","الإبلاغ لموانئ","Report port cyber incidents to Mawani","الإبلاغ عن حوادث الميناء السيبرانية لموانئ","critical",false,["incident_report"]],
        ["MPORT-3.1.3","3.1.3","Manual Operations","العمليات اليدوية","Procedures for manual port operations during IT failure","إجراءات العمليات اليدوية للميناء أثناء فشل تقنية المعلومات","critical",false,["document"]],
      ])),
    ]),
  ],
});

export const TGA_LAND: FrameworkDef = FW({
  id:"INST-KSA-TGA-LAND",reg:"REG-KSA-TGA",nEn:"Land Transport Cybersecurity Standards",nAr:"معايير الأمن السيبراني للنقل البري",
  type:"standard",ver:"1.0",verId:"VER-KSA-TGA-LAND-1-0",
  sectors:["SEC-KSA-TRANS-LOG","SEC-KSA-TRANS-RAIL"],mandatory:true,
  sumEn:"TGA cybersecurity standards for land transport, logistics, and railway operations.",
  sumAr:"معايير الأمن السيبراني للهيئة العامة للنقل للنقل البري واللوجستيات والسكك الحديدية.",
  tags:["transport","logistics","railway","cybersecurity"],
  domains:[
    D("TLAND-D1","1","Transport Systems","أنظمة النقل",[
      S("TLAND-1-1","1.1","Fleet Management","إدارة الأسطول",controls([
        ["TLAND-1.1.1","1.1.1","Fleet Telematics","تليماتيكس الأسطول","Secure fleet telematics and GPS tracking systems","تأمين أنظمة تليماتيكس الأسطول وتتبع GPS","high",true,["system_config"]],
        ["TLAND-1.1.2","1.1.2","Driver Systems","أنظمة السائقين","Secure driver management and digital tachograph systems","تأمين أنظمة إدارة السائقين والتاكوغراف الرقمي","high",true,["system_config"]],
        ["TLAND-1.1.3","1.1.3","Connected Vehicle","المركبات المتصلة","Secure V2X (vehicle-to-everything) communications","تأمين اتصالات V2X","high",true,["system_config"]],
      ])),
      S("TLAND-1-2","1.2","Railway Systems","أنظمة السكك الحديدية",controls([
        ["TLAND-1.2.1","1.2.1","Signaling Security","أمن الإشارات","Secure railway signaling systems (ETCS, CBTC)","تأمين أنظمة إشارات السكك الحديدية","critical",true,["system_config"]],
        ["TLAND-1.2.2","1.2.2","Train Control","التحكم في القطارات","Secure train control and management systems","تأمين أنظمة التحكم في القطارات وإدارتها","critical",true,["system_config"]],
        ["TLAND-1.2.3","1.2.3","Station Systems","أنظمة المحطات","Secure station automation and passenger information","تأمين أتمتة المحطات ومعلومات الركاب","high",true,["system_config"]],
        ["TLAND-1.2.4","1.2.4","Railway SCADA","SCADA السكك الحديدية","Secure railway SCADA for power and traction systems","تأمين SCADA للسكك الحديدية لأنظمة الطاقة والجر","critical",true,["system_config"]],
      ])),
    ]),
    D("TLAND-D2","2","Logistics Platforms","منصات اللوجستيات",[
      S("TLAND-2-1","2.1","Digital Logistics","اللوجستيات الرقمية",controls([
        ["TLAND-2.1.1","2.1.1","TMS Security","أمن نظام إدارة النقل","Secure Transport Management Systems","تأمين أنظمة إدارة النقل","high",true,["system_config"]],
        ["TLAND-2.1.2","2.1.2","WMS Security","أمن نظام إدارة المستودعات","Secure Warehouse Management Systems","تأمين أنظمة إدارة المستودعات","high",true,["system_config"]],
        ["TLAND-2.1.3","2.1.3","Last Mile","الميل الأخير","Secure last-mile delivery platform and driver apps","تأمين منصة التوصيل في الميل الأخير وتطبيقات السائقين","medium",true,["system_config"]],
        ["TLAND-2.1.4","2.1.4","IoT Sensors","مستشعرات IoT","Secure IoT sensors for cold chain and cargo monitoring","تأمين مستشعرات IoT لمراقبة سلسلة التبريد والشحن","high",true,["system_config"]],
      ])),
    ]),
  ],
});

export const TRANSPORT_FRAMEWORKS: FrameworkDef[] = [GACA_AVIA, MAWANI_PORT, TGA_LAND];
