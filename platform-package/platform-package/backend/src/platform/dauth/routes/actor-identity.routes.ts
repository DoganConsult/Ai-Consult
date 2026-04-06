// @ts-nocheck
import { auditMiddleware } from '../../dos/http/middleware/audit';
import { asyncHandler } from '../../dos/http/error-handling/async-handler';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '..';
import { requirePermission } from '..';
import { recordAudit } from '../../../modules/audit/services/audit/core/audit-trail.service';
import { emitEvent } from '../../dos/events/event-bus';
import {
  createActor,
  getActor,
  listActors,
  deactivateActor,
  listAccessProfiles,
  listFunctionalRoles,
  getActorEffectivePermissions,
  checkDecisionAuthority,
  _recordActorAudit,
} from '../../dos/profile/actor-identity.service';
import { loadCanonicalProfile, loadCanonicalProfileMinimal } from '../../../modules/platform/services/canonical-profile-loader.service';
import { computeWorkload, getLatestWorkload, computeBatchWorkloads } from '../../dos/observability/services/workload-aggregator.service';
import { addCompetency, getUserCompetencies, checkCompetency } from '../../../modules/platform/services/user/user-competency.service';
import { setModuleUserContext, getModuleUserContext, getAllUserModuleContexts, getModuleContextRegistry } from '../../../modules/platform/services/module/module-user-context.service';
import { createExternalStakeholder, listExternalStakeholders, updateStakeholderAccess, deactivateStakeholder } from '../../../modules/onboarding/services/journey/external-stakeholder.service';
import { upsertAgentProfile, getAgentProfile, listAgentProfiles, computeAgentTrustScore } from '../../../modules/platform/services/agent-actor-profile.service';
import { computeProfileCompleteness, getProfileCompleteness, getDefaultRules } from '../../../modules/platform/services/profile-completeness.service';
import { getUserAvailability, setUserAvailability } from '../../../modules/platform/services/user/user-availability.service';
import { getUserPreferences, setUserPreferences, getModulePreferences } from '../../../modules/platform/services/user/user-preference.service';
import { getTenantAdaptation, detectOrgProfileForTenant } from '../../../modules/platform/services/org-type-adapter.service';
import { evaluateAgentProgression, enforceAutonomyGate, getProgressionGates, type PlatformMode } from '../../../modules/platform/services/autonomy/autonomy-progression.service';
import { processOooDelegations, delegateWithCompetencyCheck, enforceDelegationPolicy } from '../delegation/delegation-automation.service';
import type { ActorType, AuthorityType, CompetencyType, ProficiencyLevel, StakeholderType } from '../../../types/actor-identity.types';
import { createActorBody, authorityCheckBody, addCompetencyBody, checkCompetencyBody, setModuleContextBody, createStakeholderBody, updateStakeholderAccessBody, upsertAgentProfileBody, computeCompletenessBody, batchComputeBody, setAvailabilityBody, agentProgressionBody, autonomyGateBody, competencyDelegateBody, delegationCheckPolicyBody } from "../../../modules/platform/schemas/platform.schemas";


type ValidationOk<T> = { ok: true; data: T; error?: undefined };
type ValidationFail = { ok: false; data?: undefined; error: string };
type ValidationResult<T> = ValidationOk<T> | ValidationFail;

function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true as const, data: result.data as T };
  const messages = (result as Record<string, unknown>).error?.issues?.map((i: unknown) => `${i.path?.join('.') || ''}: ${i.message}`).join('; ')
    || 'Validation failed';
  return { ok: false as const, error: messages };
}

const router: Router = Router();
router.use(auditMiddleware('platform'));

router.use(authenticate);

