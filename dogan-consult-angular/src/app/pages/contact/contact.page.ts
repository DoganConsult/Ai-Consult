import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../../shared/icons';
import { I18nService } from '../../shared/i18n.service';
import { TranslatePipe } from '../../shared/translate.pipe';
import { COMPANY_INFO } from '../../shared/constants';
import { ApiService } from '../../shared/api.service';

@Component({
  selector: 'app-contact-page',
  imports: [LucideAngularModule, TranslatePipe, FormsModule],
  template: `
    <section class="pt-24 sm:pt-28 pb-16 sm:pb-20">
      <div class="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div class="text-center mb-12 sm:mb-16">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-4">
            <lucide-icon [img]="icons.Mail" [size]="14" class="text-blue-600" aria-hidden="true"></lucide-icon>
            <span class="text-blue-600 font-medium text-sm">{{ 'contact.badge' | translate }}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">{{ 'contact.title' | translate }}</h1>
          <p class="text-gray-600 text-base sm:text-lg max-w-3xl mx-auto">{{ 'contact.subtitle' | translate }}</p>
        </div>

        <div class="grid lg:grid-cols-5 gap-8 sm:gap-12">
          <div class="lg:col-span-3">
            @if (sent()) {
              <div class="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <lucide-icon [img]="icons.CheckCircle" [size]="48" class="text-green-500 mx-auto mb-4" aria-hidden="true"></lucide-icon>
                <h3 class="text-xl font-bold text-gray-900 mb-2">{{ 'contact.success_title' | translate }}</h3>
                <p class="text-gray-600">{{ 'contact.success_desc' | translate }}</p>
              </div>
            } @else {
              <form (ngSubmit)="submit()" class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5">
                <div class="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ 'contact.label_name' | translate }}</label>
                    <input type="text" [(ngModel)]="form.name" name="name" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ 'contact.label_email' | translate }}</label>
                    <input type="email" [(ngModel)]="form.email" name="email" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ 'contact.label_company' | translate }}</label>
                  <input type="text" [(ngModel)]="form.company" name="company" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ 'contact.label_subject' | translate }}</label>
                  <select [(ngModel)]="form.subject" name="subject" class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white">
                    <option value="">{{ 'contact.select_subject' | translate }}</option>
                    <option value="consultation">{{ 'contact.subj_consultation' | translate }}</option>
                    <option value="rfp">{{ 'contact.subj_rfp' | translate }}</option>
                    <option value="partnership">{{ 'contact.subj_partnership' | translate }}</option>
                    <option value="general">{{ 'contact.subj_general' | translate }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ 'contact.label_message' | translate }}</label>
                  <textarea [(ngModel)]="form.message" name="message" rows="5" required class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"></textarea>
                </div>
                <button type="submit" [disabled]="sending()" class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
                  <lucide-icon [img]="icons.Send" [size]="16" aria-hidden="true"></lucide-icon>
                  {{ 'contact.submit' | translate }}
                </button>
              </form>
            }
          </div>

          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
              <h3 class="text-lg font-bold text-gray-900 mb-4">{{ 'contact.info_title' | translate }}</h3>
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <lucide-icon [img]="icons.MapPin" [size]="18" class="text-blue-600" aria-hidden="true"></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{{ 'contact.address_label' | translate }}</p>
                    <p class="text-gray-600 text-sm">{{ company.address }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <lucide-icon [img]="icons.Mail" [size]="18" class="text-blue-600" aria-hidden="true"></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{{ 'contact.email_label' | translate }}</p>
                    <a [href]="'mailto:' + company.email" class="text-blue-600 hover:text-blue-700 text-sm" dir="ltr">{{ company.email }}</a>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </section>
  `,
})
export class ContactPage {
  protected readonly icons = APP_ICONS;
  protected readonly company = COMPANY_INFO;
  i18n = inject(I18nService);
  private api = inject(ApiService);
  form = { name: '', email: '', company: '', subject: '', message: '' };
  sending = signal(false);
  sent = signal(false);

  submit(): void {
    if (!this.form.name || !this.form.email || !this.form.message) return;
    this.sending.set(true);
    this.api.submitContact({
      name: this.form.name,
      email: this.form.email,
      message: `[${this.form.subject || 'General'}] ${this.form.company ? 'Company: ' + this.form.company + ' | ' : ''}${this.form.message}`,
      lang: this.i18n.lang(),
    }).subscribe({
      next: () => { this.sending.set(false); this.sent.set(true); },
      error: () => { this.sending.set(false); },
    });
  }
}
