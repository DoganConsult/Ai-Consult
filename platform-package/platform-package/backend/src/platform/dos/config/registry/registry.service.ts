// @ts-nocheck
// ============================================
// Shahin — Regulatory Registry Service
// Hierarchical KSA regulatory data management
// Naming convention enforcement
// Cross-mapping and sector queries
// ============================================

import { emptyResult, safeQuery } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallowDefault, EC , catchHandler } from '../../../../utils/resilient-catch';

// === Naming Convention Validators ===

const REGULATOR_PATTERN = /^REG-KSA-[A-Z][A-Z0-9_]{1,20}$/;
const INSTRUMENT_PATTERN = /^INST-KSA-[A-Z][A-Z0-9_]+-[A-Z][A-Z0-9_]+$/;
const VERSION_PATTERN = /^VER-KSA-[A-Z][A-Z0-9_]+-[A-Z0-9._-]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRegulatorId(id: string): ValidationResult {
  if (REGULATOR_PATTERN.test(id)) return { valid: true };
  return { valid: false, error: `Regulator ID must match pattern REG-KSA-<ACRONYM> (got: ${id})` };
}

export function validateInstrumentId(id: string): ValidationResult {
  if (INSTRUMENT_PATTERN.test(id)) return { valid: true };
  return { valid: false, error: `Instrument ID must match pattern INST-KSA-<ACRONYM>-<SHORTNAME> (got: ${id})` };
}

export function validateVersionId(id: string): ValidationResult {
  if (VERSION_PATTERN.test(id)) return { valid: true };
  return { valid: false, error: `Version ID must match pattern VER-KSA-<SHORTNAME>-<VERSION> (got: ${id})` };
}

export function validateNamingConvention(
  entityType: "regulator" | "instrument" | "version",
  id: string
): ValidationResult {
  switch (entityType) {
    case "regulator": return validateRegulatorId(id);
    case "instrument": return validateInstrumentId(id);
    case "version": return validateVersionId(id);
    default: return { valid: false, error: `Unknown entity type: ${entityType}` };
  }
}

// === Regulator CRUD ===

export async function getRegulators(): Promise<GenericRow[]> {
  const result = await safeQuery(
    `SELECT * FROM regulators WHERE active = TRUE ORDER BY regulator_id`
  );
  return result.rows;
}

export async function getRegulatorById(regulatorId: string): Promise<GenericRow | null> {
  const result = await safeQuery(
    `SELECT * FROM regulators WHERE regulator_id = $1`,
    [regulatorId]
  );
  return getFirstRow(result) || null;
}

export async function createRegulator(data: {
  regulator_id: string;
  name_en: string;
  name_ar: string;
  acronym?: string;
  category?: string;
  website?: string;
  mandate_note?: string;
  sectors?: string[];
}): Promise<GenericRow | null> {
  const v = validateRegulatorId(data.regulator_id);
  if (!v.valid) throw new Error(v.error);

  const result = await safeQuery(
    `INSERT INTO regulators (regulator_id, name_en, name_ar, acronym, category, website, mandate_note, sectors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.regulator_id, data.name_en, data.name_ar,
      data.acronym || null, data.category || null,
      data.website || null, data.mandate_note || null,
      data.sectors || [],
    ]
  );
  return getFirstRow(result);
}

// === Instrument CRUD ===

export async function getInstruments(regulatorId?: string): Promise<GenericRow[]> {
  if (regulatorId) {
    const result = await safeQuery(
      `SELECT * FROM instruments WHERE regulator_id = $1 ORDER BY instrument_id`,
      [regulatorId]
    );
    return result.rows;
  }
  const result = await safeQuery(`SELECT * FROM instruments ORDER BY instrument_id`);
  return result.rows;
}

export async function getInstrumentById(instrumentId: string): Promise<GenericRow | null> {
  const result = await safeQuery(
    `SELECT * FROM instruments WHERE instrument_id = $1`,
    [instrumentId]
  );
  return getFirstRow(result) || null;
}

export async function createInstrument(data: {
  instrument_id: string;
  regulator_id: string;
  name_en: string;
  name_ar: string;
  type: string;
  version?: string;
  version_id?: string;
  publication_date?: string;
  effective_date?: string;
  status?: string;
  sectors?: string[];
  mandatory?: boolean;
  summary_en?: string;
  summary_ar?: string;
  tags?: string[];
}): Promise<GenericRow | null> {
  const v = validateInstrumentId(data.instrument_id);
  if (!v.valid) throw new Error(v.error);

  const result = await safeQuery(
    `INSERT INTO instruments
      (instrument_id, regulator_id, name_en, name_ar, type, version, version_id,
       publication_date, effective_date, status, sectors, mandatory, summary_en, summary_ar, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.instrument_id, data.regulator_id, data.name_en, data.name_ar,
      data.type, data.version || null, data.version_id || null,
      data.publication_date || null, data.effective_date || null,
      data.status || "active", data.sectors || [], data.mandatory || false,
      data.summary_en || null, data.summary_ar || null, data.tags || [],
    ]
  );
  return getFirstRow(result);
}

