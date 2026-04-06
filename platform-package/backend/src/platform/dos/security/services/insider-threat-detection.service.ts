// @ts-nocheck
import { logger } from '../../observability/services/logger.service';
// ============================================
// Shahin — Insider Threat Pattern Detection Service
// Feature 48: Analyze audit trail for suspicious patterns,
// compute threat index, create alerts
// ============================================

import { emptyResult, safeQuery, tenantSchema } from "../../../../config/database";
import { queryAuditTrail, type AuditFilters } from '../../../../modules/audit/services/audit/core/audit-trail.service';
import { reportIncident } from '../../../../modules/incident/services/incident/incident.service';
let createNotification: any = async () => {};
try { ({ createNotification } = require('../../../../modules/notification/services/notification.service')); } catch {}
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { toErrorMessage } from "../../../../utils/http-error.util";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

// === Types ===

export interface ThreatPattern {
  patternId: string;
  patternName: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  weight: number; // 0-1, used in threat index calculation
}

export interface PatternMatch {
  patternId: string;
  patternName: string;
  userId: string;
  userEmail?: string;
  matchCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  details: {
    actions: string[];
    modules: string[];
    entityTypes: string[];
    ipAddresses: string[];
  };
  severity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
}

export interface ThreatIndex {
  userId: string;
  userEmail?: string;
  threatIndex: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  patternMatches: PatternMatch[];
  lastAnalyzed: string;
  recommendations: string[];
}

export interface ThreatDetectionResult {
  tenantId: string;
  analyzedAt: string;
  windowHours: number;
  totalUsersAnalyzed: number;
  threatsDetected: number;
  threatIndices: ThreatIndex[];
  alertsCreated: number;
  incidentsCreated: number;
}

// === Threat Pattern Definitions ===

const THREAT_PATTERNS: ThreatPattern[] = [
  {
    patternId: "excessive_deletes",
    patternName: "Excessive Delete Operations",
    description: "User performs an unusually high number of delete operations in a short time window",
    severity: "high",
    weight: 0.8,
  },
  {
    patternId: "after_hours_activity",
    patternName: "After-Hours Activity Spike",
    description: "Significant activity outside normal business hours (e.g., 10 PM - 6 AM)",
    severity: "medium",
    weight: 0.5,
  },
  {
    patternId: "privilege_escalation_attempts",
    patternName: "Privilege Escalation Attempts",
    description: "Multiple attempts to access or modify privileged resources",
    severity: "critical",
    weight: 1.0,
  },
  {
    patternId: "unusual_ip_access",
    patternName: "Unusual IP Address Access",
    description: "Access from IP addresses not previously associated with the user",
    severity: "medium",
    weight: 0.6,
  },
  {
    patternId: "rapid_module_switching",
    patternName: "Rapid Module Switching",
    description: "User rapidly switches between multiple modules/entities in a short time",
    severity: "medium",
    weight: 0.5,
  },
  {
    patternId: "bulk_data_export",
    patternName: "Bulk Data Export Pattern",
    description: "Multiple export operations or access to sensitive data entities in sequence",
    severity: "high",
    weight: 0.7,
  },
  {
    patternId: "security_violation_cluster",
    patternName: "Security Violation Cluster",
    description: "Multiple security_violation actions within a short time window",
    severity: "critical",
    weight: 1.0,
  },
  {
    patternId: "failed_access_attempts",
    patternName: "Failed Access Attempts",
    description: "Multiple failed access attempts to restricted resources",
    severity: "high",
    weight: 0.8,
  },
  {
    patternId: "data_modification_spike",
    patternName: "Data Modification Spike",
    description: "Unusually high number of update operations on critical entities",
    severity: "high",
    weight: 0.7,
  },
  {
    patternId: "cross_tenant_activity",
    patternName: "Cross-Tenant Activity Pattern",
    description: "User activity spans multiple tenants (if applicable) or unusual entity scopes",
    severity: "critical",
    weight: 0.9,
  },
];

// === Pattern Detection Functions ===

/**
 * Detect excessive delete operations pattern
 */
