// ============================================
// Shahin AI-KSA GRC — CMA Framework Family
// Cybersecurity Guidelines, AML, Corporate Governance
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const CMA_CYBER: FrameworkDef = FW({
  id:"INST-KSA-CMA-CYBER",reg:"REG-KSA-CMA",nEn:"Cybersecurity Guidelines for Capital Market Institutions",nAr:"إرشادات الأمن السيبراني لمؤسسات السوق المالية",
  type:"guideline",ver:"1.0",verId:"VER-KSA-CMA-CYBER-1-0",
  sectors:["SEC-KSA-FIN-CAPITAL"],mandatory:true,
  sumEn:"CMA cybersecurity guidelines for capital market institutions including brokerages and investment funds.",
  sumAr:"إرشادات الأمن السيبراني لهيئة السوق المالية لمؤسسات سوق رأس المال.",
  tags:["capital_markets","cybersecurity","finance"],
  domains:[
    D("CMA-D1","1","Governance & Oversight","الحوكمة والرقابة",[
      S("CMA-1-1","1.1","Board Oversight","رقابة مجلس الإدارة",controls([
        ["CMA-1.1.1","1.1.1","Board CS Oversight","رقابة مجلس الإدارة على الأمن السيبراني","Board of directors oversight of cybersecurity program","رقابة مجلس الإدارة على برنامج الأمن السيبراني","critical",false,["board_minutes","document"]],
        ["CMA-1.1.2","1.1.2","CS Policy","سياسة الأمن السيبراني","Board-approved cybersecurity policy","سياسة الأمن السيبراني المعتمدة من مجلس الإدارة","critical",false,["document"]],
        ["CMA-1.1.3","1.1.3","CS Risk Appetite","الرغبة في المخاطرة السيبرانية","Define cyber risk appetite for capital market operations","تحديد الرغبة في المخاطر السيبرانية لعمليات السوق المالية","critical",false,["document"]],
        ["CMA-1.1.4","1.1.4","CS Organization","تنظيم الأمن السيبراني","Establish independent cybersecurity function","إنشاء وظيفة أمن سيبراني مستقلة","critical",false,["org_chart"]],
      ])),
      S("CMA-1-2","1.2","Risk Management","إدارة المخاطر",controls([
        ["CMA-1.2.1","1.2.1","Cyber Risk Assessment","تقييم المخاطر السيبرانية","Assess cyber risks to trading and settlement systems","تقييم المخاطر السيبرانية لأنظمة التداول والتسوية","critical",false,["assessment_report"]],
        ["CMA-1.2.2","1.2.2","Market Integrity Risk","مخاطر سلامة السوق","Assess cyber risks to market integrity","تقييم المخاطر السيبرانية لسلامة السوق","critical",false,["risk_assessment"]],
        ["CMA-1.2.3","1.2.3","Insider Threat","التهديد الداخلي","Manage insider threat risks for market-sensitive data","إدارة مخاطر التهديد الداخلي للبيانات الحساسة للسوق","critical",false,["assessment_report"]],
      ])),
    ]),
    D("CMA-D2","2","Market System Security","أمن أنظمة السوق",[
      S("CMA-2-1","2.1","Trading System Security","أمن أنظمة التداول",controls([
        ["CMA-2.1.1","2.1.1","Trading Platform Security","أمن منصة التداول","Secure electronic trading platforms","تأمين منصات التداول الإلكتروني","critical",true,["system_config"]],
        ["CMA-2.1.2","2.1.2","Algorithmic Trading Controls","ضوابط التداول الخوارزمي","Security controls for algorithmic/HFT trading","ضوابط أمنية للتداول الخوارزمي عالي التردد","critical",true,["system_config"]],
        ["CMA-2.1.3","2.1.3","Market Data Protection","حماية بيانات السوق","Protect market data feeds from manipulation","حماية تغذيات بيانات السوق من التلاعب","critical",true,["system_config"]],
        ["CMA-2.1.4","2.1.4","Settlement Security","أمن التسوية","Secure settlement and clearing systems","تأمين أنظمة التسوية والمقاصة","critical",true,["system_config"]],
      ])),
      S("CMA-2-2","2.2","Client Protection","حماية العملاء",controls([
        ["CMA-2.2.1","2.2.1","Client Data Protection","حماية بيانات العملاء","Protect client personal and financial data","حماية البيانات الشخصية والمالية للعملاء","critical",true,["system_config"]],
        ["CMA-2.2.2","2.2.2","Client Authentication","مصادقة العملاء","Strong authentication for client trading accounts","مصادقة قوية لحسابات التداول للعملاء","critical",true,["system_config"]],
        ["CMA-2.2.3","2.2.3","Transaction Monitoring","مراقبة المعاملات","Monitor transactions for unauthorized activity","مراقبة المعاملات بحثاً عن نشاط غير مصرح به","critical",true,["monitoring_report"]],
        ["CMA-2.2.4","2.2.4","Client Communication","اتصالات العملاء","Secure client communication channels","تأمين قنوات الاتصال مع العملاء","high",true,["system_config"]],
      ])),
    ]),
    D("CMA-D3","3","Resilience & Reporting","المرونة والتقارير",[
      S("CMA-3-1","3.1","Market Resilience","مرونة السوق",controls([
        ["CMA-3.1.1","3.1.1","Trading Continuity","استمرارية التداول","BCP for trading system availability","خطة استمرارية لتوفر نظام التداول","critical",false,["bcp_plan"]],
        ["CMA-3.1.2","3.1.2","Circuit Breakers","قواطع الدائرة","Cyber-triggered circuit breaker procedures","إجراءات قواطع الدائرة المحفزة بالسيبرانية","critical",false,["document"]],
        ["CMA-3.1.3","3.1.3","CMA Incident Reporting","الإبلاغ عن الحوادث للهيئة","Report significant incidents to CMA immediately","الإبلاغ عن الحوادث الهامة لهيئة السوق المالية فوراً","critical",false,["incident_report"]],
        ["CMA-3.1.4","3.1.4","Annual CS Report","التقرير السنوي للأمن السيبراني","Submit annual cybersecurity report to CMA","تقديم تقرير الأمن السيبراني السنوي لهيئة السوق المالية","critical",false,["annual_report"]],
      ])),
    ]),
  ],
});

