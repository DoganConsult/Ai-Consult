import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-enterprise-page',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="ai-section" style="padding-top: 6rem;">
      <div class="ai-container">
        <div class="ai-section-header">
          <div class="ai-badge" style="margin: 0 auto 1rem;">
            <span class="ai-badge-text">{{ 'enterprise.badge' | translate }}</span>
          </div>
          <h2>{{ 'enterprise.title' | translate }}</h2>
          <p>{{ 'enterprise.desc' | translate }}</p>
        </div>
        <div class="ai-enterprise-grid">
          <div class="ai-enterprise-card">
            <div class="ai-solution-icon">🔒</div>
            <h3>{{ 'enterprise.sec1' | translate }}</h3>
            <p>{{ 'enterprise.sec1_desc' | translate }}</p>
          </div>
          <div class="ai-enterprise-card">
            <div class="ai-solution-icon">⚡</div>
            <h3>{{ 'enterprise.sec2' | translate }}</h3>
            <p>{{ 'enterprise.sec2_desc' | translate }}</p>
          </div>
        </div>
      </div>
    </section>
  `
})
export class EnterprisePage {}
