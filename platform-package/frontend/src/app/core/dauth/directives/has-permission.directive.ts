import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermissionService } from '../services/permission.service';

/**
 * Structural directive that renders its template only when the current
 * user has at least one of the supplied permission codes. Super admins
 * always see the template.
 *
 * Usage:
 *   <button *dosHasPermission="['platform.feature.toggle']">Toggle</button>
 */
@Directive({
  selector: '[dosHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private perm = inject(PermissionService);

  private _codes: string[] = [];
  private _rendered = false;

  @Input() set dosHasPermission(codes: string | string[] | null | undefined) {
    this._codes = Array.isArray(codes) ? codes : codes ? [codes] : [];
    this.evaluate();
  }

  constructor() {
    effect(() => {
      // react to snapshot changes
      this.perm.snapshot();
      this.evaluate();
    });
  }

  private evaluate(): void {
    const allowed = this.perm.hasAny(this._codes);
    if (allowed && !this._rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this._rendered = true;
    } else if (!allowed && this._rendered) {
      this.vcr.clear();
      this._rendered = false;
    }
  }
}
