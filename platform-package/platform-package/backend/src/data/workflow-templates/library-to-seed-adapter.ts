// @ts-nocheck
/**
 * Library-to-Seed Adapter
 *
 * Converts WorkflowTemplateLibraryEntry (rich library format) into
 * WorkflowTemplateSeed (DB insert format) for tenant provisioning.
 */

import type { WorkflowTemplateLibraryEntry } from './types';
import type { WorkflowTemplateSeed } from '../seed-workflow-templates';

/**
 * Convert a library entry into a seed-compatible object.
 * The library entry must have a templateCode set.
 */
export function libraryEntryToSeed(entry: WorkflowTemplateLibraryEntry): WorkflowTemplateSeed {
  if (!entry.templateCode) {
    throw new Error(`Cannot convert library entry '${entry.id}' to seed: missing templateCode`);
  }

  return {
    templateCode: entry.templateCode,
    name: entry.name,
    description: entry.description,
    definition: entry.definition,
    parametersSchema: entry.parametersSchema,
  };
}

/**
 * Convert multiple library entries to seeds, filtering out entries without templateCode.
 */
export function libraryEntriesToSeeds(entries: WorkflowTemplateLibraryEntry[]): WorkflowTemplateSeed[] {
  return entries
    .filter((e) => !!e.templateCode)
    .map(libraryEntryToSeed);
}
