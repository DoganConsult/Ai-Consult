import { ErpSalesLead } from '@dos/types/erp';
import { IErpSalesService } from '@dos/contracts/erp';
import { eventBus, ERP_EVENTS } from '@dos/platform-core/event-bus';
import { createActor } from 'xstate';
import { OpportunityApprovalMachine } from './workflow';
import type { TenancyBounds } from '@dos/types';

export class SalesService implements IErpSalesService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  async createLead(source: string, customerName: string, customerEmail: string, value: number, context: TenancyBounds): Promise<ErpSalesLead> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const isoDate = new Date().toISOString();
    
    // Perform real DB insertion
    const result = await this.dbRunner(
      `INSERT INTO erp_sales_leads (source, customer_name, customer_email, value_ext, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [source, customerName, customerEmail, value, 'NEW', context.tenantId]
    );
    
    const dbRow = result.rows[0];
    const lead: ErpSalesLead = {
      id: dbRow.id,
      source: source as any,
      customerName,
      customerEmail,
      valueExt: value,
      status: 'NEW',
      tenantId: context.tenantId,
      createdDate: isoDate
    };
    
    // Announce the Native Core Event 
    eventBus.publish(ERP_EVENTS.OPPORTUNITY_CREATED, lead);
    return lead;
  }

  async approveAndWinOpportunity(payload: { leadId: string, tenantId: string }): Promise<void> {
    // 1. Fetch
    const leadResult = await this.dbRunner('SELECT * FROM erp_sales_leads WHERE id = $1 AND tenant_id = $2', [payload.leadId, payload.tenantId]);
    if(!leadResult || leadResult.rows.length === 0) throw new Error('Lead not found');

    const dbLead = leadResult.rows[0];

    // 2. Simulate XState machine executing the business rules
    const actor = createActor(OpportunityApprovalMachine);
    actor.start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });

    // Fire approval event at the QUALIFIED intermediate state
    const approvedState = actor.getSnapshot().value;
    if (approvedState === 'QUALIFIED') {
      eventBus.publish(ERP_EVENTS.OPPORTUNITY_APPROVED, {
        id: dbLead.id,
        customerName: dbLead.customer_name,
        tenantId: payload.tenantId
      });
    }

    actor.send({ type: 'WIN_DEAL' });
    
    const finalState = actor.getSnapshot().value; 
    
    if (finalState === 'CLOSED_WON') {
      // 3. Persist State Update
      await this.dbRunner('UPDATE erp_sales_leads SET status = $1 WHERE id = $2', ['WON', payload.leadId]);
      
      // 4. Fire Async Event for Finance/HR to pick up
      const typedLead: ErpSalesLead = {
         id: dbLead.id,
         source: dbLead.source,
         customerName: dbLead.customer_name,
         customerEmail: dbLead.customer_email,
         valueExt: dbLead.value_ext,
         status: 'WON',
         tenantId: dbLead.tenant_id,
         createdDate: dbLead.created_at || new Date().toISOString()
      };
      
      eventBus.publish(ERP_EVENTS.DEAL_WON, typedLead);
    }
  }

  async getLeads(context: TenancyBounds): Promise<ErpSalesLead[]> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      'SELECT * FROM erp_sales_leads WHERE tenant_id = $1 ORDER BY created_date DESC',
      [context.tenantId]
    );
    return result.rows;
  }

  async updateLeadStatus(leadId: string, status: string, context: TenancyBounds): Promise<ErpSalesLead> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      'UPDATE erp_sales_leads SET status = $1, updated_date = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [status, leadId, context.tenantId]
    );
    if (result.rows.length === 0) throw new Error('Lead not found');
    return result.rows[0];
  }
}
