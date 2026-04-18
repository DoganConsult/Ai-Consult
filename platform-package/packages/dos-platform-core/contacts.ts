import type { ContactModel, TenancyBounds } from '@dos/types';
import type { IContactService } from '@dos/contracts';

/**
 * Enterprise implementation of the Contact Service.
 */
export class CoreContactService implements IContactService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  async submit(payload: ContactModel, context: TenancyBounds): Promise<{ id: string; createdAt: Date }> {
    if (!context.tenantId) throw new Error('Security Error: Missing Tenant Boundary in Execution Context');
    
    // Real validation
    if (!payload.name || !payload.email || !payload.message) {
      throw new Error('Validation Error: Target fields are incomplete.');
    }
    
    const query = `
      INSERT INTO contacts (name, email, subject, message, lang, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, created_at
    `;
    const params = [
      payload.name,
      payload.email,
      payload.subject || null,
      payload.message,
      payload.lang || 'ar',
      context.tenantId
    ];

    const result = await this.dbRunner(query, params);
    
    return {
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at
    };
  }
}
