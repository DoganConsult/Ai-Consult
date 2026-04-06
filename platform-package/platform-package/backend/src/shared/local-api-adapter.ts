// @ts-nocheck
// ============================================
// Shahin GRC — Local API Adapter
// R3.3B Phase A: Adapter for local API on LAN
// ============================================

import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import { LocalKnowledgeAdapter, SourceFetchResult, SourceMetadata } from './local-knowledge-adapter.interface';

export interface LocalApiConfig {
  baseUrl: string;
  endpoint: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  body?: unknown;
}

export class LocalApiAdapter implements LocalKnowledgeAdapter {
  async fetch(sourceConfig: LocalApiConfig): Promise<SourceFetchResult> {
    const { baseUrl, endpoint, method = 'GET', headers = {}, auth, body } = sourceConfig;
    const url = new URL(endpoint, baseUrl);

    return new Promise((resolve, reject) => {
      const requestOptions: unknown = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: { ...headers },
      };

      // Add auth headers
      if (auth) {
        if (auth.type === 'bearer' && auth.token) {
          requestOptions.headers['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.type === 'basic' && auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          requestOptions.headers['Authorization'] = `Basic ${credentials}`;
        } else if (auth.type === 'apikey' && auth.apiKey && auth.apiKeyHeader) {
          requestOptions.headers[auth.apiKeyHeader] = auth.apiKey;
        }
      }

      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', async () => {
          try {
            const metadata: SourceMetadata = {
              path: url.toString(),
              size: Buffer.byteLength(data, 'utf-8'),
              modifiedAt: new Date().toISOString(),
              contentType: res.headers['content-type'] || 'application/json',
              additionalFields: {
                statusCode: res.statusCode,
                headers: res.headers,
              },
            };

            const checksum = await this.checksum(data);
            const version = await this.detectVersion(metadata);

            resolve({
              content: data,
              metadata,
              checksum,
              version: version ?? undefined,
            });
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body && method !== 'GET') {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        req.write(bodyStr);
      }

      req.end();
    });
  }

  async checksum(content: Buffer | string): Promise<string> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async detectVersion(metadata: any): Promise<string | null> {
    // Version could come from ETag, Last-Modified, or custom header
    if (metadata.additionalFields?.headers?.['etag']) {
      return metadata.additionalFields.headers['etag'];
    }
    if (metadata.additionalFields?.headers?.['last-modified']) {
      return metadata.additionalFields.headers['last-modified'];
    }
    return null;
  }

  async extractMetadata(content: Buffer | string, apiPath: string): Promise<SourceMetadata> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return {
      path: apiPath,
      size: buffer.length,
      modifiedAt: new Date().toISOString(),
      contentType: 'application/json',
    };
  }
}
