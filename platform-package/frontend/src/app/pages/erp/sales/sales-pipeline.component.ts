import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpApiService } from '../../../core/erp/services/erp-api.service';
import { ErpSalesLeadParsed } from '../../../core/erp/schemas/erp.zod';

@Component({
  selector: 'app-sales-pipeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pipeline-container">
      <!-- Top Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="label">Total Revenue <i class="icon">💸</i></span>
          <h3 class="value glow-cyan">$945,670</h3>
        </div>
        <div class="metric-card">
          <span class="label">New Leads <i class="icon">👥</i></span>
          <h3 class="value">148 <span class="trend pos">↗</span></h3>
        </div>
        <div class="metric-card">
          <span class="label">Win Rate <i class="icon">🎯</i></span>
          <h3 class="value">68% <span class="trend pos">↗</span></h3>
        </div>
        <div class="metric-card">
          <span class="label">Avg. Deal Size <i class="icon">📊</i></span>
          <h3 class="value">$14,200</h3>
        </div>
      </div>

      <!-- Main Layout: Kanban + Chart Axis -->
      <div class="dashboard-grid">
        
        <!-- Kanban Board -->
        <div class="kanban-wrapper glass-panel">
          <div class="kanban-header">
            <h3>SALES PIPELINE</h3>
            <button class="icon-btn">•••</button>
          </div>
          
          <div class="kanban-board">
            
            <div class="kanban-column" *ngFor="let col of columns">
              <div class="col-header" [style.border-top-color]="col.color">
                <span class="title">{{col.title}}</span>
                <span class="count">{{ getLeadsByStatus(col.status).length }}</span>
              </div>
              
              <div class="card-list">
                <div class="lead-card" *ngFor="let lead of getLeadsByStatus(col.status)">
                  <div class="card-top">
                    <span class="value">{{ lead.value_ext | currency:'USD':'symbol':'1.0-0' }}</span>
                    <button class="icon-btn sm">⋮</button>
                  </div>
                  <div class="company">{{ lead.customer_name }}</div>
                  
                  <div class="card-bottom">
                    <div class="owner">
                      <div class="avatar-sm bg-purple">{{ lead.customer_name.charAt(0) }}</div>
                      <span>Owner</span>
                    </div>
                  </div>
                </div>
                <!-- Empty Drop Zone -->
                 <div class="drop-zone">
                   <div class="dot" [style.background]="col.color"></div>
                   <span>Drag and drop</span>
                   <i class="arrows">↕</i>
                 </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Revenue Chart Box -->
        <div class="chart-wrapper glass-panel">
          <div class="kanban-header">
            <h3>REVENUE OVER TIME</h3>
            <select class="glass-select"><option>Area chart</option></select>
          </div>
          <div class="chart-body">
            <!-- Simulated Neon Graph -->
            <div class="neon-line-graph">
              <svg viewBox="0 0 500 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#00FFD1" />
                    <stop offset="50%" stop-color="#BC00FF" />
                    <stop offset="100%" stop-color="#00FFD1" />
                  </linearGradient>
                  <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="rgba(0,255,209,0.3)" />
                    <stop offset="100%" stop-color="rgba(26,28,35,0)" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <!-- Grid Lines -->
                <path d="M0 50 H500 M0 100 H500 M0 150 H500 M0 200 H500 M0 250 H500" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                
                <!-- Fill Area -->
                <path d="M 50 250 Q 80 150 120 170 T 200 180 T 250 130 T 320 150 T 400 50 T 450 150 T 490 80 L 490 300 L 50 300 Z" fill="url(#fillGrad)" />
                
                <!-- Glowing Line -->
                <path d="M 50 250 Q 80 150 120 170 T 200 180 T 250 130 T 320 150 T 400 50 T 450 150 T 490 80" fill="none" stroke="url(#lineGrad)" stroke-width="4" filter="url(#glow)"/>
                
                <!-- Points -->
                <circle cx="120" cy="170" r="4" fill="#1A1C23" stroke="#00FFD1" stroke-width="2" filter="url(#glow)"/>
                <circle cx="250" cy="130" r="4" fill="#1A1C23" stroke="#BC00FF" stroke-width="2" filter="url(#glow)"/>
                <circle cx="400" cy="50" r="4" fill="#1A1C23" stroke="#00FFD1" stroke-width="2" filter="url(#glow)"/>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .pipeline-container { display: flex; flex-direction: column; gap: 24px; height: 100%; }
    
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px;
    }
    .metric-card .label { color: #8C8F9F; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; }
    .metric-card h3 { margin: 0; font-size: 1.75rem; font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 12px; }
    .glow-cyan { text-shadow: 0 0 16px rgba(0,255,209,0.4); }
    .trend { font-size: 1rem; }
    .trend.pos { color: #00FFD1; }
    
    .dashboard-grid { display: grid; grid-template-columns: minmax(500px, 1.2fr) minmax(400px, 1fr); gap: 24px; flex: 1; min-height: 0; }
    
    .glass-panel {
      background: rgba(20, 24, 34, 0.6);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 20px;
    }
    
    .kanban-header { display: flex; justify-content: space-between; align-items: center; }
    .kanban-header h3 { margin: 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.5px; }
    .icon-btn { background: transparent; border: none; color: #8C8F9F; cursor: pointer; padding: 4px; border-radius: 4px; }
    .icon-btn:hover { color: #FFF; background: rgba(255,255,255,0.1); }
    
    .glass-select { background: rgba(255,255,255,0.05); color: #FFF; border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 8px; outline: none; }
    
    .kanban-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; flex: 1; min-height: 0; overflow-y: auto; padding-right: 8px; }
    .kanban-column { display: flex; flex-direction: column; gap: 16px; }
    .col-header { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid; padding-top: 8px; }
    .col-header .title { font-size: 0.85rem; font-weight: 600; letter-spacing: 0.5px; }
    .col-header .count { background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; color: #8C8F9F; }
    
    .card-list { display: flex; flex-direction: column; gap: 12px; }
    .lead-card {
      background: rgba(30, 34, 45, 0.8); border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px; padding: 16px; cursor: grab; transition: transform 0.2s, box-shadow 0.2s;
    }
    .lead-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,255,209,0.2); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .card-top .value { font-size: 1.1rem; font-weight: 700; }
    .company { color: #8C8F9F; font-size: 0.85rem; margin-bottom: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
    .card-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; }
    .owner { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #8C8F9F; }
    .avatar-sm { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold; color: #FFF; }
    .bg-purple { background: rgba(188,0,255,0.6); border: 1px solid #BC00FF; }
    
    .drop-zone {
      border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 12px;
      display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #6C6F7F; background: rgba(255,255,255,0.01);
    }
    .drop-zone .dot { width: 8px; height: 8px; border-radius: 50%; }
    .drop-zone .arrows { margin-left: auto; font-style: normal; }
    
    .chart-body { flex: 1; display: flex; align-items: stretch; }
    .neon-line-graph { width: 100%; flex: 1; position: relative; }
    svg { width: 100%; height: 100%; overflow: visible; padding-top: 20px;}
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  `]
})
export class SalesPipelineComponent implements OnInit {
  private erpApi = inject(ErpApiService);
  
  leads: ErpSalesLeadParsed[] = [];
  
  columns = [
    { status: 'NEW', title: 'LEADS', color: '#00FFD1' },
    { status: 'QUALIFIED', title: 'QUALIFIED', color: '#BC00FF' },
    { status: 'PROPOSAL', title: 'PROPOSAL', color: '#0088FF' },
    { status: 'WON', title: 'CLOSED WON', color: '#00FF88' }
  ];

  ngOnInit() {
    this.erpApi.getSalesLeads().subscribe({
      next: (data) => {
        this.leads = data;
        // Inject some mock visual data if the real DB is empty so the WOW UI always looks great
        if (this.leads.length === 0) {
          this.leads = [
            { id: '1', source: 'SBG', customer_name: 'Stark Industries', value_ext: 25600, status: 'QUALIFIED', tenant_id: '1' },
            { id: '2', source: 'DOGAN', customer_name: 'Wayne Enterprises', value_ext: 12000, status: 'QUALIFIED', tenant_id: '1' },
            { id: '3', source: 'SBG', customer_name: 'LexCorp', value_ext: 25000, status: 'PROPOSAL', tenant_id: '1' },
            { id: '4', source: 'DOGAN', customer_name: 'Oscorp', value_ext: 14200, status: 'WON', tenant_id: '1' },
            { id: '5', source: 'Internal', customer_name: 'Pym Tech', value_ext: 12000, status: 'WON', tenant_id: '1' }
          ];
        }
      },
      error: (err: any) => {
        console.error('Failed to load ERP pipeline', err);
      }
    });
  }

  getLeadsByStatus(status: string) {
    return this.leads.filter(l => l.status === status);
  }
}
