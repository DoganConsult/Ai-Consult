// ============================================
// Shahin AI-KSA GRC — ZATCA Framework Family
// E-Invoicing, VAT Compliance, Customs
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const ZATCA_EINV: FrameworkDef = FW({
  id:"INST-KSA-ZATCA-EINV",reg:"REG-KSA-ZATCA",nEn:"E-Invoicing (Fatoorah) Regulations",nAr:"أنظمة الفوترة الإلكترونية (فاتورة)",
  type:"regulation",ver:"Phase 2",verId:"VER-KSA-ZATCA-EINV-P2",sectors:["all_commercial"],mandatory:true,
  sumEn:"ZATCA e-invoicing regulations requiring electronic invoice generation, reporting, and integration.",
  sumAr:"أنظمة الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك.",
  tags:["tax","e-invoicing","compliance"],
  domains:[
    D("EINV-D1","1","E-Invoice Generation","إنشاء الفاتورة الإلكترونية",[
      S("EINV-1-1","1.1","Invoice Requirements","متطلبات الفاتورة",controls([
        ["EINV-1.1.1","1.1.1","XML Format","تنسيق XML","Generate invoices in ZATCA-compliant UBL 2.1 XML format","إنشاء الفواتير بتنسيق XML UBL 2.1 المتوافق مع الهيئة","critical",true,["system_config","sample_invoice"]],
        ["EINV-1.1.2","1.1.2","Digital Signing","التوقيع الرقمي","Digitally sign all electronic invoices with ZATCA-issued certificate","التوقيع الرقمي لجميع الفواتير الإلكترونية بشهادة صادرة من الهيئة","critical",true,["system_config","certificate"]],
        ["EINV-1.1.3","1.1.3","QR Code","رمز QR","Generate QR code with TLV-encoded invoice data","إنشاء رمز QR مع بيانات الفاتورة المرمزة بـ TLV","critical",true,["system_config"]],
        ["EINV-1.1.4","1.1.4","UUID Generation","إنشاء UUID","Generate unique UUID for each invoice","إنشاء معرف فريد UUID لكل فاتورة","critical",true,["system_config"]],
        ["EINV-1.1.5","1.1.5","Sequential Numbering","الترقيم التسلسلي","Maintain sequential invoice counter per device","الحفاظ على عداد فواتير تسلسلي لكل جهاز","critical",true,["system_config"]],
        ["EINV-1.1.6","1.1.6","Hash Chaining","تسلسل الهاش","Implement invoice hash chaining for tamper detection","تنفيذ تسلسل هاش الفاتورة لكشف التلاعب","critical",true,["system_config"]],
      ])),
      S("EINV-1-2","1.2","Invoice Types","أنواع الفواتير",controls([
        ["EINV-1.2.1","1.2.1","Standard Invoice","الفاتورة القياسية","Support standard tax invoice (B2B)","دعم الفاتورة الضريبية القياسية (B2B)","critical",true,["system_config"]],
        ["EINV-1.2.2","1.2.2","Simplified Invoice","الفاتورة المبسطة","Support simplified tax invoice (B2C)","دعم الفاتورة الضريبية المبسطة (B2C)","critical",true,["system_config"]],
        ["EINV-1.2.3","1.2.3","Credit/Debit Notes","إشعارات الخصم/الائتمان","Support credit and debit notes with references","دعم إشعارات الخصم والائتمان مع المراجع","high",true,["system_config"]],
        ["EINV-1.2.4","1.2.4","Self-Billing","الفوترة الذاتية","Support self-billing invoices where applicable","دعم فواتير الفوترة الذاتية حيثما أمكن","medium",true,["system_config"]],
      ])),
    ]),
    D("EINV-D2","2","Integration & Reporting","التكامل والإبلاغ",[
      S("EINV-2-1","2.1","ZATCA Integration","التكامل مع الهيئة",controls([
        ["EINV-2.1.1","2.1.1","API Integration","تكامل API","Integrate with ZATCA Fatoorah platform APIs","التكامل مع واجهات برمجة منصة فاتورة للهيئة","critical",true,["system_config"]],
        ["EINV-2.1.2","2.1.2","Clearance (B2B)","اعتماد الفواتير","Real-time invoice clearance for B2B invoices","اعتماد الفواتير في الوقت الحقيقي لفواتير B2B","critical",true,["system_config"]],
        ["EINV-2.1.3","2.1.3","Reporting (B2C)","الإبلاغ عن الفواتير","Near-real-time reporting for B2C simplified invoices","الإبلاغ في الوقت شبه الحقيقي لفواتير B2C المبسطة","critical",true,["system_config"]],
        ["EINV-2.1.4","2.1.4","Error Handling","معالجة الأخطاء","Handle ZATCA rejection and resubmission","معالجة رفض الهيئة وإعادة التقديم","high",true,["system_config"]],
        ["EINV-2.1.5","2.1.5","Offline Capability","القدرة على العمل بدون اتصال","Handle invoicing during ZATCA platform unavailability","التعامل مع الفوترة أثناء عدم توفر منصة الهيئة","high",true,["system_config"]],
      ])),
      S("EINV-2-2","2.2","Compliance & Archiving","الامتثال والأرشفة",controls([
        ["EINV-2.2.1","2.2.1","Invoice Archiving","أرشفة الفواتير","Archive invoices for minimum 6 years","أرشفة الفواتير لمدة 6 سنوات كحد أدنى","critical",true,["archive_config"]],
        ["EINV-2.2.2","2.2.2","Tamper Detection","كشف التلاعب","Detect and prevent invoice tampering","كشف ومنع التلاعب بالفواتير","critical",true,["system_config"]],
        ["EINV-2.2.3","2.2.3","Audit Trail","مسار التدقيق","Maintain complete audit trail for all invoice operations","الحفاظ على مسار تدقيق كامل لجميع عمليات الفواتير","critical",true,["audit_log"]],
        ["EINV-2.2.4","2.2.4","Certificate Management","إدارة الشهادات","Manage ZATCA cryptographic certificates lifecycle","إدارة دورة حياة شهادات التشفير الصادرة من الهيئة","critical",true,["certificate_report"]],
      ])),
    ]),
    D("EINV-D3","3","Device & Security","الأجهزة والأمن",[
      S("EINV-3-1","3.1","EGS Compliance","امتثال أجهزة الفوترة",controls([
        ["EINV-3.1.1","3.1.1","EGS Registration","تسجيل أجهزة الفوترة","Register all E-invoice Generation Solutions with ZATCA","تسجيل جميع حلول إنشاء الفواتير الإلكترونية مع الهيئة","critical",true,["registration_record"]],
        ["EINV-3.1.2","3.1.2","Device Onboarding","تسجيل الأجهزة","Complete CCSID/PCSID onboarding for each device","إكمال تسجيل CCSID/PCSID لكل جهاز","critical",true,["system_config"]],
        ["EINV-3.1.3","3.1.3","Tamper-Resistant Storage","التخزين المقاوم للتلاعب","Store cryptographic keys in tamper-resistant hardware","تخزين مفاتيح التشفير في أجهزة مقاومة للتلاعب","critical",true,["system_config"]],
        ["EINV-3.1.4","3.1.4","EGS Updates","تحديثات أجهزة الفوترة","Keep EGS software updated per ZATCA requirements","تحديث برمجيات أجهزة الفوترة وفقاً لمتطلبات الهيئة","high",true,["update_log"]],
      ])),
    ]),
  ],
});

