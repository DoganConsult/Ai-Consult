import { Component, signal, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { InViewDirective } from '../../shared/in-view.directive';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-technology-vision',
  imports: [LucideAngularModule, InViewDirective, NgClass, TranslatePipe],
  template: `
    <section id="approach" class="py-8 sm:py-12 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
      </div>

      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center mb-6 sm:mb-8">
          <span class="inline-flex items-center rounded-md border border-transparent bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-medium mb-4 sm:mb-6">{{ 'approach.badge' | translate }}</span>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">{{ 'approach.title' | translate }}</h2>
          <p class="text-blue-100 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto">{{ 'approach.desc' | translate }}</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8" appInView (inView)="techVisible.set(true)">
          @for (phase of approachPhases(); track phase.titleKey; let i = $index) {
            <div
              class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300 group flex flex-col gap-3 sm:gap-6"
              [class.opacity-0]="!techVisible()" [class.translate-y-5]="!techVisible()"
              [class.opacity-100]="techVisible()" [class.translate-y-0]="techVisible()"
              [style.transition-delay.ms]="i * 100"
            >
              <div class="px-3 sm:px-6 pt-3 sm:pt-6">
                <div class="flex items-start justify-between mb-3 sm:mb-4">
                  <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" [ngClass]="'bg-gradient-to-br ' + phase.color">
                    <lucide-icon [img]="phase.icon" [size]="20" class="text-white sm:hidden"></lucide-icon>
                    <lucide-icon [img]="phase.icon" [size]="28" class="text-white hidden sm:block"></lucide-icon>
                  </div>
                  <span class="bg-white/20 text-white border border-white/30 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md">{{ 'approach.phase' | translate }} {{ i + 1 }}</span>
                </div>
                <h4 class="text-white font-semibold leading-tight text-sm sm:text-lg">{{ phase.titleKey | translate }}</h4>
                <p class="text-blue-200 text-xs sm:text-sm mt-1.5 sm:mt-2">{{ phase.descKey | translate }}</p>
              </div>
              <div class="px-3 sm:px-6 pb-3 sm:pb-6">
                <div class="flex flex-wrap gap-1.5 sm:gap-2">
                  @for (dKey of phase.deliverableKeys; track dKey) {
                    <span class="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/10 text-blue-100 rounded-full text-[10px] sm:text-xs border border-white/20">{{ dKey | translate }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <div class="mb-6 sm:mb-8">
          <h3 class="text-xl sm:text-2xl font-bold text-white text-center mb-4 sm:mb-6">{{ 'approach.engagement_title' | translate }}</h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6" appInView (inView)="roadmapVisible.set(true)">
            @for (eng of engagementTypes(); track eng.titleKey; let i = $index) {
              <div
                class="relative transition-all duration-500"
                [class.opacity-0]="!roadmapVisible()" [class.translate-y-5]="!roadmapVisible()"
                [class.opacity-100]="roadmapVisible()" [class.translate-y-0]="roadmapVisible()"
                [style.transition-delay.ms]="i * 120"
              >
                <div class="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-white/10 transition-all duration-300 h-full">
                  <div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                      <lucide-icon [img]="eng.icon" [size]="16" class="text-white sm:hidden"></lucide-icon>
                      <lucide-icon [img]="eng.icon" [size]="20" class="text-white hidden sm:block"></lucide-icon>
                    </div>
                    <div class="text-white font-semibold text-xs sm:text-base leading-tight">{{ eng.titleKey | translate }}</div>
                  </div>
                  <p class="text-blue-100 text-xs sm:text-sm">{{ eng.descKey | translate }}</p>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12">
          <div class="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div>
              <div class="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 rounded-full border border-white/20 mb-4 sm:mb-6">
                <lucide-icon [img]="icons.Award" [size]="18" class="text-blue-300"></lucide-icon>
                <span class="text-white text-xs sm:text-sm font-medium">{{ 'approach.diff_badge' | translate }}</span>
              </div>
              <h3 class="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                {{ 'approach.diff_title' | translate }}
                <span class="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{{ 'approach.diff_subtitle' | translate }}</span>
              </h3>
              <p class="text-blue-100 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{{ 'approach.diff_desc' | translate }}</p>
              <ul class="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                @for (key of differentiatorKeys; track key) {
                  <li class="flex items-start gap-2.5 sm:gap-3">
                    <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <span class="text-white text-xs sm:text-sm">{{ key | translate }}</span>
                  </li>
                }
              </ul>
            </div>

            <div class="relative hidden md:block">
              <div class="aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 p-8 flex items-center justify-center">
                <div class="relative w-full h-full">
                  <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center animate-pulse">
                    <lucide-icon [img]="icons.Shield" [size]="48" class="text-white"></lucide-icon>
                  </div>
                  <div class="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <lucide-icon [img]="icons.Radio" [size]="32" class="text-blue-300"></lucide-icon>
                  </div>
                  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <lucide-icon [img]="icons.Server" [size]="32" class="text-green-300"></lucide-icon>
                  </div>
                  <div class="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <lucide-icon [img]="icons.ShieldCheck" [size]="32" class="text-purple-300"></lucide-icon>
                  </div>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center">
                    <lucide-icon [img]="icons.ClipboardCheck" [size]="32" class="text-orange-300"></lucide-icon>
                  </div>
                  <svg class="absolute inset-0 w-full h-full" style="z-index: -1">
                    <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
                    <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
                    <line x1="50%" y1="50%" x2="20%" y2="50%" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
                    <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class TechnologyVisionComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  techVisible = signal(false);
  roadmapVisible = signal(false);

  differentiatorKeys = ['approach.diff1', 'approach.diff2', 'approach.diff3', 'approach.diff4', 'approach.diff5'];

  approachPhases = computed(() => [
    { icon: APP_ICONS.Eye, titleKey: 'approach.assess.title', descKey: 'approach.assess.desc', deliverableKeys: ['approach.assess.d1', 'approach.assess.d2', 'approach.assess.d3'], color: 'from-blue-500 to-blue-700' },
    { icon: APP_ICONS.Settings, titleKey: 'approach.design.title', descKey: 'approach.design.desc', deliverableKeys: ['approach.design.d1', 'approach.design.d2', 'approach.design.d3'], color: 'from-purple-500 to-purple-700' },
    { icon: APP_ICONS.ShieldCheck, titleKey: 'approach.assure.title', descKey: 'approach.assure.desc', deliverableKeys: ['approach.assure.d1', 'approach.assure.d2', 'approach.assure.d3'], color: 'from-green-500 to-green-700' },
    { icon: APP_ICONS.Users, titleKey: 'approach.support.title', descKey: 'approach.support.desc', deliverableKeys: ['approach.support.d1', 'approach.support.d2', 'approach.support.d3'], color: 'from-orange-500 to-orange-700' },
  ]);

  engagementTypes = computed(() => [
    { icon: APP_ICONS.Eye, titleKey: 'approach.eng_advisory.title', descKey: 'approach.eng_advisory.desc' },
    { icon: APP_ICONS.Settings, titleKey: 'approach.eng_design.title', descKey: 'approach.eng_design.desc' },
    { icon: APP_ICONS.ClipboardCheck, titleKey: 'approach.eng_governance.title', descKey: 'approach.eng_governance.desc' },
    { icon: APP_ICONS.Shield, titleKey: 'approach.eng_oversight.title', descKey: 'approach.eng_oversight.desc' },
  ]);
}
