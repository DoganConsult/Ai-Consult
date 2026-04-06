// ============================================
// Shahin AI-KSA GRC — CST Framework Family
// CRF, ISP Regulation, Spectrum Security
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const CST_CRF: FrameworkDef = FW({
  id:"INST-KSA-CST-CRF",reg:"REG-KSA-CST",nEn:"Cybersecurity Regulatory Framework for Telecom",nAr:"الإطار التنظيمي للأمن السيبراني للاتصالات",
  type:"framework",ver:"1.0",verId:"VER-KSA-CST-CRF-1-0",
  sectors:["SEC-KSA-TEL-OP","SEC-KSA-TEL-ICT"],mandatory:true,
  sumEn:"CST cybersecurity regulatory framework for telecom and ICT service providers in KSA.",
  sumAr:"الإطار التنظيمي للأمن السيبراني لهيئة الاتصالات لمقدمي خدمات الاتصالات وتقنية المعلومات.",
  tags:["telecom","ict","cybersecurity"],
  domains:[
    D("CRF-D1","1","Governance & Risk","الحوكمة وإدارة المخاطر",[
      S("CRF-1-1","1.1","Security Governance","حوكمة الأمن",controls([
        ["CRF-1.1.1","1.1.1","Security Governance Framework","إطار حوكمة الأمن","Establish security governance framework for telecom operations","إنشاء إطار حوكمة الأمن لعمليات الاتصالات","critical",false,["document"]],
        ["CRF-1.1.2","1.1.2","CISO Appointment","تعيين CISO","Appoint dedicated CISO for telecom operations","تعيين مسؤول أمن معلومات مخصص لعمليات الاتصالات","critical",false,["appointment_record"]],
        ["CRF-1.1.3","1.1.3","Security Budget","ميزانية الأمن","Allocate minimum 8% of IT budget to cybersecurity","تخصيص 8% كحد أدنى من ميزانية تقنية المعلومات للأمن السيبراني","high",false,["budget_document"]],
        ["CRF-1.1.4","1.1.4","Risk Management","إدارة المخاطر","Implement telecom-specific risk management","تنفيذ إدارة مخاطر خاصة بالاتصالات","critical",false,["risk_assessment"]],
      ])),
      S("CRF-1-2","1.2","Regulatory Compliance","الامتثال التنظيمي",controls([
        ["CRF-1.2.1","1.2.1","CST Compliance","امتثال CST","Comply with all CST cybersecurity directives","الامتثال لجميع توجيهات هيئة الاتصالات للأمن السيبراني","critical",false,["compliance_report"]],
        ["CRF-1.2.2","1.2.2","Incident Reporting to CST","الإبلاغ عن الحوادث","Report security incidents to CST within 4 hours","الإبلاغ عن الحوادث الأمنية لهيئة الاتصالات خلال 4 ساعات","critical",false,["incident_report"]],
        ["CRF-1.2.3","1.2.3","Annual Audit","التدقيق السنوي","Annual cybersecurity audit by CST-approved auditor","تدقيق سنوي للأمن السيبراني من مدقق معتمد من الهيئة","critical",false,["audit_report"]],
        ["CRF-1.2.4","1.2.4","Vulnerability Disclosure","الإفصاح عن الثغرات","Coordinated vulnerability disclosure program","برنامج إفصاح منسق عن الثغرات","high",false,["program_document"]],
      ])),
    ]),
    D("CRF-D2","2","Network Security","أمن الشبكات",[
      S("CRF-2-1","2.1","Core Network Security","أمن الشبكة الأساسية",controls([
        ["CRF-2.1.1","2.1.1","5G Security","أمن شبكات الجيل الخامس","Implement 3GPP security standards for 5G networks","تنفيذ معايير أمن 3GPP لشبكات الجيل الخامس","critical",true,["system_config"]],
        ["CRF-2.1.2","2.1.2","SS7/Diameter Security","أمن SS7/Diameter","Protect signaling protocols (SS7, Diameter, GTP)","حماية بروتوكولات الإشارة","critical",true,["system_config"]],
        ["CRF-2.1.3","2.1.3","DNS Security","أمن DNS","Implement DNSSEC and DNS filtering","تنفيذ DNSSEC وتصفية DNS","critical",true,["system_config"]],
        ["CRF-2.1.4","2.1.4","BGP Security","أمن BGP","Implement RPKI and BGP route validation","تنفيذ RPKI والتحقق من مسار BGP","critical",true,["system_config"]],
        ["CRF-2.1.5","2.1.5","Network Function Virtualization","أمن NFV","Secure NFV/SDN infrastructure","تأمين بنية NFV/SDN التحتية","high",true,["system_config"]],
      ])),
      S("CRF-2-2","2.2","Subscriber Security","أمن المشتركين",controls([
        ["CRF-2.2.1","2.2.1","SIM Security","أمن SIM","Implement SIM swap protection and fraud detection","تنفيذ حماية تبديل SIM وكشف الاحتيال","critical",true,["system_config"]],
        ["CRF-2.2.2","2.2.2","Subscriber Data Protection","حماية بيانات المشتركين","Protect subscriber personal and traffic data","حماية البيانات الشخصية وبيانات حركة المرور للمشتركين","critical",true,["system_config"]],
        ["CRF-2.2.3","2.2.3","Lawful Interception","الاعتراض القانوني","Secure lawful interception systems","تأمين أنظمة الاعتراض القانوني","critical",false,["system_config"]],
        ["CRF-2.2.4","2.2.4","Anti-Spam/Fraud","مكافحة البريد العشوائي/الاحتيال","Implement anti-spam and anti-fraud systems","تنفيذ أنظمة مكافحة البريد العشوائي والاحتيال","high",true,["system_config"]],
      ])),
    ]),
    D("CRF-D3","3","Resilience & Response","المرونة والاستجابة",[
      S("CRF-3-1","3.1","Telecom Resilience","مرونة الاتصالات",controls([
        ["CRF-3.1.1","3.1.1","Network Redundancy","تكرار الشبكة","Maintain network redundancy for critical infrastructure","الحفاظ على تكرار الشبكة للبنية التحتية الحرجة","critical",true,["network_diagram"]],
        ["CRF-3.1.2","3.1.2","DDoS Mitigation","تخفيف DDoS","Implement carrier-grade DDoS mitigation","تنفيذ تخفيف DDoS على مستوى الناقل","critical",true,["system_config"]],
        ["CRF-3.1.3","3.1.3","Emergency Communications","الاتصالات الطارئة","Maintain emergency communication capabilities","الحفاظ على قدرات الاتصالات الطارئة","critical",false,["document"]],
        ["CRF-3.1.4","3.1.4","Cyber Exercise","تمرين سيبراني","Participate in national cyber exercises","المشاركة في التمارين السيبرانية الوطنية","high",false,["exercise_report"]],
      ])),
    ]),
  ],
});

