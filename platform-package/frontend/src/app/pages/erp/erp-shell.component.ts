import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-erp-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="erp-container">
      <aside class="erp-sidebar">
        <div class="erp-logo">
          <div class="orb"></div>
          <h2>NEXUS <span>ERP</span></h2>
        </div>
        
        <nav class="erp-nav">
          <a routerLink="sales" routerLinkActive="active" class="nav-item">
            <i class="icon-sales">📈</i> Sales
          </a>
          <a routerLink="finance" routerLinkActive="active" class="nav-item">
            <i class="icon-finance">💰</i> Finance
          </a>
          <a routerLink="hr" routerLinkActive="active" class="nav-item">
            <i class="icon-hr">👥</i> HR
          </a>
          <a routerLink="marketing" routerLinkActive="active" class="nav-item">
            <i class="icon-marketing">📢</i> Marketing
          </a>
          <a routerLink="procurement" routerLinkActive="active" class="nav-item">
            <i class="icon-procurement">📦</i> Procurement
          </a>
        </nav>
        
        <div class="sidebar-footer">
          <a routerLink="/dashboard" class="nav-item">
            <i class="icon-settings">⚙️</i> Platform Settings
          </a>
        </div>
      </aside>

      <main class="erp-content">
        <header class="erp-header">
          <div class="breadcrumbs">
            <span class="font-inter">Inter</span>
            <h1>SALES PIPELINE & ANALYTICS</h1>
          </div>
          <div class="header-actions">
            <div class="search-bar">
              <i>🔍</i>
              <input type="text" placeholder="Search..." />
            </div>
            <button class="notif-btn">🔔<span class="badge">9</span></button>
            <div class="user-profile">
              <img src="/assets/avatars/alex.jpg" alt="Alex R." onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FhYSI+PHBhdGggZD0iTTEyIDJDMiAxMiA2LjQ4IDIgMTIgMnMxMCA0LjQ4IDEwIDEwLTQuNDggMTAtMTAgMTBTMiAxNy41MiAyIDEyem0wIDE4YzQuNDEgMCA4LTMuNTkgOC04cy0zLjU5LTgtOC04LTggMy41OS04IDggMy41OSA4IDggOHptMC0xNGMyLjIxIDAgNCAxLjc5IDQgNHMtMS43OSA0LTQgNC00LTEuNzktNC00IDEuNzktNCA0LTR6bTAgNmMxLjEgMCAyLS45IDItMnMtLjktMi0yLTItMiAuOS0yIDIgLjkgMiAyIDJ6Ii8+PC9zdmc+'" />
              <span>Alex R. <i>▼</i></span>
            </div>
          </div>
        </header>

        <section class="erp-body">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .font-inter { color: #8C8F9F; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; }
    .erp-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      background-color: #1A1C23;
      color: #FFFFFF;
      font-family: 'Inter', 'Roboto', sans-serif;
      overflow: hidden;
    }
    .erp-sidebar {
      width: 250px;
      background: linear-gradient(180deg, #151B26 0%, #171E2D 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      box-shadow: 4px 0 24px rgba(0,0,0,0.2);
      z-index: 10;
    }
    .erp-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 48px;
      padding-left: 12px;
    }
    .orb { width: 24px; height: 24px; background: linear-gradient(135deg, #00FFD1, #0088FF); border-radius: 50%; box-shadow: 0 0 12px rgba(0, 255, 209, 0.6); }
    .erp-logo h2 { font-size: 1.25rem; font-weight: 700; margin: 0; letter-spacing: 0.5px; }
    .erp-logo span { color: #8C8F9F; font-weight: 400; }
    
    .erp-nav { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: #8C8F9F;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .nav-item:hover { color: #FFFFFF; background: rgba(255,255,255,0.03); transform: translateX(4px); }
    .nav-item.active {
      color: #FFFFFF;
      background: rgba(188, 0, 255, 0.1);
      box-shadow: inset 0 0 0 1px rgba(188, 0, 255, 0.3), 0 4px 12px rgba(188, 0, 255, 0.15);
    }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #BC00FF; border-radius: 0 4px 4px 0;
      box-shadow: 0 0 8px #BC00FF;
    }
    .sidebar-footer { margin-top: auto; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05); }
    
    .erp-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: radial-gradient(circle at top right, rgba(188, 0, 255, 0.05), transparent 40%), #1A1C23;
      padding: 32px 40px;
      overflow-y: auto;
    }
    .erp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 32px;
    }
    .breadcrumbs h1 { margin: 4px 0 0; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.5px; }
    
    .header-actions { display: flex; align-items: center; gap: 20px; }
    .search-bar {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
      padding: 8px 16px; border-radius: 24px; transition: all 0.3s;
    }
    .search-bar:focus-within { border-color: rgba(0, 255, 209, 0.5); box-shadow: 0 0 0 2px rgba(0, 255, 209, 0.1); }
    .search-bar input { background: transparent; border: none; color: #FFF; outline: none; width: 200px; font-family: 'Inter', sans-serif;}
    .search-bar input::placeholder { color: #5C5F6F; }
    
    .notif-btn {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 50%; width: 40px; height: 40px; color: #FFF; cursor: pointer; position: relative; transition: all 0.3s;
    }
    .notif-btn:hover { background: rgba(255,255,255,0.1); }
    .badge { position: absolute; top: -4px; right: -4px; background: #BC00FF; color: #FFF; font-size: 0.6rem; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(188,0,255,0.6); }
    
    .user-profile { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 4px 12px; border-radius: 20px; transition: background 0.3s; }
    .user-profile:hover { background: rgba(255,255,255,0.05); }
    .user-profile img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); }
    .user-profile span { font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 4px;}
    .user-profile i { font-size: 0.7rem; color: #8C8F9F; }
    
    .erp-body { flex: 1; display: flex; flex-direction: column; }
  `]
})
export class ErpShellComponent {}
