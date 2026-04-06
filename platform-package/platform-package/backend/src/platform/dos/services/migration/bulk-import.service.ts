// @ts-nocheck
// ============================================
// Shahin — Bulk Import Service
// CSV/XLSX import for risks, controls, assets,
// vendors, policies, incidents
// ============================================

import * as ExcelJS from "exceljs";
import { safeQuery, tenantSchema } from "../../../../config/database";
import { toErrorMessage } from '../../../../utils/http-error.util';
import type { GenericRow } from '../../../../types/db-rows.types';

export interface ImportResult {
  entity: string;
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

const ENTITY_CONFIGS: Record<string, {
  table: string;
  requiredCols: string[];
  colMap: Record<string, string>;
  defaults: Record<string, any>;
}> = {
  risks: {
    table: "risks",
    requiredCols: ["title", "category"],
    colMap: {
      title: "title", description: "description", category: "category",
      likelihood: "likelihood", impact: "impact", severity: "severity",
      owner: "owner", status: "status", treatment: "treatment_plan",
    },
    defaults: { status: "open", likelihood: 3, impact: 3, severity: "medium" },
  },
  controls: {
    table: "ucf_controls",
    requiredCols: ["code", "title"],
    colMap: {
      code: "code", title: "title", description: "description",
      domain: "domain", owner: "owner", frequency: "frequency",
      status: "status", implementation_status: "implementation_status",
    },
    defaults: { status: "active", frequency: "monthly", implementation_status: "not_implemented" },
  },
  assets: {
    table: "assets",
    requiredCols: ["name"],
    colMap: {
      name: "name", type: "type", description: "description",
      criticality: "criticality", owner: "owner", department: "department",
      location: "location", ip_address: "ip_address", classification: "classification",
      status: "status",
    },
    defaults: { type: "server", criticality: "medium", status: "active", classification: "internal" },
  },
  vendors: {
    table: "vendors",
    requiredCols: ["name"],
    colMap: {
      name: "name", contact_name: "contact_name", contact_email: "contact_email",
      service_type: "service_type", risk_tier: "risk_tier",
      contract_start: "contract_start", contract_end: "contract_end",
      status: "status",
    },
    defaults: { status: "active", risk_tier: "medium" },
  },
  policies: {
    table: "policies",
    requiredCols: ["title"],
    colMap: {
      title: "title", description: "description", category: "category",
      owner: "owner", status: "status", version: "version",
    },
    defaults: { status: "draft", version: "1.0" },
  },
  incidents: {
    table: "incidents",
    requiredCols: ["title", "category"],
    colMap: {
      title: "title", description: "description", category: "category",
      severity: "severity", status: "status",
    },
    defaults: { status: "reported", severity: "medium" },
  },
};

/**
 * Parse an XLSX buffer into rows. Returns header row + data rows.
 */
async function parseExcel(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row, _rowNumber) => {
    const vals = (row.values as any[]).slice(1).map((v: GenericRow) => {
      if (v === null || v === undefined) return "";
      if (typeof v === "object" && v.text) return v.text;
      if (typeof v === "object" && v.result !== undefined) return String(v.result);
      return String(v).trim();
    });
    rows.push(vals);
  });
  return rows;
}

/**
 * Parse a CSV string into rows.
 */
function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const row: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        row.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    row.push(current.trim());
    return row;
  });
}

/**
 * Import data from a file buffer (CSV or XLSX) into the specified entity table.
 */
export async function bulkImport(
  tenantId: string,
  entityType: string,
  buffer: Buffer,
  mimeType: string,
  _userId: string
): Promise<ImportResult> {
  const config = ENTITY_CONFIGS[entityType];
  if (!config) {
    return { entity: entityType, total: 0, imported: 0, skipped: 0, errors: [{ row: 0, message: `Unsupported entity type: ${entityType}` }] };
  }

  // Parse file
  let rows: string[][];
  if (mimeType.includes("spreadsheet") || mimeType.includes("xlsx") || mimeType.includes("excel")) {
    rows = await parseExcel(buffer);
  } else {
    rows = parseCSV(buffer.toString("utf-8"));
  }

  if (rows.length < 2) {
    return { entity: entityType, total: 0, imported: 0, skipped: 0, errors: [{ row: 0, message: "File must have a header row and at least one data row" }] };
  }

  // Map headers
  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const dataRows = rows.slice(1);
  const schema = tenantSchema(tenantId);

  const result: ImportResult = { entity: entityType, total: dataRows.length, imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // 1-indexed + header

    try {
      // Build row object from headers
      const obj: Record<string, any> = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const dbCol = config.colMap[header];
        if (dbCol && row[j]) {
          obj[dbCol] = row[j];
        }
      }

      // Apply defaults for missing values
      for (const [key, val] of Object.entries(config.defaults)) {
        if (!obj[key]) obj[key] = val;
      }

      // Validate required columns
      const missing = config.requiredCols.filter((c) => !obj[config.colMap[c] || c]);
      if (missing.length > 0) {
        result.errors.push({ row: rowNum, message: `Missing required: ${missing.join(", ")}` });
        result.skipped++;
        continue;
      }

      // Insert
      const cols = Object.keys(obj);
      const placeholders = cols.map((_, idx) => `$${idx + 1}`);
      const values = cols.map((c) => obj[c]);

      await safeQuery(
        `INSERT INTO "${schema}".${config.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
        values
      );
      result.imported++;
    } catch (err: unknown) {
      result.errors.push({ row: rowNum, message: toErrorMessage(err).slice(0, 200) || "Unknown error" });
      result.skipped++;
    }
  }

  return result;
}

export function getSupportedEntities(): string[] {
  return Object.keys(ENTITY_CONFIGS);
}

export function getEntityTemplate(entityType: string): { headers: string[]; sampleRow: string[] } | null {
  const config = ENTITY_CONFIGS[entityType];
  if (!config) return null;
  const headers = Object.keys(config.colMap);
  const sampleRow = headers.map((h) => config.defaults[config.colMap[h]] || `sample_${h}`);
  return { headers, sampleRow };
}
