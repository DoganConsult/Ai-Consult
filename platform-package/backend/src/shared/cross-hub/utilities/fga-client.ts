import { OpenFgaClient } from '@openfga/sdk';

export const fgaClient = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL || 'http://localhost:8080',
  storeId: process.env.FGA_STORE_ID || 'default-store',
  authorizationModelId: process.env.FGA_MODEL_ID,
});
