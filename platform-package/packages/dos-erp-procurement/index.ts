import type { TenancyBounds } from '@dos/types';
import type { IErpProcurementService } from '@dos/contracts';

export class ProcurementService implements IErpProcurementService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  async createPurchaseOrder(vendorId: string, totalCost: number, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      `INSERT INTO erp_purchase_orders (vendor_id, total_cost, status, tenant_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vendorId, totalCost, 'DRAFT', context.tenantId]
    );
    return result.rows[0];
  }
}
