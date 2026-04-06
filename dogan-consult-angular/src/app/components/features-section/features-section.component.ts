import { Component, signal, inject, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { InViewDirective } from '../../shared/in-view.directive';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-features-section',
  imports: [LucideAngularModule, InViewDirective, TranslatePipe],
  template: `
    <section id="capabilities" class="py-8 sm:py-12 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-0 right-0 h-full bg-[linear-gradient(to_right,rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:5rem_5rem]"></div>
      </div>
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center mb-6 sm:mb-8">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm mb-3 sm:mb-4">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span class="text-gray-600 font-medium text-xs sm:text-sm">{{ 'features.badge' | translate }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 text-gray-900">{{ 'features.title' | translate }}</h2>
          <p class="max-w-2xl mx-auto text-sm sm:text-base text-gray-500">{{ 'features.desc' | translate }}</p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6" appInView (inView)="visible.set(true)">
          @for (feature of features(); track feature.titleKey; let i = $index) {
            <div
              class="relative bg-white rounded-xl border border-gray-100 sm:border-2 sm:border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 flex flex-col gap-3 sm:gap-6"
              [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
              [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
              [style.transition-delay.ms]="i * 80"
            >
              <div class="px-3 sm:px-6 pt-3 sm:pt-6">
                <div class="flex items-center justify-between mb-2 sm:mb-3">
                  <div class="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg">
                    <lucide-icon [img]="feature.icon" [size]="18" class="text-white sm:hidden"></lucide-icon>
                    <lucide-icon [img]="feature.icon" [size]="24" class="text-white hidden sm:block"></lucide-icon>
                  </div>
                  <span class="inline-flex items-center rounded-md border border-transparent bg-gray-100 text-gray-700 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium">{{ feature.badgeKey | translate }}</span>
                </div>
                <h4 class="text-sm sm:text-lg font-semibold text-gray-900 leading-tight sm:leading-none">{{ feature.titleKey | translate }}</h4>
              </div>
              <div class="px-3 sm:px-6 pb-3 sm:pb-6">
                <p class="text-gray-500 leading-relaxed text-xs sm:text-sm">{{ feature.descKey | translate }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class FeaturesSectionComponent {
  i18n = inject(I18nService);
  visible = signal(false);

  features = computed(() => [
    { icon: APP_ICONS.Network, titleKey: 'features.network.title', descKey: 'features.network.desc', badgeKey: 'features.network.badge' },
    { icon: APP_ICONS.Server, titleKey: 'features.datacenter.title', descKey: 'features.datacenter.desc', badgeKey: 'features.datacenter.badge' },
    { icon: APP_ICONS.Shield, titleKey: 'features.security.title', descKey: 'features.security.desc', badgeKey: 'features.security.badge' },
    { icon: APP_ICONS.ClipboardCheck, titleKey: 'features.program.title', descKey: 'features.program.desc', badgeKey: 'features.program.badge' },
    { icon: APP_ICONS.Eye, titleKey: 'features.oversight.title', descKey: 'features.oversight.desc', badgeKey: 'features.oversight.badge' },
    { icon: APP_ICONS.Settings, titleKey: 'features.design.title', descKey: 'features.design.desc', badgeKey: 'features.design.badge' },
    { icon: APP_ICONS.BarChart3, titleKey: 'features.risk.title', descKey: 'features.risk.desc', badgeKey: 'features.risk.badge' },
    { icon: APP_ICONS.Zap, titleKey: 'features.resilience.title', descKey: 'features.resilience.desc', badgeKey: 'features.resilience.badge' },
  ]);
}
