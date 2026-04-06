/** Common database row types used across modules */

export interface BaseRow {
  id: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface AuditableRow extends BaseRow {
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: string;
  version: number;
}

export type DbJson = Record<string, unknown>;
export type DbJsonArray = unknown[];

/** Generic row returned from any database query */
export interface GenericRow {
  [key: string]: unknown;
}

/** Control-specific row shape */
export interface ControlRow extends BaseRow {
  code: string;
  title: string;
  description?: string;
  framework_id?: string;
  domain_id?: string;
  status?: string;
  priority?: string;
  [key: string]: unknown;
}
