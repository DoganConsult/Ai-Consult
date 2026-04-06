// Entity Link Types & Constants
// Extracted from entity-link.service.ts -- all type definitions and constants

// ============================================================================
// Core Types (per design spec)
// ============================================================================

export type EntityType = 'risk' | 'control' | 'policy' | 'framework' |
                         'incident' | 'vendor' | 'evidence' | 'finding' |
                         'asset' | 'bcp_plan' | 'exception' | 'workflow' |
                         'team' | 'remediation' | 'process_task';

export type RelationshipType = 'mitigates' | 'implements' | 'governs' |
                               'maps_to' | 'depends_on' | 'related_to' |
                               'generated_from';

export interface EntityLink {
  linkId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: RelationshipType;
  metadata: Record<string, any>;
  createdAt: string;
  createdBy: string;
}

export interface EntityLinkInput {
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: RelationshipType;
  metadata?: Record<string, any>;
}

export interface EntityGraphNode {
  id: string;
  type: EntityType;
  title: string;
  status?: string;
  linkCount: number;
}

export interface EntityGraphEdge {
  source: string;
  target: string;
  relationshipType: RelationshipType;
}

export interface EntityGraph {
  nodes: EntityGraphNode[];
  edges: EntityGraphEdge[];
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export interface LegacyEntityLink {
  link_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  link_type: string;
  created_by: string;
  created_at: string;
}

export interface LinkMetadata {
  metadata_id: string;
  link_id: string;
  key: string;
  value: string;
  created_at: string;
}

export interface EntityLinkWithMeta extends LegacyEntityLink {
  metadata?: Record<string, string>;
}

// ============================================================================
// Constants
// ============================================================================

export const VALID_ENTITY_TYPES: readonly EntityType[] = ['risk', 'control', 'policy', 'framework', 'incident', 'vendor', 'evidence', 'finding', 'asset', 'bcp_plan', 'exception', 'workflow', 'team', 'remediation'];
export type ValidEntityType = EntityType;

export const VALID_RELATIONSHIP_TYPES: readonly RelationshipType[] = ['mitigates', 'implements', 'governs', 'maps_to', 'depends_on', 'related_to'];

// Legacy link types for backward compatibility
export const VALID_LINK_TYPES = ['related', 'depends_on', 'mitigates', 'implements', 'evidences', 'parent_of', 'child_of'] as const;
export type ValidLinkType = typeof VALID_LINK_TYPES[number];

export const INVERSE_LINK_MAP: Record<string, string> = {
  depends_on: 'dependency_of',
  parent_of: 'child_of',
  child_of: 'parent_of',
  mitigates: 'mitigated_by',
  implements: 'implemented_by',
  evidences: 'evidenced_by',
  related: 'related',
  governs: 'governed_by',
  maps_to: 'mapped_from',
  related_to: 'related_to',
};

// Inverse relationship types for bidirectional links
export const INVERSE_RELATIONSHIP_MAP: Record<RelationshipType, RelationshipType> = {
  mitigates: 'mitigates',
  implements: 'implements',
  governs: 'governs',
  maps_to: 'maps_to',
  depends_on: 'depends_on',
  related_to: 'related_to',
  generated_from: 'generated_from',
};
