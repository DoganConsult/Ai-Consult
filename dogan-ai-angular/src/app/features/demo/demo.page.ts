import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-demo-page',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="ai-section" style="padding-top: 6rem;">
      <div class="ai-container">
        <div class="ai-section-header">
          <div class="ai-badge" style="margin: 0 auto 1rem;">
            <span class="ai-pulse"></span>
            <span class="ai-badge-text">{{ 'demo.badge' | translate }}</span>
          </div>
          <h2>{{ 'demo.title' | translate }}</h2>
          <p>{{ 'demo.desc' | translate }}</p>
        </div>

        <div class="ai-terminal">
          <div class="ai-terminal-bar">
            <div class="ai-terminal-dots">
              <span></span><span></span><span></span>
            </div>
            <div class="ai-terminal-status">dogan-ai-engine / {{ isConnected() ? 'connected' : 'connecting...' }}</div>
          </div>

          <div class="ai-terminal-body">
            @for (msg of messages(); track msg.id) {
              <div class="ai-chat-msg">
                @if (msg.role === 'agent') {
                  <div class="ai-chat-avatar agent">A</div>
                  <div class="ai-chat-bubble">{{ msg.content }}</div>
                } @else {
                  <div style="margin-left:auto; display:flex; gap:1rem;">
                    <div class="ai-chat-bubble user-bubble">{{ msg.content }}</div>
                    <div class="ai-chat-avatar user">U</div>
                  </div>
                }
              </div>
            }
            @if (isTyping()) {
              <div class="ai-chat-msg">
                <div class="ai-chat-avatar agent">A</div>
                <div class="ai-chat-bubble" style="color: #06b6d4;">Thinking...</div>
              </div>
            }
          </div>

          <div class="ai-terminal-input">
            <div class="ai-input-wrap">
              <input
                [placeholder]="'demo.input' | translate"
                [value]="userInput()"
                (input)="userInput.set($any($event.target).value)"
                (keydown.enter)="sendMessage()"
              >
              <button (click)="sendMessage()">{{ 'demo.send' | translate }}</button>
            </div>
          </div>
          <div class="ai-terminal-footer">Connected to Dogan Consult Neural Backend • /api/chat</div>
        </div>
      </div>
    </section>
  `
})
export class DemoPage {
  i18n = inject(I18nService);
  userInput = signal('');
  isConnected = signal(true);
  isTyping = signal(false);
  messages = signal<{id: number; role: string; content: string}[]>([
    { id: 1, role: 'agent', content: 'Hello! I am the Dogan AI enterprise agent. I am connected to the live neural backend. Ask me anything about AI consulting, governance, compliance, or our enterprise solutions for the KSA market.' }
  ]);

  private msgId = 2;

  async sendMessage() {
    const input = this.userInput().trim();
    if (!input) return;

    this.messages.update(msgs => [...msgs, { id: this.msgId++, role: 'user', content: input }]);
    this.userInput.set('');
    this.isTyping.set(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, context: 'dogan-ai-demo' })
      });
      const data = await res.json();
      this.messages.update(msgs => [...msgs, {
        id: this.msgId++, role: 'agent',
        content: data.reply || data.message || data.response || 'I received your message. The full AI engine is being configured.'
      }]);
    } catch {
      this.messages.update(msgs => [...msgs, {
        id: this.msgId++, role: 'agent',
        content: 'I could not reach the backend at this moment. Please ensure the Dogan Consult backend is running on /api/chat.'
      }]);
    } finally {
      this.isTyping.set(false);
    }
  }
}
