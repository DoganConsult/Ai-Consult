// @ts-nocheck
// ============================================
// Shahin — File Storage Service
// Multi-provider (local / S3 / Azure Blob)
// with DB tracking in file_storage table
// ============================================

import { SYSTEM_JOB_ACTOR } from '../constants/system-actors';
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { safeQuery, tenantSchema } from '../../../config/database/database';
import { getFirstRow } from '../../../shared/data/db-utils';
import { SYSTEM_JOB_ACTOR } from '../constants/system-actors';

// Maximum file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Storage provider from env
const STORAGE_PROVIDER = (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3' | 'azure_blob';
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// S3 config
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || 'me-south-1';
const __S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const __S3_SECRET_KEY = process.env.S3_SECRET_KEY || '';
const S3_ENDPOINT = process.env.S3_ENDPOINT || '';

// Azure Blob config
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const AZURE_STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'grc-files';

export interface FileRecord {
  fileId: string;
  originalFilename: string;
  storageProvider: string;
  storageKey: string;
  storageBucket: string | null;
  contentType: string | null;
  fileSizeBytes: number;
  contentHash: string;
  entityType: string | null;
  entityId: string | null;
  uploadedBy: string;
  accessLevel: string;
  createdAt: string;
}

// === Pure validation function (exported for property testing) ===

export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes >= 0 && sizeBytes <= MAX_FILE_SIZE;
}

function computeHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// === Storage Provider Implementations ===

async function storeLocal(buffer: Buffer, storageKey: string): Promise<void> {
  const dir = path.dirname(path.join(UPLOAD_DIR, storageKey));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, storageKey), buffer);
}

async function retrieveLocal(storageKey: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${storageKey}`);
  return fs.readFileSync(fullPath);
}

async function deleteLocal(storageKey: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

async function storeS3(buffer: Buffer, storageKey: string, contentType: string | null): Promise<void> {
  // Native HTTPS PUT to S3 (no SDK dependency)
  const { default: _https } = await import('https');
  const date = new Date().toUTCString();
  const bucket = S3_BUCKET;
  const endpoint = S3_ENDPOINT || `https://${bucket}.s3.${S3_REGION}.amazonaws.com`;

  const url = `${endpoint}/${storageKey}`;

  // Simple PUT with pre-signed style (for production, use aws-sdk or @aws-sdk/client-s3)
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'x-amz-date': date,
      'x-amz-content-sha256': computeHash(buffer),
    },
    body: buffer,
  });
  if (!resp.ok) throw new Error(`S3 upload failed (${resp.status}): ${await resp.text()}`);
}

async function retrieveS3(storageKey: string): Promise<Buffer> {
  const bucket = S3_BUCKET;
  const endpoint = S3_ENDPOINT || `https://${bucket}.s3.${S3_REGION}.amazonaws.com`;
  const resp = await fetch(`${endpoint}/${storageKey}`);
  if (!resp.ok) throw new Error(`S3 download failed (${resp.status})`);
  return Buffer.from(await resp.arrayBuffer());
}

async function storeAzureBlob(buffer: Buffer, storageKey: string, contentType: string | null): Promise<void> {
  // Parse connection string for account name and key
  const parts = AZURE_STORAGE_CONNECTION_STRING.split(';').reduce((acc: Record<string, string>, part) => {
    const [key, ...val] = part.split('=');
    acc[key] = val.join('=');
    return acc;
  }, {});
  const accountName = parts['AccountName'];
  const url = `https://${accountName}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER}/${storageKey}`;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-version': '2020-10-02',
    },
    body: buffer,
  });
  if (!resp.ok) throw new Error(`Azure Blob upload failed (${resp.status}): ${await resp.text()}`);
}

async function retrieveAzureBlob(storageKey: string): Promise<Buffer> {
  const parts = AZURE_STORAGE_CONNECTION_STRING.split(';').reduce((acc: Record<string, string>, part) => {
    const [key, ...val] = part.split('=');
    acc[key] = val.join('=');
    return acc;
  }, {});
  const accountName = parts['AccountName'];
  const url = `https://${accountName}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER}/${storageKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Azure Blob download failed (${resp.status})`);
  return Buffer.from(await resp.arrayBuffer());
}

