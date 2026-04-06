import { Injectable, signal } from '@angular/core';
import { TRANSLATIONS } from './translations';

export type Lang = 'en' | 'ar' | 'tr';

@Injectable({ providedIn: 'root' })
export class I18nService {
  lang = signal<Lang>('ar');

  constructor() {
    const saved = localStorage.getItem('dc_lang') as Lang | null;
    const urlLang = new URLSearchParams(window.location.search).get('lang') as Lang | null;
    const initial = urlLang || saved || 'ar';
    if (['en', 'ar', 'tr'].includes(initial)) {
      this.lang.set(initial as Lang);
    }
    this.applyDir(this.lang());
  }

  t(key: string): string {
    return TRANSLATIONS[this.lang()]?.[key] ?? TRANSLATIONS['en'][key] ?? key;
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem('dc_lang', lang);
    this.applyDir(lang);
  }

  private applyDir(lang: Lang): void {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }
}
