import { Component, signal, inject, HostListener } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService, Lang } from '../../shared/i18n.service';

@Component({
  selector: 'app-language-switcher',
  imports: [LucideAngularModule],
  template: `
    <div class="relative">
      <button
        (click)="isOpen.set(!isOpen())"
        class="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 sm:border-transparent"
      >
        <lucide-icon [img]="icons.Globe" [size]="14"></lucide-icon>
        <span class="text-xs sm:text-sm font-medium">{{ currentLang().short }}</span>
        <lucide-icon [img]="icons.ChevronRight" [size]="12" class="rotate-90 text-gray-400"></lucide-icon>
      </button>

      @if (isOpen()) {
        <div class="absolute top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 min-w-[140px] z-50"
          [class.right-0]="true"
          [class.left-auto]="true"
        >
          @for (lang of languages; track lang.code) {
            <button
              (click)="selectLanguage(lang.code)"
              class="w-full px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2.5"
              [class.bg-blue-50]="i18n.lang() === lang.code"
              [class.text-blue-600]="i18n.lang() === lang.code"
              [class.font-medium]="i18n.lang() === lang.code"
              [class.text-gray-700]="i18n.lang() !== lang.code"
            >
              <span class="text-sm">{{ lang.flag }}</span>
              <span class="text-sm">{{ lang.name }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class LanguageSwitcherComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  isOpen = signal(false);

  languages = [
    { code: 'ar' as Lang, name: 'العربية', short: 'ع', flag: '🇸🇦' },
    { code: 'en' as Lang, name: 'English', short: 'EN', flag: '🇬🇧' },
    { code: 'tr' as Lang, name: 'Türkçe', short: 'TR', flag: '🇹🇷' },
  ];

  currentLang() {
    return this.languages.find((l) => l.code === this.i18n.lang()) ?? this.languages[0];
  }

  selectLanguage(code: Lang): void {
    this.i18n.setLang(code);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }
}
