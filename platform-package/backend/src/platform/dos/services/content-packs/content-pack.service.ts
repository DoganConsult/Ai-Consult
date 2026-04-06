// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Shahin — Content Pack Engine Service
// Manages installation, versioning, upgrade,
// rollback, and sector resolution of regulatory
// content packs.
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
// ============================================

import { safeQuery, getClient, tenantSchema } from "../../../../config/database";
import { KSA_SECTORS } from "../../../../data/ksa-sectors";
import type {
  ContentPackManifest,
  ContentPackInstallation,
  ValidationResult,
} from "../../../../types/grc-os.types";
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Manifest Validation (Req 1.3) ──────────────────────────────────────────

export function validateManifest(manifest: ContentPackManifest): ValidationResult {
  const errors: string[] = [];

  if (!manifest) {
    return { valid: false, errors: ["manifest is required"] };
  }
  if (!manifest.packId || typeof manifest.packId !== "string" || manifest.packId.trim() === "") {
    errors.push("packId is required");
  }
  if (!manifest.version || typeof manifest.version !== "string" || manifest.version.trim() === "") {
    errors.push("version is required");
  }
  if (!Array.isArray(manifest.frameworkRefs) || manifest.frameworkRefs.length === 0) {
    errors.push("frameworkRefs must be a non-empty array");
  }
  if (!manifest.artifacts) {
    errors.push("artifacts is required");
  } else {
    if (!Array.isArray(manifest.artifacts.controls)) {
      errors.push("artifacts.controls must be an array");
    }
    if (!Array.isArray(manifest.artifacts.mappings)) {
      errors.push("artifacts.mappings must be an array");
    }
    if (!Array.isArray(manifest.artifacts.testProcedures)) {
      errors.push("artifacts.testProcedures must be an array");
    }
    if (!Array.isArray(manifest.artifacts.evidenceTemplates)) {
      errors.push("artifacts.evidenceTemplates must be an array");
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Options for installPack. When skipMasterUpsert is true, the master content_packs table is not written (tenant path only). */
export interface InstallPackOptions {
  skipMasterUpsert?: boolean;
}

/** Options for upgradePack. When skipMasterUpsert is true, the master content_packs table is not written (tenant path only). */
export interface UpgradePackOptions {
  skipMasterUpsert?: boolean;
}

// ── Register Pack (platform-only: writes master content_packs only) ─────────

/**
 * Register a pack in the master content_packs table. Call only from platform-admin context.
 * Tenant install/upgrade must not write to content_packs; use installPack(..., { skipMasterUpsert: true }) instead.
 */
export async function registerPack(manifest: ContentPackManifest): Promise<void> {
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join(", ")}`);
  }
  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO content_packs (pack_id, version, framework_refs, manifest, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (pack_id) DO UPDATE SET
         version = EXCLUDED.version,
         framework_refs = EXCLUDED.framework_refs,
         manifest = EXCLUDED.manifest,
         metadata = EXCLUDED.metadata`,
      [
        manifest.packId,
        manifest.version,
        manifest.frameworkRefs,
        JSON.stringify(manifest),
        JSON.stringify(manifest.metadata),
      ]
    );
  } finally {
    client.release();
  }
}

// ── Install Pack (Req 1.1, 1.4, 1.6) ──────────────────────────────────────

