import { Component, inject } from '@angular/core';
import { I18nService, Lang } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-language-switcher',
  template: `
    <button (click)="toggle()" class="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-violet-500/30 transition-all bg-white/5">
      {{ i18n.lang() === 'ar' ? 'EN' : 'عربي' }}
    </button>
  `,
})
export class LanguageSwitcherComponent {
  i18n = inject(I18nService);
  toggle(): void {
    this.i18n.setLang(this.i18n.lang() === 'ar' ? 'en' : 'ar');
  }
}
