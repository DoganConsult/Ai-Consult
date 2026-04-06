// @ts-nocheck
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

let index: unknown = null;

export interface VectorDocument {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  vector?: number[];
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: Record<string, unknown>;
}

export async function initVectorStore(indexPath: string): Promise<boolean> {
  try {
    const { LocalIndex } = await import('vectra');
    const fs = await import('fs');

    if (!fs.existsSync(indexPath)) {
      fs.mkdirSync(indexPath, { recursive: true });
    }

    index = new LocalIndex(indexPath);
    if (!await index.isIndexCreated()) {
      await index.createIndex();
    }

    logger.info(`[VectorSearch] Index initialized at ${indexPath}`);
    return true;
  } catch (err: unknown) {
    logger.warn(`[VectorSearch] Init failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function upsertDocument(doc: VectorDocument): Promise<boolean> {
  if (!index) return false;
  try {
    await index.upsertItem({
      id: doc.id,
      vector: doc.vector || [],
      metadata: { text: doc.text, ...doc.metadata },
    });
    return true;
  } catch (err: unknown) {
    logger.error(`[VectorSearch] Upsert failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function searchSimilar(
  queryVector: number[],
  topK = 5,
): Promise<SearchResult[]> {
  if (!index) return [];
  try {
    const results = await index.queryItems(queryVector, topK);
    return results.map((r: any) => ({
      id: r.item.id,
      score: r.score,
      text: r.item.metadata?.text || '',
      metadata: r.item.metadata || {},
    }));
  } catch (err: unknown) {
    logger.error(`[VectorSearch] Search failed: ${toErrorMessage(err)}`);
    return [];
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (!index) return false;
  try {
    await index.deleteItem(id);
    return true;
  } catch {
    return false;
  }
}
