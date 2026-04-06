import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';

@Component({
  selector: 'app-back-to-top',
  imports: [LucideAngularModule],
  template: `
    @if (visible()) {
      <button
        (click)="scrollToTop()"
        class="fixed bottom-6 left-6 z-40 w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center"
        [attr.aria-label]="i18n.t('a11y.back_to_top')"
      >
        <lucide-icon [img]="icons.ChevronRight" [size]="20" class="-rotate-90"></lucide-icon>
      </button>
    }
  `,
})
export class BackToTopComponent implements OnInit, OnDestroy {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  visible = signal(false);
  private onScroll = () => this.visible.set(window.scrollY > 400);

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
