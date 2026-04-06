import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent, FooterComponent],
  template: `
    <app-navigation />
    <main id="main-content">
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: `
    :host { display: block; min-height: 100dvh; }
  `
})
export class App {}
