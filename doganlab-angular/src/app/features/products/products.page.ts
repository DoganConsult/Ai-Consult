import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApiService, Product } from '../../core/services/api.service';

@Component({
  selector: 'app-products-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-32 pb-16 sm:pb-24 relative">
      <div class="absolute inset-0 bg-gradient-to-b from-violet-950/10 via-transparent to-transparent"></div>
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-500/20 mb-4">
            <span class="text-violet-300 font-medium text-sm">{{ 'products.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">{{ 'products.title' | translate }}</h1>
          <p class="text-gray-400 text-base sm:text-lg max-w-3xl mx-auto">{{ 'products.subtitle' | translate }}</p>
        </div>

        @if (loading()) {
          <div class="flex justify-center py-20">
            <div class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else {
          <div class="grid md:grid-cols-2 gap-6">
            @for (p of products(); track p.slug) {
              <a [routerLink]="'/products/' + p.slug" class="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all group block">
                <div class="flex items-start gap-4 mb-4">
                  <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center shrink-0">
                    <span class="text-2xl">{{ getEmoji(p.slug) }}</span>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">{{ getLang() === 'ar' ? p.name_ar : p.name_en }}</h3>
                      <span class="text-[10px] px-2 py-0.5 rounded-full" [class]="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
                    </div>
                    <p class="text-violet-400 text-sm font-medium">{{ getLang() === 'ar' ? p.tagline_ar : p.tagline_en }}</p>
                  </div>
                </div>
                <p class="text-gray-500 text-sm leading-relaxed mb-4">{{ getLang() === 'ar' ? p.description_ar : p.description_en }}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                  @for (feat of getFeatures(p); track feat) {
                    <span class="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/5">{{ feat }}</span>
                  }
                </div>
                <span class="text-violet-400 text-sm font-medium group-hover:text-violet-300">{{ 'products.view_details' | translate }} →</span>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ProductsPage implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ApiService);
  products = signal<Product[]>([]);
  loading = signal(true);

  private emojiMap: Record<string, string> = {
    'shahin-ai': '🛡️', 'dogan-ai': '🤖', 'saudi-business-gate': '🏛️',
    'doganhub': '📊', 'poc-sandbox': '🧪', 'openclaw': '⚖️',
  };

  ngOnInit(): void {
    this.api.getProducts().then(data => {
      this.products.set(data);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  getLang(): string { return this.i18n.lang(); }
  getEmoji(slug: string): string { return this.emojiMap[slug] || '📦'; }
  getFeatures(p: Product): string[] {
    const features = p.features_json;
    if (!features) return [];
    const lang = this.getLang();
    if (Array.isArray(features)) return features.slice(0, 4);
    return (features[lang] || features['en'] || []).slice(0, 4);
  }
  statusClass(s: string): string {
    if (s === 'live') return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (s === 'beta') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
  }
  statusLabel(s: string): string { return this.i18n.t('products.status_' + s); }
}
