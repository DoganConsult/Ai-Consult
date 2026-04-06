/**
 * DOS Contract Catalog Service
 *
 * In-memory registry for all platform and DAuth contracts.
 * Supports registration, versioning, history tracking, backward compatibility
 * validation, and deprecation with Law 8 compliance (death date required).
 *
 * Law 1: One canonical catalog for contract metadata.
 * Law 8: Deprecation requires removal date, replacement, and owner.
 * Law 9: Organized by concern (contracts/).
 */

/** Status of a contract in the catalog. */
export type ContractStatus = 'active' | 'deprecated' | 'removed';

/** Ownership layer classification for contracts. */
export type ContractOwner = 'dos' | 'dauth' | 'product' | 'module' | 'agent';

/** A single entry in the contract catalog. */
export interface ContractCatalogEntry {
  contractCode: string;
  name: string;
  description: string;
  owner: ContractOwner;
  version: number;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  /** Required when status is 'deprecated' — the contract replacing this one. */
  replacedBy?: string;
  /** Required when status is 'deprecated' — ISO date for removal (Law 8). */
  removalDate?: string;
  /** Semantic version range for backward compatibility checks. */
  minCompatibleVersion?: number;
}

/** Version history entry for audit trail. */
export interface ContractVersionEntry {
  contractCode: string;
  version: number;
  changedAt: string;
  changeType: 'created' | 'updated' | 'deprecated' | 'removed';
  changedBy: string;
  description: string;
}

/** Filters for listing contracts. */
export interface ContractFilters {
  owner?: ContractOwner;
  status?: ContractStatus;
  nameContains?: string;
  minVersion?: number;
}

/** In-memory contract catalog storage. */
const catalog = new Map<string, ContractCatalogEntry>();

/** In-memory version history storage. */
const versionHistory = new Map<string, ContractVersionEntry[]>();

/**
 * Register a new contract in the catalog or update an existing one.
 * Appends a version history entry for auditability.
 * Throws 'CONTRACT_ALREADY_EXISTS' if a contract with the same code exists
 * and the caller does not increment the version.
 */