async function detectExcessiveDeletes(
  tenantId: string,
  userId: string,
  windowHours: number
): Promise<PatternMatch | null> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const result = await safeQuery(
    `SELECT action, module, entity_type, ip_address, timestamp
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND action = 'delete' AND timestamp >= $2
     ORDER BY timestamp DESC`,
    [userId, cutoff.toISOString()]
  );

  const deletes = result.rows;
  if (deletes.length < 10) return null; // Threshold: 10+ deletes in window

  const pattern = THREAT_PATTERNS.find(p => p.patternId === "excessive_deletes");
  if (!pattern) return null;

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    userId,
    matchCount: deletes.length,
    firstOccurrence: deletes[deletes.length - 1].timestamp,
    lastOccurrence: deletes[0].timestamp,
    details: {
      actions: ["delete"],
      modules: [...new Set(deletes.map((d: GenericRow) => d.module))],
      entityTypes: [...new Set(deletes.map((d: GenericRow) => d.entity_type))],
      ipAddresses: [...new Set(deletes.map((d: GenericRow) => d.ip_address).filter(Boolean))],
    },
    severity: pattern.severity,
    confidence: Math.min(1.0, deletes.length / 20), // Higher confidence with more deletes
  };
}

/**
 * Detect after-hours activity spike
 */
async function detectAfterHoursActivity(
  tenantId: string,
  userId: string,
  windowHours: number
): Promise<PatternMatch | null> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const result = await safeQuery(
    `SELECT action, module, entity_type, ip_address, timestamp,
            EXTRACT(HOUR FROM timestamp) AS hour
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND timestamp >= $2
     ORDER BY timestamp DESC`,
    [userId, cutoff.toISOString()]
  );

  const entries = result.rows;
  const afterHours = entries.filter((e: GenericRow) => {
    const hour = parseInt(e.hour) as string;
    return hour >= 22 || hour < 6; // 10 PM - 6 AM
  });

  if (afterHours.length < 5 || afterHours.length / entries.length < 0.3) return null;

  const pattern = THREAT_PATTERNS.find(p => p.patternId === "after_hours_activity");
  if (!pattern) return null;

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    userId,
    matchCount: afterHours.length,
    firstOccurrence: afterHours[afterHours.length - 1].timestamp,
    lastOccurrence: afterHours[0].timestamp,
    details: {
      actions: [...new Set(afterHours.map((e: GenericRow) => e.action))],
      modules: [...new Set(afterHours.map((e: GenericRow) => e.module))],
      entityTypes: [...new Set(afterHours.map((e: GenericRow) => e.entity_type))],
      ipAddresses: [...new Set(afterHours.map((e: GenericRow) => e.ip_address).filter(Boolean))],
    },
    severity: pattern.severity,
    confidence: Math.min(1.0, afterHours.length / entries.length),
  };
}

/**
 * Detect privilege escalation attempts
 */
async function detectPrivilegeEscalation(
  tenantId: string,
  userId: string,
  windowHours: number
): Promise<PatternMatch | null> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  // Look for actions on privileged entities (roles, permissions, admin settings)
  const privilegedModules = ["admin", "foundation", "rbac", "governance"];
  const privilegedEntityTypes = ["role", "permission", "user", "tenant_config"];

  const result = await safeQuery(
    `SELECT action, module, entity_type, ip_address, timestamp
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND timestamp >= $2
       AND (module = ANY($3) OR entity_type = ANY($4))
     ORDER BY timestamp DESC`,
    [userId, cutoff.toISOString(), privilegedModules, privilegedEntityTypes]
  );

  const privilegedActions = result.rows;
  if (privilegedActions.length < 3) return null;

  const pattern = THREAT_PATTERNS.find(p => p.patternId === "privilege_escalation_attempts");
  if (!pattern) return null;

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    userId,
    matchCount: privilegedActions.length,
    firstOccurrence: privilegedActions[privilegedActions.length - 1].timestamp,
    lastOccurrence: privilegedActions[0].timestamp,
    details: {
      actions: [...new Set(privilegedActions.map((a: GenericRow) => a.action))],
      modules: [...new Set(privilegedActions.map((a: GenericRow) => a.module))],
      entityTypes: [...new Set(privilegedActions.map((a: GenericRow) => a.entity_type))],
      ipAddresses: [...new Set(privilegedActions.map((a: GenericRow) => a.ip_address).filter(Boolean))],
    },
    severity: pattern.severity,
    confidence: Math.min(1.0, privilegedActions.length / 10),
  };
}

/**
 * Detect unusual IP address access
 */
