// ============================================
// Shahin AI-KSA GRC — Education Sector Frameworks
// MOE, ETEC, NCEL
// ============================================
import { FrameworkDef } from "./ksa-frameworks";
import { S, D, FW, controls } from "./ksa-control-builder";

export const MOE_EDTECH: FrameworkDef = FW({
  id:"INST-KSA-MOE-EDTECH",reg:"REG-KSA-MOE",nEn:"Education Technology & Data Protection Standards",nAr:"معايير تقنية التعليم وحماية البيانات",
  type:"standard",ver:"1.0",verId:"VER-KSA-MOE-EDTECH-1-0",
  sectors:["SEC-KSA-EDU-UNIV","SEC-KSA-EDU-K12"],mandatory:true,
  sumEn:"Ministry of Education standards for education technology platforms, student data protection, and e-learning security.",
  sumAr:"معايير وزارة التعليم لمنصات تقنية التعليم وحماية بيانات الطلاب وأمن التعلم الإلكتروني.",
  tags:["education","edtech","student_data","e-learning"],
  domains:[
    D("MEDT-D1","1","Student Data Protection","حماية بيانات الطلاب",[
      S("MEDT-1-1","1.1","Student Privacy","خصوصية الطلاب",controls([
        ["MEDT-1.1.1","1.1.1","Student Data Policy","سياسة بيانات الطلاب","Establish student data protection policy compliant with PDPL","وضع سياسة حماية بيانات الطلاب المتوافقة مع نظام حماية البيانات","critical",false,["document"]],
        ["MEDT-1.1.2","1.1.2","Parental Consent","موافقة الوالدين","Obtain parental consent for minor student data processing","الحصول على موافقة الوالدين لمعالجة بيانات الطلاب القُصّر","critical",true,["consent_record"]],
        ["MEDT-1.1.3","1.1.3","Student Record Security","أمن سجلات الطلاب","Encrypt and protect student academic records","تشفير وحماية السجلات الأكاديمية للطلاب","critical",true,["encryption_report"]],
        ["MEDT-1.1.4","1.1.4","EdTech Vendor Assessment","تقييم موردي EdTech","Assess privacy practices of EdTech vendors","تقييم ممارسات الخصوصية لموردي تقنية التعليم","high",false,["assessment_report"]],
        ["MEDT-1.1.5","1.1.5","Data Minimization","تقليل البيانات","Collect only necessary student data for educational purposes","جمع بيانات الطلاب الضرورية فقط للأغراض التعليمية","high",false,["document"]],
      ])),
      S("MEDT-1-2","1.2","Academic Integrity","النزاهة الأكاديمية",controls([
        ["MEDT-1.2.1","1.2.1","Exam Security","أمن الاختبارات","Secure online examination platforms and proctoring","تأمين منصات الاختبارات عبر الإنترنت والمراقبة","critical",true,["system_config"]],
        ["MEDT-1.2.2","1.2.2","Credential Verification","التحقق من الشهادات","Digital credential verification and blockchain-based certificates","التحقق الرقمي من الشهادات والشهادات القائمة على البلوكتشين","high",true,["system_config"]],
        ["MEDT-1.2.3","1.2.3","Plagiarism Detection","كشف الانتحال","Implement plagiarism detection for academic submissions","تنفيذ كشف الانتحال للتقديمات الأكاديمية","high",true,["system_config"]],
      ])),
    ]),
    D("MEDT-D2","2","E-Learning Security","أمن التعلم الإلكتروني",[
      S("MEDT-2-1","2.1","LMS Security","أمن نظام إدارة التعلم",controls([
        ["MEDT-2.1.1","2.1.1","LMS Access Control","التحكم في الوصول لـ LMS","Role-based access control for LMS platforms","التحكم في الوصول القائم على الأدوار لمنصات LMS","critical",true,["system_config"]],
        ["MEDT-2.1.2","2.1.2","Content Protection","حماية المحتوى","Protect intellectual property of educational content","حماية الملكية الفكرية للمحتوى التعليمي","high",true,["drm_config"]],
        ["MEDT-2.1.3","2.1.3","Virtual Classroom Security","أمن الفصول الافتراضية","Secure virtual classroom sessions from unauthorized access","تأمين جلسات الفصول الافتراضية من الوصول غير المصرح به","high",true,["system_config"]],
        ["MEDT-2.1.4","2.1.4","Madrasati Platform","منصة مدرستي","Comply with Madrasati platform security requirements","الامتثال لمتطلبات أمن منصة مدرستي","critical",true,["compliance_report"]],
      ])),
      S("MEDT-2-2","2.2","Research Data","بيانات البحث",controls([
        ["MEDT-2.2.1","2.2.1","Research Ethics","أخلاقيات البحث","IRB approval for research involving student data","موافقة لجنة الأخلاقيات للبحث المتضمن بيانات الطلاب","critical",false,["irb_approval"]],
        ["MEDT-2.2.2","2.2.2","Research Data Security","أمن بيانات البحث","Secure research data storage and sharing","التخزين والمشاركة الآمنة لبيانات البحث","high",true,["system_config"]],
        ["MEDT-2.2.3","2.2.3","International Collaboration","التعاون الدولي","Secure data sharing for international research collaborations","مشاركة البيانات الآمنة للتعاون البحثي الدولي","high",false,["data_sharing_agreement"]],
      ])),
    ]),
  ],
});

