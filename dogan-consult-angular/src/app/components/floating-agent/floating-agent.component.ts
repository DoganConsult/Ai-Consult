import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {APP_ICONS} from '../../shared/icons';
import {I18nService} from '../../shared/i18n.service';
import {TranslatePipe} from '../../shared/translate.pipe';
import {ApiService, ChatMessage} from '../../shared/api.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-floating-agent',
  standalone: true,
  imports: [LucideAngularModule, FormsModule, TranslatePipe],
  template: `
    <div class="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      
      @if (isOpen()) {
        <div class="bg-white rounded-2xl shadow-2xl w-[350px] max-w-[calc(100vw-3rem)] max-h-[600px] flex flex-col border border-gray-100 overflow-hidden pointer-events-auto transform transition-all">
          
          <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 shrink-0 relative">
            <button (click)="isOpen.set(false)" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
              <lucide-icon [img]="icons.X" [size]="18"></lucide-icon>
            </button>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <lucide-icon [img]="icons.Bot" [size]="20" class="text-white"></lucide-icon>
              </div>
              <div class="flex flex-col">
                <span class="text-white font-semibold flex items-center gap-2">
                  {{ 'agent.name' | translate }}
                  <span class="w-2 h-2 rounded-full bg-green-400"></span>
                </span>
                <span class="text-blue-100 text-xs">{{ 'agent.title' | translate }}</span>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col min-h-[300px]">
            @for (msg of chatMessages(); track $index) {
              <div class="flex" [class.justify-end]="msg.type === 'user'" [class.justify-start]="msg.type === 'agent'">
                @if (msg.type === 'agent') {
                  <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <lucide-icon [img]="icons.Bot" [size]="12" class="text-blue-600"></lucide-icon>
                  </div>
                }
                
                <div class="max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm"
                     [class.bg-blue-600]="msg.type === 'user'" [class.text-white]="msg.type === 'user'" [class.rounded-tr-sm]="msg.type === 'user'"
                     [class.bg-white]="msg.type === 'agent'" [class.text-gray-800]="msg.type === 'agent'" [class.rounded-tl-sm]="msg.type === 'agent'" [class.border]="msg.type === 'agent'" [class.border-gray-100]="msg.type === 'agent'">
                  <p class="whitespace-pre-wrap leading-relaxed">{{ msg.text }}</p>
                </div>
              </div>
            }
            
            @if (chatLoading()) {
              <div class="flex justify-start">
                <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <lucide-icon [img]="icons.Bot" [size]="12" class="text-blue-600"></lucide-icon>
                </div>
                <div class="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-gray-100 shadow-sm flex items-center gap-1">
                  <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              </div>
            }
          </div>

          <div class="p-3 bg-white border-t border-gray-100 shrink-0">
            <div class="flex items-center gap-2 bg-gray-50 rounded-xl px-2 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <input type="text" [(ngModel)]="chatInput" (keyup.enter)="sendChat()" [placeholder]="i18n.t('agent.placeholder')" [disabled]="chatLoading()" class="flex-1 bg-transparent py-3 px-2 text-sm focus:outline-none disabled:opacity-50 text-gray-800 placeholder:text-gray-400" />
              <button (click)="sendChat()" [disabled]="chatLoading() || !chatInput.trim()" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-gray-300">
                <lucide-icon [img]="icons.Send" [size]="14"></lucide-icon>
              </button>
            </div>
            <div class="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <lucide-icon [img]="icons.Shield" [size]="10"></lucide-icon> Powered by OpenClaw Autonomous Engine
            </div>
          </div>
        </div>
      }

      @if (!isOpen()) {
        <button (click)="openChat()" class="w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center pointer-events-auto group relative">
          <lucide-icon [img]="icons.MessageSquare" [size]="24" class="group-hover:rotate-12 transition-transform duration-300"></lucide-icon>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
        </button>
      }
    </div>
  `
})
export class FloatingAgentComponent implements OnInit {
  protected readonly icons = APP_ICONS;
  i18n = inject(I18nService);
  private api = inject(ApiService);
  private router = inject(Router);
  
  isOpen = signal(false);
  chatInput = '';
  chatLoading = signal(false);
  chatSessionId: string | undefined;
  chatMessages = signal<{ type: string; text: string }[]>([]);
  contextPath = '';

  constructor() {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.contextPath = event.urlAfterRedirects;
    });
  }

  openChat() {
    this.isOpen.set(true);
    if (this.chatMessages().length === 0) {
       this.chatMessages.set([
        { type: 'agent', text: this.i18n.t('agent.welcome') }
      ]);
    }
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

    this.api.sendOpenClawChat(apiMessages, this.i18n.lang(), this.contextPath, this.chatSessionId).subscribe({
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
