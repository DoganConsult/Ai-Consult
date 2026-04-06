import {
  bindCredential,
  getCredentialBinding,
  revokeCredential,
  validateBinding,
  checkRotationDue,
  getSafeBindingMetadata,
} from '../credentials/credential-binding.service';

import {
  registerInboundHandler,
  ingestWebhookPayload,
  getInboundPayload,
} from '../inbound/webhook-ingest.service';

import {
  createOutboundDelivery,
  getDeliveryByIdempotencyKey,
  registerDeliveryExecutor,
  executeDelivery,
} from '../outbound/delivery.service';

import {
  registerMapping,
  applyMapping,
  applyMappingByContracts,
} from '../mapping/mapping-validator.service';

import {
  registerRetryPolicy,
  computeNextRetryDelay,
  shouldRetry,
  buildRetryState,
} from '../retries/retry-policy.service';

import {
  quarantinePayload,
  getQuarantineEntry,
  replayEntry,
  registerReplayHandler,
  listReplayableEntries,
  markNonReplayable,
} from '../quarantine/quarantine.service';

import type { MappingDefinition } from '../contracts/integration.types';

describe('Credential Binding Service', () => {
  it('binds and retrieves a credential', () => {
    const binding = bindCredential({
      connectorCode: 'test-connector',
      tenantId: 'tenant-1',
      credentialType: 'api-key',
      referenceKey: 'vault/secret/key-1',
    });
    expect(binding.bindingId).toBeTruthy();
    expect(binding.status).toBe('active');

    const retrieved = getCredentialBinding(binding.bindingId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.connectorCode).toBe('test-connector');
  });

  it('revokes a credential and marks it invalid', () => {
    const binding = bindCredential({
      connectorCode: 'revoke-test',
      tenantId: 'tenant-1',
      credentialType: 'api-key',
      referenceKey: 'vault/key',
    });
    revokeCredential(binding.bindingId);
    const result = validateBinding(binding.bindingId);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('revoked');
  });

  it('validates active credential as valid', () => {
    const binding = bindCredential({
      connectorCode: 'valid-cred',
      tenantId: 'tenant-1',
      credentialType: 'oauth2-token',
      referenceKey: 'vault/oauth/token',
    });
    const result = validateBinding(binding.bindingId);
    expect(result.valid).toBe(true);
  });

  it('does not expose referenceKey in safe metadata', () => {
    const binding = bindCredential({
      connectorCode: 'safe-meta',
      tenantId: 'tenant-1',
      credentialType: 'api-key',
      referenceKey: 'SECRET_VALUE',
    });
    const safe = getSafeBindingMetadata(binding.bindingId);
    expect(safe).not.toHaveProperty('referenceKey');
  });

  it('detects rotation due when expiry is near', () => {
    const nearExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const binding = bindCredential({
      connectorCode: 'rotation-test',
      tenantId: 't1',
      credentialType: 'api-key',
      referenceKey: 'key',
      expiresAt: nearExpiry,
      rotationPolicy: { rotateBeforeExpiryDays: 7, autoRotate: false, notifyOwnerOnExpiry: true },
    });
    expect(checkRotationDue(binding.bindingId)).toBe(true);
  });
});

