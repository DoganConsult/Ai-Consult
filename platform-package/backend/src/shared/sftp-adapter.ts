// @ts-nocheck
// ============================================
// Shahin GRC — SFTP Adapter
// R3.3B Phase A: Adapter for SFTP drop sources
// ============================================

import crypto from 'crypto';
import SftpClient from 'ssh2-sftp-client';
import { logger } from '../platform/dos/observability/logger.service';
import { LocalKnowledgeAdapter, SourceFetchResult, SourceMetadata } from './local-knowledge-adapter.interface';

export interface SftpConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  remotePath: string;
  filePattern?: string;
  timeout?: number;
}

export class SftpAdapter implements LocalKnowledgeAdapter {
  async fetch(sourceConfig: SftpConfig): Promise<SourceFetchResult> {
    const { host, port = 22, username, password, privateKey, passphrase, remotePath, filePattern, timeout = 30000 } = sourceConfig;
    const client = new SftpClient();

    try {
      // Connect to SFTP server
      const connectConfig: unknown = {
        host,
        port,
        username,
        readyTimeout: timeout,
      };

      if (privateKey) {
        connectConfig.privateKey = privateKey;
        if (passphrase) {
          connectConfig.passphrase = passphrase;
        }
      } else if (password) {
        connectConfig.password = password;
      } else {
        throw new Error('SFTP authentication requires either password or privateKey');
      }

      await client.connect(connectConfig);

      try {
        // Check if remotePath is a file or directory
        const stats = await client.stat(remotePath);

        let content: Buffer;
        let metadata: SourceMetadata;

        if ((stats as any).isFile || stats.size > 0) {
          // Fetch single file
          content = Buffer.from((await client.get(remotePath)) as any);
          metadata = {
            path: remotePath,
            size: stats.size,
            modifiedAt: new Date(stats.modifyTime).toISOString(),
            contentType: this.detectContentType(remotePath),
            additionalFields: {
              host,
              port,
              username,
              isFile: true,
              permissions: (stats as any).permissions || (stats as any).mode,
            },
          };
        } else {
          // List and fetch files from directory (optionally filtered by pattern)
          const files = await client.list(remotePath);
          const filteredFiles = filePattern
            ? files.filter((f) => {
                const regex = new RegExp(filePattern);
                return regex.test(f.name);
              })
            : files;

          // Fetch all matching files and combine content
          const fileContents: Array<{ name: string; content: Buffer; stats: unknown }> = [];
          for (const file of filteredFiles) {
            if (file.type === '-') {
              // Regular file
              const filePath = `${remotePath}/${file.name}`;
              const fileContent = Buffer.from((await client.get(filePath)) as any);
              fileContents.push({ name: file.name, content: fileContent, stats: file });
            }
          }

          // Combine all files into a single JSON structure
          const combinedData = {
            source: remotePath,
            fileCount: fileContents.length,
            files: fileContents.map((f) => ({
              name: f.name,
              size: f.stats.size,
              modifiedAt: new Date(f.stats.modifyTime).toISOString(),
              content: f.content.toString('utf-8'),
            })),
          };

          content = Buffer.from(JSON.stringify(combinedData, null, 2), 'utf-8');
          const totalSize = fileContents.reduce((sum, f) => sum + f.stats.size, 0);
          const latestModified = fileContents.reduce((latest, f) => {
            const modTime = new Date(f.stats.modifyTime).getTime();
            return modTime > latest ? modTime : latest;
          }, 0);

          metadata = {
            path: remotePath,
            size: totalSize,
            modifiedAt: new Date(latestModified).toISOString(),
            contentType: 'application/json',
            additionalFields: {
              host,
              port,
              username,
              isDirectory: true,
              fileCount: fileContents.length,
              filePattern: filePattern || null,
            },
          };
        }

        const checksum = await this.checksum(content);

        logger.info('[SftpAdapter] Successfully fetched content', {
          host,
          remotePath,
          size: metadata.size,
          isDirectory: metadata.additionalFields?.isDirectory || false,
        });

        return {
          content,
          metadata,
          checksum,
        };
      } finally {
        await client.end();
      }
    } catch (err) {
      logger.error('[SftpAdapter] Failed to fetch from SFTP', {
        host,
        port,
        username,
        remotePath,
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      throw err;
    }
  }

  private detectContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      xml: 'application/xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
      csv: 'text/csv',
      html: 'text/html',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  async checksum(content: Buffer | string): Promise<string> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async detectVersion(metadata: any): Promise<string | null> {
    if (metadata.additionalFields?.modifiedAt) {
      return metadata.additionalFields.modifiedAt;
    }
    return null;
  }

  async extractMetadata(content: Buffer | string, filePath: string): Promise<SourceMetadata> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return {
      path: filePath,
      size: buffer.length,
      modifiedAt: new Date().toISOString(),
      contentType: 'application/octet-stream',
    };
  }
}