router.get('/actors', requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const type = req.query.type as ActorType | undefined;
    const actors = await listActors(tenantId, { actorType: type, isActive: true });
    res.json({ data: actors });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/actors', auditMiddleware('platform.actor_identity.create'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(createActorBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const tenantId = req.tenantId!;
    const userId = req.user?.userId;
    const actor = await createActor(tenantId, v.data);
    try {
      await recordAudit({
        tenantId, userId: userId, module: 'platform',
        action: 'create', entityType: 'actor', entityId: actor?.actorId || '',
        afterState: v.data, ipAddress: req.ip,
      });
    } catch { /* non-blocking */ }
    try {
      await emitEvent({
        tenantId, userId: userId, module: 'platform',
        event: 'actor.created', entityType: 'actor', entityId: actor?.actorId || '',
        data: v.data,
      });
    } catch { /* non-blocking */ }
    res.status(201).json({ data: actor });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/actors/:actorId', requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req.tenantId!, req.params.actorId);
    if (!actor) return res.status(404).json({ error: 'Actor not found' });
    res.json({ data: actor });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/actors/:actorId', auditMiddleware('platform.actor_identity.delete'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId;
    const actorId = req.params.actorId;
    let beforeActor = null;
    try { beforeActor = await getActor(tenantId, actorId); } catch { /* ok */ }
    await deactivateActor(tenantId, actorId);
    try {
      await recordAudit({
        tenantId, userId: userId, module: 'platform',
        action: 'delete', entityType: 'actor', entityId: actorId,
        beforeState: beforeActor, ipAddress: req.ip,
      });
    } catch { /* non-blocking */ }
    try {
      await emitEvent({
        tenantId, userId: userId, module: 'platform',
        event: 'actor.deactivated', entityType: 'actor', entityId: actorId,
        data: { actorId },
      });
    } catch { /* non-blocking */ }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/actors/:actorId/permissions', requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const perms = await getActorEffectivePermissions(req.tenantId!, req.params.actorId);
    res.json({ data: perms });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/actors/:actorId/authority-check', auditMiddleware('platform.actor_identity.create'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(authorityCheckBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const result = await checkDecisionAuthority(
      req.tenantId!, req.params.actorId,
      v.data.authorityType as AuthorityType, v.data.resourceType,
    );
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/access-profiles', requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const profiles = await listAccessProfiles(req.tenantId!);
    res.json({ data: profiles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/functional-roles', requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const roles = await listFunctionalRoles(req.tenantId!, category);
    res.json({ data: roles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** @deprecated
 * @removal-date Phase 2 (DAuth access core)
 * @owner DAuth
 * @replacement DAuth actor-registry.ts Prefer GET /me/access-snapshot for canonical access/profile data. */
router.get('/users/:userId/canonical-profile', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const profile = await loadCanonicalProfile(req.tenantId!, req.params.userId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ data: profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/canonical-profile/minimal', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const profile = await loadCanonicalProfileMinimal(req.tenantId!, req.params.userId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ data: profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/workload', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const workload = await getLatestWorkload(req.tenantId!, req.params.userId);
    res.json({ data: workload });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/users/:userId/workload/compute', auditMiddleware('platform.actor_identity.create'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const workload = await computeWorkload(req.tenantId!, req.params.userId);
    res.json({ data: workload });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/workload/batch-compute', auditMiddleware('platform.actor_identity.create'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(batchComputeBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const snapshots = await computeBatchWorkloads(req.tenantId!, v.data.userIds);
    res.json({ data: snapshots });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/competencies', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const type = req.query.type as CompetencyType | undefined;
    const comps = await getUserCompetencies(req.tenantId!, req.params.userId, type);
    res.json({ data: comps });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/users/:userId/competencies', auditMiddleware('platform.actor_identity.create'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(addCompetencyBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const comp = await addCompetency(req.tenantId!, { userId: req.params.userId, ...v.data }) as string;
    res.status(201).json({ data: comp });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/users/:userId/competencies/check', auditMiddleware('platform.actor_identity.create'), requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const v = validate(checkCompetencyBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const result = await checkCompetency(req.tenantId!, req.params.userId, v.data.requiredCompetencies);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/module-contexts', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const contexts = await getAllUserModuleContexts(req.tenantId!, req.params.userId);
    res.json({ data: contexts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/module-contexts/:moduleCode', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const contextType = req.query.contextType as string | undefined;
    const contexts = await getModuleUserContext(
      req.tenantId!, req.params.userId, req.params.moduleCode, contextType as any,
    );
    res.json({ data: contexts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/users/:userId/module-contexts/:moduleCode', auditMiddleware('platform.actor_identity.update'), requirePermission('profile.record.write'), async (req: Request, res: Response) => {
  try {
    const v = validate(setModuleContextBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const ctx = await setModuleUserContext(
      req.tenantId!, req.params.userId, req.params.moduleCode, v.data.contextType, v.data.contextData,
    );
    res.json({ data: ctx });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/module-context-registry', requirePermission('profile.record.read'), asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: getModuleContextRegistry() });
}));

router.get('/external-stakeholders', requirePermission('vendor.record.read'), async (req: Request, res: Response) => {
  try {
    const type = req.query.type as StakeholderType | undefined;
    const stakeholders = await listExternalStakeholders(req.tenantId!, type);
    res.json({ data: stakeholders });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/external-stakeholders', auditMiddleware('platform.actor_identity.create'), requirePermission('vendor.record.write'), async (req: Request, res: Response) => {
  try {
    const v = validate(createStakeholderBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const stakeholder = await createExternalStakeholder(req.tenantId!, v.data);
    res.status(201).json({ data: stakeholder });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/external-stakeholders/:id/access', auditMiddleware('platform.actor_identity.update'), requirePermission('vendor.record.write'), async (req: Request, res: Response) => {
  try {
    const v = validate(updateStakeholderAccessBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    await updateStakeholderAccess(req.tenantId!, req.params.id, v.data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/external-stakeholders/:id', auditMiddleware('platform.actor_identity.delete'), requirePermission('vendor.record.write'), async (req: Request, res: Response) => {
  try {
    await deactivateStakeholder(req.tenantId!, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/agent-profiles', requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const profiles = await listAgentProfiles(req.tenantId!);
    res.json({ data: profiles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/agent-profiles/:agentCode', requirePermission('ai.agent.read'), async (req: Request, res: Response) => {
  try {
    const profile = await getAgentProfile(req.tenantId!, req.params.agentCode);
    if (!profile) return res.status(404).json({ error: 'Agent profile not found' });
    res.json({ data: profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agent-profiles', auditMiddleware('platform.actor_identity.create'), requirePermission('ai.agent.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(upsertAgentProfileBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const { agentCode, ...profileData } = v.data;
    const profile = await upsertAgentProfile(req.tenantId!, agentCode, profileData);
    res.status(201).json({ data: profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agent-profiles/:agentCode/trust-score', auditMiddleware('platform.actor_identity.create'), requirePermission('ai.agent.manage'), async (req: Request, res: Response) => {
  try {
    const score = await computeAgentTrustScore(req.tenantId!, req.params.agentCode);
    res.json({ data: score });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/actors/:actorId/completeness', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const score = await getProfileCompleteness(req.tenantId!, req.params.actorId);
    res.json({ data: score });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/actors/:actorId/completeness/compute', auditMiddleware('platform.actor_identity.create'), requirePermission('users.account.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(computeCompletenessBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const score = await computeProfileCompleteness(
      req.tenantId!, req.params.actorId, v.data.actorType, v.data.profileData as Record<string, unknown>,
    );
    res.json({ data: score });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/completeness-rules/:actorType', requirePermission('profile.record.read'), asyncHandler(async (req: Request, res: Response) => {
  const rules = getDefaultRules(req.params.actorType as ActorType);
  res.json({ data: rules });
}));

router.get('/users/:userId/availability', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const availability = await getUserAvailability(req.tenantId!, req.params.userId);
    res.json({ data: availability });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/users/:userId/availability', auditMiddleware('platform.actor_identity.update'), requirePermission('profile.record.write'), async (req: Request, res: Response) => {
  try {
    const v = validate(setAvailabilityBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const availability = await setUserAvailability(req.tenantId!, req.params.userId, v.data);
    res.json({ data: availability });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/preferences', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const prefs = await getUserPreferences(req.tenantId!, req.params.userId);
    res.json({ data: prefs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/users/:userId/preferences', auditMiddleware('platform.actor_identity.update'), requirePermission('profile.record.write'), async (req: Request, res: Response) => {
  try {
    const prefs = await setUserPreferences(req.tenantId!, req.params.userId, req.body);
    res.json({ data: prefs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/users/:userId/preferences/module/:moduleCode', requirePermission('profile.record.read'), async (req: Request, res: Response) => {
  try {
    const prefs = await getModulePreferences(req.tenantId!, req.params.userId, req.params.moduleCode);
    res.json({ data: prefs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/org-adaptation', requirePermission('admin.system.read'), async (req: Request, res: Response) => {
  try {
    const adaptation = await getTenantAdaptation(req.tenantId!);
    res.json({ data: adaptation });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/org-profile', requirePermission('admin.system.read'), async (req: Request, res: Response) => {
  try {
    const profile = await detectOrgProfileForTenant(req.tenantId!);
    res.json({ data: profile });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agent-profiles/:agentCode/progression', auditMiddleware('platform.actor_identity.create'), requirePermission('ai.agent.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(agentProgressionBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const boardApproval = v.data.boardApprovalGranted === true;
    const result = await evaluateAgentProgression(req.tenantId!, req.params.agentCode, boardApproval);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agent-profiles/:agentCode/autonomy-gate', auditMiddleware('platform.actor_identity.create'), requirePermission('ai.agent.manage'), async (req: Request, res: Response) => {
  try {
    const v = validate(autonomyGateBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const mode = v.data.requestedMode;
    const result = await enforceAutonomyGate(req.tenantId!, req.params.agentCode, mode as PlatformMode);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/autonomy-progression-gates', requirePermission('ai.agent.read'), asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: getProgressionGates() });
}));

router.post('/delegation/process-ooo', auditMiddleware('platform.actor_identity.create'), requirePermission('delegation.chain.manage'), async (req: Request, res: Response) => {
  try {
    const result = await processOooDelegations(req.tenantId!);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/delegation/competency-delegate', auditMiddleware('platform.actor_identity.create'), requirePermission('delegation.chain.write'), async (req: Request, res: Response) => {
  try {
    const v = validate(competencyDelegateBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const { delegatorUserId, candidateUserIds, requiredCompetencies, delegationType, validTo } = v.data;
    const result = await delegateWithCompetencyCheck(
      req.tenantId!, delegatorUserId, candidateUserIds, requiredCompetencies,
      delegationType || 'acting', validTo,
    );
    if (!result) return res.status(404).json({ error: 'No qualified delegate found' });
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/delegation/check-policy', auditMiddleware('platform.actor_identity.create'), requirePermission('delegation.chain.read'), async (req: Request, res: Response) => {
  try {
    const v = validate(delegationCheckPolicyBody, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const { delegatorRole, delegateActorType, scopeType, actions } = v.data;
    const result = await enforceDelegationPolicy(
      req.tenantId!, delegatorRole, delegateActorType, scopeType, actions || [],
    );
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;