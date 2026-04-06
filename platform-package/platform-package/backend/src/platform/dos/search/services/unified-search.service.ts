import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { safeQuery, tenantSchema } from '../../../../config/database';
import { searchSimilar, upsertDocument } from './vector-search.service';

interface UnifiedSearchResult {
  id: string;
  type: string;
  title: string;
  titleAr?: string;
  description?: string;
  score: number;
  module: string;
  route: string;
}

interface SearchOptions {
  query: string;
  tenantId: string;
  modules?: string[];
  limit?: number;
  fuzzyThreshold?: number;
  includeArchived?: boolean;
}

const SEARCHABLE_ENTITIES = [
  { type: 'control', table: 'ucf_controls', titleCol: 'title', descCol: 'description', codeCol: 'code', module: 'controls', route: '/controls' },
  { type: 'risk', table: 'risks', titleCol: 'title', descCol: 'description', codeCol: null, module: 'risk', route: '/risks' },
  { type: 'policy', table: 'policies', titleCol: 'title', descCol: 'description', codeCol: 'policy_code', module: 'governance', route: '/policies' },
  { type: 'asset', table: 'assets', titleCol: 'name', descCol: 'description', codeCol: 'asset_code', module: 'asset', route: '/assets' },
  { type: 'incident', table: 'incidents', titleCol: 'title', descCol: 'description', codeCol: null, module: 'incident', route: '/incidents' },
  { type: 'vendor', table: 'vendors', titleCol: 'name', descCol: 'description', codeCol: null, module: 'vendor', route: '/vendors' },
  { type: 'audit', table: 'audits', titleCol: 'title', descCol: 'scope', codeCol: 'audit_code', module: 'audit', route: '/audits' },
  { type: 'evidence', table: 'evidence', titleCol: 'title', descCol: 'description', codeCol: null, module: 'evidence', route: '/evidence' },
];

export async function unifiedSearch(options: SearchOptions): Promise<UnifiedSearchResult[]> {
  const { query: searchQuery, tenantId, modules, limit = 20, fuzzyThreshold = 0.3 } = options;
  const schema = tenantSchema(tenantId);
  const results: UnifiedSearchResult[] = [];

  const entities = modules
    ? SEARCHABLE_ENTITIES.filter(e => modules.includes(e.module))
    : SEARCHABLE_ENTITIES;

  const fuzzyResults = await fuzzySearch(searchQuery, tenantId, entities, schema, fuzzyThreshold);
  results.push(...fuzzyResults);

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

async function fuzzySearch(
  searchQuery: string,
  _tenantId: string,
  entities: typeof SEARCHABLE_ENTITIES,
  schema: string,
  threshold: number,
): Promise<UnifiedSearchResult[]> {
  const results: UnifiedSearchResult[] = [];

  try {
    const Fuse = (await import('fuse.js')).default;

    for (const entity of entities) {
      const cols = [entity.titleCol, entity.descCol, entity.codeCol].filter(Boolean).join(', ');
      const queryResult = await safeQuery(
        `SELECT id, ${cols} FROM "${schema}".${entity.table} LIMIT 500`,
        []
      );

      if (!queryResult || !queryResult.rows.length) continue;

      const fuse = new Fuse(queryResult.rows, {
        keys: [entity.titleCol, entity.descCol, entity.codeCol].filter(Boolean) as string[],
        threshold,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });

      const matches = fuse.search(searchQuery);
      for (const match of matches.slice(0, 10)) {
        const item = match.item as Record<string, any>;
        results.push({
          id: item.id,
          type: entity.type,
          title: item[entity.titleCol] || '',
          description: item[entity.descCol] || '',
          score: 1 - (match.score || 0),
          module: entity.module,
          route: `${entity.route}/${item.id}`,
        });
      }
    }
  } catch (err: unknown) {
    logger.error(`[UnifiedSearch] Fuzzy search failed: ${toErrorMessage(err)}`);
  }

  return results;
}

export async function semanticSearch(
  queryVector: number[],
  _tenantId: string,
  topK = 10,
): Promise<UnifiedSearchResult[]> {
  try {
    const vectorResults = await searchSimilar(queryVector, topK);
    return vectorResults.map(r => ({
      id: r.id,
      type: (r.metadata.entityType as string) || 'unknown',
      title: r.text,
      score: r.score,
      module: (r.metadata.module as string) || 'platform',
      route: (r.metadata.route as string) || '',
    }));
  } catch (err: unknown) {
    logger.error(`[UnifiedSearch] Semantic search failed: ${toErrorMessage(err)}`);
    return [];
  }
}

export async function indexEntityForSearch(
  entityId: string,
  entityType: string,
  text: string,
  metadata: Record<string, unknown>,
  vector?: number[],
): Promise<boolean> {
  return upsertDocument({
    id: `${entityType}:${entityId}`,
    text,
    metadata: { ...metadata, entityType },
    vector,
  });
}
