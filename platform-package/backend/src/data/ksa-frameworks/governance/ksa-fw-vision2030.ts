// ============================================
// Shahin AI-KSA GRC — Vision 2030 Program Frameworks
// NIDLP, NTP, HRP, Quality of Life
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const V2030_NIDLP: FrameworkDef = FW({
  id:"INST-KSA-V2030-NIDLP",reg:"REG-KSA-NIDLP",nEn:"National Industrial Development & Logistics Program",nAr:"برنامج تطوير الصناعة الوطنية والخدمات اللوجستية",
  type:"framework",ver:"2.0",verId:"VER-KSA-V2030-NIDLP-2-0",
  sectors:["SEC-KSA-INDUSTRY","SEC-KSA-TRANS-LOG","SEC-KSA-MINING"],mandatory:false,
  sumEn:"NIDLP program compliance framework for industrial digitization, logistics platforms, and supply chain standards.",
  sumAr:"إطار امتثال برنامج تطوير الصناعة الوطنية والخدمات اللوجستية للتحول الرقمي الصناعي.",
  tags:["vision2030","industry","logistics","digitization"],
  domains:[
    D("NIDLP-D1","1","Industrial Digitization","التحول الرقمي الصناعي",[
      S("NIDLP-1-1","1.1","Industry 4.0","الصناعة 4.0",controls([
        ["NIDLP-1.1.1","1.1.1","Smart Factory Standards","معايير المصنع الذكي","Comply with smart factory cybersecurity standards","الامتثال لمعايير الأمن السيبراني للمصنع الذكي","high",true,["compliance_report"]],
        ["NIDLP-1.1.2","1.1.2","IoT in Manufacturing","إنترنت الأشياء في التصنيع","Secure industrial IoT deployments","تأمين نشر إنترنت الأشياء الصناعي","high",true,["system_config"]],
        ["NIDLP-1.1.3","1.1.3","Digital Twin Security","أمن التوأم الرقمي","Protect digital twin data and simulations","حماية بيانات ومحاكاة التوأم الرقمي","medium",true,["system_config"]],
        ["NIDLP-1.1.4","1.1.4","Additive Manufacturing","التصنيع الإضافي","Secure 3D printing and additive manufacturing systems","تأمين أنظمة الطباعة ثلاثية الأبعاد والتصنيع الإضافي","medium",true,["system_config"]],
      ])),
      S("NIDLP-1-2","1.2","Supply Chain Digital","سلسلة التوريد الرقمية",controls([
        ["NIDLP-1.2.1","1.2.1","Supply Chain Visibility","رؤية سلسلة التوريد","Secure end-to-end supply chain visibility platforms","تأمين منصات رؤية سلسلة التوريد من طرف إلى طرف","high",true,["system_config"]],
        ["NIDLP-1.2.2","1.2.2","Logistics Hub Integration","تكامل المحاور اللوجستية","Integrate with Saudi logistics hub platforms","التكامل مع منصات المحاور اللوجستية السعودية","high",true,["system_config"]],
        ["NIDLP-1.2.3","1.2.3","Blockchain in Supply Chain","البلوكتشين في سلسلة التوريد","Secure blockchain-based supply chain tracking","تأمين تتبع سلسلة التوريد القائم على البلوكتشين","medium",true,["system_config"]],
        ["NIDLP-1.2.4","1.2.4","Cross-Border Trade","التجارة عبر الحدود","Secure digital cross-border trade documentation","تأمين وثائق التجارة الرقمية عبر الحدود","high",true,["system_config"]],
      ])),
    ]),
    D("NIDLP-D2","2","Mining & Minerals","التعدين والمعادن",[
      S("NIDLP-2-1","2.1","Mining Technology","تقنية التعدين",controls([
        ["NIDLP-2.1.1","2.1.1","Mining OT Security","أمن OT التعدين","Secure mining automation and remote operations","تأمين أتمتة التعدين والعمليات عن بعد","critical",true,["system_config"]],
        ["NIDLP-2.1.2","2.1.2","Geological Data","البيانات الجيولوجية","Protect geological survey and mineral resource data","حماية بيانات المسح الجيولوجي والموارد المعدنية","high",true,["system_config"]],
        ["NIDLP-2.1.3","2.1.3","Autonomous Mining","التعدين المستقل","Secure autonomous mining vehicles and drones","تأمين مركبات وطائرات التعدين المستقلة","high",true,["system_config"]],
        ["NIDLP-2.1.4","2.1.4","Environmental Mining","التعدين البيئي","Environmental monitoring for mining operations","المراقبة البيئية لعمليات التعدين","high",true,["monitoring_report"]],
      ])),
    ]),
  ],
});

