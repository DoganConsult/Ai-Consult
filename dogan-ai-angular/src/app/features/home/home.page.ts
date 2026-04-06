import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="ai-hero">
      <div class="ai-hero-bg"></div>
      <div class="ai-hero-orb1"></div>
      <div class="ai-hero-orb2"></div>

      <div class="ai-hero-content ai-animate">
        <div class="ai-badge ai-delay-1">
          <span class="ai-pulse"></span>
          <span class="ai-badge-text">{{ 'hero.badge' | translate }}</span>
        </div>
        
        <h1 class="ai-delay-2">
          <span class="white">{{ 'hero.title1' | translate }}</span><br>
          <span class="gradient">{{ 'hero.title2' | translate }}</span>
        </h1>
        
        <p class="ai-hero-desc ai-delay-3">{{ 'hero.desc' | translate }}</p>
        
        <div class="ai-hero-actions ai-delay-3">
          <a routerLink="/solutions" class="ai-btn-primary">
            {{ 'hero.cta' | translate }}
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5-5-5-5"/></svg>
          </a>
          <a routerLink="/demo" class="ai-btn-secondary">{{ 'hero.demo' | translate }}</a>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <section class="ai-stats">
      <div class="ai-stats-inner">
        <p class="ai-stats-label">Powered by Dogan Consult Enterprise Architecture</p>
        <div class="ai-stats-grid">
          <div>
            <div class="ai-stat-value ai-cyan">99.99%</div>
            <div class="ai-stat-label">SLA Uptime</div>
          </div>
          <div>
            <div class="ai-stat-value ai-blue">SOC2</div>
            <div class="ai-stat-label">Compliant</div>
          </div>
          <div>
            <div class="ai-stat-value ai-indigo">&lt;50ms</div>
            <div class="ai-stat-label">Latency</div>
          </div>
          <div>
            <div class="ai-stat-value ai-emerald">PDPL</div>
            <div class="ai-stat-label">KSA Hosted</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Solutions Preview -->
    <section class="ai-section">
      <div class="ai-container">
        <div class="ai-section-header">
          <div class="ai-badge" style="margin: 0 auto 1rem;">
            <span class="ai-badge-text">{{ 'solutions.badge' | translate }}</span>
          </div>
          <h2>{{ 'solutions.title' | translate }}</h2>
        </div>
        <div class="ai-solutions-grid">
          <div class="ai-solution-card">
            <div class="ai-solution-icon">🤖</div>
            <h3>{{ 'solutions.agent' | translate }}</h3>
            <p>{{ 'solutions.agent_desc' | translate }}</p>
          </div>
          <div class="ai-solution-card">
            <div class="ai-solution-icon">📄</div>
            <h3>{{ 'solutions.doc' | translate }}</h3>
            <p>{{ 'solutions.doc_desc' | translate }}</p>
          </div>
          <div class="ai-solution-card">
            <div class="ai-solution-icon">🧠</div>
            <h3>{{ 'solutions.llm' | translate }}</h3>
            <p>{{ 'solutions.llm_desc' | translate }}</p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomePage {
  i18n = inject(I18nService);
}
