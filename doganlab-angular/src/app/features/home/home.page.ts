import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-32 pb-16 sm:pb-24 relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent"></div>
      <div class="absolute top-20 start-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 end-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>

      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative">
        <div class="text-center max-w-4xl mx-auto mb-16 sm:mb-20">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-500/20 mb-6">
            <span class="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span>
            <span class="text-violet-300 font-medium text-sm">{{ 'home.badge' | translate }}</span>
          </div>
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            {{ 'home.title1' | translate }}
            <span class="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent"> {{ 'home.title2' | translate }}</span>
          </h1>
          <p class="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">{{ 'home.desc' | translate }}</p>
          <div class="flex flex-wrap justify-center gap-4">
            <a routerLink="/products" class="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 font-medium text-sm">{{ 'home.cta_products' | translate }}</a>
            <a routerLink="/contact" class="px-6 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 hover:border-white/20 transition-all font-medium text-sm">{{ 'home.cta_requirements' | translate }}</a>
          </div>
        </div>

        <div class="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-20 sm:mb-28">
          @for (card of heroCards; track card.key) {
            <div class="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all group">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center mb-4 group-hover:from-violet-600/30 group-hover:to-purple-600/30 transition-all">
                <span class="text-violet-400 text-xl">{{ card.emoji }}</span>
              </div>
              <h3 class="text-white font-semibold mb-1">{{ card.key | translate }}</h3>
              <p class="text-gray-500 text-sm">{{ card.descKey | translate }}</p>
            </div>
          }
        </div>

        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-500/20 mb-4">
            <span class="text-violet-300 font-medium text-sm">{{ 'home.products_badge' | translate }}</span>
          </div>
          <h2 class="text-3xl sm:text-4xl font-bold text-white mb-3">{{ 'home.products_title' | translate }}</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">{{ 'home.products_desc' | translate }}</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-20">
          @for (p of products; track p.slug) {
            <a [routerLink]="'/products/' + p.slug" class="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all group block">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center" [class]="p.bgClass">
                  <span class="text-white text-lg">{{ p.emoji }}</span>
                </div>
                <div>
                  <h3 class="text-white font-semibold text-sm group-hover:text-violet-300 transition-colors">{{ p.name }}</h3>
                  <span class="text-[10px] px-2 py-0.5 rounded-full" [class]="p.statusClass">{{ p.status }}</span>
                </div>
              </div>
              <p class="text-gray-500 text-xs leading-relaxed">{{ p.desc }}</p>
            </a>
          }
        </div>

        <div class="bg-gradient-to-br from-violet-950/50 via-purple-950/30 to-transparent border border-white/5 rounded-2xl p-8 sm:p-12">
          <h3 class="text-xl font-bold text-white mb-6 text-center">{{ 'home.stats_title' | translate }}</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
            @for (stat of stats; track stat.labelKey) {
              <div class="text-center">
                <div class="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-1">{{ stat.value }}</div>
                <div class="text-gray-500 text-xs">{{ stat.labelKey | translate }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomePage {
  i18n = inject(I18nService);
  heroCards = [
    { key: 'home.card_ai', descKey: 'home.card_ai_desc', emoji: '🧠' },
    { key: 'home.card_iot', descKey: 'home.card_iot_desc', emoji: '📡' },
    { key: 'home.card_blockchain', descKey: 'home.card_blockchain_desc', emoji: '⚙️' },
  ];
  products = [
    { slug: 'shahin-ai', name: 'Shahin AI', emoji: '🛡️', bgClass: 'bg-gradient-to-br from-violet-600 to-violet-800', desc: 'AI-powered GRC / Governance OS', status: 'Live', statusClass: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    { slug: 'dogan-ai', name: 'Dogan AI', emoji: '🤖', bgClass: 'bg-gradient-to-br from-blue-600 to-blue-800', desc: 'Enterprise AI agent workflows', status: 'Live', statusClass: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    { slug: 'saudi-business-gate', name: 'Saudi Business Gate', emoji: '🏛️', bgClass: 'bg-gradient-to-br from-amber-600 to-amber-800', desc: 'SaaS and marketplace platform', status: 'Live', statusClass: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    { slug: 'doganhub', name: 'DoganHub', emoji: '📊', bgClass: 'bg-gradient-to-br from-emerald-600 to-emerald-800', desc: 'SOC / NOC / operations platform', status: 'Beta', statusClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
    { slug: 'poc-sandbox', name: 'Custom POC Sandbox', emoji: '🧪', bgClass: 'bg-gradient-to-br from-pink-600 to-pink-800', desc: 'Tailored pilots and integration labs', status: 'POC', statusClass: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
    { slug: 'openclaw', name: 'OpenClaw Server', emoji: '⚖️', bgClass: 'bg-gradient-to-br from-indigo-600 to-indigo-800', desc: 'Autonomous orchestration agent for workflows', status: 'Live', statusClass: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  ];
  stats = [
    { value: '5+', labelKey: 'home.stat_products' },
    { value: '20+', labelKey: 'home.stat_pocs' },
    { value: '50+', labelKey: 'home.stat_clients' },
    { value: '99.9%', labelKey: 'home.stat_uptime' },
  ];
}
