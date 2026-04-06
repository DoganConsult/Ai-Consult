import { Routes } from '@angular/router';
import { DoganConsultPage } from './pages/dogan-consult/dogan-consult.page';
import { AboutPage } from './pages/about/about.page';
import { OfficesPage } from './pages/offices/offices.page';
import { ProductsPage } from './pages/products/products.page';
import { ProductDetailPage } from './pages/products/product-detail.page';
import { CapabilitiesPage } from './pages/capabilities/capabilities.page';
import { ContactPage } from './pages/contact/contact.page';
import { LegalPage } from './pages/legal/legal.page';

export const routes: Routes = [
  { path: '', component: DoganConsultPage },
  { path: 'about', component: AboutPage },
  { path: 'offices', component: OfficesPage },
  { path: 'products', component: ProductsPage },
  { path: 'products/:slug', component: ProductDetailPage },
  { path: 'capabilities', component: CapabilitiesPage },
  { path: 'contact', component: ContactPage },
  { path: 'legal', component: LegalPage },
  { path: '**', redirectTo: '' },
];
