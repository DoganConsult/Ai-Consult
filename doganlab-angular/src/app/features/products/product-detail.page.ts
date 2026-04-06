import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApiService, Product } from '../../core/services/api.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-32 pb-16 sm:pb-24 relative">
      <div class="absolute inset-0 bg-gradient-to-b from-violet-950/10 via-transparent to-transparent"></div>
      <div class="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 relative">
        <a routerLink="/products" class="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm mb-8 group">← {{ 'products.back' | translate }}</a>

        @if (loading()) {
          <div class="flex justify-center py-20">
            <div class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (product()) {
          <div class="flex items-center gap-4 mb-8">
            <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center">
              <span class="text-3xl">{{ getEmoji(product()!.slug) }}</span>
            </div>
            <div>
              <h1 class="text-3xl sm:text-4xl font-bold text-white">{{ getLang() === 'ar' ? product()!.name_ar : product()!.name_en }}</h1>
              <p class="text-violet-400 font-medium">{{ getLang() === 'ar' ? product()!.tagline_ar : product()!.tagline_en }}</p>
            </div>
          </div>

          <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 mb-8">
            <p class="text-gray-300 text-lg leading-relaxed">{{ getLang() === 'ar' ? product()!.description_ar : product()!.description_en }}</p>
          </div>

          <div class="grid md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <h2 class="text-lg font-bold text-white mb-4">{{ 'products.features' | translate }}</h2>
              <div class="space-y-3">
                @for (feat of getFeatures(); track feat) {
                  <div class="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg">
                    <span class="text-violet-400 shrink-0">✓</span>
                    <span class="text-gray-400 text-sm">{{ feat }}</span>
                  </div>
                }
              </div>
            </div>
            <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
              <h2 class="text-lg font-bold text-white mb-4">{{ 'products.use_cases' | translate }}</h2>
              <div class="space-y-3">
                @for (uc of getUseCases(); track uc) {
                  <div class="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg">
                    <span class="text-purple-400 shrink-0">→</span>
                    <span class="text-gray-400 text-sm">{{ uc }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-r from-violet-950/50 to-purple-950/50 border border-violet-500/20 rounded-2xl p-8 text-center">
            <h3 class="text-xl font-bold text-white mb-3">{{ 'products.request_demo' | translate }}</h3>
            <div class="flex flex-wrap justify-center gap-4">
              <a routerLink="/contact" class="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all font-medium text-sm shadow-lg shadow-violet-500/20">{{ 'products.request_trial' | translate }}</a>
              @if (getUrl()) {
                <a [href]="getUrl()" target="_blank" rel="noopener noreferrer" class="px-6 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-all font-medium text-sm">{{ 'products.visit_site' | translate }}</a>
              }
            </div>
          </div>
        } @else {
          <div class="text-center py-20">
            <p class="text-gray-500">Product not found.</p>
            <a routerLink="/products" class="text-violet-400 text-sm mt-4 inline-block">{{ 'products.back' | translate }}</a>
          </div>
        }
      </div>
    </section>
  `,
})
export class ProductDetailPage implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') || '')));
  product = signal<Product | null>(null);
  loading = signal(true);

  private emojiMap: Record<string, string> = {
    'shahin-ai': '🛡️', 'dogan-ai': '🤖', 'saudi-business-gate': '🏛️',
    'doganhub': '📊', 'poc-sandbox': '🧪', 'openclaw': '⚖️',
  };
  private urlMap: Record<string, string> = {
    'shahin-ai': 'https://www.shahin-ai.com',
    'saudi-business-gate': 'https://www.saudibusinessgate.com',
    'openclaw': '/api/integration/openclaw',
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') || '';
      this.loading.set(true);
      this.api.getProduct(slug).then(data => {
        this.product.set(data);
        this.loading.set(false);
      }).catch(() => this.loading.set(false));
    });
  }

  getLang(): string { return this.i18n.lang(); }
  getEmoji(slug: string): string { return this.emojiMap[slug] || '📦'; }
  getUrl(): string { return this.urlMap[this.product()?.slug || ''] || ''; }

  getFeatures(): string[] {
    const p = this.product();
    if (!p?.features_json) return [];
    const f = p.features_json;
    if (Array.isArray(f)) return f;
    return f[this.getLang()] || f['en'] || [];
  }

  getUseCases(): string[] {
    const p = this.product();
    if (!p?.use_cases_json) return [];
    const u = p.use_cases_json;
    if (Array.isArray(u)) return u;
    return u[this.getLang()] || u['en'] || [];
  }
}
