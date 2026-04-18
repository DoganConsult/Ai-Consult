import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  ErpSalesLeadListSchema, type ErpSalesLeadParsed,
  ErpInvoiceListSchema, type ErpInvoiceParsed,
  ErpEmployeeListSchema, type ErpEmployeeParsed,
  ErpCampaignListSchema, type ErpCampaignParsed,
  ErpPurchaseOrderListSchema, type ErpPurchaseOrderParsed
} from '../schemas/erp.zod';

@Injectable({
  providedIn: 'root'
})
export class ErpApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/products/erp`;

  getSalesLeads(): Observable<ErpSalesLeadParsed[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sales/leads`).pipe(
      map(data => ErpSalesLeadListSchema.parse(data)) // Hard Zod boundary parse
    );
  }

  updateLeadStatus(leadId: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/sales/leads/${leadId}`, { status });
  }

  // FINANCE
  getInvoices(): Observable<ErpInvoiceParsed[]> {
    return this.http.get<any[]>(`${this.apiUrl}/finance/invoices`).pipe(
      map(data => ErpInvoiceListSchema.parse(data))
    );
  }

  // HR 
  getEmployees(): Observable<ErpEmployeeParsed[]> {
    return this.http.get<any[]>(`${this.apiUrl}/hr/employees`).pipe(
      map(data => ErpEmployeeListSchema.parse(data))
    );
  }

  // MARKETING
  getCampaigns(): Observable<ErpCampaignParsed[]> {
    return this.http.get<any[]>(`${this.apiUrl}/marketing/campaigns`).pipe(
      map(data => ErpCampaignListSchema.parse(data))
    );
  }

  // PROCUREMENT
  getPurchaseOrders(): Observable<ErpPurchaseOrderParsed[]> {
    return this.http.get<any[]>(`${this.apiUrl}/procurement/pos`).pipe(
      map(data => ErpPurchaseOrderListSchema.parse(data))
    );
  }
}
