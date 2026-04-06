import { Shield, Target, AlertTriangle, BarChart3, FileText, Users, Zap, Lock } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Governance Framework',
    titleAr: 'إطار الحوكمة',
    description: 'Establish and maintain comprehensive governance policies aligned with Saudi regulations',
    descriptionAr: 'إنشاء وصيانة سياسات الحوكمة الشاملة المتوافقة مع اللوائح السعودية',
    color: 'from-green-500 to-green-700'
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment',
    titleAr: 'تقييم المخاطر',
    description: 'Automated risk identification, scoring, and mitigation tracking with AI-powered insights',
    descriptionAr: 'تحديد المخاطر تلقائياً وتسجيل النقاط وتتبع التخفيف مع رؤى مدعومة بالذكاء الاصطناعي',
    color: 'from-orange-500 to-orange-700'
  },
  {
    icon: FileText,
    title: 'Compliance Management',
    titleAr: 'إدارة الامتثال',
    description: 'Track and manage compliance with NCA, DGA, PDPL, and international standards',
    descriptionAr: 'تتبع وإدارة الامتثال مع الهيئة الوطنية والحكومة الرقمية وقانون البيانات والمعايير الدولية',
    color: 'from-blue-500 to-blue-700'
  },
  {
    icon: Target,
    title: 'Policy Automation',
    titleAr: 'أتمتة السياسات',
    description: 'Automatically enforce policies, generate reports, and ensure continuous compliance',
    descriptionAr: 'فرض السياسات تلقائياً وإنشاء التقارير وضمان الامتثال المستمر',
    color: 'from-purple-500 to-purple-700'
  },
  {
    icon: Users,
    title: 'Access Control',
    titleAr: 'التحكم في الوصول',
    description: 'Role-based access control with audit trails and permission management',
    descriptionAr: 'التحكم في الوصول القائم على الدور مع سجلات التدقيق وإدارة الأذونات',
    color: 'from-indigo-500 to-indigo-700'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    titleAr: 'التحليلات والتقارير',
    description: 'Real-time dashboards, compliance metrics, and executive-ready reports',
    descriptionAr: 'لوحات معلومات في الوقت الفعلي ومقاييس الامتثال وتقارير جاهزة للإدارة',
    color: 'from-cyan-500 to-cyan-700'
  },
  {
    icon: Zap,
    title: 'Automated Workflows',
    titleAr: 'سير العمل التلقائي',
    description: 'Streamline approval processes, notifications, and compliance tasks',
    descriptionAr: 'تبسيط عمليات الموافقة والإشعارات ومهام الامتثال',
    color: 'from-yellow-500 to-yellow-700'
  },
  {
    icon: Lock,
    title: 'Data Protection',
    titleAr: 'حماية البيانات',
    description: 'PDPL-compliant data handling, encryption, and privacy management',
    descriptionAr: 'معالجة البيانات المتوافقة مع قانون البيانات والتشفير وإدارة الخصوصية',
    color: 'from-red-500 to-red-700'
  }
];

export function GRCModule() {
  return (
    <section id="grc" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200 mb-4">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-green-700">GRC Module | وحدة الحوكمة والمخاطر والامتثال</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">منصة الحوكمة والمخاطر والامتثال الشاملة</span>
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Comprehensive GRC Platform
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            نظام متكامل يجمع بين الحوكمة وإدارة المخاطر والامتثال في منصة واحدة قوية
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-green-300 hover:shadow-xl transition-all duration-300 group"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg text-gray-900 mb-2">{feature.titleAr}</h3>
              <h4 className="text-sm text-green-600 mb-3">{feature.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{feature.descriptionAr}</p>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <a
              href="#demo"
              className="px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
            >
              احجز عرض توضيحي | Request GRC Demo
            </a>
            <a
              href="#pricing"
              className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-xl hover:border-green-600 transition-all"
            >
              عرض الأسعار | View Pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
