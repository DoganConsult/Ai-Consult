import { Shield, CheckCircle, ArrowLeft, TrendingUp, Lock, FileCheck } from 'lucide-react';

export function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-green-700">شاهين | موضّح الامتثال | Clarifier of Compliance</span>
            </div>

            <h1 className="text-5xl lg:text-6xl text-gray-900 leading-tight">
              <span className="block mb-2">منصة الامتثال</span>
              <span className="block mb-2">والحوكمة الذكية</span>
              <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent block">
                Intelligent GRC Platform
              </span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              نظام متقدم لإدارة الامتثال والحوكمة يضمن الالتزام باللوائح السعودية، تقييم المخاطر، وتنفيذ السياسات تلقائياً.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#demo"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span>ابدأ الآن | Start Free Trial</span>
                <ArrowLeft className="w-5 h-5" />
              </a>
              <a
                href="#grc"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl border-2 border-gray-200 hover:border-green-600 transition-all"
              >
                <span>استكشف المنصة | Explore Platform</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-600">NCA Aligned | متوافق مع الهيئة الوطنية</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-600">DGA Certified | معتمد من الحكومة الرقمية</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-600">PDPL Compliant | ملتزم بقانون البيانات</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            {/* Main Dashboard Preview */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-900">لوحة الامتثال | Compliance Dashboard</h3>
                    <p className="text-sm text-gray-500">Real-time GRC Monitoring</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm">
                  98.7% Compliant
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <Lock className="w-6 h-6 text-green-600 mb-2" />
                  <div className="text-2xl text-gray-900 mb-1">156</div>
                  <div className="text-xs text-gray-600">Controls Active</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <FileCheck className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="text-2xl text-gray-900 mb-1">2,847</div>
                  <div className="text-xs text-gray-600">Evidence Items</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                  <div className="text-2xl text-gray-900 mb-1">24/7</div>
                  <div className="text-xs text-gray-600">Auto Monitoring</div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">NCA Controls</span>
                    <span className="text-green-600">100%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">DGA Requirements</span>
                    <span className="text-green-600">98%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">PDPL Compliance</span>
                    <span className="text-green-600">97%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '97%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-600 to-blue-600 text-white rounded-2xl p-4 shadow-xl z-20">
              <div className="text-sm mb-1">Compliance Score</div>
              <div className="text-3xl">98.7%</div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-4 -left-4 w-64 h-64 bg-gradient-to-br from-green-200 to-blue-200 rounded-full blur-3xl opacity-20 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
