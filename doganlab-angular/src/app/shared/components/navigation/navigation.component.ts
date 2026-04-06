import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcherComponent],
  template: `
    <a href="#main-content" class="skip-link">{{ 'a11y.skip_to_content' | translate }}</a>
    <nav class="fixed top-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5 z-50" [attr.aria-label]="i18n.t('a11y.main_nav')">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <a routerLink="/" class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span class="text-white font-bold text-sm">DL</span>
            </div>
            <div>
              <span class="text-white font-semibold text-sm block">{{ 'nav.brand' | translate }}</span>
              <span class="text-[10px] text-violet-400 font-medium">{{ 'nav.tagline' | translate }}</span>
            </div>
          </a>

          <div class="hidden md:flex items-center gap-6">
            <a routerLink="/" routerLinkActive="text-violet-400" [routerLinkActiveOptions]="{exact:true}" class="text-gray-400 hover:text-white transition-colors text-sm">{{ 'nav.home' | translate }}</a>
            <a routerLink="/products" routerLinkActive="text-violet-400" class="text-gray-400 hover:text-white transition-colors text-sm">{{ 'nav.products' | translate }}</a>
            <a routerLink="/contact" routerLinkActive="text-violet-400" class="text-gray-400 hover:text-white transition-colors text-sm">{{ 'nav.contact' | translate }}</a>
            <a href="https://doganconsult.com" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-gray-300 transition-colors text-xs">{{ 'nav.main_site' | translate }}</a>
            <app-language-switcher />
          </div>

          <div class="flex items-center gap-2 md:hidden">
            <app-language-switcher />
            <button class="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400" (click)="isOpen.set(!isOpen())" [attr.aria-expanded]="isOpen()" [attr.aria-label]="i18n.t('a11y.toggle_menu')">
              @if (isOpen()) {
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
              }
            </button>
          </div>
        </div>

        @if (isOpen()) {
          <div class="md:hidden py-3 space-y-1 border-t border-white/5">
            <a routerLink="/" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-sm">{{ 'nav.home' | translate }}</a>
            <a routerLink="/products" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-sm">{{ 'nav.products' | translate }}</a>
            <a routerLink="/contact" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg text-sm">{{ 'nav.contact' | translate }}</a>
            <a href="https://doganconsult.com" target="_blank" class="block px-3 py-2.5 text-gray-500 hover:text-gray-300 rounded-lg text-xs">{{ 'nav.main_site' | translate }}</a>
          </div>
        }
      </div>
    </nav>
  `,
})
export class NavigationComponent {
  i18n = inject(I18nService);
  isOpen = signal(false);
}