export const CMA_AML: FrameworkDef = FW({
  id:"INST-KSA-CMA-AML",reg:"REG-KSA-CMA",nEn:"Anti-Money Laundering & CTF for Capital Markets",nAr:"مكافحة غسل الأموال وتمويل الإرهاب للأسواق المالية",
  type:"regulation",ver:"2.0",verId:"VER-KSA-CMA-AML-2-0",
  sectors:["SEC-KSA-FIN-CAPITAL"],mandatory:true,
  sumEn:"CMA anti-money laundering and counter-terrorism financing requirements for capital market institutions.",
  sumAr:"متطلبات هيئة السوق المالية لمكافحة غسل الأموال وتمويل الإرهاب لمؤسسات السوق المالية.",
  tags:["aml","cft","finance","compliance"],
  domains:[
    D("CAML-D1","1","AML/CTF Program","برنامج مكافحة غسل الأموال",[
      S("CAML-1-1","1.1","AML Governance","حوكمة مكافحة غسل الأموال",controls([
        ["CAML-1.1.1","1.1.1","AML Policy","سياسة مكافحة غسل الأموال","Establish comprehensive AML/CFT policy","وضع سياسة شاملة لمكافحة غسل الأموال وتمويل الإرهاب","critical",false,["document"]],
        ["CAML-1.1.2","1.1.2","MLRO Appointment","تعيين مسؤول الامتثال","Appoint Money Laundering Reporting Officer","تعيين مسؤول الإبلاغ عن غسل الأموال","critical",false,["appointment_record"]],
        ["CAML-1.1.3","1.1.3","Risk-Based Approach","النهج القائم على المخاطر","Implement risk-based AML approach","تنفيذ نهج مكافحة غسل الأموال القائم على المخاطر","critical",false,["risk_assessment"]],
        ["CAML-1.1.4","1.1.4","AML Training","تدريب مكافحة غسل الأموال","Annual AML training for all relevant staff","تدريب سنوي على مكافحة غسل الأموال لجميع الموظفين المعنيين","high",false,["training_record"]],
      ])),
      S("CAML-1-2","1.2","KYC/CDD","اعرف عميلك",controls([
        ["CAML-1.2.1","1.2.1","Customer Identification","تحديد هوية العملاء","Verify customer identity using reliable documents","التحقق من هوية العملاء باستخدام وثائق موثوقة","critical",true,["kyc_record"]],
        ["CAML-1.2.2","1.2.2","Enhanced Due Diligence","العناية الواجبة المعززة","EDD for high-risk customers and PEPs","العناية الواجبة المعززة للعملاء عاليي المخاطر والأشخاص المكشوفين سياسياً","critical",false,["edd_report"]],
        ["CAML-1.2.3","1.2.3","Beneficial Ownership","الملكية المستفيدة","Identify beneficial owners of entities","تحديد المالكين المستفيدين للكيانات","critical",false,["ownership_record"]],
        ["CAML-1.2.4","1.2.4","Ongoing Monitoring","المراقبة المستمرة","Continuous monitoring of customer relationships","المراقبة المستمرة لعلاقات العملاء","critical",true,["monitoring_report"]],
        ["CAML-1.2.5","1.2.5","Sanctions Screening","فحص العقوبات","Screen against sanctions and watchlists","الفحص مقابل قوائم العقوبات والمراقبة","critical",true,["screening_report"]],
      ])),
    ]),
    D("CAML-D2","2","Transaction Monitoring & Reporting","مراقبة المعاملات والإبلاغ",[
      S("CAML-2-1","2.1","Transaction Monitoring","مراقبة المعاملات",controls([
        ["CAML-2.1.1","2.1.1","Automated Monitoring","المراقبة الآلية","Implement automated transaction monitoring system","تنفيذ نظام مراقبة معاملات آلي","critical",true,["system_config"]],
        ["CAML-2.1.2","2.1.2","Suspicious Patterns","الأنماط المشبوهة","Define and detect suspicious transaction patterns","تحديد وكشف أنماط المعاملات المشبوهة","critical",true,["system_config"]],
        ["CAML-2.1.3","2.1.3","STR Filing","تقديم تقارير المعاملات المشبوهة","File STRs with SAFIU within required timeframe","تقديم تقارير المعاملات المشبوهة لوحدة التحريات المالية","critical",false,["str_record"]],
        ["CAML-2.1.4","2.1.4","Record Retention","الاحتفاظ بالسجلات","Retain all AML records for minimum 10 years","الاحتفاظ بجميع سجلات مكافحة غسل الأموال لمدة 10 سنوات كحد أدنى","critical",true,["retention_config"]],
      ])),
    ]),
  ],
});

export const CMA_FRAMEWORKS: FrameworkDef[] = [CMA_CYBER, CMA_AML];
