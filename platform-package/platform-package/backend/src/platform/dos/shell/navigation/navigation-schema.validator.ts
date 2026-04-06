// @ts-nocheck
// ============================================
// DOS Navigation — Schema Validator
// Validates registry entries, override patches,
// and metadata fields against typed constraints.
// Patch 10 §2.5: "No free-form unbounded UI JSON
// should become production truth without schema
// validation."
// ============================================

import type {
  CreateNavRegistryDto,
  UpdateNavRegistryDto,
  NavigationItemType,
  NavigationSection,
  NavigationAudience,
  NavigationEntryStatus,
} from './navigation.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_ITEM_TYPES: NavigationItemType[] = ['link', 'group', 'divider'];
const VALID_SECTIONS: NavigationSection[] = ['primary', 'secondary', 'utility'];
const VALID_AUDIENCES: NavigationAudience[] = ['all', 'internal', 'external', 'admin'];
const __VALID_STATUSES: NavigationEntryStatus[] = [
  'draft', 'in_review', 'approved', 'published', 'suspended', 'archived',
];

const NAV_KEY_REGEX = /^[a-z][a-z0-9_-]{1,63}$/;
const ROUTE_REGEX = /^\/[a-z0-9/_-]*$/;
const PERMISSION_CODE_REGEX = /^[a-z][a-z0-9_.]+$/;
const ICON_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

const ALLOWED_METADATA_KEYS = new Set([
  'tooltip', 'badge', 'featureFlag', 'requiredLicense', 'cssClass',
  'section', 'keywords', 'shortcutKey', 'externalUrl', 'openInNewTab',
  'betaFeature', 'deprecationNotice', 'visibilityCondition',
]);

const MAX_SORT_ORDER = 9999;
const MAX_LABEL_LENGTH = 200;
const MAX_ROUTE_LENGTH = 500;

