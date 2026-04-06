// ============================================
// Shahin GRC — Local Folder Adapter
// R3.3B Phase A: Adapter for local/shared folder sources
// ============================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { LocalKnowledgeAdapter, SourceFetchResult, SourceMetadata } from './local-knowledge-adapter.interface';

export interface LocalFolderConfig {
  folderPath: string;
  filePattern?: string; // glob pattern, e.g., "*.pdf", "**/*.docx"
  recursive?: boolean;
  watchForChanges?: boolean;
}

export class LocalFolderAdapter implements LocalKnowledgeAdapter {
  async fetch(sourceConfig: LocalFolderConfig): Promise<SourceFetchResult> {
    const { folderPath, filePattern, recursive } = sourceConfig;

    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${folderPath}`);
    }

    // For now, return the folder path as metadata
    // In a full implementation, this would list files matching the pattern
    const metadata: SourceMetadata = {
      path: folderPath,
      size: 0, // Will be computed per file
      modifiedAt: stats.mtime.toISOString(),
      contentType: 'directory',
      additionalFields: {
        fileCount: this.countFiles(folderPath, filePattern, recursive),
      },
    };

    // Return folder listing as content (structured JSON)
    const content = JSON.stringify({
      folderPath,
      files: this.listFiles(folderPath, filePattern, recursive),
    });

    const checksum = await this.checksum(content);

    return {
      content,
      metadata,
      checksum,
    };
  }

  async checksum(content: Buffer | string): Promise<string> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async detectVersion(metadata: any): Promise<string | null> {
    // For folders, version could be based on modification time or file count
    if (metadata.modifiedAt) {
      return metadata.modifiedAt;
    }
    return null;
  }

  async extractMetadata(_content: Buffer | string, filePath: string): Promise<SourceMetadata> {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const stats = fs.statSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    return {
      path: fullPath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      contentType: this.getContentType(ext),
      additionalFields: {
        extension: ext,
        isDirectory: stats.isDirectory(),
      },
    };
  }

  private countFiles(folderPath: string, pattern?: string, recursive = false): number {
    try {
      const files = this.listFiles(folderPath, pattern, recursive);
      return files.length;
    } catch {
      return 0;
    }
  }

  private listFiles(folderPath: string, pattern?: string, recursive = false): string[] {
    const files: string[] = [];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && recursive) {
            walk(fullPath);
          } else if (entry.isFile()) {
            if (!pattern || this.matchesPattern(entry.name, pattern)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };

    walk(folderPath);
    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob matching (can be enhanced)
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
    );
    return regex.test(filename);
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
    };
    return types[ext] || 'application/octet-stream';
  }
}
