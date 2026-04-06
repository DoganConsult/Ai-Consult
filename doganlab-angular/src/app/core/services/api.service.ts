import { Injectable } from '@angular/core';

export interface Product {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  tagline_ar: string;
  tagline_en: string;
  description_ar: string;
  description_en: string;
  features_json: any;
  pricing_json: any;
  use_cases_json: any;
  status: string;
  hero_image_url: string;
  sort_order: number;
  is_active: boolean;
}

const API_BASE = '/api/lab';

@Injectable({ providedIn: 'root' })
export class ApiService {
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    return data.products || data;
  }

  async getProduct(slug: string): Promise<Product | null> {
    const res = await fetch(`${API_BASE}/products/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.product || data;
  }

  async submitContact(payload: any): Promise<void> {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit');
  }
}
