import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/footer/footer.component';
import { BackToTopComponent } from './components/back-to-top/back-to-top.component';

import { FloatingAgentComponent } from './components/floating-agent/floating-agent.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent, FooterComponent, BackToTopComponent, FloatingAgentComponent],
  template: `
    <div class="min-h-screen bg-white flex flex-col">
      <app-navigation />
      <main id="main-content" class="flex-1">
        <router-outlet />
      </main>
      <app-footer />
      <app-back-to-top />
      <app-floating-agent />
    </div>
  `,
})
export class App {}
