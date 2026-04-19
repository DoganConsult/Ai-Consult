import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export interface XY { label: string; value: number; color?: string; }

@Component({
  selector: 'dgn-kpi',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kpi">
      <div class="kpi-label">{{ label }}</div>
      <div class="kpi-value">{{ value }}</div>
      @if (sub) { <div class="kpi-sub">{{ sub }}</div> }
    </div>
  `,
  styles: [`
    .kpi { background:#fff; border:1px solid #e0e0e0; padding:1rem 1.25rem;
      display:flex; flex-direction:column; gap:.25rem; min-height:88px; }
    .kpi-label { font-size:.6875rem; text-transform:uppercase; letter-spacing:.32px; color:#525252; }
    .kpi-value { font-size:1.875rem; font-weight:300; color:#161616; line-height:1.1; }
    .kpi-sub   { font-size:.75rem; color:#6f6f6f; }
  `],
})
export class KpiTile {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() sub?: string;
}

@Component({
  selector: 'dgn-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bars">
      @for (d of data; track d.label) {
        <div class="row">
          <div class="lbl" [title]="d.label">{{ d.label }}</div>
          <div class="bar-wrap">
            <div class="bar" [style.width.%]="pct(d.value)" [style.background]="d.color || '#0f62fe'"></div>
          </div>
          <div class="val">{{ d.value }}</div>
        </div>
      }
      @if (data.length === 0) { <div class="empty">No data.</div> }
    </div>
  `,
  styles: [`
    .bars { display:flex; flex-direction:column; gap:.375rem; }
    .row  { display:grid; grid-template-columns: 9rem 1fr 3rem; gap:.5rem; align-items:center; }
    .lbl  { font-size:.75rem; color:#525252; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .bar-wrap { background:#f4f4f4; height:14px; position:relative; }
    .bar  { height:100%; }
    .val  { font-size:.75rem; text-align:right; font-variant-numeric: tabular-nums; }
    .empty { color:#6f6f6f; font-style:italic; padding:.5rem; }
  `],
})
export class BarChart {
  @Input({ required: true }) data: XY[] = [];
  pct(v: number): number {
    const max = Math.max(1, ...this.data.map((d) => d.value));
    return Math.round((v / max) * 100);
  }
}

@Component({
  selector: 'dgn-spark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="none"
         style="width:100%;height:80px;display:block">
      <defs>
        <linearGradient id="g-{{ uid }}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.4"/>
          <stop offset="100%" [attr.stop-color]="color" stop-opacity="0"/>
        </linearGradient>
      </defs>
      @if (data.length > 1) {
        <path [attr.d]="areaPath()" [attr.fill]="'url(#g-' + uid + ')'"></path>
        <path [attr.d]="linePath()" fill="none" [attr.stroke]="color" stroke-width="1.5"></path>
      }
    </svg>
    <div class="ax">
      @for (d of data; track $index; let i = $index) {
        @if (i === 0 || i === data.length - 1) { <span>{{ shortLabel(d.label) }}</span> }
      }
    </div>
  `,
  styles: [`
    :host { display:block; }
    .ax { display:flex; justify-content:space-between; font-size:.625rem; color:#8d8d8d; padding:.125rem .25rem; }
  `],
})
export class Sparkline {
  @Input({ required: true }) data: { label: string; value: number }[] = [];
  @Input() color = '#0f62fe';
  readonly W = 200; readonly H = 60;
  readonly uid = Math.random().toString(36).slice(2, 8);

  shortLabel(s: string): string {
    if (!s) return '';
    const m = /T(\d{2}):/.exec(s); return m ? `${m[1]}:00` : s.slice(-5);
  }
  private points(): { x: number; y: number }[] {
    const max = Math.max(1, ...this.data.map((d) => d.value));
    const n = Math.max(1, this.data.length - 1);
    return this.data.map((d, i) => ({
      x: (i / n) * this.W,
      y: this.H - (d.value / max) * (this.H - 4) - 2,
    }));
  }
  linePath(): string {
    const pts = this.points();
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }
  areaPath(): string {
    const pts = this.points();
    if (pts.length === 0) return '';
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `${line} L${this.W},${this.H} L0,${this.H} Z`;
  }
}

@Component({
  selector: 'dgn-donut',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut-wrap">
      <svg viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e0e0e0" stroke-width="6"/>
        @for (s of segments(); track s.label) {
          <circle cx="21" cy="21" r="15.915" fill="transparent"
                  [attr.stroke]="s.color" stroke-width="6"
                  [attr.stroke-dasharray]="s.dash"
                  [attr.stroke-dashoffset]="s.offset"
                  transform="rotate(-90 21 21)"/>
        }
        <text x="21" y="20" text-anchor="middle" font-size="6" fill="#161616" font-weight="600">{{ total }}</text>
        <text x="21" y="26" text-anchor="middle" font-size="3" fill="#525252">{{ caption }}</text>
      </svg>
      <div class="legend">
        @for (s of segments(); track s.label) {
          <div class="li"><span class="dot" [style.background]="s.color"></span>{{ s.label }} <strong>{{ s.value }}</strong></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .donut-wrap { display:grid; grid-template-columns: 130px 1fr; gap:1rem; align-items:center; }
    svg { width:130px; height:130px; }
    .legend { display:flex; flex-direction:column; gap:.25rem; font-size:.75rem; }
    .li { display:flex; align-items:center; gap:.375rem; }
    .dot { display:inline-block; width:10px; height:10px; border-radius:2px; }
  `],
})
export class Donut {
  @Input({ required: true }) data: XY[] = [];
  @Input() caption = '';
  private readonly palette = ['#0f62fe', '#198038', '#f1c21b', '#da1e28', '#8a3ffc', '#005d5d', '#ff832b'];
  get total(): number { return this.data.reduce((s, d) => s + d.value, 0); }
  segments(): { label: string; value: number; color: string; dash: string; offset: number }[] {
    const tot = Math.max(1, this.total);
    let acc = 0;
    return this.data.map((d, i) => {
      const pct = (d.value / tot) * 100;
      const seg = { label: d.label, value: d.value,
        color: d.color ?? this.palette[i % this.palette.length]!,
        dash: `${pct.toFixed(2)} ${(100 - pct).toFixed(2)}`,
        offset: 25 - acc,
      };
      acc += pct;
      return seg;
    });
  }
}
