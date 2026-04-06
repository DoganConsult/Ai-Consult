import { Routes } from '@angular/router';
import { HomePage } from './features/home/home.page';
import { ProductsPage } from './features/products/products.page';
import { ProductDetailPage } from './features/products/product-detail.page';
import { ContactPage } from './features/contact/contact.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'products', component: ProductsPage },
  { path: 'products/:slug', component: ProductDetailPage },
  { path: 'contact', component: ContactPage },
  { path: '**', redirectTo: '' },
];
