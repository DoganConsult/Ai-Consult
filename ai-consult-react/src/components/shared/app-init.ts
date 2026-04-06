export function initializeApp(brand: string) {
  // Set Brand
  document.documentElement.setAttribute('data-brand', brand);

  // Set Language/Dir from localStorage or default to Arabic
  const savedLang = localStorage.getItem('language') || 'ar';
  document.documentElement.setAttribute('lang', savedLang);
  
  if (savedLang === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }
}
