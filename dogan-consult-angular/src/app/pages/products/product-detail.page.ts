import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';

interface ProductData {
  prefix: string;
  icon: any;
  bgClass: string;
  url: string;
  features: string[];
  benefits: string[];
}

const PRODUCT_MAP: Record<string, ProductData> = {
  'shahin-ai': {
    prefix: 'products.shahin', icon: APP_ICONS.Brain,
    bgClass: 'bg-gradient-to-br from-purple-500 to-purple-700', url: 'https://www.shahin-ai.com',
    features: ['products.shahin_f1', 'products.shahin_f2', 'products.shahin_f3'],
    benefits: ['products.shahin_b1', 'products.shahin_b2', 'products.shahin_b3', 'products.shahin_b4'],
  },
  'dogan-ai': {
    prefix: 'products.doganai', icon: APP_ICONS.Bot,
    bgClass: 'bg-gradient-to-br from-blue-500 to-blue-700', url: '#',
    features: ['products.doganai_f1', 'products.doganai_f2', 'products.doganai_f3'],
    benefits: ['products.doganai_b1', 'products.doganai_b2', 'products.doganai_b3', 'products.doganai_b4'],
  },
  'doganlab': {
    prefix: 'products.doganlab', icon: APP_ICONS.Lightbulb,
    bgClass: 'bg-gradient-to-br from-emerald-500 to-emerald-700', url: 'https://www.doganlap.com',
    features: ['products.doganlab_f1', 'products.doganlab_f2', 'products.doganlab_f3'],
    benefits: ['products.doganlab_b1', 'products.doganlab_b2', 'products.doganlab_b3', 'products.doganlab_b4'],
  },
  'saudi-business-gate': {
    prefix: 'products.sbg', icon: APP_ICONS.Landmark,
    bgClass: 'bg-gradient-to-br from-amber-500 to-amber-700', url: 'https://www.saudibusinessgate.com',
    features: ['products.sbg_f1', 'products.sbg_f2', 'products.sbg_f3'],
    benefits: ['products.sbg_b1', 'products.sbg_b2', 'products.sbg_b3', 'products.sbg_b4'],
  },
  'openclaw': {
    prefix: 'products.openclaw', icon: APP_ICONS.Scale,
    bgClass: 'bg-gradient-to-br from-indigo-500 to-indigo-700', url: '/api/integration/openclaw',
    features: ['products.openclaw_f1', 'products.openclaw_f2', 'products.openclaw_f3'],
    benefits: ['products.openclaw_b1', 'products.openclaw_b2', 'products.openclaw_b3', 'products.openclaw_b4'],
  },
};

@Component({
  selector: 'app-product-detail-page',
  imports: [LucideAngularModule, TranslatePipe, RouterLink],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
        <a routerLink="/products" class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm mb-8 group">
          <lucide-icon [img]="icons.ArrowRight" [size]="16" class="rotate-180 group-hover:-translate-x-1 transition-transform" aria-hidden="true"></lucide-icon>
          {{ 'products.back' | translate }}
        </a>

        @if (product()) {
          <div class="flex items-center gap-4 mb-8">
            <div class="w-16 h-16 rounded-xl flex items-center justify-center" [class]="product()!.bgClass">
              <lucide-icon [img]="product()!.icon" [size]="32" class="text-white" aria-hidden="true"></lucide-icon>
            </div>
            <div>
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">{{ product()!.prefix + '_name' | translate }}</h1>
              <p class="text-gray-500 font-medium">{{ product()!.prefix + '_tag' | translate }}</p>
            </div>
          </div>

          <div class="prose max-w-none mb-12">
            <p class="text-gray-600 text-lg leading-relaxed">{{ product()!.prefix + '_long_desc' | translate }}</p>
          </div>

          <div class="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <lucide-icon [img]="icons.Layers" [size]="20" class="text-blue-600" aria-hidden="true"></lucide-icon>
                {{ 'products.features_title' | translate }}
              </h2>
              <div class="space-y-3">
                @for (feat of product()!.features; track feat) {
                  <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <lucide-icon [img]="icons.CheckCircle" [size]="18" class="text-green-500 shrink-0 mt-0.5" aria-hidden="true"></lucide-icon>
                    <span class="text-gray-700 text-sm">{{ feat | translate }}</span>
                  </div>
                }
              </div>
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <lucide-icon [img]="icons.Rocket" [size]="20" class="text-blue-600" aria-hidden="true"></lucide-icon>
                {{ 'products.benefits_title' | translate }}
              </h2>
              <div class="space-y-3">
                @for (b of product()!.benefits; track b) {
                  <div class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <lucide-icon [img]="icons.Star" [size]="18" class="text-blue-500 shrink-0 mt-0.5" aria-hidden="true"></lucide-icon>
                    <span class="text-gray-700 text-sm">{{ b | translate }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          @if (product()!.url !== '#') {
            <div class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-center text-white">
              <h3 class="text-xl font-bold mb-3">{{ 'products.visit_title' | translate }}</h3>
              <p class="text-blue-100 mb-6">{{ 'products.visit_desc' | translate }}</p>
              <a [href]="product()!.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors">
                <lucide-icon [img]="icons.ExternalLink" [size]="16" aria-hidden="true"></lucide-icon>
                {{ 'products.visit_cta' | translate }}
              </a>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class ProductDetailPage {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') || '')));
  product = computed(() => PRODUCT_MAP[this.slug() || ''] || null);
}
