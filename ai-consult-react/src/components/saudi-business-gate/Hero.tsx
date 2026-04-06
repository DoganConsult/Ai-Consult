import { Handshake, Sparkles, ArrowLeft, CheckCircle, TrendingUp, Building2 } from 'lucide-react';

export function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Handshake className="w-4 h-4 text-green-400" />
              <span className="text-white">بوابة الأعمال السعودية | Saudi Business Gateway</span>
            </div>

            <h1 className="text-5xl lg:text-6xl leading-tight">
              <span className="block mb-2">منصة الأعمال الذكية</span>
              <span className="block mb-2">للمؤسسات والحكومة</span>
              <span className="bg-gradient-to-r from-green-400 to-blue-300 bg-clip-text text-transparent block">
                Autonomous Business Platform
              </span>
            </h1>

            <p className="text-xl text-blue-100 leading-relaxed">
              منصة متعددة المستأجرين تدمج التعاون التقني مع الابتكار والريادة - بوابتك للتميز في السوق السعودي
            </p>
            <p className="text-lg text-blue-200">
              Multi-tenant platform integrating tech cooperation, innovation, and business excellence in Saudi Arabia
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#modules"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-900 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
              >
                <span>استكشف المنصة | Explore Platform</span>
                <ArrowLeft className="w-5 h-5" />
              </a>
              <a
                href="#contact"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all"
              >
                <span>احجز عرض | Request Demo</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-blue-100">Enterprise-Grade | مؤسسي</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-blue-100">Multi-Tenant | متعدد المستأجرين</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-blue-100">Saudi-First | السعودية أولاً</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            {/* Main Platform Preview */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg flex items-center justify-center">
                    <Handshake className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white">لوحة القيادة | Command Center</h3>
                    <p className="text-sm text-blue-200">Real-time Business Gateway</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-400/20 text-green-300 rounded-lg text-sm border border-green-400/30">
                  Active
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <Building2 className="w-6 h-6 text-blue-300 mb-2" />
                  <div className="text-2xl text-white mb-1">247</div>
                  <div className="text-xs text-blue-200">Active Partners</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <Sparkles className="w-6 h-6 text-green-300 mb-2" />
                  <div className="text-2xl text-white mb-1">1,523</div>
                  <div className="text-xs text-blue-200">Innovations</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <TrendingUp className="w-6 h-6 text-purple-300 mb-2" />
                  <div className="text-2xl text-white mb-1">98.5%</div>
                  <div className="text-xs text-blue-200">Success Rate</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <CheckCircle className="w-6 h-6 text-yellow-300 mb-2" />
                  <div className="text-2xl text-white mb-1">24/7</div>
                  <div className="text-xs text-blue-200">Autonomous</div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="space-y-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">New RFP received</span>
                    <span className="text-xs text-blue-300">2m ago</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">GRC assessment completed</span>
                    <span className="text-xs text-blue-300">15m ago</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Partner collaboration started</span>
                    <span className="text-xs text-blue-300">1h ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-br from-green-500 to-blue-500 text-white rounded-2xl p-4 shadow-xl z-20">
              <div className="text-sm mb-1">Platform Status</div>
              <div className="text-2xl">Operational</div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-gradient-to-br from-blue-500 to-green-500 rounded-full blur-3xl opacity-20 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
