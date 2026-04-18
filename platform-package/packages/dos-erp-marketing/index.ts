import type { TenancyBounds } from '@dos/types';
import type { IErpMarketingService } from '@dos/contracts';

export class MarketingService implements IErpMarketingService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  async launchCampaign(name: string, budget: number, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      `INSERT INTO erp_campaigns (name, budget, status, tenant_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, budget, 'ACTIVE', context.tenantId]
    );
    return result.rows[0];
  }
}
