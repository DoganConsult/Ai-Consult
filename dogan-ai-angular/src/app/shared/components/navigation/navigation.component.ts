import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <header class="ai-header">
      <div class="ai-header-inner">
        <div class="ai-logo">
          <div class="ai-logo-icon"><span>A</span></div>
          <a routerLink="/" class="ai-logo-text">{{ 'nav.brand' | translate }}</a>
        </div>
        
        <nav class="ai-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">{{ 'nav.home' | translate }}</a>
          <a routerLink="/solutions" routerLinkActive="active">{{ 'nav.solutions' | translate }}</a>
          <a routerLink="/demo" routerLinkActive="active" class="ai-nav-live">
            <span class="ai-pulse"></span>
            {{ 'nav.demo' | translate }}
          </a>
          <a routerLink="/enterprise" routerLinkActive="active">{{ 'nav.enterprise' | translate }}</a>
        </nav>

        <div class="ai-header-right">
          <button (click)="i18n.toggle()" class="ai-lang-btn">
            {{ i18n.lang() === 'en' ? 'عربي' : 'EN' }}
          </button>
          <a routerLink="/contact" class="ai-cta-btn">{{ 'nav.contact' | translate }}</a>
          <button class="ai-mobile-toggle" (click)="mobileOpen.set(true)">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
    </header>
    
    <div class="ai-mobile-menu" [class.open]="mobileOpen()">
      <button class="ai-mobile-close" (click)="mobileOpen.set(false)">&times;</button>
      <a routerLink="/" (click)="mobileOpen.set(false)">{{ 'nav.home' | translate }}</a>
      <a routerLink="/solutions" (click)="mobileOpen.set(false)">{{ 'nav.solutions' | translate }}</a>
      <a routerLink="/demo" (click)="mobileOpen.set(false)">{{ 'nav.demo' | translate }}</a>
      <a routerLink="/enterprise" (click)="mobileOpen.set(false)">{{ 'nav.enterprise' | translate }}</a>
      <a routerLink="/contact" (click)="mobileOpen.set(false)">{{ 'nav.contact' | translate }}</a>
    </div>
  `
})
export class NavigationComponent {
  i18n = inject(I18nService);
  mobileOpen = signal(false);
}
