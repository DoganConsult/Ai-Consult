import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../config/database/database';
import { logger } from '../../logger';
import type { IncidentRecord, IncidentSeverity, IncidentTimelineEntry } from '../contracts/operations.types';
import { SYSTEM_JOB_ACTOR } from '../../../../platform/dos/constants/system-actors';

const INCIDENT_SEVERITY_ORDER: Record<IncidentSeverity, number> = {
  sev0: 0,
  sev1: 1,
  sev2: 2,
  sev3: 3,
  sev4: 4,
};

const activeIncidents = new Map<string, IncidentRecord>();

export function openIncident(input: {
  severity: IncidentSeverity;
  title: string;
  summary: string;
  affectedLayers?: string[];
  affectedTenants?: string[];
  affectedProducts?: string[];
  affectedModules?: string[];
  detectionSource: string;
  owner: string;
  responders?: string[];
  customerImpact?: string;
}): IncidentRecord {
  const incidentId = uuid();
  const now = new Date().toISOString();

  const incident: IncidentRecord = {
    incidentId,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    affectedLayers: input.affectedLayers ?? [],
    affectedTenants: input.affectedTenants ?? [],
    affectedProducts: input.affectedProducts ?? [],
    affectedModules: input.affectedModules ?? [],
    detectionSource: input.detectionSource,
    owner: input.owner,
    responders: input.responders ?? [],
    openedAt: now,
    state: 'open',
    timeline: [{ timestamp: now, actor: SYSTEM_JOB_ACTOR, action: 'incident_opened', note: input.summary }],
    mitigations: [],
    followUpActions: [],
    customerImpact: input.customerImpact,
  };

  activeIncidents.set(incidentId, incident);
  void persistIncident(incident);

  logger.error(`[Incident] ${input.severity.toUpperCase()} opened: ${input.title}`, {
    incidentId,
    owner: input.owner,
    detectionSource: input.detectionSource,
  });

  return incident;
}

export function acknowledgeIncident(incidentId: string, actor: string): void {
  const incident = activeIncidents.get(incidentId);
  if (!incident || incident.state !== 'open') return;
  const now = new Date().toISOString();
  incident.state = 'acknowledged';
  incident.acknowledgedAt = now;
  addTimelineEntry(incident, actor, 'acknowledged');
  void persistIncident(incident);
}

export function addMitigation(incidentId: string, mitigation: string, actor: string): void {
  const incident = activeIncidents.get(incidentId);
  if (!incident) return;
  incident.mitigations.push(mitigation);
  if (incident.state === 'acknowledged') {
    incident.state = 'mitigating';
    incident.mitigatedAt = new Date().toISOString();
  }
  addTimelineEntry(incident, actor, 'mitigation_applied', mitigation);
  void persistIncident(incident);
}

export function resolveIncident(
  incidentId: string,
  actor: string,
  options: { followUpActions?: string[]; postmortemId?: string } = {},
): void {
  const incident = activeIncidents.get(incidentId);
  if (!incident) return;
  const now = new Date().toISOString();
  incident.state = 'resolved';
  incident.resolvedAt = now;
  if (options.followUpActions) incident.followUpActions.push(...options.followUpActions);
  if (options.postmortemId) incident.postmortemId = options.postmortemId;
  addTimelineEntry(incident, actor, 'resolved');
  activeIncidents.delete(incidentId);
  void persistIncident(incident);

  logger.info(`[Incident] Resolved: ${incident.title}`, { incidentId, severity: incident.severity });
}

export function addResponder(incidentId: string, responder: string, actor: string): void {
  const incident = activeIncidents.get(incidentId);
  if (!incident || incident.responders.includes(responder)) return;
  incident.responders.push(responder);
  addTimelineEntry(incident, actor, 'responder_added', responder);
}

function addTimelineEntry(incident: IncidentRecord, actor: string, action: string, note?: string): void {
  const entry: IncidentTimelineEntry = { timestamp: new Date().toISOString(), actor, action, note };
  incident.timeline.push(entry);
}

async function persistIncident(incident: IncidentRecord): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO public.platform_incidents
         (incident_id, severity, title, summary, state, owner, opened_at, acknowledged_at, mitigated_at, resolved_at,
          affected_layers, affected_tenants, detection_source, timeline, mitigations, follow_up_actions, postmortem_id, customer_impact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (incident_id) DO UPDATE SET
         state = EXCLUDED.state,
         acknowledged_at = EXCLUDED.acknowledged_at,
         mitigated_at = EXCLUDED.mitigated_at,
         resolved_at = EXCLUDED.resolved_at,
         timeline = EXCLUDED.timeline,
         mitigations = EXCLUDED.mitigations,
         follow_up_actions = EXCLUDED.follow_up_actions,
         postmortem_id = EXCLUDED.postmortem_id`,
      [
        incident.incidentId,
        incident.severity,
        incident.title,
        incident.summary,
        incident.state,
        incident.owner,
        incident.openedAt,
        incident.acknowledgedAt ?? null,
        incident.mitigatedAt ?? null,
        incident.resolvedAt ?? null,
        JSON.stringify(incident.affectedLayers),
        JSON.stringify(incident.affectedTenants),
        incident.detectionSource,
        JSON.stringify(incident.timeline),
        JSON.stringify(incident.mitigations),
        JSON.stringify(incident.followUpActions),
        incident.postmortemId ?? null,
        incident.customerImpact ?? null,
      ],
    );
  } catch (err) {
    logger.warn('[Incident] Failed to persist incident', { incidentId: incident.incidentId, error: (err as Error).message });
  }
}

export function getActiveIncidents(severity?: IncidentSeverity): IncidentRecord[] {
  const incidents = Array.from(activeIncidents.values());
  if (!severity) return incidents;
  return incidents.filter((i) => INCIDENT_SEVERITY_ORDER[i.severity] <= INCIDENT_SEVERITY_ORDER[severity]);
}

export function getIncident(incidentId: string): IncidentRecord | undefined {
  return activeIncidents.get(incidentId);
}

export async function getIncidentHistory(limit = 20): Promise<IncidentRecord[]> {
  try {
    const result = await safeQuery(
      `SELECT * FROM public.platform_incidents ORDER BY opened_at DESC LIMIT $1`,
      [limit],
    );
    return result.rows.map((r: any) => ({
      incidentId: r.incident_id,
      severity: r.severity,
      title: r.title,
      summary: r.summary,
      state: r.state,
      owner: r.owner,
      openedAt: r.opened_at,
      acknowledgedAt: r.acknowledged_at,
      mitigatedAt: r.mitigated_at,
      resolvedAt: r.resolved_at,
      affectedLayers: r.affected_layers ?? [],
      affectedTenants: r.affected_tenants ?? [],
      affectedProducts: [],
      affectedModules: [],
      detectionSource: r.detection_source,
      responders: [],
      timeline: r.timeline ?? [],
      mitigations: r.mitigations ?? [],
      followUpActions: r.follow_up_actions ?? [],
      postmortemId: r.postmortem_id,
      customerImpact: r.customer_impact,
    }));
  } catch {
    return [];
  }
}

export const incidentService = {
  openIncident,
  acknowledgeIncident,
  addMitigation,
  resolveIncident,
  addResponder,
  getActiveIncidents,
  getIncident,
  getIncidentHistory,
};
