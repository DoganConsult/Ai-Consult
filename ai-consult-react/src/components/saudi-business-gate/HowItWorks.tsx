import { FileText, Search, Shield, Package, Presentation, Send, ArrowLeft } from 'lucide-react';

const workflow = [
  {
    step: 1,
    icon: FileText,
    title: 'RFP Received',
    titleAr: 'استلام طلب العرض',
    description: 'Upload or auto-capture RFP from email/portal',
    descriptionAr: 'تحميل أو التقاط تلقائي لطلب العرض من البريد/البوابة',
    color: 'from-blue-500 to-blue-600',
    output: 'Extracted Requirements'
  },
  {
    step: 2,
    icon: Search,
    title: 'AI Analysis',
    titleAr: 'تحليل ذكي',
    description: 'Extract requirements, scope, and evaluation criteria',
    descriptionAr: 'استخراج المتطلبات والنطاق ومعايير التقييم',
    color: 'from-purple-500 to-purple-600',
    output: 'Requirement Matrix'
  },
  {
    step: 3,
    icon: Shield,
    title: 'GRC Assessment',
    titleAr: 'تقييم الحوكمة',
    description: 'Automatic compliance check via Shahin AI',
    descriptionAr: 'فحص الامتثال التلقائي عبر شاهين',
    color: 'from-green-500 to-green-600',
    output: 'Compliance Score'
  },
  {
    step: 4,
    icon: Package,
    title: 'DGA Pack',
    titleAr: 'حزمة DGA',
    description: 'Generate compliance documentation package',
    descriptionAr: 'إنشاء حزمة وثائق الامتثال',
    color: 'from-cyan-500 to-cyan-600',
    output: 'Documentation Ready'
  },
  {
    step: 5,
    icon: Presentation,
    title: 'Pitch Generation',
    titleAr: 'إنشاء العرض',
    description: 'Auto-create professional proposal/pitch deck',
    descriptionAr: 'إنشاء تلقائي لمقترح/عرض تقديمي احترافي',
    color: 'from-orange-500 to-orange-600',
    output: 'Pitch Ready'
  },
  {
    step: 6,
    icon: Send,
    title: 'Submission',
    titleAr: 'التقديم',
    description: 'Review, approve, and submit via platform',
    descriptionAr: 'مراجعة واعتماد وتقديم عبر المنصة',
    color: 'from-red-500 to-red-600',
    output: 'Submitted'
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200 mb-4">
            <span className="text-blue-800">Workflow | سير العمل</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">كيف يعمل النظام؟</span>
            <span className="bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">
              How Does It Work?
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            من طلب العرض إلى التقديم النهائي في 6 خطوات تلقائية
          </p>
        </div>

        {/* Workflow Timeline */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-green-200 to-orange-200"></div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workflow.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Step Card */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 hover:shadow-2xl hover:border-blue-300 transition-all group">
                  {/* Step Number Badge */}
                  <div className="absolute -top-4 -right-4 w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-full flex items-center justify-center text-white shadow-lg z-10">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl text-gray-900 mb-2">{step.titleAr}</h3>
                  <h4 className="text-sm text-blue-700 mb-4">{step.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{step.descriptionAr}</p>
                  <p className="text-xs text-gray-500 mb-4">{step.description}</p>

                  {/* Output Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100">
                    <ArrowLeft className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">{step.output}</span>
                  </div>
                </div>

                {/* Arrow Connector (mobile) */}
                {index < workflow.length - 1 && (
                  <div className="lg:hidden flex justify-center my-4">
                    <ArrowLeft className="w-6 h-6 text-blue-300 transform rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time Savings */}
        <div className="mt-16 bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-8 text-white text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl mb-2">95%</div>
              <div className="text-blue-200">Time Saved</div>
              <div className="text-sm text-blue-300">توفير في الوقت</div>
            </div>
            <div>
              <div className="text-4xl mb-2">48 hrs → 2 hrs</div>
              <div className="text-blue-200">Proposal Time</div>
              <div className="text-sm text-blue-300">وقت إعداد المقترح</div>
            </div>
            <div>
              <div className="text-4xl mb-2">100%</div>
              <div className="text-blue-200">Compliance</div>
              <div className="text-sm text-blue-300">الامتثال</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
