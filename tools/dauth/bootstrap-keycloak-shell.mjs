#!/usr/bin/env node
// Idempotent Keycloak public client provisioning for the Angular shell.
// Required env: KEYCLOAK_URL, KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD.
// Optional: KEYCLOAK_REALM (default: dogan), SHELL_CLIENT_ID (default: dogan-shell),
//           SHELL_REDIRECT_URI (default: https://dogan-ai.com/auth/callback),
//           SHELL_POST_LOGOUT (default: https://dogan-ai.com/),
//           SHELL_WEB_ORIGIN (default: https://dogan-ai.com).
import { KeycloakAdmin } from '../../packages/authz/dist/keycloak-admin.js';

function need(k) {
  const v = process.env[k];
  if (!v) { process.stderr.write(`missing env ${k}\n`); process.exit(2); }
  return v;
}

const baseUrl = need('KEYCLOAK_URL');
const adminUser = need('KEYCLOAK_ADMIN');
const adminPassword = need('KEYCLOAK_ADMIN_PASSWORD');
const realm = process.env.KEYCLOAK_REALM ?? 'dogan';
const clientId = process.env.SHELL_CLIENT_ID ?? 'dogan-shell';
const redirectUri = process.env.SHELL_REDIRECT_URI ?? 'https://dogan-ai.com/auth/callback';
const postLogout = process.env.SHELL_POST_LOGOUT ?? 'https://dogan-ai.com/';
const webOrigin = process.env.SHELL_WEB_ORIGIN ?? 'https://dogan-ai.com';

const admin = new KeycloakAdmin({ baseUrl, adminUser, adminPassword });

process.stdout.write(`[shell] ensuring public client ${clientId} on realm ${realm}\n`);
const clientUuid = await admin.ensureClient(realm, {
  clientId,
  name: 'Dogan AI OS Shell (browser, PKCE)',
  enabled: true,
  protocol: 'openid-connect',
  publicClient: true,
  serviceAccountsEnabled: false,
  standardFlowEnabled: true,
  directAccessGrantsEnabled: false,
  implicitFlowEnabled: false,
  redirectUris: [redirectUri, redirectUri.replace(/\/auth\/callback$/, '/*')],
  webOrigins: [webOrigin, '+'],
  attributes: {
    'pkce.code.challenge.method': 'S256',
    'post.logout.redirect.uris': postLogout + '##' + postLogout + '*',
    'access.token.lifespan': '600',
  },
});

process.stdout.write(`[shell] ensuring audience mapper -> dogan-kernel\n`);
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'shell-audience-kernel',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-audience-mapper',
  config: {
    'included.client.audience': 'dogan-kernel',
    'id.token.claim': 'false',
    'access.token.claim': 'true',
  },
});

process.stdout.write(`[shell] ensuring tenant_id mapper\n`);
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'shell-tenant-id',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-attribute-mapper',
  config: {
    'user.attribute': 'tenant_id',
    'claim.name': 'tid',
    'jsonType.label': 'String',
    'id.token.claim': 'true',
    'access.token.claim': 'true',
    'userinfo.token.claim': 'true',
  },
});

process.stdout.write(`[shell] ensuring products mapper\n`);
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'shell-products',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-attribute-mapper',
  config: {
    'user.attribute': 'products',
    'claim.name': 'products',
    'jsonType.label': 'String',
    'multivalued': 'true',
    'id.token.claim': 'true',
    'access.token.claim': 'true',
    'userinfo.token.claim': 'true',
  },
});

process.stdout.write(`[shell] ensuring roles mapper\n`);
await admin.ensureProtocolMapper(realm, clientUuid, {
  name: 'shell-roles',
  protocol: 'openid-connect',
  protocolMapper: 'oidc-usermodel-realm-role-mapper',
  config: {
    'claim.name': 'roles',
    'jsonType.label': 'String',
    'multivalued': 'true',
    'id.token.claim': 'true',
    'access.token.claim': 'true',
    'userinfo.token.claim': 'true',
  },
});

process.stdout.write('[shell] done.\n');
