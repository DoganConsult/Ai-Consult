// ============================================
// Platform — Integration Hub connector catalog
// Static catalog the Admin UI reads to render
// capability cards. Every bound connector's
// `connector_code` MUST exist in this list.
//
// See: docs/PLATFORM-MS-INTEGRATIONS.md §2
//      docs/PLATFORM-COLLAB-CONNECTORS.md §2
// ============================================

import type { ConnectorAuthMode, ConnectorVendor } from '../../../../connectors/types';

export interface ConnectorCatalogEntry {
  code: string;
  vendor: ConnectorVendor;
  displayName: string;
  description: string;
  icon: string;
  auth: ConnectorAuthMode;
  requiredScopes: readonly string[];
  category:
    | 'identity'
    | 'productivity'
    | 'collaboration'
    | 'security_evidence'
    | 'infrastructure'
    | 'marketing'
    | 'learning';
}

export const CONNECTOR_CATALOG: readonly ConnectorCatalogEntry[] = [
  // === Microsoft ===
  {
    code: 'entra_sso',
    vendor: 'microsoft',
    displayName: 'Microsoft Entra ID SSO',
    description: 'Sign in with Azure AD / Entra ID (OIDC).',
    icon: 'pi pi-key',
    auth: 'auth_code',
    requiredScopes: ['openid', 'profile', 'email', 'User.Read'],
    category: 'identity',
  },
  {
    code: 'entra_scim',
    vendor: 'microsoft',
    displayName: 'Entra ID SCIM Provisioning',
    description: 'Automatic user + group provisioning from Entra.',
    icon: 'pi pi-users',
    auth: 'client_credentials',
    requiredScopes: ['User.ReadWrite.All', 'Group.ReadWrite.All'],
    category: 'identity',
  },
  {
    code: 'graph_outlook_send',
    vendor: 'microsoft',
    displayName: 'Outlook — Send Mail',
    description: 'Send platform notifications via Graph Mail.Send.',
    icon: 'pi pi-envelope',
    auth: 'client_credentials',
    requiredScopes: ['Mail.Send'],
    category: 'productivity',
  },
  {
    code: 'graph_teams_channel',
    vendor: 'microsoft',
    displayName: 'Teams — Channel Messages',
    description: 'Post adaptive cards and notifications to Teams channels.',
    icon: 'pi pi-comments',
    auth: 'client_credentials',
    requiredScopes: ['ChannelMessage.Send', 'Team.ReadBasic.All'],
    category: 'collaboration',
  },
  {
    code: 'graph_sharepoint',
    vendor: 'microsoft',
    displayName: 'SharePoint — Evidence Pull',
    description: 'Ingest compliance evidence from SharePoint sites.',
    icon: 'pi pi-folder-open',
    auth: 'client_credentials',
    requiredScopes: ['Sites.Read.All', 'Files.Read.All'],
    category: 'productivity',
  },
  {
    code: 'defender',
    vendor: 'microsoft',
    displayName: 'Defender for Cloud',
    description: 'Pull security alerts + recommendations as evidence.',
    icon: 'pi pi-shield',
    auth: 'client_credentials',
    requiredScopes: ['SecurityEvents.Read.All', 'SecurityAlert.Read.All'],
    category: 'security_evidence',
  },
  {
    code: 'sentinel',
    vendor: 'microsoft',
    displayName: 'Microsoft Sentinel',
    description: 'Two-way incident sync with Sentinel.',
    icon: 'pi pi-bolt',
    auth: 'client_credentials',
    requiredScopes: ['SecurityAlert.Read.All'],
    category: 'security_evidence',
  },

  // === Google Workspace ===
  {
    code: 'google_sso',
    vendor: 'google',
    displayName: 'Google Workspace SSO',
    description: 'Sign in with Google (OIDC).',
    icon: 'pi pi-google',
    auth: 'auth_code',
    requiredScopes: ['openid', 'profile', 'email'],
    category: 'identity',
  },
  {
    code: 'google_drive',
    vendor: 'google',
    displayName: 'Google Drive — Evidence Pull',
    description: 'Ingest files and shared drives as compliance evidence.',
    icon: 'pi pi-cloud',
    auth: 'service_account_jwt',
    requiredScopes: ['https://www.googleapis.com/auth/drive.readonly'],
    category: 'productivity',
  },
  {
    code: 'google_chat',
    vendor: 'google',
    displayName: 'Google Chat — Space Messages',
    description: 'Post notifications to Google Chat spaces.',
    icon: 'pi pi-comment',
    auth: 'service_account_jwt',
    requiredScopes: ['https://www.googleapis.com/auth/chat.messages'],
    category: 'collaboration',
  },
  {
    code: 'gmail_send',
    vendor: 'google',
    displayName: 'Gmail — Send Mail',
    description: 'Send platform notifications via Gmail (OAuth2).',
    icon: 'pi pi-send',
    auth: 'service_account_jwt',
    requiredScopes: ['https://www.googleapis.com/auth/gmail.send'],
    category: 'productivity',
  },

  // === Zoom ===
  {
    code: 'zoom_sso',
    vendor: 'zoom',
    displayName: 'Zoom SSO',
    description: 'Sign in with Zoom (SAML/OIDC).',
    icon: 'pi pi-video',
    auth: 'auth_code',
    requiredScopes: ['user:read'],
    category: 'identity',
  },
  {
    code: 'zoom_meetings',
    vendor: 'zoom',
    displayName: 'Zoom Meetings',
    description: 'Create meetings + join links for incidents and reviews.',
    icon: 'pi pi-desktop',
    auth: 's2s_oauth',
    requiredScopes: ['meeting:write:admin', 'meeting:read:admin'],
    category: 'collaboration',
  },
  {
    code: 'zoom_recordings',
    vendor: 'zoom',
    displayName: 'Zoom Cloud Recordings',
    description: 'Pull cloud recordings as training/compliance evidence.',
    icon: 'pi pi-file-video',
    auth: 's2s_oauth',
    requiredScopes: ['recording:read:admin'],
    category: 'learning',
  },

  // === LinkedIn ===
  {
    code: 'linkedin_sso',
    vendor: 'linkedin',
    displayName: 'Sign in with LinkedIn',
    description: 'OIDC login for partner/onboarding portals.',
    icon: 'pi pi-linkedin',
    auth: 'auth_code',
    requiredScopes: ['openid', 'profile', 'email'],
    category: 'identity',
  },
  {
    code: 'linkedin_page_post',
    vendor: 'linkedin',
    displayName: 'LinkedIn Page Posting',
    description: 'Publish company-page posts from the platform.',
    icon: 'pi pi-megaphone',
    auth: 'auth_code',
    requiredScopes: ['w_member_social', 'rw_organization_admin'],
    category: 'marketing',
  },
  {
    code: 'linkedin_learning',
    vendor: 'linkedin',
    displayName: 'LinkedIn Learning',
    description: 'Import training completion as awareness evidence.',
    icon: 'pi pi-graduation-cap',
    auth: 'auth_code',
    requiredScopes: ['r_learningAdmin'],
    category: 'learning',
  },

  // === Slack (existing) ===
  {
    code: 'slack_webhook',
    vendor: 'slack',
    displayName: 'Slack — Incoming Webhook',
    description: 'Post platform notifications to a Slack channel.',
    icon: 'pi pi-slack',
    auth: 'webhook',
    requiredScopes: [],
    category: 'collaboration',
  },
];

export function findCatalogEntry(code: string): ConnectorCatalogEntry | undefined {
  return CONNECTOR_CATALOG.find(e => e.code === code);
}