export function validateNavKey(navKey: string): ValidationResult {
  const errors: string[] = [];
  if (!navKey) {
    errors.push('navKey is required');
  } else if (!NAV_KEY_REGEX.test(navKey)) {
    errors.push(`navKey must match ${NAV_KEY_REGEX} (lowercase, 2-64 chars, start with letter)`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateCreateRegistry(dto: CreateNavRegistryDto): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!dto.navKey) errors.push('navKey is required');
  else if (!NAV_KEY_REGEX.test(dto.navKey)) errors.push(`navKey must match pattern: lowercase, 2-64 chars, starting with letter`);

  if (!dto.labelEn || dto.labelEn.trim().length === 0) errors.push('labelEn is required');
  if (!dto.labelAr || dto.labelAr.trim().length === 0) errors.push('labelAr is required');

  if (dto.labelEn && dto.labelEn.length > MAX_LABEL_LENGTH) errors.push(`labelEn exceeds max length ${MAX_LABEL_LENGTH}`);
  if (dto.labelAr && dto.labelAr.length > MAX_LABEL_LENGTH) errors.push(`labelAr exceeds max length ${MAX_LABEL_LENGTH}`);

  if (!dto.itemType) errors.push('itemType is required');
  else if (!VALID_ITEM_TYPES.includes(dto.itemType)) errors.push(`itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}`);

  // Links must have a route
  if (dto.itemType === 'link' && !dto.route) {
    errors.push('route is required for link items');
  }

  // Route format
  if (dto.route && !ROUTE_REGEX.test(dto.route)) {
    errors.push(`route must match pattern: start with /, lowercase alphanumeric with / _ -`);
  }
  if (dto.route && dto.route.length > MAX_ROUTE_LENGTH) {
    errors.push(`route exceeds max length ${MAX_ROUTE_LENGTH}`);
  }

  // Optional field validation
  if (dto.section && !VALID_SECTIONS.includes(dto.section)) {
    errors.push(`section must be one of: ${VALID_SECTIONS.join(', ')}`);
  }
  if (dto.audience && !VALID_AUDIENCES.includes(dto.audience)) {
    errors.push(`audience must be one of: ${VALID_AUDIENCES.join(', ')}`);
  }

  if (dto.sortOrder !== undefined && dto.sortOrder !== null) {
    if (!Number.isInteger(dto.sortOrder) || dto.sortOrder < 0 || dto.sortOrder > MAX_SORT_ORDER) {
      errors.push(`sortOrder must be an integer between 0 and ${MAX_SORT_ORDER}`);
    }
  }

  if (dto.icon && !ICON_REGEX.test(dto.icon)) {
    errors.push('icon must be a valid icon name (alphanumeric, 1-64 chars)');
  }

  if (dto.permissionCode && !PERMISSION_CODE_REGEX.test(dto.permissionCode)) {
    errors.push('permissionCode must match module.resource.action format');
  }

  if (dto.parentNavKey && !NAV_KEY_REGEX.test(dto.parentNavKey)) {
    errors.push('parentNavKey must be a valid nav key');
  }

  // Self-reference check
  if (dto.parentNavKey && dto.parentNavKey === dto.navKey) {
    errors.push('parentNavKey cannot reference itself');
  }

  // Metadata validation
  if (dto.metadata) {
    const metaResult = validateMetadata(dto.metadata);
    errors.push(...metaResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateRegistry(dto: UpdateNavRegistryDto): ValidationResult {
  const errors: string[] = [];

  if (dto.labelEn !== undefined && dto.labelEn.trim().length === 0) errors.push('labelEn cannot be empty');
  if (dto.labelAr !== undefined && dto.labelAr.trim().length === 0) errors.push('labelAr cannot be empty');

  if (dto.labelEn && dto.labelEn.length > MAX_LABEL_LENGTH) errors.push(`labelEn exceeds max length ${MAX_LABEL_LENGTH}`);
  if (dto.labelAr && dto.labelAr.length > MAX_LABEL_LENGTH) errors.push(`labelAr exceeds max length ${MAX_LABEL_LENGTH}`);

  if (dto.itemType && !VALID_ITEM_TYPES.includes(dto.itemType)) {
    errors.push(`itemType must be one of: ${VALID_ITEM_TYPES.join(', ')}`);
  }

  if (dto.route !== undefined && dto.route !== null && !ROUTE_REGEX.test(dto.route)) {
    errors.push('route must match pattern: start with /, lowercase alphanumeric');
  }

  if (dto.section && !VALID_SECTIONS.includes(dto.section)) {
    errors.push(`section must be one of: ${VALID_SECTIONS.join(', ')}`);
  }
  if (dto.audience && !VALID_AUDIENCES.includes(dto.audience)) {
    errors.push(`audience must be one of: ${VALID_AUDIENCES.join(', ')}`);
  }

  if (dto.sortOrder !== undefined && dto.sortOrder !== null) {
    if (!Number.isInteger(dto.sortOrder) || dto.sortOrder < 0 || dto.sortOrder > MAX_SORT_ORDER) {
      errors.push(`sortOrder must be an integer between 0 and ${MAX_SORT_ORDER}`);
    }
  }

  if (dto.icon !== undefined && dto.icon !== null && !ICON_REGEX.test(dto.icon)) {
    errors.push('icon must be a valid icon name');
  }

  if (dto.permissionCode !== undefined && dto.permissionCode !== null && !PERMISSION_CODE_REGEX.test(dto.permissionCode)) {
    errors.push('permissionCode must match module.resource.action format');
  }

  if (dto.metadata) {
    const metaResult = validateMetadata(dto.metadata);
    errors.push(...metaResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateMetadata(metadata: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  for (const key of Object.keys(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      errors.push(`metadata key "${key}" is not in the allowed schema. Allowed: ${[...ALLOWED_METADATA_KEYS].join(', ')}`);
    }
  }

  // Type-check known keys
  if (metadata.tooltip !== undefined && typeof metadata.tooltip !== 'string') {
    errors.push('metadata.tooltip must be a string');
  }
  if (metadata.badge !== undefined && typeof metadata.badge !== 'string') {
    errors.push('metadata.badge must be a string');
  }
  if (metadata.featureFlag !== undefined && typeof metadata.featureFlag !== 'string') {
    errors.push('metadata.featureFlag must be a string');
  }
  if (metadata.requiredLicense !== undefined && typeof metadata.requiredLicense !== 'string') {
    errors.push('metadata.requiredLicense must be a string');
  }
  if (metadata.cssClass !== undefined && typeof metadata.cssClass !== 'string') {
    errors.push('metadata.cssClass must be a string');
  }
  if (metadata.keywords !== undefined) {
    if (!Array.isArray(metadata.keywords) || !metadata.keywords.every((k: unknown) => typeof k === 'string')) {
      errors.push('metadata.keywords must be an array of strings');
    }
  }
  if (metadata.openInNewTab !== undefined && typeof metadata.openInNewTab !== 'boolean') {
    errors.push('metadata.openInNewTab must be a boolean');
  }
  if (metadata.betaFeature !== undefined && typeof metadata.betaFeature !== 'boolean') {
    errors.push('metadata.betaFeature must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

export function validateStatusTransition(from: NavigationEntryStatus, to: NavigationEntryStatus): ValidationResult {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['published'],
    published: ['suspended', 'archived'],
    suspended: ['published', 'archived'],
    archived: [],
  };

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) {
    return { valid: false, errors: [`Unknown status: ${from}`] };
  }
  if (!allowed.includes(to)) {
    return { valid: false, errors: [`Transition from "${from}" to "${to}" is not allowed. Valid: ${allowed.join(', ') || 'none (terminal state)'}`] };
  }
  return { valid: true, errors: [] };
}