// === Upload File (provider-aware + DB tracking) ===

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  options?: {
    tenantId?: string;
    entityType?: string;
    entityId?: string;
    uploadedBy?: string;
    contentType?: string;
    accessLevel?: 'private' | 'tenant' | 'public';
  }
): Promise<FileRecord> {
  if (!validateFileSize(buffer.length)) {
    throw new Error(`File size ${buffer.length} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  const ext = path.extname(filename);
  const contentHash = computeHash(buffer);
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  const storageKey = `${datePrefix}/${uuidv4()}${ext}`;
  const contentType = options?.contentType || guessMimeType(ext);

  // Store to provider
  switch (STORAGE_PROVIDER) {
    case 's3':
      await storeS3(buffer, storageKey, contentType);
      break;
    case 'azure_blob':
      await storeAzureBlob(buffer, storageKey, contentType);
      break;
    default:
      await storeLocal(buffer, storageKey);
  }

  // Track in DB if tenantId provided
  if (options?.tenantId) {
    const schema = tenantSchema(options.tenantId);
    const result = await safeQuery(
      `INSERT INTO "${schema}".file_storage
         (original_filename, storage_provider, storage_key, storage_bucket, content_type,
          file_size_bytes, content_hash, entity_type, entity_id, uploaded_by, access_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        filename, STORAGE_PROVIDER, storageKey,
        STORAGE_PROVIDER === 's3' ? S3_BUCKET : (STORAGE_PROVIDER === 'azure_blob' ? AZURE_STORAGE_CONTAINER : null),
        contentType, buffer.length, contentHash,
        options.entityType || null, options.entityId || null,
        options.uploadedBy || SYSTEM_JOB_ACTOR, options.accessLevel || 'private',
      ]
    );
    return rowToFileRecord(getFirstRow(result));
  }

  return {
    fileId: uuidv4(),
    originalFilename: filename,
    storageProvider: STORAGE_PROVIDER,
    storageKey,
    storageBucket: null,
    contentType,
    fileSizeBytes: buffer.length,
    contentHash,
    entityType: options?.entityType || null,
    entityId: options?.entityId || null,
    uploadedBy: options?.uploadedBy || SYSTEM_JOB_ACTOR,
    accessLevel: options?.accessLevel || 'private',
    createdAt: new Date().toISOString(),
  };
}

// === Get File ===

export async function getFile(fileIdOrPath: string, tenantId?: string): Promise<Buffer> {
  // If tenantId given, look up storage key from DB
  if (tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT storage_provider, storage_key FROM "${schema}".file_storage
       WHERE file_id = $1 AND deleted_at IS NULL`,
      [fileIdOrPath]
    );
    if (result.rows.length > 0) {
      const row = getFirstRow(result);
      return retrieveByProvider(row.storage_provider, row.storage_key);
    }
  }

  // Fallback: treat as direct path (backward compat)
  return retrieveLocal(fileIdOrPath);
}

// === Delete File (soft-delete in DB, optionally hard-delete from storage) ===

export async function deleteFile(fileId: string, tenantId: string, hardDelete = false): Promise<void> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT storage_provider, storage_key FROM "${schema}".file_storage WHERE file_id = $1`,
    [fileId]
  );
  if (result.rows.length === 0) throw new Error(`File ${fileId} not found`);

  // Soft delete in DB
  await safeQuery(
    `UPDATE "${schema}".file_storage SET deleted_at = NOW() WHERE file_id = $1`,
    [fileId]
  );

  if (hardDelete) {
    const row = getFirstRow(result);
    if (row.storage_provider === 'local') await deleteLocal(row.storage_key);
    // For S3/Azure, add DELETE API calls as needed
  }
}

// === List files for an entity ===

export async function listFiles(tenantId: string, entityType: string, entityId: string): Promise<FileRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".file_storage
     WHERE entity_type = $1 AND entity_id = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return result.rows.map(rowToFileRecord);
}

// === Helpers ===

async function retrieveByProvider(provider: string, storageKey: string): Promise<Buffer> {
  switch (provider) {
    case 's3': return retrieveS3(storageKey);
    case 'azure_blob': return retrieveAzureBlob(storageKey);
    default: return retrieveLocal(storageKey);
  }
}

function rowToFileRecord(row: unknown): FileRecord {
  return {
    fileId: row.file_id,
    originalFilename: row.original_filename,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    storageBucket: row.storage_bucket,
    contentType: row.content_type,
    fileSizeBytes: row.file_size_bytes,
    contentHash: row.content_hash,
    entityType: row.entity_type,
    entityId: row.entity_id,
    uploadedBy: row.uploaded_by,
    accessLevel: row.access_level,
    createdAt: row.created_at,
  };
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf', '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv', '.txt': 'text/plain', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.zip': 'application/zip',
    '.xml': 'application/xml', '.html': 'text/html',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}
