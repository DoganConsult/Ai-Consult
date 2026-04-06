import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <footer class="ai-footer">
      <div class="ai-container">
        <div class="ai-footer-grid">
          <div class="ai-footer-brand">
            <div class="ai-logo">
              <div class="ai-logo-icon"><span>A</span></div>
              <span class="ai-logo-text">{{ 'nav.brand' | translate }}</span>
            </div>
            <p>{{ 'hero.desc' | translate }}</p>
          </div>
          
          <div>
            <h4>Platform</h4>
            <ul>
              <li><a href="/solutions">{{ 'nav.solutions' | translate }}</a></li>
              <li><a href="/demo">{{ 'nav.demo' | translate }}</a></li>
              <li><a href="/enterprise">{{ 'nav.enterprise' | translate }}</a></li>
            </ul>
          </div>
          
          <div>
            <h4>Dogan Consult Group</h4>
            <ul>
              <li><a href="https://doganconsult.com"><span class="ai-footer-dot" style="background:#3b82f6"></span> Dogan Consult</a></li>
              <li><a href="https://doganlap.com"><span class="ai-footer-dot" style="background:#7c3aed"></span> DoganLab</a></li>
              <li><a href="https://saudibusinessgate.com"><span class="ai-footer-dot" style="background:#10b981"></span> Saudi Business Gate</a></li>
              <li><a href="https://shahin-ai.com"><span class="ai-footer-dot" style="background:#0ea5e9"></span> Shahin AI</a></li>
              <li><a href="/api/integration/openclaw"><span class="ai-footer-dot" style="background:#6366f1"></span> OpenClaw Server</a></li>
            </ul>
          </div>
        </div>
        
        <div class="ai-footer-bottom">
          <p>&copy; 2026 Dogan AI. Powered by <a href="https://doganconsult.com">Dogan Consult</a>.</p>
          <div class="ai-footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  i18n = inject(I18nService);
}
