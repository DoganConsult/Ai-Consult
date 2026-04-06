import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';
import { COMPANY_INFO } from '../../shared/constants';

@Component({
  selector: 'app-legal-page',
  imports: [LucideAngularModule, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <lucide-icon [img]="icons.Scale" [size]="14" class="text-blue-600" aria-hidden="true"></lucide-icon>
            <span class="text-blue-600 font-medium text-sm">{{ 'legal.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{{ 'legal.title' | translate }}</h1>
        </div>

        <div class="space-y-12">
          <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <lucide-icon [img]="icons.Shield" [size]="20" class="text-blue-600" aria-hidden="true"></lucide-icon>
              {{ 'legal.privacy_title' | translate }}
            </h2>
            <div class="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>{{ 'legal.privacy_intro' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.privacy_collect_title' | translate }}</h3>
              <p>{{ 'legal.privacy_collect_desc' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.privacy_use_title' | translate }}</h3>
              <p>{{ 'legal.privacy_use_desc' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.privacy_protect_title' | translate }}</h3>
              <p>{{ 'legal.privacy_protect_desc' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.privacy_contact_title' | translate }}</h3>
              <p>{{ 'legal.privacy_contact_desc' | translate }}</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <lucide-icon [img]="icons.FileText" [size]="20" class="text-blue-600" aria-hidden="true"></lucide-icon>
              {{ 'legal.terms_title' | translate }}
            </h2>
            <div class="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>{{ 'legal.terms_intro' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.terms_use_title' | translate }}</h3>
              <p>{{ 'legal.terms_use_desc' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.terms_ip_title' | translate }}</h3>
              <p>{{ 'legal.terms_ip_desc' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.terms_liability_title' | translate }}</h3>
              <p>{{ 'legal.terms_liability_desc' | translate }}</p>
              <h3 class="text-base font-semibold text-gray-900">{{ 'legal.terms_governing_title' | translate }}</h3>
              <p>{{ 'legal.terms_governing_desc' | translate }}</p>
            </div>
          </div>

          <div class="text-center text-gray-400 text-xs">
            {{ 'legal.last_updated' | translate }}
          </div>
        </div>
      </div>
    </section>
  `,
})
export class LegalPage {
  protected readonly icons = APP_ICONS;
  protected readonly company = COMPANY_INFO;
  i18n = inject(I18nService);
}
