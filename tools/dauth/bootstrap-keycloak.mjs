#!/usr/bin/env node
// Idempotent Keycloak bootstrap for Dogan AI OS.
// Reads realm spec from tools/dauth/keycloak-realm.json.
// Required env: KEYCLOAK_URL, KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD
// Optional env: KEYCLOAK_REALM (default: dogan), KEYCLOAK_CLIENT_ID (default: dogan-kernel)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { KeycloakAdmin } from '../../packages/authz/dist/keycloak-admin.js';

const __dir = dirname(fileURLToPath(import.meta.url));

function need(k) {
  const v = process.env[k];
  if (!v) { console.error(`missing env ${k}`); process.exit(2); }
  return v;
}

const baseUrl = need('KEYCLOAK_URL');
const adminUser = need('KEYCLOAK_ADMIN');
const adminPassword = need('KEYCLOAK_ADMIN_PASSWORD');
const realm = process.env.KEYCLOAK_REALM ?? 'dogan';
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'dogan-kernel';

const realmSpec = JSON.parse(await readFile(join(__dir, 'keycloak-realm.json'), 'utf8'));
const admin = new KeycloakAdmin({ baseUrl, adminUser, adminPassword });

console.log(`[dauth] ensuring realm ${realm}`);
await admin.ensureRealm(realm, realmSpec);

console.log(`[dauth] ensuring client ${clientId}`);
const clientUuid = await admin.ensureClient(realm, {
  clientId,
  name: 'Dogan AI OS Kernel',
  enabled: true,
  protocol: 'openid-connect',
  publicClient: false,
  serviceAccountsEnabled: true,
  standardFlowEnabled: true,
  directAccessGrantsEnabled: true,
  attributes: { 'access.token.lifespan': '600' },
});

console.log('[dauth] ensuring audience mapper');
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'kernel-audience',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-audience-mapper',
  config: {
    'included.client.audience': clientId,
    'id.token.claim': 'false',
    'access.token.claim': 'true',
  },
});

console.log('[dauth] ensuring tenant_id mapper');
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'tenant-id',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-attribute-mapper',
  config: {
    'user.attribute': 'tenant_id',
    'claim.name': 'tid',
    'jsonType.label': 'String',
    'id.token.claim': 'false',
    'access.token.claim': 'true',
    'userinfo.token.claim': 'false',
  },
});

console.log('[dauth] ensuring products mapper');
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'products',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-attribute-mapper',
  config: {
    'user.attribute': 'products',
    'claim.name': 'products',
    'jsonType.label': 'String',
    'multivalued': 'true',
    'id.token.claim': 'false',
    'access.token.claim': 'true',
  },
});

console.log('[dauth] ensuring roles mapper');
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'roles',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-attribute-mapper',
  config: {
    'user.attribute': 'roles',
    'claim.name': 'roles',
    'jsonType.label': 'String',
    'multivalued': 'true',
    'id.token.claim': 'false',
    'access.token.claim': 'true',
  },
});

console.log(JSON.stringify({
  realm,
  clientId,
  issuer: admin.issuer(realm),
  jwksUrl: admin.jwksUrl(realm),
}, null, 2));
console.log('[dauth] keycloak bootstrap complete');
