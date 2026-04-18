import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  // Visible boot failure in operator browsers; never silent.
  document.body.innerText = 'Dogan AI OS shell failed to start: ' + (err?.message ?? err);
});
