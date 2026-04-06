import { Routes } from '@angular/router';
import { HomePage } from './features/home/home.page';
import { DemoPage } from './features/demo/demo.page';
import { SolutionsPage } from './features/solutions/solutions.page';
import { EnterprisePage } from './features/enterprise/enterprise.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'demo', component: DemoPage },
  { path: 'solutions', component: SolutionsPage },
  { path: 'enterprise', component: EnterprisePage },
  { path: '**', redirectTo: '' }
];
