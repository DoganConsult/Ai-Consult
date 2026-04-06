// ============================================
// Shahin AI-KSA GRC — Labor & Commerce Frameworks
// MHRSD, MoC, MISA, SAIP, GAC, SASO
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const MHRSD_LABOR: FrameworkDef = FW({
  id:"INST-KSA-MHRSD-LABOR",reg:"REG-KSA-MHRSD",nEn:"Labor Compliance & Digital HR Standards",nAr:"معايير الامتثال العمالي والموارد البشرية الرقمية",
  type:"regulation",ver:"2.0",verId:"VER-KSA-MHRSD-LABOR-2-0",
  sectors:["all_commercial"],mandatory:true,
  sumEn:"MHRSD labor compliance requirements including Nitaqat, Qiwa platform integration, and employee data protection.",
  sumAr:"متطلبات الامتثال العمالي لوزارة الموارد البشرية بما في ذلك نطاقات ومنصة قوى وحماية بيانات الموظفين.",
  tags:["labor","hr","saudization","compliance"],
  domains:[
    D("MLBR-D1","1","Labor Platform Compliance","امتثال المنصات العمالية",[
      S("MLBR-1-1","1.1","Qiwa Integration","تكامل منصة قوى",controls([
        ["MLBR-1.1.1","1.1.1","Qiwa API Integration","تكامل API قوى","Integrate HR systems with Qiwa platform","تكامل أنظمة الموارد البشرية مع منصة قوى","critical",true,["system_config"]],
        ["MLBR-1.1.2","1.1.2","E-Contract Management","إدارة العقود الإلكترونية","Digital employment contracts via Qiwa","العقود الوظيفية الرقمية عبر منصة قوى","critical",true,["system_config"]],
        ["MLBR-1.1.3","1.1.3","Nitaqat Compliance","امتثال نطاقات","Maintain Saudization ratio per Nitaqat requirements","الحفاظ على نسبة التوطين وفقاً لمتطلبات نطاقات","critical",true,["compliance_report"]],
        ["MLBR-1.1.4","1.1.4","Wage Protection","حماية الأجور","Comply with Wage Protection System (WPS)","الامتثال لنظام حماية الأجور","critical",true,["wps_report"]],
      ])),
      S("MLBR-1-2","1.2","Employee Data Protection","حماية بيانات الموظفين",controls([
        ["MLBR-1.2.1","1.2.1","HR Data Security","أمن بيانات الموارد البشرية","Protect employee personal data per PDPL","حماية البيانات الشخصية للموظفين وفقاً لنظام حماية البيانات","critical",true,["system_config"]],
        ["MLBR-1.2.2","1.2.2","Biometric Data","البيانات البيومترية","Secure biometric attendance and access data","تأمين البيانات البيومترية للحضور والوصول","critical",true,["system_config"]],
        ["MLBR-1.2.3","1.2.3","Background Check Data","بيانات الفحص الأمني","Protect background check and screening data","حماية بيانات الفحص الأمني والتدقيق","high",true,["system_config"]],
        ["MLBR-1.2.4","1.2.4","Payroll Data Security","أمن بيانات الرواتب","Encrypt and protect payroll data","تشفير وحماية بيانات الرواتب","critical",true,["encryption_report"]],
      ])),
    ]),
    D("MLBR-D2","2","Workplace Safety IT","تقنية المعلومات لسلامة مكان العمل",[
      S("MLBR-2-1","2.1","OHS Digital Systems","أنظمة السلامة الرقمية",controls([
        ["MLBR-2.1.1","2.1.1","Incident Reporting System","نظام الإبلاغ عن الحوادث","Digital workplace incident reporting and tracking","الإبلاغ الرقمي عن حوادث مكان العمل وتتبعها","high",true,["system_config"]],
        ["MLBR-2.1.2","2.1.2","Safety Training Tracking","تتبع التدريب على السلامة","Track employee safety training completion","تتبع إكمال تدريب الموظفين على السلامة","high",true,["training_record"]],
        ["MLBR-2.1.3","2.1.3","GOSI Integration","تكامل التأمينات","Integrate with GOSI for occupational hazard reporting","التكامل مع التأمينات الاجتماعية للإبلاغ عن المخاطر المهنية","high",true,["system_config"]],
      ])),
    ]),
  ],
});

