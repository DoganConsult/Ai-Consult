// ============================================
// Shahin AI-KSA GRC — Energy Sector Frameworks
// ECRA, WERA, KACARE, MEIM
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const ECRA_GRID: FrameworkDef = FW({
  id:"INST-KSA-ECRA-GRID",reg:"REG-KSA-ECRA",nEn:"Electricity Grid Cybersecurity Standards",nAr:"معايير الأمن السيبراني لشبكة الكهرباء",
  type:"standard",ver:"1.0",verId:"VER-KSA-ECRA-GRID-1-0",
  sectors:["SEC-KSA-ENERGY-ELEC"],mandatory:true,
  sumEn:"ECRA cybersecurity standards for electricity generation, transmission, and distribution operators.",
  sumAr:"معايير الأمن السيبراني لهيئة تنظيم الكهرباء لمشغلي التوليد والنقل والتوزيع.",
  tags:["electricity","grid","ot","scada"],
  domains:[
    D("EGRD-D1","1","Grid OT Governance","حوكمة OT للشبكة",[
      S("EGRD-1-1","1.1","Grid Security Policy","سياسة أمن الشبكة",controls([
        ["EGRD-1.1.1","1.1.1","Grid CS Policy","سياسة الأمن السيبراني للشبكة","Establish grid-specific cybersecurity policy","وضع سياسة أمن سيبراني خاصة بشبكة الكهرباء","critical",false,["document"]],
        ["EGRD-1.1.2","1.1.2","NERC CIP Alignment","محاذاة NERC CIP","Align with NERC CIP standards where applicable","المحاذاة مع معايير NERC CIP حيثما أمكن","high",false,["compliance_report"]],
        ["EGRD-1.1.3","1.1.3","Grid Risk Assessment","تقييم مخاطر الشبكة","Conduct grid-specific cybersecurity risk assessment","إجراء تقييم مخاطر الأمن السيبراني الخاص بالشبكة","critical",false,["risk_assessment"]],
        ["EGRD-1.1.4","1.1.4","Grid Roles","أدوار أمن الشبكة","Define grid cybersecurity roles and responsibilities","تحديد أدوار ومسؤوليات الأمن السيبراني للشبكة","critical",false,["document","org_chart"]],
      ])),
      S("EGRD-1-2","1.2","Grid Asset Management","إدارة أصول الشبكة",controls([
        ["EGRD-1.2.1","1.2.1","BES Cyber Asset ID","تحديد الأصول السيبرانية BES","Identify Bulk Electric System cyber assets","تحديد الأصول السيبرانية لنظام الكهرباء الجماعي","critical",true,["asset_register"]],
        ["EGRD-1.2.2","1.2.2","SCADA Inventory","جرد SCADA","Maintain inventory of all SCADA/EMS systems","الحفاظ على جرد لجميع أنظمة SCADA/EMS","critical",true,["asset_register"]],
        ["EGRD-1.2.3","1.2.3","Substation Assets","أصول المحطات الفرعية","Inventory all substation automation and protection devices","جرد جميع أجهزة الأتمتة والحماية في المحطات الفرعية","critical",true,["asset_register"]],
      ])),
    ]),
    D("EGRD-D2","2","Grid Protection","حماية الشبكة",[
      S("EGRD-2-1","2.1","SCADA Security","أمن SCADA",controls([
        ["EGRD-2.1.1","2.1.1","SCADA Network Isolation","عزل شبكة SCADA","Isolate SCADA networks from corporate IT","عزل شبكات SCADA عن تقنية المعلومات المؤسسية","critical",true,["network_diagram"]],
        ["EGRD-2.1.2","2.1.2","RTU/IED Security","أمن RTU/IED","Secure RTUs and Intelligent Electronic Devices","تأمين وحدات الاتصال عن بعد والأجهزة الإلكترونية الذكية","critical",true,["system_config"]],
        ["EGRD-2.1.3","2.1.3","IEC 61850 Security","أمن IEC 61850","Secure IEC 61850 GOOSE/MMS communications","تأمين اتصالات IEC 61850 GOOSE/MMS","critical",true,["system_config"]],
        ["EGRD-2.1.4","2.1.4","DNP3 Security","أمن DNP3","Implement DNP3 Secure Authentication","تنفيذ المصادقة الآمنة لـ DNP3","high",true,["system_config"]],
        ["EGRD-2.1.5","2.1.5","Grid Remote Access","الوصول عن بعد للشبكة","Secure remote access to grid OT systems","الوصول الآمن عن بعد لأنظمة OT للشبكة","critical",true,["vpn_config"]],
      ])),
      S("EGRD-2-2","2.2","Smart Grid Security","أمن الشبكة الذكية",controls([
        ["EGRD-2.2.1","2.2.1","AMI Security","أمن البنية التحتية للقياس المتقدم","Secure Advanced Metering Infrastructure","تأمين البنية التحتية للقياس المتقدم","critical",true,["system_config"]],
        ["EGRD-2.2.2","2.2.2","DER Security","أمن موارد الطاقة الموزعة","Secure Distributed Energy Resources communications","تأمين اتصالات موارد الطاقة الموزعة","high",true,["system_config"]],
        ["EGRD-2.2.3","2.2.3","Grid Analytics Security","أمن تحليلات الشبكة","Protect grid analytics and AI/ML systems","حماية أنظمة تحليلات الشبكة والذكاء الاصطناعي","high",true,["system_config"]],
        ["EGRD-2.2.4","2.2.4","EV Charging Security","أمن شحن المركبات الكهربائية","Secure EV charging infrastructure and payment systems","تأمين البنية التحتية لشحن المركبات الكهربائية وأنظمة الدفع","medium",true,["system_config"]],
      ])),
    ]),
    D("EGRD-D3","3","Grid Resilience","مرونة الشبكة",[
      S("EGRD-3-1","3.1","Grid Continuity","استمرارية الشبكة",controls([
        ["EGRD-3.1.1","3.1.1","Grid BCP","خطة استمرارية الشبكة","BCP for grid operations under cyber attack","خطة استمرارية لعمليات الشبكة أثناء الهجمات السيبرانية","critical",false,["bcp_plan"]],
        ["EGRD-3.1.2","3.1.2","Black Start Recovery","استعادة التشغيل","Cyber-secure black start recovery procedures","إجراءات استعادة التشغيل الآمنة سيبرانياً","critical",false,["document"]],
        ["EGRD-3.1.3","3.1.3","Grid IR Plan","خطة الاستجابة للشبكة","Grid-specific incident response plan","خطة استجابة للحوادث خاصة بالشبكة","critical",false,["ir_plan"]],
        ["EGRD-3.1.4","3.1.4","ECRA Reporting","الإبلاغ لهيئة تنظيم الكهرباء","Report grid cyber incidents to ECRA within 2 hours","الإبلاغ عن حوادث الشبكة السيبرانية لهيئة تنظيم الكهرباء خلال ساعتين","critical",false,["incident_report"]],
        ["EGRD-3.1.5","3.1.5","Grid Cyber Exercise","تمرين سيبراني للشبكة","Annual grid cybersecurity exercise","تمرين سنوي للأمن السيبراني للشبكة","high",false,["exercise_report"]],
      ])),
    ]),
  ],
});

