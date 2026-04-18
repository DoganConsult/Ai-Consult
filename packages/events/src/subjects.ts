/**
 * Subject taxonomy for Dogan AI OS events.
 *
 * dogan.events.<tenantId>.<domain>.<eventType>
 *
 *   domain ∈ { dauth | dsoc | dnoc | product | billing }
 *   eventType is dotted lowercase snake, e.g. `user.provisioned`
 */

export const DOGAN_EVENTS_STREAM = 'DOGAN_EVENTS';
export const DOGAN_EVENTS_SUBJECT = 'dogan.events.>';

export function tenantSubject(
  tenantId: string,
  domain: 'dauth' | 'dsoc' | 'dnoc' | 'product' | 'billing',
  eventType: string,
): string {
  const safe = eventType.replace(/[^a-z0-9_.-]/gi, '_');
  return `dogan.events.${tenantId}.${domain}.${safe}`;
}

export function consumerName(domain: string, purpose: string): string {
  return `dogan-${domain}-${purpose}`;
}
