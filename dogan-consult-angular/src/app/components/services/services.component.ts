import { Component, signal, inject, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { InViewDirective } from '../../shared/in-view.directive';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-services',
  imports: [LucideAngularModule, InViewDirective, TranslatePipe],
  template: `
    <section id="sectors" class="py-8 sm:py-12 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.03),transparent_50%)]"></div>
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center mb-6 sm:mb-8">
          <div class="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 mb-3 sm:mb-4 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span class="text-gray-900 font-medium text-xs sm:text-sm">{{ 'sectors.badge' | translate }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">{{ 'sectors.title' | translate }}</h2>
          <p class="text-gray-600 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto">{{ 'sectors.desc' | translate }}</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8" appInView (inView)="visible.set(true)">
          @for (sector of sectors(); track sector.titleKey; let i = $index) {
            <div
              class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 sm:border-2 sm:border-gray-100 hover:border-blue-300 hover:shadow-2xl transition-all duration-300"
              [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
              [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
              [style.transition-delay.ms]="i * 100"
            >
              <div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-6 shadow-lg">
                <lucide-icon [img]="sector.icon" [size]="20" class="text-white sm:hidden"></lucide-icon>
                <lucide-icon [img]="sector.icon" [size]="28" class="text-white hidden sm:block"></lucide-icon>
              </div>
              <h3 class="text-sm sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">{{ sector.titleKey | translate }}</h3>
              <p class="text-gray-600 leading-relaxed text-xs sm:text-sm">{{ sector.descKey | translate }}</p>
            </div>
          }
        </div>

        <div class="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {{ 'sectors.trust_strip' | translate }}
          </span>
        </div>

        <div class="mt-5 sm:mt-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-2xl">
          <div class="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <h3 class="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">{{ 'sectors.delivery_title' | translate }}</h3>
              <p class="text-blue-100 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{{ 'sectors.delivery_desc' | translate }}</p>
              <a href="#contact">
                <button class="px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-lg font-medium text-sm sm:text-base">{{ 'sectors.delivery_cta' | translate }}</button>
              </a>
            </div>
            <div class="grid grid-cols-2 gap-3 sm:gap-4">
              @for (model of deliveryModel(); track model.labelKey) {
                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                  <lucide-icon [img]="model.icon" [size]="24" class="text-blue-200 mb-1.5 sm:mb-2 sm:hidden"></lucide-icon>
                  <lucide-icon [img]="model.icon" [size]="32" class="text-blue-200 mb-2 hidden sm:block"></lucide-icon>
                  <div class="text-white font-semibold text-xs sm:text-sm">{{ model.labelKey | translate }}</div>
                  <div class="text-blue-200 text-[10px] sm:text-xs">{{ model.subKey | translate }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ServicesComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  visible = signal(false);

  sectors = computed(() => [
    { icon: APP_ICONS.Landmark, titleKey: 'sectors.gov.title', descKey: 'sectors.gov.desc' },
    { icon: APP_ICONS.Radio, titleKey: 'sectors.telecom.title', descKey: 'sectors.telecom.desc' },
    { icon: APP_ICONS.Zap, titleKey: 'sectors.infra.title', descKey: 'sectors.infra.desc' },
    { icon: APP_ICONS.Building2, titleKey: 'sectors.enterprise.title', descKey: 'sectors.enterprise.desc' },
  ]);

  deliveryModel = computed(() => [
    { icon: APP_ICONS.Target, labelKey: 'sectors.dm_advisory', subKey: 'sectors.dm_advisory_sub' },
    { icon: APP_ICONS.Settings, labelKey: 'sectors.dm_technical', subKey: 'sectors.dm_technical_sub' },
    { icon: APP_ICONS.ShieldCheck, labelKey: 'sectors.dm_quality', subKey: 'sectors.dm_quality_sub' },
    { icon: APP_ICONS.Users, labelKey: 'sectors.dm_stakeholder', subKey: 'sectors.dm_stakeholder_sub' },
  ]);
}