export const MEIM_OG: FrameworkDef = FW({
  id:"INST-KSA-MEIM-OG",reg:"REG-KSA-MEIM",nEn:"Oil & Gas Cybersecurity Standards",nAr:"معايير الأمن السيبراني للنفط والغاز",
  type:"standard",ver:"1.0",verId:"VER-KSA-MEIM-OG-1-0",
  sectors:["SEC-KSA-ENERGY-OG"],mandatory:true,
  sumEn:"Ministry of Energy cybersecurity standards for oil & gas upstream, midstream, and downstream operations.",
  sumAr:"معايير الأمن السيبراني لوزارة الطاقة لعمليات النفط والغاز.",
  tags:["oil_gas","energy","ot","critical_infrastructure"],
  domains:[
    D("MEOG-D1","1","O&G OT Security","أمن OT للنفط والغاز",[
      S("MEOG-1-1","1.1","Process Control","التحكم في العمليات",controls([
        ["MEOG-1.1.1","1.1.1","DCS Security","أمن DCS","Secure Distributed Control Systems","تأمين أنظمة التحكم الموزعة","critical",true,["system_config"]],
        ["MEOG-1.1.2","1.1.2","PLC Security","أمن PLC","Secure Programmable Logic Controllers with hardened configs","تأمين وحدات التحكم المنطقية القابلة للبرمجة","critical",true,["system_config"]],
        ["MEOG-1.1.3","1.1.3","SIS Protection","حماية SIS","Protect Safety Instrumented Systems from cyber threats","حماية أنظمة السلامة المجهزة من التهديدات السيبرانية","critical",false,["system_config"]],
        ["MEOG-1.1.4","1.1.4","Pipeline SCADA","SCADA خطوط الأنابيب","Secure pipeline SCADA and leak detection systems","تأمين أنظمة SCADA لخطوط الأنابيب وكشف التسرب","critical",true,["system_config"]],
      ])),
      S("MEOG-1-2","1.2","Upstream Security","أمن العمليات الأولية",controls([
        ["MEOG-1.2.1","1.2.1","Drilling System Security","أمن أنظمة الحفر","Secure drilling automation and control systems","تأمين أنظمة أتمتة والتحكم في الحفر","critical",true,["system_config"]],
        ["MEOG-1.2.2","1.2.2","Offshore Platform Security","أمن المنصات البحرية","Cybersecurity for offshore platform OT and communications","الأمن السيبراني لـ OT واتصالات المنصات البحرية","critical",true,["system_config"]],
        ["MEOG-1.2.3","1.2.3","Well Control","التحكم في الآبار","Protect well control systems from cyber manipulation","حماية أنظمة التحكم في الآبار من التلاعب السيبراني","critical",false,["system_config"]],
      ])),
    ]),
    D("MEOG-D2","2","O&G Physical-Cyber","الأمن المادي-السيبراني للنفط والغاز",[
      S("MEOG-2-1","2.1","Converged Security","الأمن المتقارب",controls([
        ["MEOG-2.1.1","2.1.1","Physical-Cyber Convergence","تقارب الأمن المادي-السيبراني","Integrate physical and cybersecurity operations","دمج العمليات الأمنية المادية والسيبرانية","critical",false,["document"]],
        ["MEOG-2.1.2","2.1.2","Perimeter Security","أمن المحيط","Secure facility perimeter with cyber-physical systems","تأمين محيط المنشأة بأنظمة سيبرانية-مادية","high",true,["system_config"]],
        ["MEOG-2.1.3","2.1.3","Drone Detection","كشف الطائرات المسيرة","Implement drone detection and counter-UAS systems","تنفيذ أنظمة كشف ومكافحة الطائرات المسيرة","high",true,["system_config"]],
        ["MEOG-2.1.4","2.1.4","Emergency Shutdown","الإغلاق الطارئ","Protect Emergency Shutdown systems from cyber tampering","حماية أنظمة الإغلاق الطارئ من التلاعب السيبراني","critical",false,["system_config"]],
      ])),
    ]),
    D("MEOG-D3","3","O&G Resilience","مرونة النفط والغاز",[
      S("MEOG-3-1","3.1","O&G Incident Response","الاستجابة لحوادث النفط والغاز",controls([
        ["MEOG-3.1.1","3.1.1","O&G IR Plan","خطة الاستجابة للنفط والغاز","Sector-specific incident response plan","خطة استجابة للحوادث خاصة بالقطاع","critical",false,["ir_plan"]],
        ["MEOG-3.1.2","3.1.2","Ministry Reporting","الإبلاغ للوزارة","Report significant incidents to Ministry of Energy","الإبلاغ عن الحوادث الهامة لوزارة الطاقة","critical",false,["incident_report"]],
        ["MEOG-3.1.3","3.1.3","Sector Exercises","تمارين القطاع","Participate in energy sector cyber exercises","المشاركة في تمارين الأمن السيبراني لقطاع الطاقة","high",false,["exercise_report"]],
        ["MEOG-3.1.4","3.1.4","Supply Chain BCP","استمرارية سلسلة التوريد","BCP for energy supply chain disruption","خطة استمرارية لتعطل سلسلة توريد الطاقة","critical",false,["bcp_plan"]],
      ])),
    ]),
  ],
});

export const ENERGY_FRAMEWORKS: FrameworkDef[] = [ECRA_GRID, MEIM_OG];
