import { z } from 'zod';

export const ErpSalesLeadSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  customer_name: z.string(),
  customer_email: z.string().email().optional().or(z.literal('unknown@domain.com')),
  value_ext: z.number().default(0),
  status: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).default('NEW'),
  tenant_id: z.string(),
  created_date: z.string().datetime().optional()
});

export const ErpSalesLeadListSchema = z.array(ErpSalesLeadSchema);

export type ErpSalesLeadParsed = z.infer<typeof ErpSalesLeadSchema>;

// FINANCE
export const ErpInvoiceSchema = z.object({
  id: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE']).default('DRAFT'),
  due_date: z.string(),
  tenant_id: z.string()
});
export const ErpInvoiceListSchema = z.array(ErpInvoiceSchema);
export type ErpInvoiceParsed = z.infer<typeof ErpInvoiceSchema>;

// HR
export const ErpEmployeeSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string(),
  last_name: z.string(),
  department: z.string(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE'),
  tenant_id: z.string()
});
export const ErpEmployeeListSchema = z.array(ErpEmployeeSchema);
export type ErpEmployeeParsed = z.infer<typeof ErpEmployeeSchema>;

// MARKETING
export const ErpCampaignSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  budget: z.number(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).default('PLANNED'),
  tenant_id: z.string()
});
export const ErpCampaignListSchema = z.array(ErpCampaignSchema);
export type ErpCampaignParsed = z.infer<typeof ErpCampaignSchema>;

// PROCUREMENT
export const ErpPurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  vendor_id: z.string(),
  total_cost: z.number(),
  status: z.enum(['DRAFT', 'APPROVED', 'FULFILLED']).default('DRAFT'),
  tenant_id: z.string()
});
export const ErpPurchaseOrderListSchema = z.array(ErpPurchaseOrderSchema);
export type ErpPurchaseOrderParsed = z.infer<typeof ErpPurchaseOrderSchema>;
