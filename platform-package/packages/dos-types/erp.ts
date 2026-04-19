export type ErpLeadStatus = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type ErpInvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface ErpSalesLead {
  id: string;
  source: 'DOGAN_CONSULT' | 'SBG' | 'MANUAL' | 'PARTNER_PORTAL' | 'EMPLOYEE_PORTAL';
  customerName: string;
  customerEmail: string;
  valueExt: number;
  status: ErpLeadStatus;
  tenantId: string;
  createdDate: string;
}

export interface ErpInvoice {
  id: string;
  associatedLeadId?: string;
  amount: number;
  currency: string;
  status: ErpInvoiceStatus;
  tenantId: string;
  dueDate: string;
  createdDate: string;
}

export interface ErpEmployee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  tenantId: string;
}

export interface ErpCampaign {
  id: string;
  name: string;
  budget: number;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  tenantId: string;
}

export interface ErpPurchaseOrder {
  id: string;
  vendorId: string;
  totalCost: number;
  status: 'DRAFT' | 'APPROVED' | 'FULFILLED';
  tenantId: string;
}

// Convenience re-export so `@dos/types/erp` subpath also carries shared tenancy types.
export type { TenancyBounds } from "./index";
