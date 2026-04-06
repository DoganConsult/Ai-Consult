// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../../config/database';
import * as https from 'https';
import type { GenericRow } from '../../../../platform/dos/types/db-rows.types';

export interface RAGResult {
  content: string;
  source: string;
  entityType: string;
  entityId: string;
  score: number;
}

export interface RAGContext {
  documents: RAGResult[];
  tokenEstimate: number;
}

async function searchAzureAISearch(query: string, topK: number = 5): Promise<RAGResult[]> {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const indexName = process.env.AZURE_SEARCH_INDEX || 'grc-documents';
  const apiKey = process.env.AZURE_SEARCH_API_KEY || process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) return [];

  return new Promise((resolve) => {
    const url = new URL(endpoint);
    const path = `/indexes/${indexName}/docs/search?api-version=2024-07-01`;
    const body = JSON.stringify({
      search: query,
      top: topK,
      queryType: 'semantic',
      semanticConfiguration: 'default',
      select: 'content,title,entity_type,entity_id',
    });

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const results = (parsed.value || []).map((doc: GenericRow) => ({
              content: (doc.content || '').slice(0, 1000),
              source: doc.title || 'any',
              entityType: doc.entity_type || 'document',
              entityId: doc.entity_id || '',
              score: doc['@search.score'] || 0,
            }));
            resolve(results);
          } catch {
            resolve([]);
          }
        });
      },
    );

    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
    req.write(body);
    req.end();
  });
}

async function searchLocalDB(
  tenantId: string,
  agentId: string,
  query: string,
  topK: number = 5,
): Promise<RAGResult[]> {
  const schema = tenantSchema(tenantId);
  const results: RAGResult[] = [];

  const AGENT_TABLES: Record<string, Array<{ table: string; fields: string; entityType: string; idField: string }>> = {
    A01: [
      { table: 'frameworks', fields: 'title, description', entityType: 'framework', idField: 'framework_id' },
    ],
    A02: [
      { table: 'users', fields: 'name, email, role', entityType: 'user', idField: 'user_id' },
    ],
    A03: [
      { table: 'frameworks', fields: 'title, description', entityType: 'framework', idField: 'framework_id' },
      { table: 'ucf_controls', fields: 'title, description, mapped_frameworks::text', entityType: 'control', idField: 'id' },
    ],
    A04: [
      { table: 'ucf_controls', fields: 'title, description, implementation_notes', entityType: 'control', idField: 'id' },
      { table: 'policies', fields: 'title, content', entityType: 'policy', idField: 'policy_id' },
    ],
    A05: [
      { table: 'evidence', fields: 'title, description, status', entityType: 'evidence', idField: 'evidence_id' },
    ],
    A06: [
      { table: 'compliance_gaps', fields: 'title, description, severity', entityType: 'gap', idField: 'gap_id' },
      { table: 'remediation_tasks', fields: 'title, description, status', entityType: 'remediation', idField: 'task_id' },
    ],
    A07: [
      { table: 'risks', fields: 'title, description, risk_score, likelihood, impact', entityType: 'risk', idField: 'risk_id' },
    ],
    A08: [
      { table: 'policies', fields: 'title, content, status, review_date', entityType: 'policy', idField: 'policy_id' },
    ],
    A09: [
      { table: 'vendors', fields: 'name, risk_rating, status', entityType: 'vendor', idField: 'vendor_id' },
    ],
    A10: [
      { table: 'findings', fields: 'title, description, severity, status', entityType: 'finding', idField: 'finding_id' },
    ],
    A11: [
      { table: 'risks', fields: 'title, description, risk_score, likelihood, impact', entityType: 'risk', idField: 'risk_id' },
      { table: 'ucf_controls', fields: 'title, description, implementation_notes', entityType: 'control', idField: 'id' },
    ],
    A12: [
      { table: 'policies', fields: 'title, content, status', entityType: 'policy', idField: 'policy_id' },
      { table: 'users', fields: 'name, email, role', entityType: 'user', idField: 'user_id' },
    ],
  };

  const tables = AGENT_TABLES[agentId] || [];
  const searchTerm = query.split(' ').slice(0, 5).join(' & ');

  for (const tbl of tables) {
    try {
      const res = await safeQuery(
        `SELECT ${tbl.fields}, ${tbl.idField} AS id FROM "${schema}".${tbl.table}
         WHERE to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(description,''))
               @@ plainto_tsquery('english', $1)
         LIMIT $2`,
        [searchTerm, Math.ceil(topK / tables.length)],
      );
      for (const row of res.rows) {
        const content = Object.values(row).filter(v => typeof v === 'string').join(' | ').slice(0, 800);
        results.push({
          content,
          source: `${tbl.table}:${row.id}`,
          entityType: tbl.entityType,
          entityId: row.id || '',
          score: 0.7,
        });
      }
    } catch { /* table may not exist */ }
  }

  return results;
}

export async function buildRAGContext(
  tenantId: string,
  agentId: string,
  query: string,
  topK: number = 5,
): Promise<RAGContext> {
  const [azureResults, localResults] = await Promise.allSettled([
    searchAzureAISearch(query, topK),
    searchLocalDB(tenantId, agentId, query, topK),
  ]);

  const docs: RAGResult[] = [
    ...((azureResults as any).value || []),
    ...((localResults as any).value || []),
  ];

  docs.sort((a, b) => b.score - a.score);
  const topDocs = docs.slice(0, topK);
  const tokenEstimate = topDocs.reduce((sum, d) => sum + Math.ceil(d.content.length / 4), 0);

  return { documents: topDocs, tokenEstimate };
}

export function formatRAGForPrompt(ragContext: RAGContext): string {
  if (ragContext.documents.length === 0) return '';

  const lines = ragContext.documents.map((d, i) =>
    `[${i + 1}] (${d.entityType}) ${d.source}: ${d.content}`,
  );

  return `\n=== RETRIEVED DOCUMENTS (RAG) ===\n${lines.join('\n')}\n=== END RAG ===\n`;
}