export const ZATCA_VAT: FrameworkDef = FW({
  id:"INST-KSA-ZATCA-VAT",reg:"REG-KSA-ZATCA",nEn:"VAT Compliance Framework",nAr:"إطار الامتثال لضريبة القيمة المضافة",
  type:"regulation",ver:"2.0",verId:"VER-KSA-ZATCA-VAT-2-0",sectors:["all_commercial"],mandatory:true,
  sumEn:"ZATCA value-added tax compliance requirements for all commercial entities in KSA.",
  sumAr:"متطلبات الامتثال لضريبة القيمة المضافة لهيئة الزكاة والضريبة والجمارك.",
  tags:["vat","tax","compliance"],
  domains:[
    D("VAT-D1","1","VAT Registration & Filing","التسجيل وتقديم الإقرارات",[
      S("VAT-1-1","1.1","Registration","التسجيل",controls([
        ["VAT-1.1.1","1.1.1","VAT Registration","التسجيل في ضريبة القيمة المضافة","Register for VAT when revenue exceeds threshold","التسجيل في ضريبة القيمة المضافة عند تجاوز الإيرادات للحد","critical",false,["registration_certificate"]],
        ["VAT-1.1.2","1.1.2","Group Registration","التسجيل الجماعي","Manage VAT group registration for related entities","إدارة التسجيل الجماعي لضريبة القيمة المضافة للكيانات ذات الصلة","high",false,["document"]],
        ["VAT-1.1.3","1.1.3","Registration Changes","تغييرات التسجيل","Update ZATCA on registration changes within 20 days","تحديث الهيئة بتغييرات التسجيل خلال 20 يوماً","critical",false,["notification_record"]],
      ])),
      S("VAT-1-2","1.2","Returns & Payment","الإقرارات والدفع",controls([
        ["VAT-1.2.1","1.2.1","Return Filing","تقديم الإقرارات","File VAT returns within prescribed deadlines","تقديم إقرارات ضريبة القيمة المضافة ضمن المواعيد المحددة","critical",true,["filing_record"]],
        ["VAT-1.2.2","1.2.2","Tax Calculation","حساب الضريبة","Accurate VAT calculation on all taxable supplies","حساب دقيق لضريبة القيمة المضافة على جميع التوريدات الخاضعة","critical",true,["system_config"]],
        ["VAT-1.2.3","1.2.3","Input Tax Recovery","استرداد ضريبة المدخلات","Track and claim eligible input tax deductions","تتبع والمطالبة بخصومات ضريبة المدخلات المؤهلة","high",true,["system_config"]],
        ["VAT-1.2.4","1.2.4","Payment Compliance","امتثال الدفع","Timely VAT payment to ZATCA","دفع ضريبة القيمة المضافة للهيئة في الوقت المحدد","critical",true,["payment_record"]],
      ])),
    ]),
    D("VAT-D2","2","Record Keeping & Audit","حفظ السجلات والتدقيق",[
      S("VAT-2-1","2.1","Record Keeping","حفظ السجلات",controls([
        ["VAT-2.1.1","2.1.1","Tax Records","السجلات الضريبية","Maintain tax records for minimum 6 years","الحفاظ على السجلات الضريبية لمدة 6 سنوات كحد أدنى","critical",true,["retention_config"]],
        ["VAT-2.1.2","2.1.2","Digital Records","السجلات الرقمية","Maintain digital records in Arabic","الحفاظ على السجلات الرقمية باللغة العربية","critical",true,["system_config"]],
        ["VAT-2.1.3","2.1.3","Audit Readiness","الجاهزية للتدقيق","Maintain audit-ready documentation","الحفاظ على الوثائق الجاهزة للتدقيق","high",false,["document"]],
      ])),
    ]),
  ],
});

export const ZATCA_FRAMEWORKS: FrameworkDef[] = [ZATCA_EINV, ZATCA_VAT];