export async function installPack(
  tenantId: string,
  manifest: ContentPackManifest,
  options: InstallPackOptions = {}
): Promise<ContentPackInstallation> {
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join(", ")}`);
  }

  const { skipMasterUpsert = false } = options;
  const schema = tenantSchema(tenantId);
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Store manifest in master content_packs table (upsert) — skip when tenant path (platform-only writes)
    if (!skipMasterUpsert) {
      await client.query(
        `INSERT INTO content_packs (pack_id, version, framework_refs, manifest, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (pack_id) DO UPDATE SET
           version = EXCLUDED.version,
           framework_refs = EXCLUDED.framework_refs,
           manifest = EXCLUDED.manifest,
           metadata = EXCLUDED.metadata`,
        [
          manifest.packId,
          manifest.version,
          manifest.frameworkRefs,
          JSON.stringify(manifest),
          JSON.stringify(manifest.metadata),
        ]
      );
    }

    // Insert controls into tenant schema
    for (const ctrl of manifest.artifacts.controls) {
      await client.query(
        `INSERT INTO ${schema}.ucf_controls
         (control_id, code, objective_en, objective_ar, activity_en, activity_ar,
          owner, frequency, evidence_requirements, test_steps, exception_rules, pack_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (control_id) DO UPDATE SET
           code = EXCLUDED.code, objective_en = EXCLUDED.objective_en, objective_ar = EXCLUDED.objective_ar,
           activity_en = EXCLUDED.activity_en, activity_ar = EXCLUDED.activity_ar,
           owner = EXCLUDED.owner, frequency = EXCLUDED.frequency
         WHERE (ucf_controls.code, ucf_controls.objective_en)
           IS DISTINCT FROM (EXCLUDED.code, EXCLUDED.objective_en)`,
        [
          ctrl.controlId, ctrl.code,
          ctrl.objectiveEn, ctrl.objectiveAr,
          ctrl.activityEn, ctrl.activityAr,
          ctrl.owner, ctrl.frequency,
          JSON.stringify(ctrl.evidenceRequirements),
          JSON.stringify(ctrl.testSteps),
          JSON.stringify(ctrl.exceptionRules),
          manifest.packId,
        ]
      );
    }

    // Insert crosswalk mappings
    for (const mapping of manifest.artifacts.mappings) {
      await client.query(
        `INSERT INTO ${schema}.crosswalk_mappings
         (source_control_id, target_requirement_id, relationship, confidence)
         VALUES ($1,$2,$3,$4)`,
        [
          mapping.sourceControlId,
          mapping.targetRequirementId,
          mapping.relationship,
          mapping.confidence,
        ]
      );
    }

    // Insert test procedures into evidence_catalog as procedure-type entries
    for (const proc of manifest.artifacts.testProcedures) {
      await client.query(
        `INSERT INTO ${schema}.evidence_catalog
         (control_id, evidence_type, source_system, frequency, naming_standard, retention_days)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          proc.controlId,
          "test_procedure",
          "content_pack",
          "quarterly",
          proc.procedureId,
          365,
        ]
      );
    }

    // Insert evidence templates
    for (const tmpl of manifest.artifacts.evidenceTemplates) {
      await client.query(
        `INSERT INTO ${schema}.evidence_catalog
         (control_id, evidence_type, source_system, frequency, naming_standard, retention_days)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tmpl.controlId,
          tmpl.evidenceType,
          "content_pack",
          "quarterly",
          tmpl.templateId,
          365,
        ]
      );
    }

    // Install role_pack if present
    if (manifest.role_pack?.roles?.length) {
      for (const role of manifest.role_pack.roles) {
        await client.query(
          `INSERT INTO ${schema}.roles (role_code, role_name_en, role_name_ar, home_route, is_active)
           VALUES ($1, $2, $3, $4, TRUE)
           ON CONFLICT (role_code) DO UPDATE SET role_name_en = $2, role_name_ar = $3, home_route = $4`,
          [role.code, role.name_en, role.name_ar || null, role.home_route || '/workspace-home']
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    }

    // Install dashboard_pack if present
    if (manifest.dashboard_pack?.layouts?.length) {
      for (const layout of manifest.dashboard_pack.layouts) {
        await client.query(
          `INSERT INTO ${schema}.dashboard_layouts (layout_code, name_en, name_ar, role_code, config)
           VALUES ($1, $2, $3, $4, $5::jsonb)
           ON CONFLICT (layout_code) DO UPDATE SET
             name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, config = EXCLUDED.config
           WHERE (dashboard_layouts.name_en, dashboard_layouts.config)
             IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.config)`,
          [layout.code, layout.name_en, layout.name_ar || null, layout.role_code || null, JSON.stringify(layout.config)]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    }

    // Install workflow_pack if present
    if (manifest.workflow_pack?.templates?.length) {
      for (const wf of manifest.workflow_pack.templates) {
        await client.query(
          `INSERT INTO ${schema}.workflow_templates (template_code, name_en, name_ar, trigger_type, steps, is_active)
           VALUES ($1, $2, $3, $4, $5::jsonb, TRUE)
           ON CONFLICT (template_code) DO UPDATE SET
             name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, steps = EXCLUDED.steps
           WHERE (workflow_templates.name_en, workflow_templates.steps)
             IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.steps)`,
          [wf.code, wf.name_en, wf.name_ar || null, wf.trigger_type || 'manual', JSON.stringify(wf.steps)]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    }

    // Record installation in tenant schema (Req 1.6)
    const installResult = await client.query(
      `INSERT INTO ${schema}.content_pack_installations
       (pack_id, version, status, installed_by)
       VALUES ($1, $2, 'active', $3)
       RETURNING *`,
      [manifest.packId, manifest.version, tenantId]
    );

    await client.query("COMMIT");

    const row = getFirstRow(installResult);
    return {
      tenantId,
      packId: row.pack_id,
      version: row.version,
      installedAt: row.installed_at,
      status: row.status,
    };
  } catch (err) {
    // Req 1.4 — rollback on failure
    await client.query("ROLLBACK");
    throw new Error(
      `Content pack installation failed for ${manifest.packId}: ${(err as Error).message}`
    );
  } finally {
    client.release();
  }
}


// ── Upgrade Pack (Req 1.2) ─────────────────────────────────────────────────

export async function upgradePack(
  tenantId: string,
  packId: string,
  newManifest: ContentPackManifest,
  options: UpgradePackOptions = {}
): Promise<ContentPackInstallation> {
  const validation = validateManifest(newManifest);
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join(", ")}`);
  }
  if (newManifest.packId !== packId) {
    throw new Error(`Manifest packId "${newManifest.packId}" does not match target "${packId}"`);
  }

  const { skipMasterUpsert = false } = options;
  const schema = tenantSchema(tenantId);
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Mark current active installation as superseded
    await client.query(
      `UPDATE ${schema}.content_pack_installations
       SET status = 'superseded'
       WHERE pack_id = $1 AND status = 'active'`,
      [packId]
    );

    // Update master content_packs — skip when tenant path (platform-only writes)
    if (!skipMasterUpsert) {
      await client.query(
        `INSERT INTO content_packs (pack_id, version, framework_refs, manifest, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (pack_id) DO UPDATE SET
           version = EXCLUDED.version,
           framework_refs = EXCLUDED.framework_refs,
           manifest = EXCLUDED.manifest,
           metadata = EXCLUDED.metadata`,
        [
          newManifest.packId,
          newManifest.version,
          newManifest.frameworkRefs,
          JSON.stringify(newManifest),
          JSON.stringify(newManifest.metadata),
        ]
      );
    }

    // Apply incremental control changes — preserve tenant customizations (Req 1.2)
    for (const ctrl of newManifest.artifacts.controls) {
      // Check if control already exists with tenant modifications
      const existing = await client.query(
        `SELECT owner, frequency FROM ${schema}.ucf_controls WHERE control_id = $1`,
        [ctrl.controlId]
      );

      if (existing.rows.length > 0) {
        // Preserve tenant-customized owner and frequency; update structural fields
        await client.query(
          `UPDATE ${schema}.ucf_controls SET
             code = $2,
             objective_en = $3, objective_ar = $4,
             activity_en = $5, activity_ar = $6,
             evidence_requirements = $7,
             test_steps = $8,
             exception_rules = $9,
             pack_id = $10,
             updated_at = NOW()
           WHERE control_id = $1`,
          [
            ctrl.controlId, ctrl.code,
            ctrl.objectiveEn, ctrl.objectiveAr,
            ctrl.activityEn, ctrl.activityAr,
            JSON.stringify(ctrl.evidenceRequirements),
            JSON.stringify(ctrl.testSteps),
            JSON.stringify(ctrl.exceptionRules),
            packId,
          ]
        );
      } else {
        // New control — insert with pack defaults
        await client.query(
          `INSERT INTO ${schema}.ucf_controls
           (control_id, code, objective_en, objective_ar, activity_en, activity_ar,
            owner, frequency, evidence_requirements, test_steps, exception_rules, pack_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            ctrl.controlId, ctrl.code,
            ctrl.objectiveEn, ctrl.objectiveAr,
            ctrl.activityEn, ctrl.activityAr,
            ctrl.owner, ctrl.frequency,
            JSON.stringify(ctrl.evidenceRequirements),
            JSON.stringify(ctrl.testSteps),
            JSON.stringify(ctrl.exceptionRules),
            packId,
          ]
        );
      }
    }

    // Replace mappings for this pack's controls
    const controlIds = newManifest.artifacts.controls.map((c: any) => c.controlId);
    if (controlIds.length > 0) {
      await client.query(
        `DELETE FROM ${schema}.crosswalk_mappings
         WHERE source_control_id = ANY($1)`,
        [controlIds]
      );
    }
    for (const mapping of newManifest.artifacts.mappings) {
      await client.query(
        `INSERT INTO ${schema}.crosswalk_mappings
         (source_control_id, target_requirement_id, relationship, confidence)
         VALUES ($1,$2,$3,$4)`,
        [
          mapping.sourceControlId,
          mapping.targetRequirementId,
          mapping.relationship,
          mapping.confidence,
        ]
      );
    }

    // Replace evidence catalog entries from this pack
    if (controlIds.length > 0) {
      await client.query(
        `DELETE FROM ${schema}.evidence_catalog
         WHERE control_id = ANY($1) AND source_system = 'content_pack'`,
        [controlIds]
      );
    }
    for (const proc of newManifest.artifacts.testProcedures) {
      await client.query(
        `INSERT INTO ${schema}.evidence_catalog
         (control_id, evidence_type, source_system, frequency, naming_standard, retention_days)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [proc.controlId, "test_procedure", "content_pack", "quarterly", proc.procedureId, 365]
      );
    }
    for (const tmpl of newManifest.artifacts.evidenceTemplates) {
      await client.query(
        `INSERT INTO ${schema}.evidence_catalog
         (control_id, evidence_type, source_system, frequency, naming_standard, retention_days)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tmpl.controlId, tmpl.evidenceType, "content_pack", "quarterly", tmpl.templateId, 365]
      );
    }

    // Record new installation
    const installResult = await client.query(
      `INSERT INTO ${schema}.content_pack_installations
       (pack_id, version, status, installed_by)
       VALUES ($1, $2, 'active', $3)
       RETURNING *`,
      [packId, newManifest.version, tenantId]
    );

    await client.query("COMMIT");

    const row = getFirstRow(installResult);
    return {
      tenantId,
      packId: row.pack_id,
      version: row.version,
      installedAt: row.installed_at,
      status: row.status,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(
      `Content pack upgrade failed for ${packId}: ${(err as Error).message}`
    );
  } finally {
    client.release();
  }
}

// ── Rollback Pack (Req 1.4, 1.6) ──────────────────────────────────────────

export async function rollbackPack(
  tenantId: string,
  packId: string,
  targetVersion: string
): Promise<ContentPackInstallation> {
  const schema = tenantSchema(tenantId);
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Find the target version's installation record
    const targetResult = await client.query(
      `SELECT * FROM ${schema}.content_pack_installations
       WHERE pack_id = $1 AND version = $2
       ORDER BY installed_at DESC LIMIT 1`,
      [packId, targetVersion]
    );
    if (targetResult.rows.length === 0) {
      throw new Error(`No installation found for ${packId} version ${targetVersion}`);
    }

    // Mark current active installation as rolled_back
    await client.query(
      `UPDATE ${schema}.content_pack_installations
       SET status = 'rolled_back'
       WHERE pack_id = $1 AND status = 'active'`,
      [packId]
    );

    // Retrieve the manifest for the target version from master
    const manifestResult = await client.query(
      `SELECT manifest FROM content_packs WHERE pack_id = $1`,
      [packId]
    );

    // Record rollback installation
    const installResult = await client.query(
      `INSERT INTO ${schema}.content_pack_installations
       (pack_id, version, status, installed_by)
       VALUES ($1, $2, 'active', $3)
       RETURNING *`,
      [packId, targetVersion, tenantId]
    );

    // If we have the manifest, re-apply the target version's controls
    if (manifestResult.rows.length > 0) {
      const manifest = getFirstRow(manifestResult)?.manifest as ContentPackManifest;

      // Remove current pack controls and re-insert from target manifest
      const controlIds = manifest.artifacts.controls.map((c: any) => c.controlId);
      if (controlIds.length > 0) {
        // Delete mappings and evidence catalog entries for these controls
        await client.query(
          `DELETE FROM ${schema}.crosswalk_mappings WHERE source_control_id = ANY($1)`,
          [controlIds]
        );
        await client.query(
          `DELETE FROM ${schema}.evidence_catalog
           WHERE control_id = ANY($1) AND source_system = 'content_pack'`,
          [controlIds]
        );
        await client.query(
          `DELETE FROM ${schema}.ucf_controls WHERE control_id = ANY($1)`,
          [controlIds]
        );
      }

      // Re-insert controls from target version
      for (const ctrl of manifest.artifacts.controls) {
        await client.query(
          `INSERT INTO ${schema}.ucf_controls
           (control_id, code, objective_en, objective_ar, activity_en, activity_ar,
            owner, frequency, evidence_requirements, test_steps, exception_rules, pack_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (control_id) DO UPDATE SET
             code = EXCLUDED.code, objective_en = EXCLUDED.objective_en, objective_ar = EXCLUDED.objective_ar,
             activity_en = EXCLUDED.activity_en, activity_ar = EXCLUDED.activity_ar,
             owner = EXCLUDED.owner, frequency = EXCLUDED.frequency
           WHERE (ucf_controls.code, ucf_controls.objective_en)
             IS DISTINCT FROM (EXCLUDED.code, EXCLUDED.objective_en)`,
          [
            ctrl.controlId, ctrl.code,
            ctrl.objectiveEn, ctrl.objectiveAr,
            ctrl.activityEn, ctrl.activityAr,
            ctrl.owner, ctrl.frequency,
            JSON.stringify(ctrl.evidenceRequirements),
            JSON.stringify(ctrl.testSteps),
            JSON.stringify(ctrl.exceptionRules),
            packId,
          ]
        );
      }
      for (const mapping of manifest.artifacts.mappings) {
        await client.query(
          `INSERT INTO ${schema}.crosswalk_mappings
           (source_control_id, target_requirement_id, relationship, confidence)
           VALUES ($1,$2,$3,$4)`,
          [mapping.sourceControlId, mapping.targetRequirementId, mapping.relationship, mapping.confidence]
        );
      }
      for (const proc of manifest.artifacts.testProcedures) {
        await client.query(
          `INSERT INTO ${schema}.evidence_catalog
           (control_id, evidence_type, source_system, frequency, naming_standard, retention_days)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [proc.controlId, "test_procedure", "content_pack", "quarterly", proc.procedureId, 365]
        );
      }
      for (const tmpl of manifest.artifacts.evidenceTemplates) {
        await client.query(
          `INSERT INTO ${schema}.evidence_catalog
           (control_id, evidence_type, source_system, frequency, naming_standard, retention_days)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [tmpl.controlId, tmpl.evidenceType, "content_pack", "quarterly", tmpl.templateId, 365]
        );
      }
    }

    await client.query("COMMIT");

    const row = getFirstRow(installResult);
    return {
      tenantId,
      packId: row.pack_id,
      version: row.version,
      installedAt: row.installed_at,
      status: row.status,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(
      `Content pack rollback failed for ${packId}: ${(err as Error).message}`
    );
  } finally {
    client.release();
  }
}


// ── Get Installed Packs (Req 1.6) ──────────────────────────────────────────

export async function getInstalledPacks(
  tenantId: string
): Promise<ContentPackInstallation[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM ${schema}.content_pack_installations ORDER BY installed_at DESC`
  );
  return result.rows.map((row: GenericRow) => ({
    tenantId,
    packId: row.pack_id,
    version: row.version,
    installedAt: row.installed_at,
    status: row.status,
  }));
}

// ── Sector-to-Pack Resolution (Req 1.5) ────────────────────────────────────

export async function resolvePacksForSectors(sectorIds: string[]): Promise<ContentPackManifest[]> {
  // Collect all unique framework IDs required by the given sectors
  const frameworkSet = new Set<string>();
  for (const sectorId of sectorIds) {
    const sector = KSA_SECTORS.find((s) => s.sectorId === sectorId);
    if (sector) {
      for (const fw of sector.applicableFrameworks) {
        frameworkSet.add(fw);
      }
    }
  }

  // Try to load real manifests from the content_packs table
  const manifests: ContentPackManifest[] = [];
  for (const frameworkId of frameworkSet) {
    try {
      const result = await safeQuery(
        `SELECT manifest FROM content_packs WHERE $1 = ANY(framework_refs) LIMIT 1`,
        [frameworkId]
      );
      if (result.rows.length > 0) {
        const raw = getFirstRow(result)?.manifest;
        const manifest: ContentPackManifest =
          typeof raw === "string" ? JSON.parse(raw) : raw;
        manifests.push(manifest);
        continue;
      }
    } catch {
      // DB query failed — fall through to generated stub
    }

    // Fallback: generate a minimal manifest so callers know which packs are needed
    manifests.push({
      packId: `PACK-${frameworkId}`,
      version: "1.0.0",
      frameworkRefs: [frameworkId],
      artifacts: {
        controls: [],
        mappings: [],
        testProcedures: [],
        evidenceTemplates: [],
      },
      metadata: {
        publisher: "dos-platform",
        publishedAt: new Date().toISOString(),
        changelog: "Auto-resolved from sector selection",
        minPlatformVersion: "1.0.0",
      },
    });
  }

  return manifests;
}

// ── Manifest Serialization (Req 1.7) ───────────────────────────────────────

export function serializeManifest(manifest: ContentPackManifest): string {
  return JSON.stringify(manifest);
}

export function deserializeManifest(json: string): ContentPackManifest {
  return JSON.parse(json) as ContentPackManifest;
}
