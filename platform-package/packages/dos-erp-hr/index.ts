import type { TenancyBounds } from '@dos/types';
import type { IErpHrService } from '@dos/contracts';

export class HrService implements IErpHrService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  async onboardEmployee(firstName: string, lastName: string, department: string, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const result = await this.dbRunner(
      `INSERT INTO erp_employees (first_name, last_name, department, status, tenant_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [firstName, lastName, department, 'ACTIVE', context.tenantId]
    );
    return result.rows[0];
  }
}
