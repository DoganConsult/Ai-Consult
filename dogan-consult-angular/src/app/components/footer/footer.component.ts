import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { COMPANY_INFO } from '../../shared/constants';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';
import { ApiService } from '../../shared/api.service';

@Component({
  selector: 'app-footer',
  imports: [LucideAngularModule, TranslatePipe, FormsModule, RouterLink],
  template: `
    <footer id="contact" class="bg-gray-900 text-gray-300" role="contentinfo">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-6 sm:mb-8">

          <div class="col-span-2 lg:col-span-1 space-y-4">
            <a routerLink="/" class="flex items-center gap-2">
              <div class="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center" role="img" [attr.aria-label]="i18n.t('nav.brand')">
                <span class="text-white font-bold text-sm sm:text-base" aria-hidden="true">D</span>
              </div>
              <span class="text-white font-bold text-sm sm:text-base tracking-wide">{{ 'nav.brand' | translate }}</span>
            </a>
            <p class="text-gray-400 text-xs sm:text-sm leading-relaxed">{{ 'footer.tagline' | translate }}</p>
            <div class="space-y-1 text-xs text-gray-500">
              <p>{{ 'footer.founded' | translate }}</p>
              <p>{{ 'footer.regional' | translate }}</p>
              <p>{{ 'footer.ai_since' | translate }}</p>
            </div>
            <div class="flex gap-2.5">
              <a [href]="company.social.linkedin" target="_blank" rel="noopener noreferrer" class="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors" aria-label="LinkedIn">
                <lucide-icon [img]="icons.Linkedin" [size]="16" aria-hidden="true"></lucide-icon>
              </a>
              <a [href]="company.social.twitter" target="_blank" rel="noopener noreferrer" class="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors" aria-label="Twitter / X">
                <lucide-icon [img]="icons.Twitter" [size]="16" aria-hidden="true"></lucide-icon>
              </a>
            </div>
          </div>

          <div>
            <h4 class="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{{ 'footer.platforms_title' | translate }}</h4>
            <ul class="space-y-2.5 sm:space-y-3">
              <li>
                <a href="https://www.shahin-ai.com" target="_blank" rel="noopener noreferrer" class="hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium text-white">Shahin AI</a>
                <p class="text-[10px] sm:text-xs text-gray-500 mt-0.5">{{ 'footer.plat_shahin_desc' | translate }}</p>
              </li>
              <li>
                <a href="https://www.dogan-ai.com" target="_blank" rel="noopener noreferrer" class="hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium text-white">Dogan AI</a>
                <p class="text-[10px] sm:text-xs text-gray-500 mt-0.5">{{ 'footer.plat_doganai_desc' | translate }}</p>
              </li>
              <li>
                <a href="https://www.doganlap.com" target="_blank" rel="noopener noreferrer" class="hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium text-white">DoganLap</a>
                <p class="text-[10px] sm:text-xs text-gray-500 mt-0.5">{{ 'footer.plat_doganlab_desc' | translate }}</p>
              </li>
              <li>
                <a href="https://www.saudibusinessgate.com" target="_blank" rel="noopener noreferrer" class="hover:text-blue-400 transition-colors text-xs sm:text-sm font-medium text-white">Saudi Business Gate</a>
                <p class="text-[10px] sm:text-xs text-gray-500 mt-0.5">{{ 'footer.plat_sbg_desc' | translate }}</p>
              </li>
            </ul>
            <p class="mt-3 text-[10px] text-gray-600">{{ 'footer.plat_initiative' | translate }}</p>
          </div>

          <div>
            <h4 class="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{{ 'footer.offices_title' | translate }}</h4>
            <ul class="space-y-3 text-xs sm:text-sm">
              <li>
                <p class="text-white font-medium">{{ 'footer.office_egypt' | translate }}</p>
                <p class="text-gray-500 text-[10px] sm:text-xs">{{ 'footer.office_egypt_detail' | translate }}</p>
              </li>
              <li>
                <p class="text-white font-medium">{{ 'footer.office_turkey' | translate }}</p>
                <p class="text-gray-500 text-[10px] sm:text-xs">{{ 'footer.office_turkey_detail' | translate }}</p>
              </li>
              <li>
                <p class="text-white font-medium">{{ 'footer.office_ksa' | translate }}</p>
                <p class="text-gray-500 text-[10px] sm:text-xs">{{ 'footer.office_ksa_detail' | translate }}</p>
              </li>
            </ul>
          </div>

          <div class="col-span-2 lg:col-span-2">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <h4 class="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{{ 'footer.pages_title' | translate }}</h4>
                <ul class="space-y-2 sm:space-y-2.5">
                  <li><a routerLink="/about" class="hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'nav.about' | translate }}</a></li>
                  <li><a routerLink="/offices" class="hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'nav.offices' | translate }}</a></li>
                  <li><a routerLink="/products" class="hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'nav.products' | translate }}</a></li>
                  <li><a routerLink="/capabilities" class="hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'nav.capabilities' | translate }}</a></li>
                  <li><a routerLink="/contact" class="hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'nav.contact' | translate }}</a></li>
                </ul>
              </div>
              <div>
                <h4 class="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{{ 'footer.contact_title' | translate }}</h4>
                <ul class="space-y-2.5">
                  <li class="flex items-start gap-2">
                    <lucide-icon [img]="icons.Mail" [size]="14" class="text-blue-400 shrink-0 mt-0.5" aria-hidden="true"></lucide-icon>
                    <a [href]="'mailto:' + company.email" class="hover:text-blue-400 transition-colors text-xs sm:text-sm" dir="ltr">{{ company.email }}</a>
                  </li>
                  <li class="flex items-start gap-2">
                    <lucide-icon [img]="icons.Globe" [size]="14" class="text-blue-400 shrink-0 mt-0.5" aria-hidden="true"></lucide-icon>
                    <span class="text-xs sm:text-sm" dir="ltr">doganconsult.com</span>
                  </li>
                </ul>
                <div class="mt-4">
                  <h5 class="text-white font-medium mb-2 text-xs sm:text-sm">{{ 'footer.quick_message' | translate }}</h5>
                  @if (contactSent()) {
                    <p class="text-green-400 text-xs">{{ 'footer.message_sent' | translate }}</p>
                  } @else {
                    <form (ngSubmit)="sendQuickMessage()" class="space-y-2">
                      <input type="email" [(ngModel)]="quickEmail" name="qemail" required [placeholder]="i18n.t('booking.label_email')" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" [attr.aria-label]="i18n.t('booking.label_email')" />
                      <textarea [(ngModel)]="quickMsg" name="qmsg" rows="2" required [placeholder]="i18n.t('footer.message_placeholder')" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" [attr.aria-label]="i18n.t('footer.message_placeholder')"></textarea>
                      <button type="submit" [disabled]="contactSending()" class="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                        <lucide-icon [img]="icons.Send" [size]="12" aria-hidden="true"></lucide-icon>
                        {{ 'footer.send' | translate }}
                      </button>
                    </form>
                  }
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="pt-5 sm:pt-6 border-t border-gray-800">
          <div class="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mb-3">
            <p class="text-gray-400 text-xs sm:text-sm text-center sm:text-start">{{ 'footer.copyright' | translate }}</p>
            <div class="flex gap-4 sm:gap-6">
              <a routerLink="/legal" class="text-gray-400 hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'footer.privacy' | translate }}</a>
              <a routerLink="/legal" class="text-gray-400 hover:text-blue-400 transition-colors text-xs sm:text-sm">{{ 'footer.terms' | translate }}</a>
            </div>
          </div>
          <p class="text-center text-[10px] sm:text-xs text-gray-600">{{ 'footer.excellence' | translate }}</p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly icons = APP_ICONS;
  protected readonly company = COMPANY_INFO;
  i18n = inject(I18nService);
  private api = inject(ApiService);
  quickEmail = '';
  quickMsg = '';
  contactSending = signal(false);
  contactSent = signal(false);

  sendQuickMessage(): void {
    if (!this.quickEmail || !this.quickMsg) return;
    this.contactSending.set(true);
    this.api.submitContact({
      name: 'Footer Contact',
      email: this.quickEmail,
      message: this.quickMsg,
      lang: this.i18n.lang(),
    }).subscribe({
      next: () => {
        this.contactSending.set(false);
        this.contactSent.set(true);
      },
      error: () => {
        this.contactSending.set(false);
      },
    });
  }
}
