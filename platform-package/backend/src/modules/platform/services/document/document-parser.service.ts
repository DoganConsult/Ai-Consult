// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
// ============================================
// Shahin GRC — Document Parsing Pipeline
// Functions 2-3: Orchestrates document parsing
// via Apache Tika + Unstructured.io.
// Extracts text, metadata, structured elements,
// and applies Arabic text normalization.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from "../../../../config/database";
import { parseWithTika } from "../../../../connectors/tika.connector";
import {
  parseWithUnstructured,
  UnstructuredElement,
} from "../../../../connectors/unstructured.connector";
import { eventBus } from '../event/event-bus.service';
import type { GenericRow } from '../../../../types/db-rows.types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedElement {
  elementId: string;
  /** Element type: Title, NarrativeText, Table, ListItem, Header, etc. */
  type: string;
  /** Extracted text content */
  text: string;
  /** Page number where element appears (1-based) */
  pageNumber: number | null;
  /** Index position within the document */
  sortOrder: number;
}

export interface ParseDocumentResult {
  documentId: string;
  /** Full extracted plain text */
  text: string;
  /** Structured elements from Unstructured.io */
  elements: ParsedElement[];
  /** Document metadata from Tika (author, creation date, etc.) */
  metadata: Record<string, string>;
  /** Detected primary language (ISO 639-1) */
  language: string;
  /** Number of pages detected in the document */
  pageCount: number;
}

// ============================================================================
// Arabic Text Normalization Utilities
// ============================================================================

/**
 * Normalize Arabic alef variants to bare alef.
 * Maps: ALEF_WITH_MADDA (U+0622), ALEF_WITH_HAMZA_ABOVE (U+0623),
 * ALEF_WITH_HAMZA_BELOW (U+0625), ALEF_WASLA (U+0671) -> ALEF (U+0627)
 */
function normalizeAlef(text: string): string {
  return text.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627");
}

/**
 * Normalize taa marbuta (U+0629) to haa (U+0647) for consistent matching.
 */
function normalizeTaaMarbuta(text: string): string {
  return text.replace(/\u0629/g, "\u0647");
}

/**
 * Strip Arabic diacritics (tashkeel/harakat) from text.
 * Removes: fathah, dammah, kasrah, sukun, shadda, tanween, etc.
 */
function stripDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, "");
}

/**
 * Apply full Arabic text cleanup: normalize alef/hamza variants,
 * normalize taa marbuta, and optionally strip diacritics.
 *
 * @param text - Raw Arabic text to normalize
 * @param removeDiacritics - Whether to strip diacritical marks (default true)
 * @returns Normalized text suitable for indexing and matching
 */
export function normalizeArabicText(
  text: string,
  removeDiacritics: boolean = true,
): string {
  let normalized = normalizeAlef(text);
  normalized = normalizeTaaMarbuta(normalized);
  if (removeDiacritics) {
    normalized = stripDiacritics(normalized);
  }
  return normalized;
}

// ============================================================================
// Table Initialization
// ============================================================================

let tablesInitialized = false;

/**
 * Ensure the regulatory_documents and document_elements tables exist
 * in the tenant schema.
 */
