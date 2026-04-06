import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-contact-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="pt-24 sm:pt-32 pb-16 sm:pb-24 relative">
      <div class="absolute inset-0 bg-gradient-to-b from-violet-950/10 via-transparent to-transparent"></div>
      <div class="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 relative">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-full border border-violet-500/20 mb-4">
            <span class="text-violet-300 font-medium text-sm">{{ 'contact.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">{{ 'contact.title' | translate }}</h1>
          <p class="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">{{ 'contact.subtitle' | translate }}</p>
        </div>

        @if (sent()) {
          <div class="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
            <div class="text-4xl mb-4">✅</div>
            <p class="text-green-400 font-medium">{{ 'contact.success' | translate }}</p>
          </div>
        } @else {
          <form (ngSubmit)="submit()" class="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 space-y-5">
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1.5">{{ 'contact.label_name' | translate }}</label>
                <input type="text" [(ngModel)]="form.name" name="name" required class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1.5">{{ 'contact.label_email' | translate }}</label>
                <input type="email" [(ngModel)]="form.email" name="email" required class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600" dir="ltr" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1.5">{{ 'contact.label_company' | translate }}</label>
              <input type="text" [(ngModel)]="form.company" name="company" class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1.5">{{ 'contact.label_message' | translate }}</label>
              <textarea [(ngModel)]="form.message" name="message" rows="5" required class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 placeholder-gray-600 resize-none"></textarea>
            </div>
            <button type="submit" [disabled]="sending()" class="w-full px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-all font-medium text-sm shadow-lg shadow-violet-500/20 disabled:opacity-50">
              {{ 'contact.submit' | translate }}
            </button>
          </form>

          <div class="mt-6 text-center">
            <a href="https://wa.me/966500666084" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-600/20 transition-all text-sm font-medium">
              {{ 'contact.whatsapp' | translate }}
            </a>
          </div>
        }
      </div>
    </section>
  `,
})
export class ContactPage {
  i18n = inject(I18nService);
  private api = inject(ApiService);
  form = { name: '', email: '', company: '', message: '' };
  sending = signal(false);
  sent = signal(false);

  submit(): void {
    if (!this.form.name || !this.form.email || !this.form.message) return;
    this.sending.set(true);
    this.api.submitContact({ ...this.form, lang: this.i18n.lang() }).then(() => {
      this.sent.set(true);
    }).catch(() => {
      this.sending.set(false);
    });
  }
}
