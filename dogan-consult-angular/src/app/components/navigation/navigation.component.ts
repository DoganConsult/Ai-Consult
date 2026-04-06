import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-navigation',
  imports: [LucideAngularModule, LanguageSwitcherComponent, BookingFormComponent, TranslatePipe, RouterLink, RouterLinkActive],
  template: `
    <div>
      <a href="#main-content" class="skip-link">{{ 'a11y.skip_to_content' | translate }}</a>
      <nav class="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300" [attr.aria-label]="i18n.t('a11y.main_nav')">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16 sm:h-[72px]">
            <a routerLink="/" class="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div class="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg shrink-0" role="img" [attr.aria-label]="i18n.t('nav.brand')">
                <span class="text-white font-bold text-base sm:text-lg" aria-hidden="true">D</span>
              </div>
              <div class="min-w-0">
                <span class="text-gray-900 font-bold block text-sm sm:text-base tracking-wide truncate">{{ 'nav.brand' | translate }}</span>
                <span class="text-[10px] sm:text-xs text-gray-500 font-medium tracking-wider uppercase hidden xs:block">{{ 'nav.tagline' | translate }}</span>
              </div>
            </a>

            <div class="hidden lg:flex items-center gap-6" role="menubar">
              <a routerLink="/about" routerLinkActive="text-blue-600" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium" role="menuitem">{{ 'nav.about' | translate }}</a>
              <a routerLink="/offices" routerLinkActive="text-blue-600" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium" role="menuitem">{{ 'nav.offices' | translate }}</a>
              <div class="relative group">
                <button class="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium" role="menuitem">
                  {{ 'nav.products' | translate }}
                  <lucide-icon [img]="icons.ChevronDown" [size]="14" aria-hidden="true"></lucide-icon>
                </button>
                <div class="absolute top-full start-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                  <a routerLink="/products/shahin-ai" class="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Shahin AI</a>
                  <a routerLink="/products/dogan-ai" class="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Dogan AI</a>
                  <a routerLink="/products/doganlab" class="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">DoganLap</a>
                  <a routerLink="/products/saudi-business-gate" class="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">Saudi Business Gate</a>
                  <a routerLink="/products/openclaw" class="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors">OpenClaw Server</a>
                  <div class="border-t border-gray-100 mt-1 pt-1">
                    <a routerLink="/products" class="block px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors">{{ 'nav.all_products' | translate }}</a>
                  </div>
                </div>
              </div>
              <a routerLink="/capabilities" routerLinkActive="text-blue-600" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium" role="menuitem">{{ 'nav.capabilities' | translate }}</a>
              <a routerLink="/contact" routerLinkActive="text-blue-600" class="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium" role="menuitem">{{ 'nav.contact' | translate }}</a>
              <button (click)="showBooking.set(true)" class="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm" role="menuitem">
                <lucide-icon [img]="icons.Calendar" [size]="16" aria-hidden="true"></lucide-icon>
                <span>{{ 'nav.cta' | translate }}</span>
              </button>
            </div>

            <div class="flex items-center gap-1 sm:gap-2 lg:hidden">
              <app-language-switcher />
              <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors" (click)="isOpen.set(!isOpen())" [attr.aria-expanded]="isOpen()" aria-controls="mobile-menu" [attr.aria-label]="i18n.t('a11y.toggle_menu')">
                @if (isOpen()) {
                  <lucide-icon [img]="icons.X" [size]="22" aria-hidden="true"></lucide-icon>
                } @else {
                  <lucide-icon [img]="icons.Menu" [size]="22" aria-hidden="true"></lucide-icon>
                }
              </button>
            </div>

            <div class="hidden lg:block">
              <app-language-switcher />
            </div>
          </div>

          @if (isOpen()) {
            <div id="mobile-menu" class="lg:hidden py-3 space-y-1 border-t border-gray-100" role="menu">
              <a routerLink="/about" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-sm" role="menuitem">{{ 'nav.about' | translate }}</a>
              <a routerLink="/offices" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-sm" role="menuitem">{{ 'nav.offices' | translate }}</a>
              <button (click)="productsOpen.set(!productsOpen())" class="w-full flex items-center justify-between px-3 py-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-sm" role="menuitem">
                {{ 'nav.products' | translate }}
                <lucide-icon [img]="icons.ChevronDown" [size]="14" [class]="productsOpen() ? 'rotate-180' : ''" class="transition-transform" aria-hidden="true"></lucide-icon>
              </button>
              @if (productsOpen()) {
                <div class="ps-6 space-y-1">
                  <a routerLink="/products/shahin-ai" (click)="isOpen.set(false)" class="block px-3 py-2 text-gray-500 hover:text-blue-600 text-sm" role="menuitem">Shahin AI</a>
                  <a routerLink="/products/dogan-ai" (click)="isOpen.set(false)" class="block px-3 py-2 text-gray-500 hover:text-blue-600 text-sm" role="menuitem">Dogan AI</a>
                  <a routerLink="/products/doganlab" (click)="isOpen.set(false)" class="block px-3 py-2 text-gray-500 hover:text-blue-600 text-sm" role="menuitem">DoganLap</a>
                  <a routerLink="/products/saudi-business-gate" (click)="isOpen.set(false)" class="block px-3 py-2 text-gray-500 hover:text-blue-600 text-sm" role="menuitem">Saudi Business Gate</a>
                  <a routerLink="/products/openclaw" (click)="isOpen.set(false)" class="block px-3 py-2 text-gray-500 hover:text-blue-600 text-sm" role="menuitem">OpenClaw Server</a>
                </div>
              }
              <a routerLink="/capabilities" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-sm" role="menuitem">{{ 'nav.capabilities' | translate }}</a>
              <a routerLink="/contact" (click)="isOpen.set(false)" class="block px-3 py-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-sm" role="menuitem">{{ 'nav.contact' | translate }}</a>
              <div class="pt-2">
                <button (click)="showBooking.set(true); isOpen.set(false)" class="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium" role="menuitem">
                  <lucide-icon [img]="icons.Calendar" [size]="16" aria-hidden="true"></lucide-icon>
                  <span>{{ 'nav.cta' | translate }}</span>
                </button>
              </div>
            </div>
          }
        </div>
      </nav>

      @if (showBooking()) {
        <app-booking-form (close)="showBooking.set(false)" />
      }
    </div>
  `,
})
export class NavigationComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  isOpen = signal(false);
  showBooking = signal(false);
  productsOpen = signal(false);
}
