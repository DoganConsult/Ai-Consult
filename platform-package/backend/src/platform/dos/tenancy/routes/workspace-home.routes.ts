// @ts-nocheck
import { Router } from "express";
import { asyncHandler } from '../../http/error-handling/async-handler';
import { authenticate } from '../../../dauth';
import { emptyResult, query, safeQuery, tenantSchema } from "../../../../config/database/database";
import { getFirstRow } from '../../../../shared/data/db-utils';
import { swallowDefault, EC } from '../../resilience/resilient-catch';

const router = Router();

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.user.tenantId!);
  const [risks, controls, policies, incidents, remediation] = await Promise.all([
  swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, open: 0 }]), query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('identified','open')) as open FROM "${schema}".risks`), { operation: 'query risks' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, effective: 0 }]), query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'effective') as effective FROM "${schema}".controls`), { operation: 'query risks' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, approved: 0 }]), query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'approved') as approved FROM "${schema}".policies`), { operation: 'query risks' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, open: 0 }]), query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('reported','open')) as open FROM "${schema}".incidents`), { operation: 'query controls' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, completed: 0 }]), query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM "${schema}".remediation_tasks`), { operation: 'query policies' }),
  ]);
  res.json({
  risks: { total: +getFirstRow(risks)?.total, open: +getFirstRow(risks)?.open },
  controls: { total: +getFirstRow(controls)?.total, effective: +getFirstRow(controls)?.effective },
  policies: { total: +getFirstRow(policies)?.total, approved: +getFirstRow(policies)?.approved },
  incidents: { total: +getFirstRow(incidents)?.total, open: +getFirstRow(incidents)?.open },
  tasks: { total: +getFirstRow(remediation)?.total, completed: +getFirstRow(remediation)?.completed },
  });
}));

router.get("/recent-activity", authenticate, asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.user.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".audit_trail ORDER BY timestamp DESC LIMIT 20`
  ), { operation: 'query audit_trail' });
  res.json({ activities: result.rows });
}));

export default router;
