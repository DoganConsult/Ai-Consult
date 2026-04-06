import { Component, signal, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { InViewDirective } from '../../shared/in-view.directive';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-solutions',
  imports: [LucideAngularModule, InViewDirective, NgClass, TranslatePipe],
  template: `
    <section id="expertise" class="py-8 sm:py-12 lg:py-14 bg-white relative overflow-hidden">
      <div class="absolute top-0 right-0 w-1/3 h-full bg-gray-50/50 skew-x-12 transform origin-top-right -z-10"></div>
      <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.03),transparent_50%)]"></div>

      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-6 sm:mb-8 lg:mb-10" appInView (inView)="visible.set(true)">
          <div
            class="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white rounded-full border border-gray-200 shadow-sm mb-4 sm:mb-6 transition-all duration-500"
            [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span class="text-gray-600 font-medium text-xs sm:text-sm">{{ 'solutions.badge' | translate }}</span>
          </div>

          <h2
            class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight transition-all duration-500 delay-100"
            [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            {{ 'solutions.title_pre' | translate }} <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{{ 'solutions.title_highlight' | translate }}</span>
          </h2>

          <p
            class="text-gray-500 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed transition-all duration-500 delay-200"
            [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            {{ 'solutions.desc' | translate }}
          </p>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8" appInView (inView)="cardsVisible.set(true)">
          @for (solution of solutions(); track solution.titleKey; let i = $index) {
            <div
              class="group h-full relative bg-white rounded-2xl sm:rounded-3xl p-0.5 sm:p-1 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              [class.opacity-0]="!cardsVisible()" [class.translate-y-5]="!cardsVisible()"
              [class.opacity-100]="cardsVisible()" [class.translate-y-0]="cardsVisible()"
              [style.transition-delay.ms]="i * 100"
            >
              <div class="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500" [ngClass]="'bg-gradient-to-br ' + solution.gradient"></div>
              <div class="relative h-full bg-white rounded-[18px] sm:rounded-[22px] p-5 sm:p-6 lg:p-8 border border-gray-100 overflow-hidden">
                <div class="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" [ngClass]="'bg-gradient-to-br ' + solution.gradient"></div>
                <div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
                  <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500" [ngClass]="'bg-gradient-to-br ' + solution.gradient">
                    <lucide-icon [img]="solution.icon" [size]="24"></lucide-icon>
                  </div>
                  <div class="flex-1 space-y-3 sm:space-y-4">
                    <div>
                      <h3 class="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{{ solution.titleKey | translate }}</h3>
                      <p class="text-xs sm:text-sm font-medium bg-clip-text text-transparent" [ngClass]="'bg-gradient-to-r ' + solution.gradient">{{ solution.subtitleKey | translate }}</p>
                    </div>
                    <p class="text-gray-500 leading-relaxed text-sm">{{ solution.descKey | translate }}</p>
                    <div class="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                      @for (fKey of solution.featureKeys; track fKey) {
                        <span class="px-2.5 sm:px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-100 group-hover:border-gray-200 transition-colors">{{ fKey | translate }}</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <div
          class="mt-8 sm:mt-10 text-center transition-all duration-500 delay-700"
          [class.opacity-0]="!cardsVisible()" [class.translate-y-5]="!cardsVisible()"
          [class.opacity-100]="cardsVisible()" [class.translate-y-0]="cardsVisible()"
        >
          <div class="inline-block relative group">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 blur opacity-20 group-hover:opacity-40 transition-opacity rounded-2xl"></div>
            <div class="relative px-5 sm:px-8 py-3 sm:py-4 bg-white rounded-2xl border border-gray-100 shadow-lg flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div class="flex -space-x-3">
                @for (s of solutions(); track s.titleKey) {
                  <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center" [ngClass]="'bg-gradient-to-br ' + s.gradient">
                    <lucide-icon [img]="s.icon" [size]="14" class="text-white"></lucide-icon>
                  </div>
                }
              </div>
              <div class="h-px w-12 sm:h-8 sm:w-px bg-gray-200"></div>
              <p class="text-xs sm:text-sm font-medium text-gray-700 text-center">
                {{ 'solutions.footer_pre' | translate }} <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold">{{ 'solutions.footer_highlight' | translate }}</span> {{ 'solutions.footer_post' | translate }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SolutionsComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  visible = signal(false);
  cardsVisible = signal(false);

  solutions = computed(() => [
    {
      icon: APP_ICONS.Radio,
      titleKey: 'solutions.telecom.title',
      subtitleKey: 'solutions.telecom.subtitle',
      descKey: 'solutions.telecom.desc',
      gradient: 'from-blue-600 to-indigo-600',
      featureKeys: ['solutions.telecom.f1', 'solutions.telecom.f2', 'solutions.telecom.f3'],
    },
    {
      icon: APP_ICONS.Server,
      titleKey: 'solutions.dc.title',
      subtitleKey: 'solutions.dc.subtitle',
      descKey: 'solutions.dc.desc',
      gradient: 'from-emerald-500 to-green-600',
      featureKeys: ['solutions.dc.f1', 'solutions.dc.f2', 'solutions.dc.f3'],
    },
    {
      icon: APP_ICONS.ShieldCheck,
      titleKey: 'solutions.cyber.title',
      subtitleKey: 'solutions.cyber.subtitle',
      descKey: 'solutions.cyber.desc',
      gradient: 'from-purple-600 to-pink-600',
      featureKeys: ['solutions.cyber.f1', 'solutions.cyber.f2', 'solutions.cyber.f3'],
    },
    {
      icon: APP_ICONS.ClipboardCheck,
      titleKey: 'solutions.gov.title',
      subtitleKey: 'solutions.gov.subtitle',
      descKey: 'solutions.gov.desc',
      gradient: 'from-slate-700 to-black',
      featureKeys: ['solutions.gov.f1', 'solutions.gov.f2', 'solutions.gov.f3'],
    },
  ]);
}