export const V2030_NTP: FrameworkDef = FW({
  id:"INST-KSA-V2030-NTP",reg:"REG-KSA-ADAA",nEn:"National Transformation Program Digital Standards",nAr:"معايير التحول الرقمي لبرنامج التحول الوطني",
  type:"framework",ver:"2.0",verId:"VER-KSA-V2030-NTP-2-0",
  sectors:["SEC-KSA-GOV-MIN","SEC-KSA-GOV-AUTH"],mandatory:true,
  sumEn:"NTP digital transformation standards for government entities including e-services, automation, and data-driven decision making.",
  sumAr:"معايير التحول الرقمي لبرنامج التحول الوطني للجهات الحكومية.",
  tags:["vision2030","transformation","government","digital"],
  domains:[
    D("NTP-D1","1","Digital Transformation","التحول الرقمي",[
      S("NTP-1-1","1.1","E-Service Delivery","تقديم الخدمات الإلكترونية",controls([
        ["NTP-1.1.1","1.1.1","Service Digitization","رقمنة الخدمات","Digitize all government services per NTP targets","رقمنة جميع الخدمات الحكومية وفقاً لأهداف برنامج التحول الوطني","critical",true,["digitization_report"]],
        ["NTP-1.1.2","1.1.2","Zero-Visit Target","هدف صفر زيارات","Achieve zero-visit for eligible services","تحقيق هدف صفر زيارات للخدمات المؤهلة","high",true,["service_metrics"]],
        ["NTP-1.1.3","1.1.3","Customer Experience","تجربة العملاء","Meet NTP customer satisfaction targets","تحقيق أهداف رضا العملاء لبرنامج التحول الوطني","high",true,["satisfaction_report"]],
        ["NTP-1.1.4","1.1.4","Process Automation","أتمتة العمليات","Automate government processes using RPA and AI","أتمتة العمليات الحكومية باستخدام RPA والذكاء الاصطناعي","high",true,["automation_report"]],
      ])),
      S("NTP-1-2","1.2","Data-Driven Government","الحكومة القائمة على البيانات",controls([
        ["NTP-1.2.1","1.2.1","Analytics Platform","منصة التحليلات","Deploy secure government analytics platform","نشر منصة تحليلات حكومية آمنة","high",true,["system_config"]],
        ["NTP-1.2.2","1.2.2","AI in Government","الذكاء الاصطناعي في الحكومة","Adopt AI for government decision support per SDAIA guidelines","تبني الذكاء الاصطناعي لدعم القرار الحكومي وفقاً لإرشادات SDAIA","high",true,["system_config"]],
        ["NTP-1.2.3","1.2.3","Performance Dashboards","لوحات معلومات الأداء","Implement real-time performance dashboards","تنفيذ لوحات معلومات الأداء في الوقت الحقيقي","high",true,["system_config"]],
        ["NTP-1.2.4","1.2.4","Evidence-Based Policy","السياسة القائمة على الأدلة","Use data analytics for evidence-based policy making","استخدام تحليلات البيانات لصنع السياسات القائمة على الأدلة","medium",false,["document"]],
      ])),
    ]),
  ],
});

export const VISION2030_FRAMEWORKS: FrameworkDef[] = [V2030_NIDLP, V2030_NTP];