describe('Inbound Webhook Ingest', () => {
  it('rejects payload when no handler registered', async () => {
    const result = await ingestWebhookPayload({
      connectorCode: 'no-handler',
      tenantId: 't1',
      source: 'external',
      contractType: 'event.v1',
      rawPayload: { data: 'test' },
    });
    expect(result.status).toBe('rejected');
    expect(result.failureReason).toContain('No inbound handler');
  });

  it('maps payload when handler returns success', async () => {
    registerInboundHandler('mapped-connector', async () => ({ mapped: true }));
    const result = await ingestWebhookPayload({
      connectorCode: 'mapped-connector',
      tenantId: 't1',
      source: 'external',
      contractType: 'event.v1',
      rawPayload: { foo: 'bar' },
    });
    expect(result.status).toBe('mapped');
    expect(result.mappedAt).toBeTruthy();
  });

  it('rejects payload when handler returns failure', async () => {
    registerInboundHandler('failing-connector', async () => ({ mapped: false, failureReason: 'Schema mismatch' }));
    const result = await ingestWebhookPayload({
      connectorCode: 'failing-connector',
      tenantId: 't1',
      source: 'external',
      contractType: 'event.v1',
      rawPayload: { bad: 'data' },
    });
    expect(result.status).toBe('rejected');
    expect(result.failureReason).toBe('Schema mismatch');
  });

  it('stores and retrieves payload by ID', async () => {
    registerInboundHandler('store-connector', async () => ({ mapped: true }));
    const result = await ingestWebhookPayload({
      connectorCode: 'store-connector',
      tenantId: 't1',
      source: 'ext',
      contractType: 'type.v1',
      rawPayload: { id: 1 },
    });
    const retrieved = getInboundPayload(result.payloadId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.payloadId).toBe(result.payloadId);
  });
});

describe('Outbound Delivery Service', () => {
  it('suppresses duplicate delivery by idempotency key', () => {
    const first = createOutboundDelivery({
      connectorCode: 'idem-conn',
      tenantId: 't1',
      targetEndpoint: 'https://api.example.com/events',
      payloadType: 'event.v1',
      payload: { id: 1 },
      idempotencyKey: 'unique-key-123',
    });

    const duplicate = createOutboundDelivery({
      connectorCode: 'idem-conn',
      tenantId: 't1',
      targetEndpoint: 'https://api.example.com/events',
      payloadType: 'event.v1',
      payload: { id: 1 },
      idempotencyKey: 'unique-key-123',
    });

    expect(duplicate.deliveryId).toBe(first.deliveryId);
  });

  it('executes delivery and marks as delivered', async () => {
    registerDeliveryExecutor('success-conn', async () => ({ success: true }));
    const delivery = createOutboundDelivery({
      connectorCode: 'success-conn',
      tenantId: 't1',
      targetEndpoint: 'https://api.example.com',
      payloadType: 'type.v1',
      payload: { event: 'test' },
      idempotencyKey: 'exec-idem-1',
    });
    const result = await executeDelivery(delivery.deliveryId);
    expect(result.status).toBe('delivered');
    expect(result.attempts).toBe(1);
  });

  it('marks delivery as failed when executor fails', async () => {
    registerDeliveryExecutor('fail-conn', async () => ({ success: false, failureReason: 'Timeout' }));
    const delivery = createOutboundDelivery({
      connectorCode: 'fail-conn',
      tenantId: 't1',
      targetEndpoint: 'https://api.example.com',
      payloadType: 'type.v1',
      payload: {},
      idempotencyKey: 'fail-idem-1',
    });
    const result = await executeDelivery(delivery.deliveryId);
    expect(result.status).toBe('failed');
    expect(result.failureReason).toBe('Timeout');
  });
});

describe('Mapping Validator Service', () => {
  const mapping: MappingDefinition = {
    mappingId: 'map-test-1',
    connectorCode: 'map-conn',
    sourceContract: 'source.v1',
    targetContract: 'target.v1',
    rules: [
      { sourceField: 'user.name', targetField: 'fullName', required: true, redact: false },
      { sourceField: 'user.email', targetField: 'emailAddress', required: true, redact: false },
      { sourceField: 'user.ssn', targetField: 'ssn', required: false, redact: true },
    ],
    validationPolicy: { rejectOnMissingRequired: true, rejectOnTypeViolation: false, maxAllowedNullPercent: 30 },
    failurePolicy: 'reject',
    version: '1.0.0',
  };

  beforeAll(() => {
    registerMapping(mapping);
  });

  it('maps valid payload correctly', () => {
    const result = applyMapping('map-test-1', {
      user: { name: 'Alice', email: 'alice@example.com', ssn: '123-45-6789' },
    });
    expect(result.valid).toBe(true);
    expect(result.mappedPayload?.fullName).toBe('Alice');
    expect(result.mappedPayload?.ssn).toBe('[REDACTED]');
  });

  it('rejects when required field is missing', () => {
    const result = applyMapping('map-test-1', { user: { email: 'test@example.com' } });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('user.name'))).toBe(true);
  });

  it('returns null payload on violation with reject policy', () => {
    const result = applyMapping('map-test-1', { user: {} });
    expect(result.mappedPayload).toBeNull();
  });
});

