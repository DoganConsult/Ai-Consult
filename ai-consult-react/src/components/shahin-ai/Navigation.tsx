import { Menu, X, Shield, Calendar } from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-gray-900 block">Shahin AI</span>
              <span className="text-xs bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                شاهين | موضّح الامتثال
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#grc" className="text-gray-600 hover:text-green-600 transition-colors">
              الحوكمة والمخاطر | GRC
            </a>
            <a href="#dga" className="text-gray-600 hover:text-green-600 transition-colors">
              هيئة الحكومة الرقمية | DGA
            </a>
            <a href="#evidence" className="text-gray-600 hover:text-green-600 transition-colors">
              تتبع الأدلة | Evidence
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-green-600 transition-colors">
              الأسعار | Pricing
            </a>
            <a
              href="#demo"
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>احجز عرض | Request Demo</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-gray-100">
            <a href="#grc" className="block text-gray-600 hover:text-green-600 transition-colors">
              الحوكمة والمخاطر | GRC
            </a>
            <a href="#dga" className="block text-gray-600 hover:text-green-600 transition-colors">
              هيئة الحكومة الرقمية | DGA
            </a>
            <a href="#evidence" className="block text-gray-600 hover:text-green-600 transition-colors">
              تتبع الأدلة | Evidence
            </a>
            <a href="#pricing" className="block text-gray-600 hover:text-green-600 transition-colors">
              الأسعار | Pricing
            </a>
            <a
              href="#demo"
              className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>احجز عرض | Request Demo</span>
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
