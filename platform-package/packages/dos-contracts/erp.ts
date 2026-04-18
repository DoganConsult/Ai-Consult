import type { TenancyBounds, ErpSalesLead, ErpInvoice } from '@dos/types';

export interface IErpSalesService {
  createLead(source: string, customerName: string, customerEmail: string, value: number, context: TenancyBounds): Promise<ErpSalesLead>;
  getLeads(context: TenancyBounds): Promise<ErpSalesLead[]>;
  updateLeadStatus(leadId: string, status: string, context: TenancyBounds): Promise<ErpSalesLead>;
}

export interface IErpFinanceService {
  generateInvoice(amount: number, currency: string, dueDate: string, leadId: string | undefined, context: TenancyBounds): Promise<ErpInvoice>;
  getInvoices(context: TenancyBounds): Promise<ErpInvoice[]>;
  markPaid(invoiceId: string, context: TenancyBounds): Promise<ErpInvoice>;
}

export interface IErpHrService {
  onboardEmployee(firstName: string, lastName: string, department: string, context: TenancyBounds): Promise<any>;
}

export interface IErpMarketingService {
  launchCampaign(name: string, budget: number, context: TenancyBounds): Promise<any>;
}

export interface IErpProcurementService {
  createPurchaseOrder(vendorId: string, totalCost: number, context: TenancyBounds): Promise<any>;
}
