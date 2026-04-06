import { Component, signal, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { InViewDirective } from '../../shared/in-view.directive';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-hero-section',
  imports: [LucideAngularModule, InViewDirective, TranslatePipe],
  template: `
    <section class="relative pt-20 sm:pt-24 pb-6 sm:pb-8 overflow-hidden bg-white">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-0 right-0 h-full bg-[linear-gradient(to_right,rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div class="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-[80px] opacity-50"></div>
        <div class="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-gradient-to-br from-slate-100 to-blue-50 rounded-full blur-[80px] opacity-50"></div>
      </div>

      <div class="max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
        <div class="flex flex-col items-center text-center" appInView (inView)="visible.set(true)">

          <div class="transition-all duration-500" [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()" [class.opacity-100]="visible()" [class.translate-y-0]="visible()">
            <span class="inline-flex items-center gap-2 mb-5 sm:mb-6 px-3.5 py-1.5 text-xs font-semibold border border-blue-200 bg-blue-50/80 text-blue-700 rounded-full shadow-sm">
              <lucide-icon [img]="icons.Shield" [size]="13" class="text-blue-500 shrink-0"></lucide-icon>
              {{ 'hero.badge' | translate }}
            </span>
          </div>

          <h1
            class="mx-auto max-w-4xl text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight mb-4 sm:mb-5 text-gray-900 transition-all duration-500 delay-100 leading-[1.3]"
            [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            {{ 'hero.title' | translate }}
          </h1>

          <p
            class="mx-auto max-w-2xl text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0 transition-all duration-500 delay-200"
            [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            {{ 'hero.desc' | translate }}
          </p>

          <div
            class="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto px-4 sm:px-0 transition-all duration-500 delay-300"
            [class.opacity-0]="!visible()" [class.translate-y-5]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            <a href="#contact" class="w-full sm:w-auto">
              <button class="w-full sm:w-auto group relative px-7 py-3 bg-gray-900 text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden text-sm">
                <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span class="relative flex items-center justify-center gap-2">
                  {{ 'hero.cta_primary' | translate }}
                  <lucide-icon [img]="icons.ArrowRight" [size]="15" class="group-hover:translate-x-0.5 transition-transform"></lucide-icon>
                </span>
              </button>
            </a>
            <a href="#expertise" class="w-full sm:w-auto">
              <button class="w-full sm:w-auto px-7 py-3 bg-white text-gray-700 font-medium border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 transition-all duration-300 flex items-center justify-center gap-2 text-sm">
                {{ 'hero.cta_secondary' | translate }}
              </button>
            </a>
          </div>

          <div
            class="mt-6 sm:mt-8 w-full max-w-3xl mx-auto transition-all duration-700 delay-400"
            [class.opacity-0]="!visible()" [class.translate-y-10]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            <div class="flex flex-wrap justify-center gap-2">
              @for (chip of trustChips; track chip) {
                <span class="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium text-gray-600">
                  {{ chip | translate }}
                </span>
              }
            </div>
          </div>

          <div
            class="mt-4 sm:mt-5 w-full max-w-2xl mx-auto transition-all duration-700 delay-500"
            [class.opacity-0]="!visible()" [class.translate-y-10]="!visible()"
            [class.opacity-100]="visible()" [class.translate-y-0]="visible()"
          >
            <p class="text-xs sm:text-sm text-gray-400 italic leading-relaxed px-4 sm:px-0">
              {{ 'hero.vision' | translate }}
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HeroSectionComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  visible = signal(false);

  trustChips = ['hero.trust1', 'hero.trust2', 'hero.trust3', 'hero.trust4'];
}
