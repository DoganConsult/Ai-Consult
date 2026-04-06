/**
 * Co-located tests for entity-link.helpers.ts
 * Tests pure functions: validateEntityLink, buildBidirectionalLinks,
 * serializeEntityLink, parseEntityLink.
 */
import { describe, it, expect } from 'vitest';
import {
  validateEntityLink,
  buildBidirectionalLinks,
  serializeEntityLink,
  parseEntityLink,
} from './entity-link.helpers';
import type { EntityLinkInput, EntityLink } from './entity-link.types';

describe('entity-link.helpers — validateEntityLink', () => {
  const validInput: EntityLinkInput = {
    sourceType: 'risk',
    sourceId: 'r-001',
    targetType: 'control',
    targetId: 'c-001',
    relationshipType: 'mitigates',
  };

  it('accepts a valid entity link input', () => {
    const result = validateEntityLink(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing sourceType', () => {
    const input = { ...validInput, sourceType: '' as any };
    const result = validateEntityLink(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('sourceType'))).toBe(true);
  });

  it('rejects self-referencing links', () => {
    const input: EntityLinkInput = {
      sourceType: 'risk',
      sourceId: 'r-001',
      targetType: 'risk',
      targetId: 'r-001',
      relationshipType: 'related_to',
    };
    const result = validateEntityLink(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('itself'))).toBe(true);
  });

  it('rejects invalid entity type', () => {
    const input = { ...validInput, sourceType: 'invalid_type' as any };
    const result = validateEntityLink(input);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid metadata (non-object)', () => {
    const input = { ...validInput, metadata: 'not-an-object' as any };
    const result = validateEntityLink(input);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
  });
});

describe('entity-link.helpers — buildBidirectionalLinks', () => {
  it('creates forward and reverse links', () => {
    const input: EntityLinkInput = {
      sourceType: 'risk',
      sourceId: 'r-001',
      targetType: 'control',
      targetId: 'c-001',
      relationshipType: 'mitigates',
    };

    const [forward, reverse] = buildBidirectionalLinks(input);

    expect(forward.sourceType).toBe('risk');
    expect(forward.targetType).toBe('control');
    expect(reverse.sourceType).toBe('control');
    expect(reverse.targetType).toBe('risk');
    expect(reverse.sourceId).toBe('c-001');
    expect(reverse.targetId).toBe('r-001');
  });
});

describe('entity-link.helpers — parseEntityLink', () => {
  it('throws on empty input', () => {
    expect(() => parseEntityLink('')).toThrow('Invalid input');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseEntityLink('not-json')).toThrow('Invalid JSON');
  });

  it('throws on missing required fields', () => {
    expect(() => parseEntityLink('{}')).toThrow('Missing required field');
  });
});
