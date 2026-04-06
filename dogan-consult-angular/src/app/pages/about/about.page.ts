import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';
import { COMPANY_INFO } from '../../shared/constants';

@Component({
  selector: 'app-about-page',
  imports: [LucideAngularModule, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <lucide-icon [img]="icons.Info" [size]="14" class="text-blue-600" aria-hidden="true"></lucide-icon>
            <span class="text-blue-600 font-medium text-sm">{{ 'about.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{{ 'about.title' | translate }}</h1>
          <p class="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">{{ 'about.subtitle' | translate }}</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8 sm:gap-12 mb-16">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ 'about.mission_title' | translate }}</h2>
            <p class="text-gray-600 leading-relaxed mb-6">{{ 'about.mission_desc' | translate }}</p>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ 'about.vision_title' | translate }}</h2>
            <p class="text-gray-600 leading-relaxed">{{ 'about.vision_desc' | translate }}</p>
          </div>
          <div class="space-y-4">
            @for (val of values; track val.key) {
              <div class="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <lucide-icon [img]="val.icon" [size]="20" class="text-blue-600" aria-hidden="true"></lucide-icon>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 mb-1">{{ val.key + '_title' | translate }}</h3>
                  <p class="text-gray-600 text-sm">{{ val.key + '_desc' | translate }}</p>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 sm:p-12 text-white">
          <h2 class="text-2xl font-bold mb-6 text-center">{{ 'about.stats_title' | translate }}</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">15+</div>
              <div class="text-gray-400 text-sm">{{ 'hero.stat_years' | translate }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">50+</div>
              <div class="text-gray-400 text-sm">{{ 'hero.stat_clients' | translate }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">12+</div>
              <div class="text-gray-400 text-sm">{{ 'hero.stat_countries' | translate }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">100%</div>
              <div class="text-gray-400 text-sm">{{ 'hero.stat_compliance' | translate }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class AboutPage {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  values = [
    { icon: APP_ICONS.ShieldCheck, key: 'about.val_independence' },
    { icon: APP_ICONS.Award, key: 'about.val_standards' },
    { icon: APP_ICONS.Users, key: 'about.val_senior' },
    { icon: APP_ICONS.Globe, key: 'about.val_regional' },
  ];
}
