import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';
import { COMPANY_INFO } from '../../shared/constants';

@Component({
  selector: 'app-offices-page',
  imports: [LucideAngularModule, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <lucide-icon [img]="icons.MapPin" [size]="14" class="text-blue-600" aria-hidden="true"></lucide-icon>
            <span class="text-blue-600 font-medium text-sm">{{ 'offices.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{{ 'offices.title' | translate }}</h1>
          <p class="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto">{{ 'offices.subtitle' | translate }}</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          @for (office of offices; track office.cityKey) {
            <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
              <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <lucide-icon [img]="icons.Building2" [size]="24" class="text-blue-600" aria-hidden="true"></lucide-icon>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-1">{{ office.cityKey | translate }}</h3>
              <p class="text-blue-600 text-sm font-medium mb-3">{{ office.typeKey | translate }}</p>
              <p class="text-gray-600 text-sm leading-relaxed mb-4">{{ office.descKey | translate }}</p>
              <div class="space-y-2 text-sm text-gray-500">
                <div class="flex items-center gap-2">
                  <lucide-icon [img]="icons.MapPin" [size]="14" class="text-gray-400" aria-hidden="true"></lucide-icon>
                  <span>{{ office.addressKey | translate }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <lucide-icon [img]="icons.Mail" [size]="14" class="text-gray-400" aria-hidden="true"></lucide-icon>
                  <span dir="ltr">{{ company.email }}</span>
                </div>
              </div>
            </div>
          }
        </div>


      </div>
    </section>
  `,
})
export class OfficesPage {
  protected readonly icons = APP_ICONS;
  protected readonly company = COMPANY_INFO;
  i18n = inject(I18nService);
  offices = [
    { cityKey: 'offices.riyadh_city', typeKey: 'offices.riyadh_type', descKey: 'offices.riyadh_desc', addressKey: 'offices.riyadh_address' },
    { cityKey: 'offices.istanbul_city', typeKey: 'offices.istanbul_type', descKey: 'offices.istanbul_desc', addressKey: 'offices.istanbul_address' },
    { cityKey: 'offices.cairo_city', typeKey: 'offices.cairo_type', descKey: 'offices.cairo_desc', addressKey: 'offices.cairo_address' },
  ];
  regions = ['offices.region_gcc', 'offices.region_levant', 'offices.region_north_africa', 'offices.region_turkey', 'offices.region_central_asia'];
}
