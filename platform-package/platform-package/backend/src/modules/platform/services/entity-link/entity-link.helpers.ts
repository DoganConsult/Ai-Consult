// @ts-nocheck
// Entity Link Pure Functions (validation, serialization, grouping)
// Extracted from entity-link.service.ts -- no DB dependencies

import {
  EntityLink,
  EntityLinkInput,
  EntityType,
  RelationshipType,
  LegacyEntityLink,
  ValidEntityType,
  ValidLinkType,
  VALID_ENTITY_TYPES,
  VALID_RELATIONSHIP_TYPES,
  VALID_LINK_TYPES,
  INVERSE_LINK_MAP,
  INVERSE_RELATIONSHIP_MAP,
} from './entity-link.types';

// ============================================================================
// Pure Functions for Testing (per design spec Requirements 1.1, 1.6, 1.7, 1.8, 1.9, 1.10)
// ============================================================================

/**
 * Validates an EntityLinkInput object.
 * Validates: Requirements 1.8
 */
export function validateEntityLink(link: EntityLinkInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate sourceType
  if (!link.sourceType) {
    errors.push('sourceType is required');
  } else if (!VALID_ENTITY_TYPES.includes(link.sourceType)) {
    errors.push(`Invalid sourceType: ${link.sourceType}. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
  }

  // Validate sourceId
  if (!link.sourceId) {
    errors.push('sourceId is required');
  } else if (typeof link.sourceId !== 'string' || link.sourceId.trim() === '') {
    errors.push('sourceId must be a non-empty string');
  }

  // Validate targetType
  if (!link.targetType) {
    errors.push('targetType is required');
  } else if (!VALID_ENTITY_TYPES.includes(link.targetType)) {
    errors.push(`Invalid targetType: ${link.targetType}. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
  }

  // Validate targetId
  if (!link.targetId) {
    errors.push('targetId is required');
  } else if (typeof link.targetId !== 'string' || link.targetId.trim() === '') {
    errors.push('targetId must be a non-empty string');
  }

  // Validate relationshipType
  if (!link.relationshipType) {
    errors.push('relationshipType is required');
  } else if (!VALID_RELATIONSHIP_TYPES.includes(link.relationshipType)) {
    errors.push(`Invalid relationshipType: ${link.relationshipType}. Must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}`);
  }

  // Validate self-reference
  if (link.sourceType === link.targetType && link.sourceId === link.targetId) {
    errors.push('Cannot create a link from an entity to itself');
  }

  // Validate metadata if provided
  if (link.metadata !== undefined && link.metadata !== null) {
    if (typeof link.metadata !== 'object' || Array.isArray(link.metadata)) {
      errors.push('metadata must be an object');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Builds bidirectional links from a single link input.
 * Returns a tuple of [forward link, reverse link].
 * Validates: Requirements 1.1, 1.6
 */
export function buildBidirectionalLinks(link: EntityLinkInput): [EntityLinkInput, EntityLinkInput] {
  const forwardLink: EntityLinkInput = {
    sourceType: link.sourceType,
    sourceId: link.sourceId,
    targetType: link.targetType,
    targetId: link.targetId,
    relationshipType: link.relationshipType,
    metadata: link.metadata ? { ...link.metadata } : undefined,
  };

  const reverseLink: EntityLinkInput = {
    sourceType: link.targetType,
    sourceId: link.targetId,
    targetType: link.sourceType,
    targetId: link.sourceId,
    relationshipType: INVERSE_RELATIONSHIP_MAP[link.relationshipType],
    metadata: link.metadata ? { ...link.metadata, _reverse: 'true' } : { _reverse: 'true' },
  };

  return [forwardLink, reverseLink];
}

/**
 * Serializes an EntityLink to JSON string.
 * Validates: Requirements 1.9
 */
export function serializeEntityLink(link: EntityLink): string {
  return JSON.stringify({
    linkId: link.linkId,
    sourceType: link.sourceType,
    sourceId: link.sourceId,
    targetType: link.targetType,
    targetId: link.targetId,
    relationshipType: link.relationshipType,
    metadata: link.metadata,
    createdAt: link.createdAt,
    createdBy: link.createdBy,
  });
}

/**
 * Parses a JSON string into an EntityLink object.
 * Validates: Requirements 1.8, 1.10
 */
export function parseEntityLink(json: string): EntityLink {
  if (!json || typeof json !== 'string') {
    throw new Error('Invalid input: expected a non-empty JSON string');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error('Invalid JSON format');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid input: expected a JSON object');
  }

  // Validate required fields
  const requiredFields = ['linkId', 'sourceType', 'sourceId', 'targetType', 'targetId', 'relationshipType', 'createdAt', 'createdBy'];
  for (const field of requiredFields) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate entity types
  if (!VALID_ENTITY_TYPES.includes(parsed.sourceType)) {
    throw new Error(`Invalid sourceType: ${parsed.sourceType}`);
  }
  if (!VALID_ENTITY_TYPES.includes(parsed.targetType)) {
    throw new Error(`Invalid targetType: ${parsed.targetType}`);
  }

  // Validate relationship type
  if (!VALID_RELATIONSHIP_TYPES.includes(parsed.relationshipType)) {
    throw new Error(`Invalid relationshipType: ${parsed.relationshipType}`);
  }

  return {
    linkId: String(parsed.linkId),
    sourceType: parsed.sourceType as EntityType,
    sourceId: String(parsed.sourceId),
    targetType: parsed.targetType as EntityType,
    targetId: String(parsed.targetId),
    relationshipType: parsed.relationshipType as RelationshipType,
    metadata: parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {},
    createdAt: String(parsed.createdAt),
    createdBy: String(parsed.createdBy),
  };
}

/**
 * Groups links by their target entity type.
 * Validates: Requirements 1.7
 */
export function groupLinksByType(links: EntityLink[]): Record<EntityType, EntityLink[]> {
  const result: Record<EntityType, EntityLink[]> = {
    risk: [],
    control: [],
    policy: [],
    framework: [],
    incident: [],
    vendor: [],
    evidence: [],
    finding: [],
    remediation: [],
    team: [],
    workflow: [],
    asset: [],
    bcp_plan: [],
    exception: [],
    process_task: [],
  };

  for (const link of links) {
    if (VALID_ENTITY_TYPES.includes(link.targetType)) {
      result[link.targetType].push(link);
    }
  }

  return result;
}

// ============================================================================
// Legacy Helper Functions (for backward compatibility)
// ============================================================================

export function isBidirectional(links: LegacyEntityLink[], sourceType: string, sourceId: string, targetType: string, targetId: string): boolean {
  return links.some(l =>
    (l.source_type === sourceType && l.source_id === sourceId && l.target_type === targetType && l.target_id === targetId) ||
    (l.target_type === sourceType && l.target_id === sourceId && l.source_type === targetType && l.source_id === targetId)
  );
}

export function isValidEntityType(t: string): t is ValidEntityType {
  return (VALID_ENTITY_TYPES as readonly string[]).includes(t);
}

export function isValidLinkType(t: string): t is ValidLinkType {
  return (VALID_LINK_TYPES as readonly string[]).includes(t);
}

export function getInverseLinkType(linkType: string): string {
  return INVERSE_LINK_MAP[linkType] || linkType;
}

export function normalizeLink(link: LegacyEntityLink, perspectiveType: string, perspectiveId: string): { relatedType: string; relatedId: string; direction: 'outgoing' | 'incoming'; effectiveLinkType: string } {
  if (link.source_type === perspectiveType && link.source_id === perspectiveId) {
    return { relatedType: link.target_type, relatedId: link.target_id, direction: 'outgoing', effectiveLinkType: link.link_type };
  }
  return { relatedType: link.source_type, relatedId: link.source_id, direction: 'incoming', effectiveLinkType: getInverseLinkType(link.link_type) };
}

export function deduplicateLinks(links: LegacyEntityLink[]): LegacyEntityLink[] {
  const seen = new Set<string>();
  return links.filter(l => {
    const key = [l.source_type, l.source_id, l.target_type, l.target_id, l.link_type].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
