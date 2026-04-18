import type { TenancyBounds } from '@dos/types';
import type { ISbgEntityService } from '@dos/contracts';

const VALID_SBG_ENTITIES = [
  'sbg_products', 'sbg_sectors', 'sbg_inquiries', 'sbg_demo_requests',
  'sbg_documents', 'sbg_trainings', 'sbg_conversations', 'sbg_notifications',
  'sbg_approval_gates', 'sbg_approval_requests', 'sbg_workflow_rules',
  'sbg_visitor_sessions', 'sbg_sector_campaigns', 'sbg_lead_magnets',
  'sbg_campaign_leads', 'sbg_agent_configs', 'sbg_agent_runs',
  'sbg_agent_notifications', 'sbg_marketplace_items', 'sbg_marketplace_reviews'
] as const;

export type SbgTableName = typeof VALID_SBG_ENTITIES[number];

/**
 * Platform implementation for SBG Generic Entities.
 * Extends the legacy dynamic mapping with secure statement generation and tenant bounds.
 */
export class CoreSbgEntityService implements ISbgEntityService {
  private readonly dbRunner: any;

  constructor(dbRunner: any) {
    this.dbRunner = dbRunner;
  }

  private validateTable(tableName: string): SbgTableName {
    if (!VALID_SBG_ENTITIES.includes(tableName as SbgTableName)) {
      throw new Error(`Security Exception: Invalid SBG Entity mapping ${tableName}`);
    }
    return tableName as SbgTableName;
  }

  async list(entityName: string, filters: Record<string, any>, limit: number, context: TenancyBounds): Promise<any[]> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const table = this.validateTable(entityName);
    
    // Safely mapping parameters
    const clauses = ['tenant_id = $1'];
    const values = [context.tenantId];
    let idx = 2;

    for (const [key, val] of Object.entries(filters || {})) {
       const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
       clauses.push(`${safeKey} = $${idx++}`);
       values.push(val);
    }

    const query = `SELECT * FROM ${table} WHERE ${clauses.join(' AND ')} ORDER BY created_date DESC LIMIT $${idx}`;
    values.push(limit.toString());

    const result = await this.dbRunner(query, values);
    return result.rows;
  }

  async get(entityName: string, id: string, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const table = this.validateTable(entityName);
    const result = await this.dbRunner(`SELECT * FROM ${table} WHERE id = $1 AND tenant_id = $2`, [id, context.tenantId]);
    return result.rows[0];
  }

  async create(entityName: string, data: Record<string, any>, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const table = this.validateTable(entityName);
    
    const safeData: Record<string, any> = { ...data, tenant_id: context.tenantId };
    delete safeData['id'];

    const keys = Object.keys(safeData);
    if (keys.length === 0) throw new Error('Empty payload');

    const cols = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const vals = keys.map(k => {
      const v = safeData[k];
      return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
    });

    const query = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.dbRunner(query, vals);
    return result.rows[0];
  }

  async update(entityName: string, id: string, data: Record<string, any>, context: TenancyBounds): Promise<any> {
    if (!context.tenantId) throw new Error('Missing Tenant Boundary');
    const table = this.validateTable(entityName);
    
    const safeData: Record<string, any> = { ...data };
    delete safeData['id'];
    delete safeData['tenant_id'];

    const keys = Object.keys(safeData);
    if (keys.length === 0) throw new Error('Empty payload');

    const sets = keys.map((k, i) => `${k.replace(/[^a-zA-Z0-9_]/g, '')} = $${i + 1}`).join(', ');
    const vals = keys.map(k => {
      const v = safeData[k];
      return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
    });

    vals.push(id, context.tenantId);
    
    const query = `UPDATE ${table} SET ${sets}, updated_date = NOW() WHERE id = $${vals.length - 1} AND tenant_id = $${vals.length} RETURNING *`;
    const result = await this.dbRunner(query, vals);
    return result.rows[0];
  }
}
