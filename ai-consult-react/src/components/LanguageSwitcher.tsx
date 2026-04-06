import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const [language, setLanguage] = useState<'ar' | 'en' | 'tr'>('ar');
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' }
  ];

  useEffect(() => {
    // Initialize from localStorage or default
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | 'tr';
    if (savedLang) {
      setLanguage(savedLang);
      updateDocument(savedLang);
    }
  }, []);

  const updateDocument = (code: 'ar' | 'en' | 'tr') => {
    if (code === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', code);
    }
  };

  const handleLanguageChange = (code: 'ar' | 'en' | 'tr') => {
    setLanguage(code);
    setIsOpen(false);
    localStorage.setItem('language', code);
    updateDocument(code);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{languages.find(l => l.code === language)?.flag}</span>
        <span className="text-sm">{languages.find(l => l.code === language)?.name}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[150px] z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code as 'ar' | 'en' | 'tr')}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span className="text-sm">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
