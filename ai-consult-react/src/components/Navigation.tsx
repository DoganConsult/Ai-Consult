import { Menu, X, LogIn, Calendar } from 'lucide-react';
import { useState } from 'react';
import { BookingForm } from './BookingForm';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div>
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar with Language Switcher */}
          <div className="flex justify-end items-center py-2 border-b border-gray-100">
            <LanguageSwitcher />
          </div>

          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white">D</span>
                </div>
                <div>
                  <span className="text-gray-900 block">Dogan Consult</span>
                  <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Engineering Excellence</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#solutions" className="text-gray-600 hover:text-blue-600 transition-colors">الحلول | Solutions</a>
              <a href="#services" className="text-gray-600 hover:text-blue-600 transition-colors">الخدمات | Services</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">النتائج | Results</a>
              <button 
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول | Login</span>
              </button>
              <button 
                onClick={() => setShowBooking(true)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>احجز عرض | Book Demo</span>
              </button>
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
            <div className="md:hidden py-4 space-y-4">
              <a href="#solutions" className="block text-gray-600 hover:text-blue-600 transition-colors">الحلول | Solutions</a>
              <a href="#services" className="block text-gray-600 hover:text-blue-600 transition-colors">الخدمات | Services</a>
              <a href="#testimonials" className="block text-gray-600 hover:text-blue-600 transition-colors">النتائج | Results</a>
              <button 
                onClick={() => setShowLogin(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 text-gray-600 hover:text-blue-600 transition-colors border border-gray-200 rounded-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول | Login</span>
              </button>
              <button 
                onClick={() => setShowBooking(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>احجز عرض | Book Demo</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">D</span>
              </div>
              <h2 className="text-gray-900 text-2xl mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your dashboard</p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Username or Agent ID</label>
                <input 
                  type="text" 
                  placeholder="Enter your credentials"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700">Forgot password?</a>
              </div>

              <button 
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>

              <div className="text-center text-gray-600">
                Need access? <a href="#" className="text-blue-600 hover:text-blue-700">Contact Admin</a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBooking && <BookingForm onClose={() => setShowBooking(false)} />}
    </div>
  );
}
