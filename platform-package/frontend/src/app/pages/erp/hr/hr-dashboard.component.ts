import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpApiService } from '../../../core/erp/services/erp-api.service';
import { ErpEmployeeParsed } from '../../../core/erp/schemas/erp.zod';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="glass-panel main-panel">
        <div class="panel-header">
          <h3>GLOBAL WORKFORCE</h3>
          <button class="action-btn">+ Onboard Employee</button>
        </div>
        <div class="table-wrapper">
          <table class="erp-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let emp of employees">
                <td>
                  <div class="profile-cell">
                    <div class="avatar">{{emp.first_name.charAt(0)}}</div>
                    <span class="font-bold">{{emp.first_name}} {{emp.last_name}}</span>
                  </div>
                </td>
                <td>{{emp.department}}</td>
                <td><span class="status-badge" [class]="emp.status.toLowerCase()">{{emp.status}}</span></td>
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
    .profile-cell { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #00FFD1; color: #000; display: flex; align-items: center; justify-content: center; font-weight: bold;}
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .status-badge.active { background: rgba(0,255,136,0.1); color: #00FF88; }
    .status-badge.terminated { background: rgba(255,0,0,0.1); color: #FF4444; }
  `]
})
export class HrDashboardComponent implements OnInit {
  private erpApi = inject(ErpApiService);
  employees: ErpEmployeeParsed[] = [];

  ngOnInit() {
    this.erpApi.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        if(this.employees.length === 0){
           this.employees = [
             { id: '1', first_name: 'Jane', last_name: 'Doe', department: 'Engineering', status: 'ACTIVE', tenant_id: '1' }
           ];
        }
      },
      error: (e) => console.error(e)
    });
  }
}