export function registerContract(entry: ContractCatalogEntry): ContractCatalogEntry {
  const existing = catalog.get(entry.contractCode);

  if (existing && existing.version >= entry.version) {
    throw new Error('CONTRACT_VERSION_CONFLICT: new version must be greater than current version');
  }

  const now = new Date().toISOString();
  const registered: ContractCatalogEntry = {
    ...entry,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  catalog.set(entry.contractCode, registered);

  const historyEntry: ContractVersionEntry = {
    contractCode: entry.contractCode,
    version: entry.version,
    changedAt: now,
    changeType: existing ? 'updated' : 'created',
    changedBy: entry.owner,
    description: existing
      ? `Updated from v${existing.version} to v${entry.version}`
      : `Initial registration at v${entry.version}`,
  };

  const history = versionHistory.get(entry.contractCode) || [];
  history.push(historyEntry);
  versionHistory.set(entry.contractCode, history);

  return registered;
}

/**
 * Get a contract by its unique code.
 * Returns null if the contract is not registered.
 */
export function getContract(contractCode: string): ContractCatalogEntry | null {
  return catalog.get(contractCode) ?? null;
}

/**
 * List all contracts, optionally filtered by owner, status, name, or minimum version.
 */
export function listContracts(filters?: ContractFilters): ContractCatalogEntry[] {
  let entries = Array.from(catalog.values());

  if (filters?.owner) {
    entries = entries.filter((e) => e.owner === filters.owner);
  }
  if (filters?.status) {
    entries = entries.filter((e) => e.status === filters.status);
  }
  if (filters?.nameContains) {
    const search = filters.nameContains.toLowerCase();
    entries = entries.filter((e) => e.name.toLowerCase().includes(search));
  }
  if (filters?.minVersion !== undefined) {
    entries = entries.filter((e) => e.version >= filters.minVersion!);
  }

  return entries.sort((a, b) => a.contractCode.localeCompare(b.contractCode));
}

/**
 * Get all contracts owned by a specific layer or module.
 */
export function getContractsByOwner(owner: string): ContractCatalogEntry[] {
  return Array.from(catalog.values())
    .filter((e) => e.owner === owner)
    .sort((a, b) => a.contractCode.localeCompare(b.contractCode));
}

/**
 * Get the current version number for a contract.
 * Returns null if the contract is not registered.
 */
export function getContractVersion(contractCode: string): number | null {
  const entry = catalog.get(contractCode);
  return entry?.version ?? null;
}

/**
 * Get the full version history of a contract.
 * Returns an empty array if no history exists.
 */
export function getContractHistory(contractCode: string): ContractVersionEntry[] {
  return versionHistory.get(contractCode) ?? [];
}

/**
 * Validate whether a new version is backward compatible with the current contract.
 * A new version is compatible if it is strictly greater than the current version
 * and does not skip the minimum compatible version boundary.
 * Returns an object with `compatible` flag and a `reason` on failure.
 */
export function validateContractCompatibility(
  contractCode: string,
  newVersion: number,
): { compatible: boolean; reason: string } {
  const entry = catalog.get(contractCode);

  if (!entry) {
    return { compatible: true, reason: 'Contract not registered — no compatibility constraints' };
  }

  if (newVersion <= entry.version) {
    return {
      compatible: false,
      reason: `New version ${newVersion} must be greater than current version ${entry.version}`,
    };
  }

  if (entry.minCompatibleVersion !== undefined && newVersion < entry.minCompatibleVersion) {
    return {
      compatible: false,
      reason: `New version ${newVersion} is below minimum compatible version ${entry.minCompatibleVersion}`,
    };
  }

  if (entry.status === 'removed') {
    return {
      compatible: false,
      reason: `Contract '${contractCode}' has been removed and cannot be updated`,
    };
  }

  const versionJump = newVersion - entry.version;
  if (versionJump > 10) {
    return {
      compatible: false,
      reason: `Version jump of ${versionJump} exceeds maximum allowed increment of 10`,
    };
  }

  return { compatible: true, reason: 'Version is compatible' };
}

/**
 * Deprecate a contract with Law 8 compliance.
 * Requires a replacement contract code and a removal date.
 * Throws if the contract does not exist or if required deprecation fields are missing.
 */
export function deprecateContract(
  contractCode: string,
  replacedBy: string,
  removalDate: string,
): ContractCatalogEntry {
  const entry = catalog.get(contractCode);

  if (!entry) {
    throw new Error('CONTRACT_NOT_FOUND');
  }

  if (!replacedBy || !replacedBy.trim()) {
    throw new Error('LAW_8_VIOLATION: replacedBy is required for deprecation');
  }

  if (!removalDate || !removalDate.trim()) {
    throw new Error('LAW_8_VIOLATION: removalDate is required for deprecation');
  }

  const parsedDate = new Date(removalDate);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('LAW_8_VIOLATION: removalDate must be a valid ISO date');
  }

  if (parsedDate <= new Date()) {
    throw new Error('LAW_8_VIOLATION: removalDate must be in the future');
  }

  const now = new Date().toISOString();
  const deprecated: ContractCatalogEntry = {
    ...entry,
    status: 'deprecated',
    replacedBy,
    removalDate,
    updatedAt: now,
  };

  catalog.set(contractCode, deprecated);

  const history = versionHistory.get(contractCode) || [];
  history.push({
    contractCode,
    version: entry.version,
    changedAt: now,
    changeType: 'deprecated',
    changedBy: entry.owner,
    description: `Deprecated — replaced by '${replacedBy}', removal date: ${removalDate}`,
  });
  versionHistory.set(contractCode, history);

  return deprecated;
}
