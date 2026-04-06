import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-solutions-page',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="ai-section" style="padding-top: 6rem;">
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
export class SolutionsPage {}
