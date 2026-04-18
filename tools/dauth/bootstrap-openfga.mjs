#!/usr/bin/env node
// Idempotent OpenFGA bootstrap.
// Reads model from tools/dauth/openfga-model.json.
// Required env: OPENFGA_URL
// Optional env: OPENFGA_STORE_NAME (default: dogan-ai-os)
// Prints {storeId, modelId} for env wiring.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OpenFgaAdmin } from '../../packages/authz/dist/openfga-admin.js';

const __dir = dirname(fileURLToPath(import.meta.url));

function need(k) {
  const v = process.env[k];
  if (!v) { console.error(`missing env ${k}`); process.exit(2); }
  return v;
}

const apiUrl = need('OPENFGA_URL');
const storeName = process.env.OPENFGA_STORE_NAME ?? 'dogan-ai-os';
const model = JSON.parse(await readFile(join(__dir, 'openfga-model.json'), 'utf8'));

const admin = new OpenFgaAdmin({ apiUrl });

console.log(`[dauth] ensuring openfga store ${storeName}`);
const storeId = await admin.ensureStore(storeName);

console.log('[dauth] writing authorization model');
const modelId = await admin.writeAuthorizationModel(storeId, model);

console.log(JSON.stringify({ storeId, modelId }, null, 2));
console.log('[dauth] openfga bootstrap complete');
