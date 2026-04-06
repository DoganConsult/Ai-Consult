import { Injectable, signal, effect } from '@angular/core';
import { TRANSLATIONS, Lang } from './translations';

@Injectable({ providedIn: 'root' })
export class I18nService {
  lang = signal<Lang>('en');

  constructor() {
    const saved = localStorage.getItem('ai_lang');
    if (saved === 'ar' || saved === 'en') {
      this.lang.set(saved);
    } else {
      const browserLang = navigator.language;
      if (browserLang.startsWith('ar')) this.lang.set('ar');
    }

    effect(() => {
      const current = this.lang();
      document.documentElement.lang = current;
      document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
      localStorage.setItem('ai_lang', current);
    });
  }

  t(key: string): string {
    const map = TRANSLATIONS[this.lang()];
    return map[key] || key;
  }

  toggle(): void {
    this.lang.update(l => l === 'en' ? 'ar' : 'en');
  }
}
