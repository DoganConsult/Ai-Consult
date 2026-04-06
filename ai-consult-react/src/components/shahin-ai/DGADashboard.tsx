import { Building2, CheckCircle, FileCheck, Shield, Clock, TrendingUp, AlertCircle, Download } from 'lucide-react';

const dgaRequirements = [
  {
    category: 'Digital Identity',
    categoryAr: 'الهوية الرقمية',
    requirements: [
      { name: 'Authentication Standards', nameAr: 'معايير المصادقة', status: 'compliant', completion: 100 },
      { name: 'Access Management', nameAr: 'إدارة الوصول', status: 'compliant', completion: 100 },
      { name: 'Identity Verification', nameAr: 'التحقق من الهوية', status: 'compliant', completion: 98 }
    ]
  },
  {
    category: 'Data Governance',
    categoryAr: 'حوكمة البيانات',
    requirements: [
      { name: 'Data Classification', nameAr: 'تصنيف البيانات', status: 'compliant', completion: 100 },
      { name: 'Data Protection', nameAr: 'حماية البيانات', status: 'compliant', completion: 97 },
      { name: 'Data Retention', nameAr: 'الاحتفاظ بالبيانات', status: 'in-progress', completion: 85 }
    ]
  },
  {
    category: 'Security Controls',
    categoryAr: 'الضوابط الأمنية',
    requirements: [
      { name: 'Encryption Standards', nameAr: 'معايير التشفير', status: 'compliant', completion: 100 },
      { name: 'Incident Response', nameAr: 'الاستجابة للحوادث', status: 'compliant', completion: 95 },
      { name: 'Security Monitoring', nameAr: 'المراقبة الأمنية', status: 'compliant', completion: 100 }
    ]
  }
];

export function DGADashboard() {
  const overallCompliance = 96.7;

  return (
    <section id="dga" className="py-20 bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200 mb-4">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700">DGA Compliance Portal | بوابة هيئة الحكومة الرقمية</span>
          </div>
          <h2 className="text-4xl lg:text-5xl text-gray-900 mb-6">
            <span className="block mb-2">لوحة هيئة الحكومة الرقمية</span>
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Digital Government Authority Dashboard
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            متابعة مستمرة وآلية للامتثال لمتطلبات هيئة الحكومة الرقمية السعودية
          </p>
        </div>

        {/* Overall Compliance Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - overallCompliance / 100)}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#16a34a" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl text-gray-900">{overallCompliance}%</span>
                  <span className="text-sm text-gray-500">Compliance</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 grid sm:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                <div className="text-3xl text-gray-900 mb-1">28</div>
                <div className="text-sm text-gray-600 mb-1">Requirements Met</div>
                <div className="text-xs text-green-600">متطلبات مستوفاة</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <Clock className="w-8 h-8 text-blue-600 mb-3" />
                <div className="text-3xl text-gray-900 mb-1">1</div>
                <div className="text-sm text-gray-600 mb-1">In Progress</div>
                <div className="text-xs text-blue-600">قيد التنفيذ</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <TrendingUp className="w-8 h-8 text-purple-600 mb-3" />
                <div className="text-3xl text-gray-900 mb-1">+5.2%</div>
                <div className="text-sm text-gray-600 mb-1">This Quarter</div>
                <div className="text-xs text-purple-600">هذا الربع</div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Breakdown */}
        <div className="grid lg:grid-cols-3 gap-8">
          {dgaRequirements.map((category, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg text-gray-900">{category.categoryAr}</h3>
                  <p className="text-sm text-gray-500">{category.category}</p>
                </div>
              </div>

              <div className="space-y-4">
                {category.requirements.map((req, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {req.status === 'compliant' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        )}
                        <span className="text-sm text-gray-700">{req.nameAr}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        req.status === 'compliant' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {req.completion}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          req.status === 'compliant' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'
                        }`}
                        style={{ width: `${req.completion}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">{req.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Export Report CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl mb-3">جاهز لتقديم تقرير الامتثال؟</h3>
          <p className="text-blue-100 mb-6">Ready to submit your DGA compliance report?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="flex items-center justify-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all">
              <Download className="w-5 h-5" />
              <span>تحميل التقرير | Download Report</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-8 py-3 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all">
              <FileCheck className="w-5 h-5" />
              <span>تقديم للهيئة | Submit to DGA</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
