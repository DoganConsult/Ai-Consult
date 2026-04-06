import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

let graphClient = null;

export function getGraphClient() {
  if (graphClient) return graphClient;

  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;

  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    console.warn('Microsoft Graph not configured — missing credentials');
    return null;
  }

  const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  console.log('Microsoft Graph client initialized');
  return graphClient;
}

export async function sendMail({ to, subject, body, isHtml = true }) {
  const client = getGraphClient();
  if (!client) {
    console.warn('Graph not configured, skipping email to:', to);
    return null;
  }

  const from = process.env.GRAPH_MAIL_FROM || 'info@doganconsult.com';

  const message = {
    subject,
    body: {
      contentType: isHtml ? 'HTML' : 'Text',
      content: body,
    },
    toRecipients: (Array.isArray(to) ? to : [to]).map((addr) => ({
      emailAddress: { address: addr },
    })),
  };

  await client.api(`/users/${from}/sendMail`).post({ message, saveToSentItems: true });
  console.log(`Email sent to ${to} via Graph API`);
  return true;
}
