import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpApiService } from '../../../core/erp/services/erp-api.service';
import { ErpPurchaseOrderParsed } from '../../../core/erp/schemas/erp.zod';

@Component({
  selector: 'app-procurement-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="glass-panel main-panel">
        <div class="panel-header">
          <h3>PURCHASE ORDERS</h3>
          <button class="action-btn">+ Generate PO</button>
        </div>
        <div class="table-wrapper">
          <table class="erp-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Vendor ID</th>
                <th>Status</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let po of pos">
                <td class="font-bold">#{{po.id.substring(0,6)}}</td>
                <td>{{po.vendor_id}}</td>
                <td><span class="status-badge" [class]="po.status.toLowerCase()">{{po.status}}</span></td>
                <td>{{po.total_cost | currency:'USD'}}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; flex-direction: column; gap: 24px; height: 100%; color: #FFF;}
    .glass-panel { background: rgba(20, 24, 34, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 24px; }
    .main-panel { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; }
    .action-btn { background: #BC00FF; color: #FFF; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;}
    .erp-table { width: 100%; border-collapse: collapse; text-align: left; }
    .erp-table th { color: #8C8F9F; border-bottom: 2px solid rgba(255,255,255,0.05); padding: 12px; }
    .erp-table td { padding: 16px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .font-bold { font-weight: bold;}
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .status-badge.draft { background: rgba(255,255,255,0.1); color: #FFF; }
    .status-badge.approved { background: rgba(0,255,136,0.1); color: #00FF88; }
  `]
})
export class ProcurementDashboardComponent implements OnInit {
  private erpApi = inject(ErpApiService);
  pos: ErpPurchaseOrderParsed[] = [];

  ngOnInit() {
    this.erpApi.getPurchaseOrders().subscribe({
      next: (data) => {
        this.pos = data;
        if(this.pos.length === 0){
           this.pos = [
             { id: 'po-1122', vendor_id: 'VND-3991', total_cost: 4500, status: 'APPROVED', tenant_id: '1' }
           ];
        }
      },
      error: (e) => console.error(e)
    });
  }
}
