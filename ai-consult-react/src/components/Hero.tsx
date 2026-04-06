import { ArrowRight, Sparkles } from 'lucide-react';
import ecosystemImage from 'figma:asset/e36e797fc5c3005e881e8811feeb0ac7e0f3cb05.png';

export function Hero() {
  return (
    <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600">AI-Powered ICT Solutions</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-gray-900">
                Transforming Business with 
                <span className="block bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Intelligent Solutions
                </span>
              </h1>
              <p className="text-gray-600 text-lg max-w-xl">
                Leading AI and ICT consulting engineering company in Saudi Arabia, delivering enterprise-grade solutions through our comprehensive ecosystem.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                Explore Solutions
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-white text-gray-900 rounded-lg border border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-colors">
                Schedule Consultation
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200">
              <div>
                <div className="text-blue-600">500+</div>
                <div className="text-gray-600">Projects</div>
              </div>
              <div>
                <div className="text-blue-600">98%</div>
                <div className="text-gray-600">Satisfaction</div>
              </div>
              <div>
                <div className="text-blue-600">24/7</div>
                <div className="text-gray-600">Support</div>
              </div>
            </div>
          </div>

          {/* Right Content - Ecosystem Diagram */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <img 
                src={ecosystemImage} 
                alt="Dogan Solutions Ecosystem"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