export const ETEC_ASSESS: FrameworkDef = FW({
  id:"INST-KSA-ETEC-ASSESS",reg:"REG-KSA-ETEC",nEn:"Assessment & Accreditation IT Standards",nAr:"معايير تقنية المعلومات للتقويم والاعتماد",
  type:"standard",ver:"1.0",verId:"VER-KSA-ETEC-ASSESS-1-0",
  sectors:["SEC-KSA-EDU-UNIV","SEC-KSA-EDU-K12"],mandatory:true,
  sumEn:"ETEC standards for IT systems supporting educational assessment, testing, and institutional accreditation.",
  sumAr:"معايير هيئة تقويم التعليم والتدريب لأنظمة تقنية المعلومات الداعمة للتقويم والاختبارات.",
  tags:["assessment","accreditation","testing","education"],
  domains:[
    D("ETCA-D1","1","Testing System Security","أمن أنظمة الاختبارات",[
      S("ETCA-1-1","1.1","Exam Platform","منصة الاختبارات",controls([
        ["ETCA-1.1.1","1.1.1","Exam Data Security","أمن بيانات الاختبارات","Protect exam questions, answers, and scores","حماية أسئلة وإجابات ودرجات الاختبارات","critical",true,["system_config"]],
        ["ETCA-1.1.2","1.1.2","Exam Integrity","نزاهة الاختبارات","Prevent exam content leakage and cheating","منع تسريب محتوى الاختبارات والغش","critical",true,["system_config"]],
        ["ETCA-1.1.3","1.1.3","Score Transmission","نقل الدرجات","Secure score transmission and result publication","النقل الآمن للدرجات ونشر النتائج","critical",true,["system_config"]],
        ["ETCA-1.1.4","1.1.4","Testing Center Security","أمن مراكز الاختبار","Physical and cyber security for testing centers","الأمن المادي والسيبراني لمراكز الاختبار","critical",true,["system_config"]],
      ])),
    ]),
    D("ETCA-D2","2","Accreditation Systems","أنظمة الاعتماد",[
      S("ETCA-2-1","2.1","Accreditation Platform","منصة الاعتماد",controls([
        ["ETCA-2.1.1","2.1.1","Accreditation Data","بيانات الاعتماد","Protect institutional accreditation data","حماية بيانات اعتماد المؤسسات","critical",true,["system_config"]],
        ["ETCA-2.1.2","2.1.2","Self-Study Portal","بوابة الدراسة الذاتية","Secure self-study submission portal","تأمين بوابة تقديم الدراسة الذاتية","high",true,["system_config"]],
        ["ETCA-2.1.3","2.1.3","Reviewer Access","وصول المراجعين","Controlled access for accreditation reviewers","الوصول المتحكم به لمراجعي الاعتماد","high",true,["access_control"]],
      ])),
    ]),
  ],
});

export const EDUCATION_FRAMEWORKS: FrameworkDef[] = [MOE_EDTECH, ETEC_ASSESS];