async function detectUnusualIPAccess(
  tenantId: string,
  userId: string,
  windowHours: number
): Promise<PatternMatch | null> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  // Get recent IPs
  const recentResult = await safeQuery(
    `SELECT DISTINCT ip_address, COUNT(*) as cnt
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND timestamp >= $2 AND ip_address IS NOT NULL
     GROUP BY ip_address
     ORDER BY cnt DESC`,
    [userId, cutoff.toISOString()]
  );

  const recentIPs = recentResult.rows.map((r: GenericRow) => r.ip_address);

  // Get historical IPs (last 30 days, excluding recent window)
  const historicalCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const historicalResult = await safeQuery(
    `SELECT DISTINCT ip_address
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND timestamp >= $3 AND timestamp < $2 AND ip_address IS NOT NULL`,
    [userId, cutoff.toISOString(), historicalCutoff.toISOString()]
  );

  const historicalIPs = new Set(historicalResult.rows.map((r: GenericRow) => r.ip_address));
  const unusualIPs = recentIPs.filter((ip: string) => !historicalIPs.has(ip));

  if (unusualIPs.length === 0) return null;

  const pattern = THREAT_PATTERNS.find(p => p.patternId === "unusual_ip_access");
  if (!pattern) return null;

  const allRecent = await safeQuery(
    `SELECT action, module, entity_type, ip_address, timestamp
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND timestamp >= $2 AND ip_address = ANY($3)
     ORDER BY timestamp DESC`,
    [userId, cutoff.toISOString(), unusualIPs]
  );

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    userId,
    matchCount: allRecent.rows.length,
    firstOccurrence: allRecent.rows[allRecent.rows.length - 1]?.timestamp || cutoff.toISOString(),
    lastOccurrence: getFirstRow(allRecent)?.timestamp || cutoff.toISOString(),
    details: {
      actions: [...new Set(allRecent.rows.map((r: GenericRow) => r.action))],
      modules: [...new Set(allRecent.rows.map((r: GenericRow) => r.module))],
      entityTypes: [...new Set(allRecent.rows.map((r: GenericRow) => r.entity_type))],
      ipAddresses: unusualIPs,
    },
    severity: pattern.severity,
    confidence: Math.min(1.0, unusualIPs.length / 3), // Higher confidence with more unusual IPs
  };
}

/**
 * Detect security violation clusters
 */
async function detectSecurityViolationCluster(
  tenantId: string,
  userId: string,
  windowHours: number
): Promise<PatternMatch | null> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const result = await safeQuery(
    `SELECT action, module, entity_type, ip_address, timestamp
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND action = 'security_violation' AND timestamp >= $2
     ORDER BY timestamp DESC`,
    [userId, cutoff.toISOString()]
  );

  const violations = result.rows;
  if (violations.length < 2) return null; // At least 2 violations in window

  const pattern = THREAT_PATTERNS.find(p => p.patternId === "security_violation_cluster");
  if (!pattern) return null;

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    userId,
    matchCount: violations.length,
    firstOccurrence: violations[violations.length - 1].timestamp,
    lastOccurrence: violations[0].timestamp,
    details: {
      actions: ["security_violation"],
      modules: [...new Set(violations.map((v: GenericRow) => v.module))],
      entityTypes: [...new Set(violations.map((v: GenericRow) => v.entity_type))],
      ipAddresses: [...new Set(violations.map((v: GenericRow) => v.ip_address).filter(Boolean))],
    },
    severity: pattern.severity,
    confidence: Math.min(1.0, violations.length / 5),
  };
}

/**
 * Detect bulk data export pattern
 */
async function detectBulkDataExport(
  tenantId: string,
  userId: string,
  windowHours: number
): Promise<PatternMatch | null> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  // Look for multiple export-related actions or access to sensitive entities
  const sensitiveEntityTypes = ["evidence", "audit_trail", "user", "control", "risk", "incident"];

  const result = await safeQuery(
    `SELECT action, module, entity_type, ip_address, timestamp
     FROM "${schema}".audit_trail
     WHERE user_id = $1 AND timestamp >= $2
       AND (action LIKE '%export%' OR action LIKE '%download%' OR entity_type = ANY($3))
     ORDER BY timestamp DESC`,
    [userId, cutoff.toISOString(), sensitiveEntityTypes]
  );

  const exports = result.rows;
  if (exports.length < 5) return null;

  // Check if multiple unique sensitive entities accessed
  const uniqueEntities = new Set(exports.map((e: GenericRow) => e.entity_id));
  if (uniqueEntities.size < 3) return null;

  const pattern = THREAT_PATTERNS.find(p => p.patternId === "bulk_data_export");
  if (!pattern) return null;

  return {
    patternId: pattern.patternId,
    patternName: pattern.patternName,
    userId,
    matchCount: exports.length,
    firstOccurrence: exports[exports.length - 1].timestamp,
    lastOccurrence: exports[0].timestamp,
    details: {
      actions: [...new Set(exports.map((e: GenericRow) => e.action))],
      modules: [...new Set(exports.map((e: GenericRow) => e.module))],
      entityTypes: [...new Set(exports.map((e: GenericRow) => e.entity_type))],
      ipAddresses: [...new Set(exports.map((e: GenericRow) => e.ip_address).filter(Boolean))],
    },
    severity: pattern.severity,
    confidence: Math.min(1.0, uniqueEntities.size / 10),
  };
}

