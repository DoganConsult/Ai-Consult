import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

@Component({
  selector: 'app-products-page',
  imports: [LucideAngularModule, TranslatePipe, RouterLink],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <lucide-icon [img]="icons.Package" [size]="14" class="text-blue-600" aria-hidden="true"></lucide-icon>
            <span class="text-blue-600 font-medium text-sm">{{ 'products.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{{ 'products.title' | translate }}</h1>
          <p class="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto">{{ 'products.subtitle' | translate }}</p>
        </div>

        <div class="grid md:grid-cols-2 gap-6 sm:gap-8">
          @for (product of products; track product.slug) {
            <a [routerLink]="'/products/' + product.slug" class="group bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 block">
              <div class="flex items-start gap-4 mb-4">
                <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" [class]="product.bgClass">
                  <lucide-icon [img]="product.icon" [size]="28" class="text-white" aria-hidden="true"></lucide-icon>
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{{ product.nameKey | translate }}</h3>
                  <p class="text-sm text-gray-500 font-medium">{{ product.tagKey | translate }}</p>
                </div>
              </div>
              <p class="text-gray-600 text-sm leading-relaxed mb-4">{{ product.descKey | translate }}</p>
              <div class="flex flex-wrap gap-2 mb-4">
                @for (feat of product.featureKeys; track feat) {
                  <span class="px-3 py-1 bg-gray-50 rounded-full text-xs font-medium text-gray-600 border border-gray-100">{{ feat | translate }}</span>
                }
              </div>
              <div class="flex items-center gap-2 text-blue-600 font-medium text-sm group-hover:gap-3 transition-all">
                {{ 'products.learn_more' | translate }}
                <lucide-icon [img]="icons.ArrowRight" [size]="16" aria-hidden="true"></lucide-icon>
              </div>
            </a>
          }
        </div>
      </div>
    </section>
  `,
})
export class ProductsPage {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  products = [
    {
      slug: 'shahin-ai', icon: APP_ICONS.Brain, bgClass: 'bg-gradient-to-br from-purple-500 to-purple-700',
      nameKey: 'products.shahin_name', tagKey: 'products.shahin_tag', descKey: 'products.shahin_desc',
      featureKeys: ['products.shahin_f1', 'products.shahin_f2', 'products.shahin_f3'],
    },
    {
      slug: 'dogan-ai', icon: APP_ICONS.Bot, bgClass: 'bg-gradient-to-br from-blue-500 to-blue-700',
      nameKey: 'products.doganai_name', tagKey: 'products.doganai_tag', descKey: 'products.doganai_desc',
      featureKeys: ['products.doganai_f1', 'products.doganai_f2', 'products.doganai_f3'],
    },
    {
      slug: 'doganlab', icon: APP_ICONS.Lightbulb, bgClass: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
      nameKey: 'products.doganlab_name', tagKey: 'products.doganlab_tag', descKey: 'products.doganlab_desc',
      featureKeys: ['products.doganlab_f1', 'products.doganlab_f2', 'products.doganlab_f3'],
    },
    {
      slug: 'saudi-business-gate', icon: APP_ICONS.Landmark, bgClass: 'bg-gradient-to-br from-amber-500 to-amber-700',
      nameKey: 'products.sbg_name', tagKey: 'products.sbg_tag', descKey: 'products.sbg_desc',
      featureKeys: ['products.sbg_f1', 'products.sbg_f2', 'products.sbg_f3'],
    },
    {
      slug: 'openclaw', icon: APP_ICONS.Scale, bgClass: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
      nameKey: 'products.openclaw_name', tagKey: 'products.openclaw_tag', descKey: 'products.openclaw_desc',
      featureKeys: ['products.openclaw_f1', 'products.openclaw_f2', 'products.openclaw_f3'],
    },
  ];
}
