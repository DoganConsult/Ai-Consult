import type { TenancyBounds, ErpInvoice } from '@dos/types/erp';
import type { IErpFinanceService } from '@dos/contracts/erp';
import { eventBus, ERP_EVENTS } from '@dos/platform-core/event-bus';

export class FinanceService implements IErpFinanceService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
    this.initializeEventHooks();
  }

  private initializeEventHooks() {
    eventBus.subscribe(ERP_EVENTS.DEAL_WON, async (event: any) => {
      const deal = event.payload;
      console.log(`[Finance Engine] Opportunity WON detected! Auto-generating invoice for ${deal.customerName}`);
      
      await this.generateInvoice(
        deal.valueExt,
        'USD',
        new Date().toISOString(),
        deal.id,
        { tenantId: deal.tenantId }
      );
    });
  }

  async generateInvoice(amount: number, currency: string, dueDate: string, leadId: string | undefined, context: TenancyBounds): Promise<ErpInvoice> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      `INSERT INTO erp_invoices (amount, currency, status, due_date, associated_lead_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [amount, currency, 'DRAFT', dueDate, leadId || null, context.tenantId]
    );
    return result.rows[0];
  }

  async getInvoices(context: TenancyBounds): Promise<ErpInvoice[]> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      'SELECT * FROM erp_invoices WHERE tenant_id = $1 ORDER BY created_date DESC',
      [context.tenantId]
    );
    return result.rows;
  }

  async markPaid(invoiceId: string, context: TenancyBounds): Promise<ErpInvoice> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      'UPDATE erp_invoices SET status = $1, updated_date = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *',
      ['PAID', invoiceId, context.tenantId]
    );
    if (result.rows.length === 0) throw new Error('Invoice not found');
    return result.rows[0];
  }
}
