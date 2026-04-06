import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronDown, Home, Package, Users, Brain, FileText, GraduationCap, BarChart3, Settings, Sparkles, BookOpen, Shield, Rocket } from 'lucide-react';

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    { name: 'الرئيسية', icon: Home, href: '#hero', color: 'text-emerald-500' },
    { name: 'فريق الوكلاء', icon: Users, href: '#agents', color: 'text-purple-500' },
    { name: 'السيناريوهات', icon: Rocket, href: '#scenarios', color: 'text-blue-500' },
  ];

  const pages = [
    { name: 'المنتجات', nameEn: 'Products', icon: Package, page: 'Search', color: 'text-cyan-500' },
    { name: 'المستندات', nameEn: 'Documents', icon: FileText, page: 'DocumentManagement', color: 'text-orange-500' },
    { name: 'التدريب', nameEn: 'Training', icon: GraduationCap, page: 'TrainingManagement', color: 'text-green-500' },
    { name: 'المستشار الذكي', nameEn: 'AI Advisor', icon: Brain, page: 'Advisor', color: 'text-violet-500' },
    { name: 'التجربة التفاعلية', nameEn: 'Interactive Demo', icon: Sparkles, page: 'InteractiveDemo', color: 'text-pink-500' },
    { name: 'بوابات الموافقة', nameEn: 'Approval Gates', icon: Shield, page: 'ApprovalGates', color: 'text-amber-500' },
  ];

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsOpen(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-4"
          >
            {/* Sections on this page */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                أقسام الصفحة
              </h3>
              <div className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.name}
                    onClick={() => scrollToSection(section.href)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white transition-colors text-right group"
                  >
                    <section.icon className={`w-5 h-5 ${section.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{section.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Other pages */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                استكشف المزيد
              </h3>
              <div className="space-y-1">
                {pages.map((page) => (
                  <Link
                    key={page.page}
                    to={createPageUrl(page.page)}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${page.color.replace('text-', 'from-')} to-white/30 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <page.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm font-medium text-slate-900">{page.name}</div>
                      <div className="text-xs text-slate-500">{page.nameEn}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full shadow-xl shadow-emerald-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform relative"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? (
            <ChevronDown className="w-6 h-6" />
          ) : (
            <BookOpen className="w-6 h-6" />
          )}
        </motion.div>

        {/* Pulse indicator */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </div>
  );
}