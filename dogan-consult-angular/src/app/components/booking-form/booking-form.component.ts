import { Component, signal, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';
import { ApiService, ChatMessage } from '../../shared/api.service';

@Component({
  selector: 'app-booking-form',
  imports: [LucideAngularModule, FormsModule, TranslatePipe],
  template: `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <button (click)="close.emit()" class="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10">
          <lucide-icon [img]="icons.X" [size]="20"></lucide-icon>
        </button>

        <div class="p-8">
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span class="text-white text-2xl font-bold">D</span>
            </div>
            <h2 class="text-gray-900 text-2xl font-bold mb-2">{{ 'booking.title' | translate }}</h2>
            <p class="text-gray-600">{{ 'booking.desc' | translate }}</p>
          </div>

          @if (submitted()) {
            <div class="text-center py-12">
              <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <lucide-icon [img]="icons.Check" [size]="40" class="text-green-600"></lucide-icon>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ 'booking.success_title' | translate }}</h3>
              <p class="text-gray-600 mb-6">{{ 'booking.success_desc' | translate }}</p>
              <button (click)="close.emit()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {{ 'booking.close' | translate }}
              </button>
            </div>
          } @else {
            <div class="flex gap-4 mb-8 border-b border-gray-200">
              <button (click)="activeTab.set('advisory')" class="px-6 py-3 transition-colors relative" [class.text-blue-600]="activeTab() === 'advisory'" [class.text-gray-600]="activeTab() !== 'advisory'">
                {{ 'booking.tab_advisory' | translate }}
                @if (activeTab() === 'advisory') { <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div> }
              </button>
              <button (click)="activeTab.set('proposal')" class="px-6 py-3 transition-colors relative" [class.text-blue-600]="activeTab() === 'proposal'" [class.text-gray-600]="activeTab() !== 'proposal'">
                {{ 'booking.tab_proposal' | translate }}
                @if (activeTab() === 'proposal') { <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div> }
              </button>
            </div>

            <div class="grid md:grid-cols-2 gap-8">
              <div>
                <h3 class="text-gray-900 font-semibold mb-6">
                  {{ activeTab() === 'advisory' ? ('booking.form_advisory_title' | translate) : ('booking.form_proposal_title' | translate) }}
                </h3>

                @if (errorMsg()) {
                  <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{{ errorMsg() }}</div>
                }

                <form class="space-y-4" (ngSubmit)="submitForm()">
                  <div>
                    <label class="block text-gray-700 mb-2">
                      <lucide-icon [img]="icons.User" [size]="16" class="inline mr-2"></lucide-icon>{{ 'booking.label_name' | translate }}
                    </label>
                    <input type="text" [(ngModel)]="formData.name" name="name" required [placeholder]="i18n.t('booking.ph_name')" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors" />
                  </div>
                  <div>
                    <label class="block text-gray-700 mb-2">
                      <lucide-icon [img]="icons.Building" [size]="16" class="inline mr-2"></lucide-icon>{{ 'booking.label_org' | translate }}
                    </label>
                    <input type="text" [(ngModel)]="formData.organization" name="organization" [placeholder]="i18n.t('booking.ph_org')" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors" />
                  </div>
                  <div>
                    <label class="block text-gray-700 mb-2">
                      <lucide-icon [img]="icons.Mail" [size]="16" class="inline mr-2"></lucide-icon>{{ 'booking.label_email' | translate }}
                    </label>
                    <input type="email" [(ngModel)]="formData.email" name="email" required placeholder="you&#64;organization.com" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors" />
                  </div>
                  <div>
                    <label class="block text-gray-700 mb-2">{{ 'booking.label_interest' | translate }}</label>
                    <div class="space-y-2">
                      @for (areaKey of serviceAreaKeys; track areaKey) {
                        <label class="flex items-center gap-2">
                          <input type="checkbox" class="w-4 h-4 text-blue-600" (change)="toggleArea(areaKey, $event)" />
                          <span class="text-gray-700 text-sm">{{ areaKey | translate }}</span>
                        </label>
                      }
                    </div>
                  </div>
                  <div>
                    <label class="block text-gray-700 mb-2">{{ 'booking.label_desc' | translate }}</label>
                    <textarea rows="3" [(ngModel)]="formData.message" name="message" [placeholder]="i18n.t('booking.ph_desc')" class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors"></textarea>
                  </div>
                  <button type="submit" [disabled]="submitting()" class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (submitting()) {
                      <span class="inline-flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        {{ 'booking.submitting' | translate }}
                      </span>
                    } @else {
                      {{ activeTab() === 'advisory' ? ('booking.submit_advisory' | translate) : ('booking.submit_proposal' | translate) }}
                    }
                  </button>
                </form>
              </div>

              <div class="flex flex-col">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-gray-900 font-semibold">
                    <lucide-icon [img]="icons.Bot" [size]="20" class="inline mr-2 text-blue-600"></lucide-icon>{{ 'booking.ai_title' | translate }}
                  </h3>
                  <button (click)="showChat.set(!showChat())" class="text-blue-600 hover:text-blue-700 text-sm">
                    {{ showChat() ? ('booking.hide_chat' | translate) : ('booking.show_chat' | translate) }}
                  </button>
                </div>

                @if (showChat()) {
                  <div class="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
                    <div class="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 max-h-96">
                      @for (msg of chatMessages(); track $index) {
                        <div class="flex" [class.justify-end]="msg.type === 'user'" [class.justify-start]="msg.type === 'agent'">
                          <div class="max-w-[80%] rounded-lg p-3" [class.bg-blue-600]="msg.type === 'user'" [class.text-white]="msg.type === 'user'" [class.bg-white]="msg.type === 'agent'" [class.border]="msg.type === 'agent'" [class.border-gray-200]="msg.type === 'agent'">
                            @if (msg.type === 'agent') {
                              <div class="flex items-center gap-2 mb-1">
                                <lucide-icon [img]="icons.Bot" [size]="16" class="text-blue-600"></lucide-icon>
                                <span class="text-xs text-gray-500">{{ 'nav.brand' | translate }}</span>
                              </div>
                            }
                            <p class="text-sm whitespace-pre-wrap">{{ msg.text }}</p>
                          </div>
                        </div>
                      }
                      @if (chatLoading()) {
                        <div class="flex justify-start">
                          <div class="max-w-[80%] rounded-lg p-3 bg-white border border-gray-200">
                            <div class="flex items-center gap-2 mb-1">
                              <lucide-icon [img]="icons.Bot" [size]="16" class="text-blue-600"></lucide-icon>
                              <span class="text-xs text-gray-500">{{ 'nav.brand' | translate }}</span>
                            </div>
                            <div class="flex items-center gap-1">
                              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                    <div class="p-4 bg-white border-t border-gray-200">
                      <div class="flex gap-2">
                        <input type="text" [(ngModel)]="chatInput" (keyup.enter)="sendChat()" [placeholder]="i18n.t('booking.chat_placeholder')" [disabled]="chatLoading()" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 disabled:opacity-50" />
                        <button (click)="sendChat()" [disabled]="chatLoading()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                          <lucide-icon [img]="icons.Send" [size]="16"></lucide-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                    <div class="flex justify-center mb-4">
                      <lucide-icon [img]="icons.Bot" [size]="48" class="text-blue-600"></lucide-icon>
                    </div>
                    <p class="text-gray-600 mb-4">{{ 'booking.chat_prompt' | translate }}</p>
                    <button (click)="showChat.set(true)" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                      <lucide-icon [img]="icons.MessageSquare" [size]="16"></lucide-icon>{{ 'booking.chat_start' | translate }}
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class BookingFormComponent {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  private api = inject(ApiService);
  close = output<void>();
  activeTab = signal<'advisory' | 'proposal'>('advisory');
  showChat = signal(false);
  submitted = signal(false);
  submitting = signal(false);
  errorMsg = signal('');
  chatInput = '';
  chatLoading = signal(false);
  chatSessionId: string | undefined;
  chatMessages = signal<{ type: string; text: string }[]>([]);

  formData = {
    name: '',
    email: '',
    organization: '',
    message: '',
    selectedAreas: [] as string[],
  };

  serviceAreaKeys = ['booking.area_telecom', 'booking.area_dc', 'booking.area_cyber', 'booking.area_gov'];

  constructor() {
    this.chatMessages.set([
      { type: 'agent', text: this.i18n.t('booking.chat_welcome') },
    ]);
  }

  toggleArea(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.formData.selectedAreas.push(key);
    } else {
      this.formData.selectedAreas = this.formData.selectedAreas.filter(a => a !== key);
    }
  }

  submitForm(): void {
    if (!this.formData.name || !this.formData.email) {
      this.errorMsg.set(this.i18n.t('booking.error_required'));
      return;
    }

    this.submitting.set(true);
    this.errorMsg.set('');

    this.api.submitConsultation({
      type: this.activeTab(),
      name: this.formData.name,
      email: this.formData.email,
      organization: this.formData.organization || undefined,
      serviceArea: this.formData.selectedAreas.map(k => this.i18n.t(k)).join(', ') || undefined,
      message: this.formData.message || undefined,
      lang: this.i18n.lang(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.error || this.i18n.t('booking.error_generic'));
      },
    });
  }

  sendChat(): void {
    if (!this.chatInput.trim() || this.chatLoading()) return;
    const userText = this.chatInput.trim();
    this.chatInput = '';

    this.chatMessages.update((msgs) => [...msgs, { type: 'user', text: userText }]);
    this.chatLoading.set(true);

    const apiMessages: ChatMessage[] = this.chatMessages()
      .filter(m => m.type !== 'agent' || this.chatMessages().indexOf(m) > 0)
      .map(m => ({
        role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

    this.api.sendChat(apiMessages, this.i18n.lang(), this.chatSessionId).subscribe({
      next: (res) => {
        this.chatSessionId = res.sessionId;
        this.chatMessages.update((msgs) => [...msgs, { type: 'agent', text: res.reply }]);
        this.chatLoading.set(false);
      },
      error: () => {
        this.chatMessages.update((msgs) => [...msgs, { type: 'agent', text: this.i18n.t('booking.chat_error') }]);
        this.chatLoading.set(false);
      },
    });
  }
}