export const CST_ISP: FrameworkDef = FW({
  id:"INST-KSA-CST-ISP",reg:"REG-KSA-CST",nEn:"ISP Security Standards",nAr:"معايير أمن مزودي خدمة الإنترنت",
  type:"standard",ver:"1.0",verId:"VER-KSA-CST-ISP-1-0",
  sectors:["SEC-KSA-TEL-OP","SEC-KSA-TEL-ICT"],mandatory:true,
  sumEn:"CST security standards for Internet Service Providers operating in KSA.",
  sumAr:"معايير أمن هيئة الاتصالات لمزودي خدمة الإنترنت العاملين في المملكة.",
  tags:["isp","internet","security"],
  domains:[
    D("ISP-D1","1","ISP Infrastructure","بنية ISP التحتية",[
      S("ISP-1-1","1.1","Content Filtering","تصفية المحتوى",controls([
        ["ISP-1.1.1","1.1.1","URL Filtering","تصفية عناوين URL","Implement CST-mandated content filtering","تنفيذ تصفية المحتوى المطلوبة من هيئة الاتصالات","critical",true,["system_config"]],
        ["ISP-1.1.2","1.1.2","DNS Filtering","تصفية DNS","DNS-level content filtering and malware blocking","تصفية المحتوى ومنع البرمجيات الخبيثة على مستوى DNS","critical",true,["system_config"]],
        ["ISP-1.1.3","1.1.3","CSAM Detection","كشف مواد الاستغلال","Implement detection and reporting of illegal content","تنفيذ كشف والإبلاغ عن المحتوى غير القانوني","critical",true,["system_config"]],
      ])),
      S("ISP-1-2","1.2","Customer Security","أمن العملاء",controls([
        ["ISP-1.2.1","1.2.1","Customer CPE Security","أمن أجهزة العملاء","Secure default configuration for customer premises equipment","تكوين آمن افتراضي لأجهزة مقر العملاء","high",true,["system_config"]],
        ["ISP-1.2.2","1.2.2","Botnet Mitigation","تخفيف الشبكات المُسيطر عليها","Detect and mitigate botnet traffic from customer networks","كشف وتخفيف حركة مرور الشبكات المُسيطر عليها","high",true,["system_config"]],
        ["ISP-1.2.3","1.2.3","Abuse Handling","معالجة إساءة الاستخدام","Establish abuse handling and takedown procedures","إنشاء إجراءات معالجة إساءة الاستخدام والإزالة","high",false,["document"]],
      ])),
    ]),
  ],
});

export const CST_FRAMEWORKS: FrameworkDef[] = [CST_CRF, CST_ISP];
