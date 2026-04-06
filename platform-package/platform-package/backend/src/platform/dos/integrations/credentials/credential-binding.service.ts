import { logger } from '../../observability/logger.service';
import { v4 as uuid } from 'uuid';
import type { CredentialBinding, CredentialType, CredentialRotationPolicy } from '../contracts/integration.types';

const bindings = new Map<string, CredentialBinding>();

export function bindCredential(input: {
  connectorCode: string;
  tenantId: string;
  credentialType: CredentialType;
  referenceKey: string;
  expiresAt?: string;
  rotationPolicy?: CredentialRotationPolicy;
}): CredentialBinding {
  const bindingId = uuid();
  const now = new Date().toISOString();

  const binding: CredentialBinding = {
    bindingId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    credentialType: input.credentialType,
    referenceKey: input.referenceKey,
    status: 'active',
    expiresAt: input.expiresAt,
    lastValidatedAt: now,
    boundAt: now,
    rotationPolicy: input.rotationPolicy,
  };

  bindings.set(bindingId, binding);
  logger.info('[CredentialBinding] Credential bound', {
    bindingId,
    connectorCode: input.connectorCode,
    tenantId: input.tenantId,
    credentialType: input.credentialType,
  });

  return binding;
}

export function getCredentialBinding(bindingId: string): CredentialBinding | null {
  return bindings.get(bindingId) ?? null;
}

export function getBindingByConnector(connectorCode: string, tenantId: string): CredentialBinding | null {
  for (const binding of bindings.values()) {
    if (binding.connectorCode === connectorCode && binding.tenantId === tenantId && binding.status === 'active') {
      return binding;
    }
  }
  return null;
}

export function revokeCredential(bindingId: string): void {
  const binding = bindings.get(bindingId);
  if (!binding) return;
  bindings.set(bindingId, { ...binding, status: 'revoked' });
  logger.info('[CredentialBinding] Credential revoked', { bindingId, connectorCode: binding.connectorCode });
}

export function markRotationPending(bindingId: string): void {
  const binding = bindings.get(bindingId);
  if (!binding) return;
  bindings.set(bindingId, { ...binding, status: 'rotation-pending' });
  logger.info('[CredentialBinding] Credential rotation pending', { bindingId });
}

export function completeRotation(bindingId: string, newReferenceKey: string, newExpiresAt?: string): CredentialBinding | null {
  const binding = bindings.get(bindingId);
  if (!binding) return null;

  const now = new Date().toISOString();
  const updated: CredentialBinding = {
    ...binding,
    referenceKey: newReferenceKey,
    expiresAt: newExpiresAt,
    status: 'active',
    lastValidatedAt: now,
  };
  bindings.set(bindingId, updated);
  logger.info('[CredentialBinding] Credential rotation completed', { bindingId, connectorCode: binding.connectorCode });
  return updated;
}

export function validateBinding(bindingId: string): { valid: boolean; reason?: string } {
  const binding = bindings.get(bindingId);
  if (!binding) return { valid: false, reason: 'Binding not found' };
  if (binding.status === 'revoked') return { valid: false, reason: 'Credential revoked' };
  if (binding.status === 'expired') return { valid: false, reason: 'Credential expired' };
  if (binding.expiresAt && new Date(binding.expiresAt) <= new Date()) {
    bindings.set(bindingId, { ...binding, status: 'expired' });
    return { valid: false, reason: 'Credential expired (detected on validate)' };
  }
  return { valid: true };
}

export function checkRotationDue(bindingId: string): boolean {
  const binding = bindings.get(bindingId);
  if (!binding?.rotationPolicy?.rotateBeforeExpiryDays || !binding.expiresAt) return false;
  const expiryMs = new Date(binding.expiresAt).getTime();
  const warningMs = binding.rotationPolicy.rotateBeforeExpiryDays * 24 * 60 * 60 * 1000;
  return expiryMs - Date.now() <= warningMs;
}

export function listBindingsByConnector(connectorCode: string): CredentialBinding[] {
  return Array.from(bindings.values()).filter((b) => b.connectorCode === connectorCode);
}

export function getSafeBindingMetadata(bindingId: string): Omit<CredentialBinding, 'referenceKey'> | null {
  const binding = bindings.get(bindingId);
  if (!binding) return null;
  const { referenceKey: _ref, ...safe } = binding;
  return safe;
}
