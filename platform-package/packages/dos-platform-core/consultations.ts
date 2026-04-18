import type { ConsultationModel, TenancyBounds } from '@dos/types';
import type { IConsultationService } from '@dos/contracts';
import { v4 as uuid } from 'uuid';

/**
 * Enterprise implementation of the Consultation Service.
 * Persists data natively while maintaining extraction-ready boundaries.
 */
export class CoreConsultationService implements IConsultationService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  async submit(payload: ConsultationModel, context: TenancyBounds): Promise<{ id: string; createdAt: Date }> {
    if (!context.tenantId) throw new Error('Security Error: Missing Tenant Boundary in Execution Context');
    
    // Real validation
    if (!payload.name || !payload.email) throw new Error('Validation Error: Target fields are incomplete.');
    
    // Natively injecting into schema without legacy express-coupled pooling
    const query = `
      INSERT INTO consultations (type, name, email, organization, phone, service_area, message, lang, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, created_at
    `;
    const params = [
      payload.type,
      payload.name,
      payload.email,
      payload.organization || null,
      payload.phone || null,
      payload.serviceArea || null,
      payload.message || null,
      payload.lang || 'ar',
      context.tenantId
    ];

    const result = await this.dbRunner(query, params);
    
    return {
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at
    };
  }

  async getStats(context: TenancyBounds): Promise<{ total: number; byStatus: Record<string, number> }> {
     if (!context.tenantId) throw new Error('Security Error: Missing Tenant Boundary');
     
     const query = `SELECT status, COUNT(*)::int as count FROM consultations WHERE tenant_id = $1 GROUP BY status`;
     const result = await this.dbRunner(query, [context.tenantId]);
     
     const stats = { total: 0, byStatus: {} as Record<string, number> };
     for (const row of result.rows) {
       stats.byStatus[row.status] = row.count;
       stats.total += row.count;
     }
     
     return stats;
  }
}
