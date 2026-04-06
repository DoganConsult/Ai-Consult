import { Component, signal, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { InViewDirective } from '../../shared/in-view.directive';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-testimonials',
  imports: [LucideAngularModule, InViewDirective, NgClass, TranslatePipe],
  template: `
    <section id="why-us" class="py-8 sm:py-12 bg-white relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-0 right-0 h-full bg-[linear-gradient(to_right,rgba(59,130,246,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.015)_1px,transparent_1px)] bg-[size:6rem_6rem]"></div>
        <div class="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-[80px] opacity-40"></div>
      </div>
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center mb-6 sm:mb-8">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100 mb-3">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span class="text-blue-600 font-medium text-xs sm:text-sm">{{ 'why.badge' | translate }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">{{ 'why.title' | translate }}</h2>
          <p class="text-gray-600 text-sm sm:text-base max-w-3xl mx-auto">{{ 'why.desc' | translate }}</p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-6 sm:mb-8" appInView (inView)="insightsVisible.set(true)">
          @for (item of valueProps(); track item.titleKey; let i = $index) {
            <div
              class="bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
              [class.opacity-0]="!insightsVisible()" [class.translate-y-5]="!insightsVisible()"
              [class.opacity-100]="insightsVisible()" [class.translate-y-0]="insightsVisible()"
              [style.transition-delay.ms]="i * 100"
            >
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center mb-3" [ngClass]="'bg-gradient-to-br ' + item.color">
                <lucide-icon [img]="item.icon" [size]="18" class="text-white sm:hidden"></lucide-icon>
                <lucide-icon [img]="item.icon" [size]="22" class="text-white hidden sm:block"></lucide-icon>
              </div>
              <h3 class="text-gray-900 font-bold mb-1.5 text-sm sm:text-base">{{ item.titleKey | translate }}</h3>
              <p class="text-gray-600 text-xs sm:text-sm leading-relaxed">{{ item.descKey | translate }}</p>
            </div>
          }
        </div>

        <div class="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8" appInView (inView)="storiesVisible.set(true)">
          <div
            class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 sm:p-7 text-white"
            [class.opacity-0]="!storiesVisible()" [class.translate-y-5]="!storiesVisible()"
            [class.opacity-100]="storiesVisible()" [class.translate-y-0]="storiesVisible()"
            style="transition: all 0.5s"
          >
            <div class="mb-4">
              <h3 class="text-lg sm:text-xl font-bold text-white mb-1">{{ 'why.arabic_title' | translate }}</h3>
              <p class="text-gray-400 text-xs">{{ 'why.arabic_subtitle' | translate }}</p>
            </div>
            <div class="space-y-3 text-right" dir="rtl">
              <div>
                <h4 class="text-base font-bold text-white mb-1">دوغان كونسلت</h4>
                <p class="text-blue-200 text-xs font-medium mb-2">استشارات هندسية في تقنيات المعلومات والاتصالات</p>
                <p class="text-gray-300 leading-relaxed text-xs sm:text-sm">
                  دوغان كونسلت هي شركة استشارات هندسية مستقلة متخصصة في تقنيات المعلومات والاتصالات، تقدم خدمات استشارية وتصميم هندسي وضمان فني للجهات الحكومية، مشغلي الاتصالات، والمؤسسات الكبرى.
                </p>
              </div>
              <p class="text-gray-300 leading-relaxed text-xs sm:text-sm">
                يقود الشركة مهندسون استشاريون ذوو خبرة واسعة على المستويين الإقليمي والدولي، مع سجل مهني في مشاريع البنية التحتية الرقمية الحيوية.
              </p>
              <div class="grid grid-cols-2 gap-2 pt-2">
                @for (area of arabicAreas; track area) {
                  <div class="bg-white/5 border border-white/10 rounded-lg p-2.5 sm:p-3">
                    <p class="text-white text-xs font-medium">{{ area }}</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <div
            class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 sm:p-7 text-white flex flex-col justify-between"
            [class.opacity-0]="!storiesVisible()" [class.translate-y-5]="!storiesVisible()"
            [class.opacity-100]="storiesVisible()" [class.translate-y-0]="storiesVisible()"
            style="transition: all 0.5s 0.1s"
          >
            <div>
              <div class="mb-4 text-right" dir="rtl">
                <h4 class="text-base font-bold text-white mb-1">منهجية العمل</h4>
                <p class="text-gray-300 leading-relaxed text-xs sm:text-sm">
                  تعتمد دوغان كونسلت نهجًا استشاريًا محايدًا تقنيًا، مبنيًا على المعايير الدولية وأفضل الممارسات، مع التركيز على جودة التصميم، سلامة التنفيذ، والاستدامة التشغيلية.
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
              @for (stat of impactStats(); track stat.labelKey) {
                <div class="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  <div class="text-white text-xl sm:text-2xl font-bold mb-0.5">{{ stat.value }}</div>
                  <div class="text-blue-200 text-[10px] sm:text-xs">{{ stat.labelKey | translate }}</div>
                  <div class="text-green-300 text-[10px] flex items-center gap-1 mt-1">
                    <lucide-icon [img]="icons.CheckCircle" [size]="10"></lucide-icon>
                    <span>{{ stat.noteKey | translate }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl sm:rounded-2xl p-5 sm:p-8 text-white">
          <div class="grid md:grid-cols-5 gap-6 items-center">
            <div class="md:col-span-3">
              <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full mb-3">
                <lucide-icon [img]="icons.TrendingUp" [size]="14"></lucide-icon>
                <span class="text-xs font-medium">{{ 'why.impact_badge' | translate }}</span>
              </div>
              <h3 class="text-lg sm:text-xl font-bold text-white mb-2">{{ 'why.impact_title' | translate }}</h3>
              <p class="text-blue-100 mb-4 text-sm">{{ 'why.impact_desc' | translate }}</p>
              <a href="#contact">
                <button class="px-6 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm">{{ 'why.impact_cta' | translate }}</button>
              </a>
            </div>
            <div class="md:col-span-2 flex flex-wrap gap-2">
              <span class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white font-medium">ICT Consulting</span>
              <span class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white font-medium">Telecom Engineering</span>
              <span class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white font-medium">Data Centers</span>
              <span class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white font-medium">Cybersecurity</span>
              <span class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white font-medium">Program Governance</span>
              <span class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white font-medium">Vendor-Neutral</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class TestimonialsComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  insightsVisible = signal(false);
  storiesVisible = signal(false);

  valueProps = computed(() => [
    { icon: APP_ICONS.Award, titleKey: 'why.senior.title', descKey: 'why.senior.desc', color: 'from-blue-500 to-blue-700' },
    { icon: APP_ICONS.ShieldCheck, titleKey: 'why.standards.title', descKey: 'why.standards.desc', color: 'from-emerald-500 to-green-700' },
    { icon: APP_ICONS.Landmark, titleKey: 'why.government.title', descKey: 'why.government.desc', color: 'from-purple-500 to-purple-700' },
    { icon: APP_ICONS.Globe, titleKey: 'why.regional.title', descKey: 'why.regional.desc', color: 'from-orange-500 to-orange-700' },
  ]);

  arabicAreas = [
    'هندسة شبكات الاتصالات',
    'استشارات مراكز البيانات والمنشآت الحيوية',
    'الأمن السيبراني والضمان الفني',
    'حوكمة البرامج والمشاريع التقنية',
  ];

  impactStats = computed(() => [
    { labelKey: 'why.stat_retention', value: '95%', noteKey: 'why.stat_retention_note' },
    { labelKey: 'why.stat_compliance', value: '100%', noteKey: 'why.stat_compliance_note' },
    { labelKey: 'why.stat_delivery', value: '50+', noteKey: 'why.stat_delivery_note' },
    { labelKey: 'why.stat_coverage', value: '12+', noteKey: 'why.stat_coverage_note' },
  ]);
}
