// ============================================
// Shahin GRC — Local Knowledge Adapter Interface
// R3.3B Phase A: Adapter abstraction for local knowledge sources
// ============================================

export interface LocalKnowledgeAdapter {
  /**
   * Fetch content from the source
   * @param sourceConfig Adapter-specific configuration (path, connection, auth, etc.)
   * @returns Fetched content with metadata
   */
  fetch(sourceConfig: any): Promise<SourceFetchResult>;

  /**
   * Compute checksum for content
   * @param content Content to checksum (Buffer or string)
   * @returns SHA-256 checksum
   */
  checksum(content: Buffer | string): Promise<string>;

  /**
   * Detect version from metadata
   * @param metadata Source metadata
   * @returns Version string or null if not detectable
   */
  detectVersion(metadata: any): Promise<string | null>;

  /**
   * Extract metadata from content
   * @param content Content to analyze
   * @param path Source path/identifier
   * @returns Extracted metadata
   */
  extractMetadata(content: Buffer | string, path: string): Promise<SourceMetadata>;
}

export interface SourceFetchResult {
  content: Buffer | string;
  metadata: SourceMetadata;
  checksum: string;
  version?: string;
}

export interface SourceMetadata {
  path: string;
  size: number;
  modifiedAt: string;
  contentType?: string;
  additionalFields?: Record<string, any>;
}
