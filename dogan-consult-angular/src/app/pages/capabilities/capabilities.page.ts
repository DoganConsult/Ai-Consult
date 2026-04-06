import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-capabilities-page',
  imports: [LucideAngularModule, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <lucide-icon [img]="icons.Layers" [size]="14" class="text-blue-600" aria-hidden="true"></lucide-icon>
            <span class="text-blue-600 font-medium text-sm">{{ 'capabilities.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{{ 'capabilities.title' | translate }}</h1>
          <p class="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto">{{ 'capabilities.subtitle' | translate }}</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 sm:gap-8 mb-16">
          @for (cap of capabilities; track cap.titleKey) {
            <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
              <div class="flex items-start gap-4 mb-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" [class]="cap.bgClass">
                  <lucide-icon [img]="cap.icon" [size]="24" class="text-white" aria-hidden="true"></lucide-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900">{{ cap.titleKey | translate }}</h3>
                  <p class="text-sm text-gray-500 font-medium">{{ cap.subtitleKey | translate }}</p>
                </div>
              </div>
              <p class="text-gray-600 text-sm leading-relaxed mb-4">{{ cap.descKey | translate }}</p>
              <ul class="space-y-2">
                @for (item of cap.items; track item) {
                  <li class="flex items-center gap-2 text-sm text-gray-600">
                    <lucide-icon [img]="icons.CheckCircle" [size]="14" class="text-green-500 shrink-0" aria-hidden="true"></lucide-icon>
                    {{ item | translate }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <div class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 sm:p-12 text-white">
          <div class="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 class="text-2xl font-bold mb-4">{{ 'capabilities.cta_title' | translate }}</h2>
              <p class="text-gray-300 mb-6">{{ 'capabilities.cta_desc' | translate }}</p>
              <a href="/contact" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <lucide-icon [img]="icons.Mail" [size]="16" aria-hidden="true"></lucide-icon>
                {{ 'capabilities.cta_btn' | translate }}
              </a>
            </div>
            <div class="grid grid-cols-2 gap-4">
              @for (stat of stats; track stat.label) {
                <div class="bg-white/10 rounded-xl p-4 text-center border border-white/10">
                  <div class="text-2xl font-bold text-blue-400 mb-1">{{ stat.value }}</div>
                  <div class="text-gray-400 text-xs">{{ stat.label | translate }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CapabilitiesPage {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  capabilities = [
    {
      icon: APP_ICONS.Radio, bgClass: 'bg-gradient-to-br from-blue-500 to-blue-700',
      titleKey: 'solutions.telecom.title', subtitleKey: 'solutions.telecom.subtitle', descKey: 'solutions.telecom.desc',
      items: ['solutions.telecom.f1', 'solutions.telecom.f2', 'solutions.telecom.f3'],
    },
    {
      icon: APP_ICONS.Server, bgClass: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
      titleKey: 'solutions.dc.title', subtitleKey: 'solutions.dc.subtitle', descKey: 'solutions.dc.desc',
      items: ['solutions.dc.f1', 'solutions.dc.f2', 'solutions.dc.f3'],
    },
    {
      icon: APP_ICONS.Shield, bgClass: 'bg-gradient-to-br from-red-500 to-red-700',
      titleKey: 'solutions.cyber.title', subtitleKey: 'solutions.cyber.subtitle', descKey: 'solutions.cyber.desc',
      items: ['solutions.cyber.f1', 'solutions.cyber.f2', 'solutions.cyber.f3'],
    },
    {
      icon: APP_ICONS.ClipboardCheck, bgClass: 'bg-gradient-to-br from-purple-500 to-purple-700',
      titleKey: 'solutions.gov.title', subtitleKey: 'solutions.gov.subtitle', descKey: 'solutions.gov.desc',
      items: ['solutions.gov.f1', 'solutions.gov.f2', 'solutions.gov.f3'],
    },
  ];
  stats = [
    { value: '15+', label: 'hero.stat_years' },
    { value: '50+', label: 'hero.stat_clients' },
    { value: '12+', label: 'hero.stat_countries' },
    { value: '100%', label: 'hero.stat_compliance' },
  ];
}
