/**
 * DOS lifecycle-gate — blocks mutations on entities in terminal lifecycle states.
 * Queries module_lifecycle_definitions to determine terminal states.
 */
import { Request, Response, NextFunction } from 'express';
import { safeQuery, tenantSchema } from '../../../../config/database/database';

/** Default terminal states — used only when module_workflow_registry has no terminal_statuses for the module. */
const DEFAULT_TERMINAL_STATES = new Set(['archived', 'closed', 'deleted', 'cancelled', 'retired', 'superseded']);

export function lifecycleGate(configOrModule?: string | { blockedStates?: string[]; entityParam?: string; statusColumn?: string }) {
  const config = typeof configOrModule === 'string' ? {} : configOrModule;
  const blocked = config?.blockedStates ? new Set(config.blockedStates) : DEFAULT_TERMINAL_STATES;
  const entityParam = config?.entityParam || 'id';
  const statusCol = config?.statusColumn || 'status';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only block mutations, not reads
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }

    const entityId = req.params[entityParam];
    if (!entityId) { next(); return; }

    const tenantId = req.tenantId;
    const moduleCode = req.moduleCode;
    if (!tenantId || !moduleCode) { next(); return; }

    try {
      const schema = tenantSchema(tenantId);
      // Get the entity's table from module_workflow_registry
      const modReg = await safeQuery(
        `SELECT initial_status, terminal_statuses FROM "${schema}".module_workflow_registry WHERE module_code = $1 LIMIT 1`,
        [moduleCode],
      );
      const terminalFromDb = modReg.rows[0]?.terminal_statuses;
      const effectiveBlocked = terminalFromDb?.length > 0 ? new Set(terminalFromDb) : blocked;

      // Resolve entity table from modules table (DB-driven, Law 3)
      const tableInfo = await safeQuery(
        `SELECT primary_table, lifecycle_id_column FROM "${schema}".modules
         WHERE module_code = $1 AND primary_table IS NOT NULL AND primary_table != ''
         LIMIT 1`,
        [moduleCode],
      );
      const mapping = tableInfo.rows[0]
        ? { table: tableInfo.rows[0].primary_table, idCol: tableInfo.rows[0].lifecycle_id_column || `${moduleCode}_id` }
        : null;
      if (!mapping) { next(); return; }

      const entity = await safeQuery(
        `SELECT "${statusCol}" FROM "${schema}"."${mapping.table}" WHERE "${mapping.idCol}" = $1 LIMIT 1`,
        [entityId],
      );
      const currentStatus = entity.rows[0]?.[statusCol];
      if (currentStatus && effectiveBlocked.has(currentStatus)) {
        res.status(409).json({
          error: `Entity is in terminal state: ${currentStatus}`,
          code: 'LIFECYCLE_BLOCKED',
          status: currentStatus,
        });
        return;
      }
    } catch {
      // Non-blocking — if we can't check, allow through
    }
    next();
  };
}
export function lifecycleStatusEndpoint(..._args: any[]): (req: Request, res: Response, next: NextFunction) => void { return (_req, _res, next) => next(); }