// === Main Detection Function ===

/**
 * Analyze audit trail for suspicious patterns and compute threat index for a user
 */
export async function analyzeUserThreatPatterns(
  tenantId: string,
  userId: string,
  windowHours: number = 24
): Promise<ThreatIndex | null> {
  const _schema = tenantSchema(tenantId);

  // Get user email if available
  const userResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT email FROM public.users WHERE user_id = $1 LIMIT 1`,
    [userId]
  ), { tenantId: tenantId, operation: 'fallback query' });
  const userEmail = getFirstRow(userResult)?.email;

  // Run all pattern detectors
  const patternMatches: PatternMatch[] = [];

  const detectors = [
    detectExcessiveDeletes,
    detectAfterHoursActivity,
    detectPrivilegeEscalation,
    detectUnusualIPAccess,
    detectSecurityViolationCluster,
    detectBulkDataExport,
  ];

  for (const detector of detectors) {
    try {
      const match = await detector(tenantId, userId, windowHours);
      if (match) {
        match.userEmail = userEmail;
        patternMatches.push(match);
      }
    } catch (err) {
      logger.error(`[InsiderThreat] Pattern detection error for ${detector.name}:`, toErrorMessage(err));
    }
  }

  if (patternMatches.length === 0) {
    return null; // No threats detected
  }

  // Compute threat index (weighted sum of pattern matches)
  let threatIndex = 0;
  let totalWeight = 0;

  for (const match of patternMatches) {
    const pattern = THREAT_PATTERNS.find(p => p.patternId === match.patternId);
    if (pattern) {
      const contribution = pattern.weight * match.confidence * 100;
      threatIndex += contribution;
      totalWeight += pattern.weight;
    }
  }

  // Normalize to 0-100 scale
  if (totalWeight > 0) {
    threatIndex = Math.min(100, threatIndex / totalWeight);
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (threatIndex >= 80) riskLevel = "critical";
  else if (threatIndex >= 60) riskLevel = "high";
  else if (threatIndex >= 40) riskLevel = "medium";

  // Generate recommendations
  const recommendations: string[] = [];
  if (patternMatches.some(m => m.patternId === "excessive_deletes")) {
    recommendations.push("Review and potentially restrict delete permissions for this user");
  }
  if (patternMatches.some(m => m.patternId === "privilege_escalation_attempts")) {
    recommendations.push("Immediately review user permissions and consider temporary access suspension");
  }
  if (patternMatches.some(m => m.patternId === "unusual_ip_access")) {
    recommendations.push("Verify user identity and investigate IP address origin");
  }
  if (patternMatches.some(m => m.patternId === "security_violation_cluster")) {
    recommendations.push("Escalate to security team for immediate investigation");
  }
  if (patternMatches.some(m => m.patternId === "bulk_data_export")) {
    recommendations.push("Review data access logs and verify legitimate business need");
  }

  return {
    userId,
    userEmail,
    threatIndex: Math.round(threatIndex * 100) / 100,
    riskLevel,
    patternMatches,
    lastAnalyzed: new Date().toISOString(),
    recommendations,
  };
}

/**
 * Run threat detection analysis for all active users in a tenant
 */
export async function runThreatDetectionAnalysis(
  tenantId: string,
  windowHours: number = 24,
  minThreatIndex: number = 40
): Promise<ThreatDetectionResult> {
  const schema = tenantSchema(tenantId);
  const analyzedAt = new Date().toISOString();

  // Get all users with recent audit activity
  const userResult = await safeQuery(
    `SELECT DISTINCT user_id
     FROM "${schema}".audit_trail
     WHERE timestamp >= $1`,
    [new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()]
  );

  const userIds = userResult.rows.map((r: GenericRow) => r.user_id);
  const threatIndices: ThreatIndex[] = [];
  let alertsCreated = 0;
  let incidentsCreated = 0;

  for (const userId of userIds) {
    try {
      const threatIndex = await analyzeUserThreatPatterns(tenantId, userId, windowHours);
      if (threatIndex && threatIndex.threatIndex >= minThreatIndex) {
        threatIndices.push(threatIndex);

        // Create alert/notification for medium+ threats
        if (threatIndex.riskLevel === "medium" || threatIndex.riskLevel === "high" || threatIndex.riskLevel === "critical") {
          try {
            // Notify tenant admins
            const adminResult = await safeQuery(
              `SELECT user_id FROM public.users WHERE role IN ('admin', 'tenant_admin', 'super_admin') AND tenant_id = $1`,
              [tenantId]
            );
            const adminIds = adminResult.rows.map((r: GenericRow) => r.user_id);

            for (const adminId of adminIds) {
              await createNotification(tenantId, {
                userId: adminId,
                type: "insider_threat_detected",
                title: `Insider Threat Detected: ${threatIndex.userEmail || threatIndex.userId}`,
                body: `Threat Index: ${threatIndex.threatIndex.toFixed(1)}/100 (${threatIndex.riskLevel.toUpperCase()}). Patterns: ${threatIndex.patternMatches.map(m => m.patternName).join(", ")}`,
                link: `/security/threats/${threatIndex.userId}`,
              });
              alertsCreated++;
            }
          } catch (err) {
            logger.error(`[InsiderThreat] Failed to create notification:`, toErrorMessage(err));
          }

          // Create incident for high/critical threats
          if (threatIndex.riskLevel === "high" || threatIndex.riskLevel === "critical") {
            try {
              await reportIncident(tenantId, {
                title: `Insider Threat: ${threatIndex.userEmail || threatIndex.userId} (Index: ${threatIndex.threatIndex.toFixed(1)})`,
                description: `Detected suspicious patterns in audit trail for user ${threatIndex.userEmail || threatIndex.userId}. Risk Level: ${threatIndex.riskLevel.toUpperCase()}. Patterns: ${threatIndex.patternMatches.map(m => `${m.patternName} (${m.matchCount} matches)`).join("; ")}. Recommendations: ${threatIndex.recommendations.join("; ")}`,
                category: "insider_threat",
                severity: threatIndex.riskLevel,
                reportedBy: "insider_threat_detection_service",
              });
              incidentsCreated++;
            } catch (err) {
              logger.error(`[InsiderThreat] Failed to create incident:`, toErrorMessage(err));
            }
          }
        }
      }
    } catch (err) {
      logger.error(`[InsiderThreat] Error analyzing user ${userId}:`, toErrorMessage(err));
    }
  }

  // Publish event
  try {
    await eventBus.publish({
      eventType: "insider_threat.analysis_completed",
      tenantId,
      sourceService: "insider_threat_detection",
      entityType: "threat_analysis",
      entityId: `analysis_${analyzedAt}`,
      severity: threatIndices.some(t => t.riskLevel === "critical" || t.riskLevel === "high") ? "warning" : "info",
      payload: {
        analyzedAt,
        windowHours,
        totalUsersAnalyzed: userIds.length,
        threatsDetected: threatIndices.length,
        alertsCreated,
        incidentsCreated,
      },
    });
  } catch (err) {
    logger.error(`[InsiderThreat] Failed to publish event:`, toErrorMessage(err));
  }

  return {
    tenantId,
    analyzedAt,
    windowHours,
    totalUsersAnalyzed: userIds.length,
    threatsDetected: threatIndices.length,
    threatIndices,
    alertsCreated,
    incidentsCreated,
  };
}

/**
 * Get threat index for a specific user
 */
export async function getUserThreatIndex(
  tenantId: string,
  userId: string,
  windowHours: number = 24
): Promise<ThreatIndex | null> {
  return analyzeUserThreatPatterns(tenantId, userId, windowHours);
}

/**
 * Get all threat indices for a tenant (cached or recomputed)
 */
export async function getAllThreatIndices(
  tenantId: string,
  windowHours: number = 24,
  minThreatIndex: number = 0
): Promise<ThreatIndex[]> {
  const schema = tenantSchema(tenantId);

  // Get all users with recent activity
  const userResult = await safeQuery(
    `SELECT DISTINCT user_id
     FROM "${schema}".audit_trail
     WHERE timestamp >= $1`,
    [new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()]
  );

  const userIds = userResult.rows.map((r: GenericRow) => r.user_id);
  const threatIndices: ThreatIndex[] = [];

  for (const userId of userIds) {
    try {
      const threatIndex = await analyzeUserThreatPatterns(tenantId, userId, windowHours);
      if (threatIndex && threatIndex.threatIndex >= minThreatIndex) {
        threatIndices.push(threatIndex);
      }
    } catch (err) {
      logger.error(`[InsiderThreat] Error analyzing user ${userId}:`, toErrorMessage(err));
    }
  }

  return threatIndices.sort((a, b) => b.threatIndex - a.threatIndex);
}