// === Instrument Structure (hierarchy) ===

export async function getInstrumentStructure(instrumentId: string): Promise<GenericRow[]> {
  const result = await safeQuery(
    `SELECT * FROM instrument_structure WHERE instrument_id = $1 ORDER BY sort_order, node_id`,
    [instrumentId]
  );
  return result.rows;
}

export async function getFrameworkHierarchy(instrumentId: string): Promise<GenericRow | null> {
  const nodes = await getInstrumentStructure(instrumentId);
  const instrument = await getInstrumentById(instrumentId);

  // Build tree from flat list
  const nodeMap = new Map<string, GenericRow & { children: GenericRow[] }>();
  const roots: Array<GenericRow & { children: GenericRow[] }> = [];

  for (const node of nodes) {
    nodeMap.set(node.node_id, { ...node, children: [] });
  }

  for (const node of nodes) {
    const treeNode = nodeMap.get(node.node_id)! as string;
    if (node.parent_node_id && nodeMap.has(node.parent_node_id)) {
      nodeMap.get(node.parent_node_id)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return {
    instrument,
    tree: roots,
    totalNodes: nodes.length,
    levels: {
      chapters: nodes.filter((n: GenericRow) => n.level === 1).length,
      domains: nodes.filter((n: GenericRow) => n.level === 2).length,
      subdomains: nodes.filter((n: GenericRow) => n.level === 3).length,
      controls: nodes.filter((n: GenericRow) => n.level === 4).length,
      requirements: nodes.filter((n: GenericRow) => n.level === 5).length,
    },
  };
}

export async function createStructureNode(data: {
  node_id: string;
  instrument_id: string;
  parent_node_id?: string;
  level: number;
  code: string;
  title_en: string;
  title_ar: string;
  description_en?: string;
  description_ar?: string;
  priority?: string;
  automatable?: boolean;
  evidence_types?: string[];
  sort_order?: number;
}): Promise<GenericRow | null> {
  const result = await safeQuery(
    `INSERT INTO instrument_structure
      (node_id, instrument_id, parent_node_id, level, code, title_en, title_ar,
       description_en, description_ar, priority, automatable, evidence_types, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.node_id, data.instrument_id, data.parent_node_id || null,
      data.level, data.code, data.title_en, data.title_ar,
      data.description_en || null, data.description_ar || null,
      data.priority || null, data.automatable || false,
      data.evidence_types || [], data.sort_order || 0,
    ]
  );
  return getFirstRow(result);
}

// === Cross-Mappings ===

export async function getCrossMappings(nodeId: string): Promise<GenericRow[]> {
  const result = await safeQuery(
    `SELECT cm.*, 
       s.title_en as source_title_en, s.title_ar as source_title_ar, s.code as source_code,
       t.title_en as target_title_en, t.title_ar as target_title_ar, t.code as target_code
     FROM cross_mappings cm
     JOIN instrument_structure s ON cm.source_node_id = s.node_id
     JOIN instrument_structure t ON cm.target_node_id = t.node_id
     WHERE cm.source_node_id = $1 OR cm.target_node_id = $1
     ORDER BY cm.confidence DESC`,
    [nodeId]
  );
  return result.rows;
}

export async function createCrossMapping(data: {
  source_node_id: string;
  target_node_id: string;
  relationship?: string;
  confidence?: number;
  rationale?: string;
}): Promise<GenericRow | null> {
  const result = await safeQuery(
    `INSERT INTO cross_mappings (source_node_id, target_node_id, relationship, confidence, rationale)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.source_node_id, data.target_node_id,
      data.relationship || "equivalent",
      data.confidence ?? 1.0,
      data.rationale || null,
    ]
  );
  return getFirstRow(result);
}

// === Sector Queries ===

export async function getSectors(): Promise<GenericRow[]> {
  const result = await safeQuery(`SELECT * FROM sectors ORDER BY sector_id`);
  return result.rows;
}

export async function getSectorById(sectorId: string): Promise<GenericRow | null> {
  const result = await safeQuery(
    `SELECT * FROM sectors WHERE sector_id = $1`,
    [sectorId]
  );
  return getFirstRow(result) || null;
}

export async function createSector(data: {
  sector_id: string;
  name_en: string;
  name_ar: string;
  parent_sector_id?: string;
  applicable_regulators?: string[];
  applicable_frameworks?: string[];
}): Promise<GenericRow | null> {
  const result = await safeQuery(
    `INSERT INTO sectors (sector_id, name_en, name_ar, parent_sector_id, applicable_regulators, applicable_frameworks)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.sector_id, data.name_en, data.name_ar,
      data.parent_sector_id || null,
      data.applicable_regulators || [],
      data.applicable_frameworks || [],
    ]
  );

  // Populate junction tables (triggers will keep arrays in sync going forward)
  for (const regId of (data.applicable_regulators || [])) {
    await safeQuery(
      `INSERT INTO sector_regulator (sector_id, regulator_id, applicability)
       VALUES ($1, $2, 'mandatory') ON CONFLICT (sector_id, regulator_id) DO UPDATE SET
         applicability = EXCLUDED.applicability
       WHERE (sector_regulator.applicability) IS DISTINCT FROM (EXCLUDED.applicability)`,
      [data.sector_id, regId]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
  for (const fwAlias of (data.applicable_frameworks || [])) {
    const resolved = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ framework_code: fwAlias }]), safeQuery(
      `SELECT COALESCE(
         (SELECT framework_code FROM framework_alias WHERE alias_code = $1), $1
       ) AS framework_code`,
      [fwAlias]
    ), { operation: 'fallback query' });
    await safeQuery(
      `INSERT INTO sector_framework (sector_id, framework_code, applicability, source)
       VALUES ($1, $2, 'mandatory', 'api') ON CONFLICT (sector_id, framework_code) DO UPDATE SET
         applicability = EXCLUDED.applicability, source = EXCLUDED.source
       WHERE (sector_framework.applicability, sector_framework.source) IS DISTINCT FROM (EXCLUDED.applicability, EXCLUDED.source)`,
      [data.sector_id, getFirstRow(resolved)?.framework_code]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  return getFirstRow(result);
}

/** Get all frameworks applicable to a specific sector */
export async function getFrameworksForSector(sectorId: string): Promise<GenericRow[]> {
  const sector = await getSectorById(sectorId);
  if (!sector) return [];

  const frameworkIds = sector.applicable_frameworks || [];
  if (frameworkIds.length === 0) return [];

  const result = await safeQuery(
    `SELECT * FROM instruments WHERE instrument_id = ANY($1) ORDER BY instrument_id`,
    [frameworkIds]
  );
  return result.rows;
}

/** Get consolidated compliance scope for multiple sectors (union) */
export async function getApplicableRegulations(sectorIds: string[]): Promise<{
  regulators: GenericRow[];
  frameworks: GenericRow[];
  sectors: GenericRow[];
}> {
  if (sectorIds.length === 0) return { regulators: [], frameworks: [], sectors: [] };

  // Get all sectors
  const sectorResult = await safeQuery(
    `SELECT * FROM sectors WHERE sector_id = ANY($1)`,
    [sectorIds]
  );
  const sectors = sectorResult.rows;

  // Collect unique regulator and framework IDs (union)
  const regulatorIds = new Set<string>();
  const frameworkIds = new Set<string>();

  for (const sector of sectors) {
    for (const rId of (sector.applicable_regulators || [])) regulatorIds.add(rId);
    for (const fId of (sector.applicable_frameworks || [])) frameworkIds.add(fId);
  }

  // Fetch regulators
  let regulators: GenericRow[] = [];
  if (regulatorIds.size > 0) {
    const regResult = await safeQuery(
      `SELECT * FROM regulators WHERE regulator_id = ANY($1) ORDER BY regulator_id`,
      [Array.from(regulatorIds)]
    );
    regulators = regResult.rows;
  }

  // Fetch frameworks
  let frameworks: GenericRow[] = [];
  if (frameworkIds.size > 0) {
    const fwResult = await safeQuery(
      `SELECT * FROM instruments WHERE instrument_id = ANY($1) ORDER BY instrument_id`,
      [Array.from(frameworkIds)]
    );
    frameworks = fwResult.rows;
  }

  return { regulators, frameworks, sectors };
}