import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpApiService } from '../../../core/erp/services/erp-api.service';
import { ErpCampaignParsed } from '../../../core/erp/schemas/erp.zod';

@Component({
  selector: 'app-marketing-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="glass-panel main-panel">
        <div class="panel-header">
          <h3>CAMPAIGN PERFORMANCE</h3>
          <button class="action-btn">+ New Campaign</button>
        </div>
        <div class="campaign-grid">
          <div class="campaign-card" *ngFor="let camp of campaigns">
            <div class="card-header">
              <h4>{{camp.name}}</h4>
              <span class="status-badge" [class]="camp.status.toLowerCase()">{{camp.status}}</span>
            </div>
            <div class="budget">
              <span>Budget:</span>
              <span class="value">{{camp.budget | currency:'USD':'symbol':'1.0-0'}}</span>
            </div>
          </div>
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
    
    .campaign-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
    .campaign-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; transition: 0.2s;}
    .campaign-card:hover { border-color: rgba(0,255,209,0.3); transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .card-header h4 { margin: 0; font-size: 1.1rem; }
    .budget { display: flex; justify-content: space-between; margin-top: auto; color: #8C8F9F; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;}
    .budget .value { color: #FFF; font-weight: bold; }
    
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .status-badge.active { background: rgba(0,255,209,0.1); color: #00FFD1; }
    .status-badge.planned { background: rgba(255,255,255,0.1); color: #FFF; }
  `]
})
export class MarketingDashboardComponent implements OnInit {
  private erpApi = inject(ErpApiService);
  campaigns: ErpCampaignParsed[] = [];

  ngOnInit() {
    this.erpApi.getCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        if(this.campaigns.length === 0){
           this.campaigns = [
             { id: '1', name: 'Q3 Enterprise Push', budget: 50000, status: 'ACTIVE', tenant_id: '1' },
             { id: '2', name: 'SBG Event Sponsorship', budget: 15000, status: 'PLANNED', tenant_id: '1' }
           ];
        }
      },
      error: (e) => console.error(e)
    });
  }
}
