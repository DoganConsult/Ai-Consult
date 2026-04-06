import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe],
  template: `
    <footer class="bg-[#06060a] border-t border-white/5 text-gray-400">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div class="col-span-2 md:col-span-1 space-y-4">
            <a routerLink="/" class="flex items-center gap-2">
              <div class="w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-500 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-xs">DL</span>
              </div>
              <span class="text-white font-semibold text-sm">{{ 'nav.brand' | translate }}</span>
            </a>
            <p class="text-gray-500 text-xs leading-relaxed">{{ 'footer.desc' | translate }}</p>
          </div>

          <div>
            <h4 class="text-white font-semibold mb-4 text-sm">{{ 'footer.products_title' | translate }}</h4>
            <ul class="space-y-2.5">
              <li><a routerLink="/products/shahin-ai" class="hover:text-violet-400 transition-colors text-xs">Shahin AI</a></li>
              <li><a routerLink="/products/dogan-ai" class="hover:text-violet-400 transition-colors text-xs">Dogan AI</a></li>
              <li><a routerLink="/products/saudi-business-gate" class="hover:text-violet-400 transition-colors text-xs">Saudi Business Gate</a></li>
              <li><a routerLink="/products/doganhub" class="hover:text-violet-400 transition-colors text-xs">DoganHub</a></li>
            </ul>
          </div>

          <div>
            <h4 class="text-white font-semibold mb-4 text-sm">{{ 'footer.network_title' | translate }}</h4>
            <ul class="space-y-2.5">
              <li><a href="https://doganconsult.com" target="_blank" rel="noopener noreferrer" class="hover:text-violet-400 transition-colors text-xs">{{ 'footer.group_dc' | translate }}</a></li>
              <li><a href="https://www.shahin-ai.com" target="_blank" rel="noopener noreferrer" class="hover:text-violet-400 transition-colors text-xs">{{ 'footer.group_shahin' | translate }}</a></li>
              <li><a href="https://www.saudibusinessgate.com" target="_blank" rel="noopener noreferrer" class="hover:text-violet-400 transition-colors text-xs">{{ 'footer.group_sbg' | translate }}</a></li>
            </ul>
          </div>

          <div>
            <h4 class="text-white font-semibold mb-4 text-sm">{{ 'footer.contact_title' | translate }}</h4>
            <ul class="space-y-2.5">
              <li class="text-xs">info&#64;doganconsult.com</li>
              <li class="text-xs" dir="ltr">+966 500 666 084</li>
              <li><a routerLink="/contact" class="hover:text-violet-400 transition-colors text-xs">{{ 'nav.contact' | translate }}</a></li>
            </ul>
          </div>
        </div>

        <div class="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p class="text-gray-500 text-xs">{{ 'footer.copyright' | translate }}</p>
          <p class="text-gray-600 text-[10px]">One of Dogan Consult projects</p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  i18n = inject(I18nService);
}
