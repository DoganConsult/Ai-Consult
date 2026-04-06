import { Shield, FileText, Presentation, Database, Users, Zap } from 'lucide-react';

const modules = [
  {
    icon: FileText,
    title: 'RFP Intelligence',
    titleAr: 'ذكاء طلبات العروض',
    description: 'AI-powered RFP extraction, analysis, and requirement mapping with automated proposal generation',
    descriptionAr: 'استخراج وتحليل طلبات العروض مدعوم بالذكاء الاصطناعي مع إنشاء المقترحات تلقائياً',
    color: 'from-blue-500 to-blue-700',
    features: ['Smart Extraction', 'Auto-Analysis', 'Proposal Generator']
  },
  {
    icon: Shield,
    title: 'GRC Assessment',
    titleAr: 'تقييم الحوكمة والمخاطر',
    description: 'Integrated governance, risk, and compliance assessment powered by Shahin AI platform',
    descriptionAr: 'تقييم متكامل للحوكمة والمخاطر والامتثال بواسطة منصة شاهين الذكية',
    color: 'from-green-500 to-green-700',
    features: ['NCA/DGA Compliance', 'Risk Scoring', 'Evidence Trail']
  },
  {
    icon: Database,
    title: 'DGA Pack Generator',
    titleAr: 'مُنشئ حزمة DGA',
    description: 'Automated generation of Digital Government Authority compliance packages and documentation',
    descriptionAr: 'إنشاء تلقائي لحزم ووثائق الامتثال لهيئة الحكومة الرقمية',
    color: 'from-purple-500 to-purple-700',
    features: ['Auto Documentation', 'Compliance Pack', 'DGA Ready']
  },
  {
    icon: Presentation,
    title: 'Pitch Builder',
    titleAr: 'بناء العروض التقديمية',
    description: 'Professional pitch deck generation with data visualization and executive summaries',
    descriptionAr: 'إنشاء عروض تقديمية احترافية مع تصور البيانات والملخصات التنفيذية',
    color: 'from-orange-500 to-orange-700',
    features: ['Auto Design', 'Data Viz', 'Export Ready']
  },
  {
    icon: Database,
    title: 'Evidence Hub',
    titleAr: 'مركز الأدلة',
    description: 'Centralized evidence repository with traceability and audit trail capabilities',
    descriptionAr: 'مستودع مركزي للأدلة مع إمكانيات التتبع وسجل التدقيق',
    color: 'from-cyan-500 to-cyan-700',
    features: ['Central Repository', 'Full Traceability', 'Audit Ready']
  },
  {
    icon: Users,
    title: 'DoganHub Integration',
    titleAr: 'تكامل DoganHub',
    description: 'Command center for customer engagement, partner collaboration, and ecosystem management',
    descriptionAr: 'مركز القيادة لإشراك العملاء والتعاون مع الشركاء وإدارة النظام البيئي',
    color: 'from-indigo-500 to-indigo-700',
    features: ['Partner Network', 'Customer Portal', 'Ecosystem Control']
  }
];

export function Modules() {
  return (
    <section id="modules" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200 mb-4">
            <Zap className="w-4 h-4 text-blue-700" />
            <span className="text-blue-800">Platform Modules | وحدات المنصة</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">منصة متكاملة من 6 وحدات قوية</span>
            <span className="bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
              Integrated 6-Module Platform
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            من طلب العرض إلى التقديم النهائي - سير عمل تلقائي كامل للتميز في الأعمال
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <module.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl text-gray-900 mb-2">{module.titleAr}</h3>
              <h4 className="text-sm text-blue-700 mb-4">{module.title}</h4>
              
              <p className="text-sm text-gray-600 mb-4">{module.descriptionAr}</p>
              <p className="text-xs text-gray-500 mb-6">{module.description}</p>
              
              <div className="flex flex-wrap gap-2">
                {module.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Integration Note */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 border border-blue-100">
          <div className="text-center">
            <h3 className="text-2xl text-gray-900 mb-3">تكامل سلس عبر ERPNext</h3>
            <p className="text-lg text-gray-600 mb-2">Seamlessly Integrated Through ERPNext</p>
            <p className="text-gray-500">
              جميع الوحدات تعمل معاً من خلال تكامل ERPNext لتقديم تجربة موحدة وقوية
            </p>
            <p className="text-sm text-gray-400 mt-2">
              All modules work together through ERPNext integration for unified business excellence
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