export const MOC_ECOM: FrameworkDef = FW({
  id:"INST-KSA-MOC-ECOM",reg:"REG-KSA-MOC",nEn:"E-Commerce & Consumer Protection Regulations",nAr:"أنظمة التجارة الإلكترونية وحماية المستهلك",
  type:"regulation",ver:"2.0",verId:"VER-KSA-MOC-ECOM-2-0",
  sectors:["SEC-KSA-RETAIL"],mandatory:true,
  sumEn:"Ministry of Commerce e-commerce regulations including consumer protection, data handling, and digital marketplace standards.",
  sumAr:"أنظمة التجارة الإلكترونية لوزارة التجارة بما في ذلك حماية المستهلك والتعامل مع البيانات.",
  tags:["ecommerce","consumer_protection","retail"],
  domains:[
    D("MECOM-D1","1","E-Commerce Compliance","امتثال التجارة الإلكترونية",[
      S("MECOM-1-1","1.1","Store Requirements","متطلبات المتجر",controls([
        ["MECOM-1.1.1","1.1.1","Maroof Registration","تسجيل معروف","Register e-commerce store on Maroof platform","تسجيل المتجر الإلكتروني على منصة معروف","critical",true,["registration_record"]],
        ["MECOM-1.1.2","1.1.2","Commercial Registration","السجل التجاري","Maintain valid commercial registration for e-commerce","الحفاظ على سجل تجاري صالح للتجارة الإلكترونية","critical",false,["registration_certificate"]],
        ["MECOM-1.1.3","1.1.3","Consumer Rights","حقوق المستهلك","Display consumer rights including return/refund policy","عرض حقوق المستهلك بما في ذلك سياسة الإرجاع والاسترداد","critical",false,["document"]],
        ["MECOM-1.1.4","1.1.4","Price Transparency","شفافية الأسعار","Display prices in SAR including VAT","عرض الأسعار بالريال السعودي شاملة ضريبة القيمة المضافة","critical",true,["system_config"]],
      ])),
      S("MECOM-1-2","1.2","Payment & Data Security","أمن الدفع والبيانات",controls([
        ["MECOM-1.2.1","1.2.1","Payment Security","أمن الدفع","PCI-DSS compliance for payment processing","الامتثال لـ PCI-DSS لمعالجة المدفوعات","critical",true,["pci_report"]],
        ["MECOM-1.2.2","1.2.2","Customer Data Protection","حماية بيانات العملاء","Protect customer personal and payment data","حماية البيانات الشخصية وبيانات الدفع للعملاء","critical",true,["system_config"]],
        ["MECOM-1.2.3","1.2.3","Secure Checkout","الدفع الآمن","Implement secure checkout with 3D Secure","تنفيذ عملية دفع آمنة مع 3D Secure","critical",true,["system_config"]],
        ["MECOM-1.2.4","1.2.4","Transaction Records","سجلات المعاملات","Maintain transaction records for 10 years","الحفاظ على سجلات المعاملات لمدة 10 سنوات","critical",true,["retention_config"]],
      ])),
    ]),
    D("MECOM-D2","2","Digital Marketplace","السوق الرقمي",[
      S("MECOM-2-1","2.1","Platform Governance","حوكمة المنصة",controls([
        ["MECOM-2.1.1","2.1.1","Seller Verification","التحقق من البائعين","Verify seller identity and commercial registration","التحقق من هوية البائع والسجل التجاري","critical",true,["verification_record"]],
        ["MECOM-2.1.2","2.1.2","Product Compliance","امتثال المنتجات","Ensure products comply with SASO/SABER standards","ضمان امتثال المنتجات لمعايير ساسو/سابر","high",false,["compliance_record"]],
        ["MECOM-2.1.3","2.1.3","Review Authenticity","مصداقية المراجعات","Prevent fake reviews and ratings manipulation","منع المراجعات المزيفة والتلاعب بالتقييمات","medium",true,["system_config"]],
        ["MECOM-2.1.4","2.1.4","Dispute Resolution","حل النزاعات","Digital dispute resolution mechanism","آلية حل النزاعات الرقمية","high",true,["system_config"]],
      ])),
    ]),
  ],
});

export const SASO_PRODUCT: FrameworkDef = FW({
  id:"INST-KSA-SASO-PRODUCT",reg:"REG-KSA-SASO",nEn:"Product Standards & Conformity Assessment",nAr:"معايير المنتجات وتقييم المطابقة",
  type:"standard",ver:"2024",verId:"VER-KSA-SASO-PRODUCT-2024",
  sectors:["all_commercial"],mandatory:true,
  sumEn:"SASO product standards and SABER conformity assessment for goods sold in KSA market.",
  sumAr:"معايير المنتجات لهيئة المواصفات ونظام سابر لتقييم المطابقة للسلع في السوق السعودي.",
  tags:["standards","quality","conformity","saber"],
  domains:[
    D("SASO-D1","1","Product Compliance","امتثال المنتجات",[
      S("SASO-1-1","1.1","SABER System","نظام سابر",controls([
        ["SASO-1.1.1","1.1.1","SABER Registration","تسجيل سابر","Register products on SABER conformity platform","تسجيل المنتجات على منصة سابر للمطابقة","critical",true,["registration_record"]],
        ["SASO-1.1.2","1.1.2","Product Certificate","شهادة المنتج","Obtain Product Certificate of Conformity (PCoC)","الحصول على شهادة مطابقة المنتج","critical",false,["certificate"]],
        ["SASO-1.1.3","1.1.3","Shipment Certificate","شهادة الشحنة","Obtain Shipment Certificate of Conformity (SCoC)","الحصول على شهادة مطابقة الشحنة","critical",false,["certificate"]],
        ["SASO-1.1.4","1.1.4","Conformity Body","جهة المطابقة","Use SASO-accredited conformity assessment body","استخدام جهة تقييم مطابقة معتمدة من ساسو","critical",false,["accreditation_record"]],
      ])),
      S("SASO-1-2","1.2","Technical Standards","المعايير التقنية",controls([
        ["SASO-1.2.1","1.2.1","Saudi Standards Compliance","الامتثال للمواصفات السعودية","Comply with applicable Saudi technical standards","الامتثال للمواصفات الفنية السعودية المعمول بها","critical",false,["test_report"]],
        ["SASO-1.2.2","1.2.2","Energy Efficiency Label","بطاقة كفاءة الطاقة","Meet energy efficiency labeling requirements","الالتزام بمتطلبات بطاقة كفاءة الطاقة","high",false,["label_record"]],
        ["SASO-1.2.3","1.2.3","Safety Testing","اختبار السلامة","Third-party safety testing for regulated products","اختبار السلامة من طرف ثالث للمنتجات المنظمة","critical",false,["test_report"]],
        ["SASO-1.2.4","1.2.4","Recall Management","إدارة الاستدعاء","Product recall management and consumer notification","إدارة استدعاء المنتجات وإخطار المستهلكين","high",true,["recall_record"]],
      ])),
    ]),
  ],
});

export const LABOR_COMMERCE_FRAMEWORKS: FrameworkDef[] = [MHRSD_LABOR, MOC_ECOM, SASO_PRODUCT];