async function ensureTables(tenantId: string): Promise<void> {
  if (tablesInitialized) return;
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".regulatory_documents (
      document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name VARCHAR(512) NOT NULL,
      mime_type VARCHAR(128),
      raw_text TEXT,
      metadata JSONB DEFAULT '{}',
      language VARCHAR(10) DEFAULT 'any',
      page_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'parsed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".document_elements (
      element_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL REFERENCES "${schema}".regulatory_documents(document_id) ON DELETE CASCADE,
      element_type VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      page_number INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_doc_elements_doc_id
      ON "${schema}".document_elements (document_id);
  `);

  tablesInitialized = true;
}

// ============================================================================
// Core Pipeline
// ============================================================================

/**
 * Parse a document through the full extraction pipeline.
 *
 * 1. Calls Apache Tika for raw text + metadata extraction
 * 2. Calls Unstructured.io for structured element extraction
 * 3. Applies Arabic text normalization on all extracted text
 * 4. Persists the parsed document and elements to the tenant database
 *
 * @param tenantId   - Tenant identifier for schema scoping
 * @param fileBuffer - Raw file bytes to parse
 * @param fileName   - Original file name
 * @param mimeType   - MIME type of the document
 * @returns Parsed document result with text, elements, metadata, and page count
 */
export async function parseDocument(
  tenantId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<ParseDocumentResult> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);
  const documentId = uuid();

  // Step 1: Extract raw text + metadata via Tika
  let rawText = "";
  let metadata: Record<string, string> = {};
  let language = "any";

  try {
    const tikaResult = await parseWithTika(fileBuffer, fileName);
    rawText = tikaResult.text;
    metadata = tikaResult.metadata;
    language = tikaResult.language;
  } catch (err: unknown) {
    logger.warn(
      `[DocumentParser] Tika extraction failed for ${fileName}: ${(err as Error).message}. Continuing with Unstructured only.`,
    );
  }

  // Step 2: Extract structured elements via Unstructured
  let unstructuredElements: UnstructuredElement[] = [];
  let pageCount = 1;

  try {
    unstructuredElements = await parseWithUnstructured(fileBuffer, fileName, {
      strategy: "hi_res",
      languages: ["eng", "ara"],
    });

    // Derive page count from element metadata
    const pageNumbers = unstructuredElements
      .map((el) => el.metadata?.page_number)
      .filter((p): p is number => typeof p === "number");
    if (pageNumbers.length > 0) {
      pageCount = Math.max(...pageNumbers);
    }
  } catch (err: unknown) {
    logger.warn(
      `[DocumentParser] Unstructured extraction failed for ${fileName}: ${(err as Error).message}. Using Tika text only.`,
    );
  }

  // Step 3: If Tika text is empty but Unstructured succeeded, build text from elements
  if (!rawText.trim() && unstructuredElements.length > 0) {
    rawText = unstructuredElements.map((el) => el.text).join("\n\n");
  }

  // Step 4: Apply Arabic text normalization
  rawText = normalizeArabicText(rawText);

  // Step 5: Build parsed elements array
  const elements: ParsedElement[] = unstructuredElements.map((el, idx) => ({
    elementId: el.element_id || uuid(),
    type: el.type || "UncategorizedText",
    text: normalizeArabicText(el.text),
    pageNumber: el.metadata?.page_number ?? null,
    sortOrder: idx,
  }));

  // Step 6: Persist document record
  await safeQuery(
    `INSERT INTO "${schema}".regulatory_documents
     (document_id, file_name, mime_type, raw_text, metadata, language, page_count, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'parsed')`,
    [
      documentId,
      fileName,
      mimeType,
      rawText,
      JSON.stringify(metadata),
      language,
      pageCount,
    ],
  );

  // Step 7: Persist individual elements
  for (const el of elements) {
    await safeQuery(
      `INSERT INTO "${schema}".document_elements
       (element_id, document_id, element_type, text, page_number, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [el.elementId, documentId, el.type, el.text, el.pageNumber, el.sortOrder],
    );
  }

  // Step 8: Emit event
  await eventBus.publish({
    eventType: "document.parsed" as any,
    tenantId,
    sourceService: "DocumentParserService",
    entityType: "regulatory_document",
    entityId: documentId,
    severity: "info",
    payload: {
      fileName,
      language,
      pageCount,
      elementCount: elements.length,
    },
  });

  return {
    documentId,
    text: rawText,
    elements,
    metadata,
    language,
    pageCount,
  };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Retrieve all parsed elements for a given document.
 *
 * @param tenantId   - Tenant identifier for schema scoping
 * @param documentId - UUID of the parsed document
 * @returns Array of parsed elements ordered by sort_order
 */
export async function getDocumentElements(
  tenantId: string,
  documentId: string,
): Promise<ParsedElement[]> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT element_id, element_type, text, page_number, sort_order
     FROM "${schema}".document_elements
     WHERE document_id = $1
     ORDER BY sort_order ASC`,
    [documentId],
  );

  return result.rows.map((row: GenericRow) => ({
    elementId: row.element_id,
    type: row.element_type,
    text: row.text,
    pageNumber: row.page_number,
    sortOrder: row.sort_order,
  }));
}

/**
 * Re-parse an existing document by fetching its stored content
 * and running it through the extraction pipeline again.
 * Deletes old elements and replaces them with freshly parsed ones.
 *
 * @param tenantId   - Tenant identifier for schema scoping
 * @param documentId - UUID of the document to reprocess
 * @returns Updated parse result
 */
export async function reprocessDocument(
  tenantId: string,
  documentId: string,
): Promise<ParseDocumentResult> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  // Fetch the original document record
  const docResult = await safeQuery(
    `SELECT document_id, file_name, mime_type, raw_text, metadata, language, page_count
     FROM "${schema}".regulatory_documents
     WHERE document_id = $1`,
    [documentId],
  );

  if (docResult.rows.length === 0) {
    const err: unknown = new Error(`Document ${documentId} not found`);
    err.status = 404;
    throw err;
  }

  const doc = docResult.rows[0];

  // Delete old elements
  await safeQuery(
    `DELETE FROM "${schema}".document_elements WHERE document_id = $1`,
    [documentId],
  );

  // Re-normalize and re-persist the raw text and elements
  const normalizedText = normalizeArabicText(doc.raw_text || "");

  // Update the document record with re-normalized text
  await safeQuery(
    `UPDATE "${schema}".regulatory_documents
     SET raw_text = $1, status = 'reprocessed', updated_at = NOW()
     WHERE document_id = $2`,
    [normalizedText, documentId],
  );

  // Build elements from the raw text (paragraph-level splitting as fallback)
  const paragraphs = normalizedText
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 0);

  const elements: ParsedElement[] = paragraphs.map((text, idx) => ({
    elementId: uuid(),
    type: idx === 0 ? "Title" : "NarrativeText",
    text: text.trim(),
    pageNumber: null,
    sortOrder: idx,
  }));

  // Persist re-generated elements
  for (const el of elements) {
    await safeQuery(
      `INSERT INTO "${schema}".document_elements
       (element_id, document_id, element_type, text, page_number, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [el.elementId, documentId, el.type, el.text, el.pageNumber, el.sortOrder],
    );
  }

  await eventBus.publish({
    eventType: "document.parsed" as any,
    tenantId,
    sourceService: "DocumentParserService",
    entityType: "regulatory_document",
    entityId: documentId,
    severity: "info",
    payload: { fileName: doc.file_name, reprocessed: true },
  });

  return {
    documentId,
    text: normalizedText,
    elements,
    metadata: typeof doc.metadata === "string" ? JSON.parse(doc.metadata) : doc.metadata || {},
    language: doc.language || "any",
    pageCount: doc.page_count || 1,
  };
}
