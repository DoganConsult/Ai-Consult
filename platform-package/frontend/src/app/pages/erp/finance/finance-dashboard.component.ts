import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpApiService } from '../../../core/erp/services/erp-api.service';
import { ErpInvoiceParsed } from '../../../core/erp/schemas/erp.zod';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="label">Total Collected <i class="icon">🏦</i></span>
          <h3 class="value glow-cyan">$2,442,100</h3>
        </div>
        <div class="metric-card">
          <span class="label">Pending Receivables <i class="icon">⏳</i></span>
          <h3 class="value">$182,500 <span class="trend push">!</span></h3>
        </div>
      </div>
      
      <div class="glass-panel main-panel">
        <div class="panel-header">
          <h3>INVOICE TRACKING</h3>
          <button class="action-btn">+ New Invoice</button>
        </div>
        <div class="table-wrapper">
          <table class="erp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td>{{inv.id.substring(0, 8)}}</td>
                <td class="font-bold">{{inv.amount | currency:inv.currency:'symbol':'1.0-0'}}</td>
                <td>{{inv.currency}}</td>
                <td>{{inv.due_date}}</td>
                <td><span class="status-badge" [class]="inv.status.toLowerCase()">{{inv.status}}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; flex-direction: column; gap: 24px; height: 100%; color: #FFF;}
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .metric-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
    .metric-card .label { color: #8C8F9F; font-size: 0.85rem; display: flex; justify-content: space-between; }
    .metric-card h3 { margin: 0; font-size: 1.75rem; font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 12px; }
    .glow-cyan { text-shadow: 0 0 16px rgba(0,255,209,0.4); }
    .glass-panel { background: rgba(20, 24, 34, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 24px; }
    .main-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; }
    .action-btn { background: #BC00FF; color: #FFF; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.3s; font-weight: bold;}
    .action-btn:hover { box-shadow: 0 0 16px rgba(188,0,255,0.5); }
    .erp-table { width: 100%; border-collapse: collapse; text-align: left; }
    .erp-table th { color: #8C8F9F; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid rgba(255,255,255,0.05); padding: 12px; }
    .erp-table td { padding: 16px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95rem; }
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .status-badge.draft { background: rgba(255,255,255,0.1); color: #FFF; }
    .status-badge.paid { background: rgba(0,255,136,0.1); color: #00FF88; }
    .status-badge.overdue { background: rgba(255,0,0,0.1); color: #FF4444; }
  `]
})
export class FinanceDashboardComponent implements OnInit {
  private erpApi = inject(ErpApiService);
  invoices: ErpInvoiceParsed[] = [];

  ngOnInit() {
    this.erpApi.getInvoices().subscribe({
      next: (data) => {
        this.invoices = data;
        if(this.invoices.length === 0){
           this.invoices = [
             { id: 'inv-12345678', amount: 15000, currency: 'USD', status: 'PAID', due_date: '2026-05-01', tenant_id: '1' },
             { id: 'inv-87654321', amount: 4500, currency: 'USD', status: 'DRAFT', due_date: '2026-05-15', tenant_id: '1' }
           ];
        }
      },
      error: (e) => console.error(e)
    });
  }
}
