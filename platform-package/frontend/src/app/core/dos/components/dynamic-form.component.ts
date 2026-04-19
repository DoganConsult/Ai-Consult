import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { DynamicFormField, DynamicFormSpec } from '../services/lowcode.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dos-dynamic-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, InputTextModule, TextareaModule, InputNumberModule,
    CheckboxModule, SelectModule, DatePickerModule, ButtonModule,
  ],
  template: `
    @if (spec(); as s) {
      <form class="dyn-form" (ngSubmit)="onSubmit()">
        @if (s.title) { <h3 class="form-title">{{ s.title }}</h3> }
        @for (f of s.fields; track f.key) {
          <div class="field">
            <label [for]="f.key">
              {{ f.label }} @if (f.required) { <span class="req">*</span> }
            </label>
            @switch (f.type) {
              @case ('text')      { <input [id]="f.key" pInputText [(ngModel)]="model[f.key]" [name]="f.key" [placeholder]="f.placeholder || ''" /> }
              @case ('textarea')  { <textarea [id]="f.key" pTextarea rows="4" [(ngModel)]="model[f.key]" [name]="f.key"></textarea> }
              @case ('number')    { <p-inputNumber [(ngModel)]="model[f.key]" [name]="f.key" /> }
              @case ('checkbox')  { <p-checkbox [(ngModel)]="model[f.key]" [binary]="true" [name]="f.key" /> }
              @case ('select')    { <p-select [(ngModel)]="model[f.key]" [name]="f.key" [options]="f.options || []" optionLabel="label" optionValue="value" /> }
              @case ('date')      { <p-datepicker [(ngModel)]="model[f.key]" [name]="f.key" [showIcon]="true" /> }
              @case ('json')      {
                <textarea [id]="f.key" pTextarea rows="6" [(ngModel)]="model[f.key]" [name]="f.key" class="mono"></textarea>
              }
            }
            @if (f.help) { <small class="help">{{ f.help }}</small> }
            @if (errors()[f.key]) { <small class="err">{{ errors()[f.key] }}</small> }
          </div>
        }
        <div class="actions">
          <p-button type="submit" [label]="s.submit_label || 'Submit'" icon="pi pi-check" [disabled]="submitting()" />
        </div>
      </form>
    }
  `,
  styles: [`
    .dyn-form { display: flex; flex-direction: column; gap: 14px; max-width: 720px; }
    .form-title { margin: 0 0 4px; font-size: 16px; font-weight: 700; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--dos-text); }
    .req { color: #dc2626; }
    .help { color: var(--dos-text-muted); font-size: 12px; }
    .err { color: #dc2626; font-size: 12px; }
    .actions { margin-top: 8px; }
    .mono { font-family: monospace; font-size: 12px; }
  `],
})
export class DynamicFormComponent {
  private _spec = signal<DynamicFormSpec | null>(null);
  @Input() set formSpec(v: DynamicFormSpec | null | undefined) {
    this._spec.set(v ?? null);
    this.resetModel();
  }
  @Input() initialValue: Record<string, any> = {};
  @Output() submit = new EventEmitter<Record<string, any>>();

  spec = this._spec.asReadonly();
  model: Record<string, any> = {};
  errors = signal<Record<string, string>>({});
  submitting = signal(false);

  private resetModel(): void {
    const base: Record<string, any> = { ...(this.initialValue ?? {}) };
    const s = this._spec();
    if (s) for (const f of s.fields) { if (!(f.key in base)) base[f.key] = f.type === 'checkbox' ? false : null; }
    this.model = base;
    this.errors.set({});
  }

  onSubmit(): void {
    const s = this._spec();
    if (!s) return;
    const errs: Record<string, string> = {};
    for (const f of s.fields) {
      const v = this.model[f.key];
      if (f.required && (v === null || v === '' || v === undefined)) errs[f.key] = 'Required';
      if (f.type === 'json' && v) {
        try { JSON.parse(v); } catch { errs[f.key] = 'Invalid JSON'; }
      }
    }
    this.errors.set(errs);
    if (Object.keys(errs).length > 0) return;
    // Parse JSON fields before emit.
    const out: Record<string, any> = { ...this.model };
    for (const f of s.fields) {
      if (f.type === 'json' && out[f.key]) {
        try { out[f.key] = JSON.parse(out[f.key]); } catch { /* already validated */ }
      }
    }
    this.submitting.set(true);
    try { this.submit.emit(out); } finally { this.submitting.set(false); }
  }

  reset(): void { this.resetModel(); }
}

export type { DynamicFormField, DynamicFormSpec };