describe('Retry Policy Service', () => {
  it('computes exponential backoff correctly', () => {
    registerRetryPolicy({
      policyCode: 'exp-test',
      strategy: 'exponential',
      maxAttempts: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    });

    const delay1 = computeNextRetryDelay({ policyCode: 'exp-test', strategy: 'exponential', maxAttempts: 5, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 }, 1);
    const delay2 = computeNextRetryDelay({ policyCode: 'exp-test', strategy: 'exponential', maxAttempts: 5, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2 }, 2);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it('does not exceed max delay', () => {
    const policy = { policyCode: 'cap-test', strategy: 'exponential' as const, maxAttempts: 10, initialDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 3 };
    const delay = computeNextRetryDelay(policy, 10);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it('stops retrying after max attempts', () => {
    const policy = { policyCode: 'max-test', strategy: 'fixed' as const, maxAttempts: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 1 };
    expect(shouldRetry(policy, 3)).toBe(false);
    expect(shouldRetry(policy, 2)).toBe(true);
  });

  it('builds exhausted retry state correctly', () => {
    const policy = { policyCode: 'state-test', strategy: 'fixed' as const, maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 1 };
    const state = buildRetryState(3, 'Network error', policy);
    expect(state.exhausted).toBe(true);
    expect(state.nextRetryAt).toBeNull();
  });
});

describe('Quarantine Service', () => {
  it('quarantines and retrieves a payload', () => {
    const entry = quarantinePayload({
      connectorCode: 'q-conn',
      tenantId: 't1',
      payloadType: 'inbound',
      rawPayload: { bad: 'data' },
      failureReason: 'Schema violation',
      correlationId: 'corr-1',
    });
    expect(entry.quarantineId).toBeTruthy();
    expect(getQuarantineEntry(entry.quarantineId)).not.toBeNull();
  });

  it('replays successfully with registered handler', async () => {
    registerReplayHandler('replay-conn', async () => true);
    const entry = quarantinePayload({
      connectorCode: 'replay-conn',
      tenantId: 't1',
      payloadType: 'outbound',
      rawPayload: {},
      failureReason: 'Transient failure',
      correlationId: 'corr-replay',
      replayable: true,
    });
    const result = await replayEntry(entry.quarantineId, 'operator-1');
    expect(result.status).toBe('completed');
  });

  it('rejects replay for non-replayable entry', async () => {
    registerReplayHandler('no-replay-conn', async () => true);
    const entry = quarantinePayload({
      connectorCode: 'no-replay-conn',
      tenantId: 't1',
      payloadType: 'inbound',
      rawPayload: {},
      failureReason: 'Permanent failure',
      correlationId: 'corr-perm',
      replayable: false,
    });
    const result = await replayEntry(entry.quarantineId, 'op-1');
    expect(result.status).toBe('rejected');
  });

  it('marks entry as non-replayable', () => {
    const entry = quarantinePayload({
      connectorCode: 'mark-conn',
      tenantId: 't1',
      payloadType: 'inbound',
      rawPayload: {},
      failureReason: 'Error',
      correlationId: 'c1',
    });
    markNonReplayable(entry.quarantineId, 'operator', 'Data corruption');
    const replayable = listReplayableEntries('mark-conn');
    expect(replayable.find((e) => e.quarantineId === entry.quarantineId)).toBeUndefined();
  });
});
