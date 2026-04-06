/**
 * Command Palette — Core command registry, search, usage tracking, and favorites.
 *
 * Provides the command palette infrastructure for the platform shell:
 * - Static command registry with category, role, and permission metadata
 * - Fuzzy search with bilingual support (en/ar)
 * - Usage tracking with frequency-weighted sorting
 * - Per-user favorites with persistent storage
 *
 * @module DOS/Shell/CommandPalette
 */

import { safeQuery, tenantSchema } from '../../../../../config/database';

// ── Types ───────────────────────────────────────────────────

export type CommandCategory =
  | 'navigation'
  | 'action'
  | 'search'
  | 'admin'
  | 'workflow'
  | 'report'
  | 'ai'
  | 'settings';

export interface Command {
  id: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: CommandCategory;
  icon: string;
  route?: string;
  action?: string;
  shortcut?: string;
  requiredPermission?: string;
  requiredRoles: string[];
  moduleCode?: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface CommandHistory {
  commandId: string;
  usageCount: number;
  lastUsedAt: string;
}

export type MatchType = 'exact' | 'prefix' | 'fuzzy' | 'contains';

export interface CommandSuggestion {
  command: Command;
  matchType: MatchType;
  score: number;
  displayLabel: string;
}

export interface UserFavorite {
  commandId: string;
  addedAt: string;
}

// ── Static Command Registry ─────────────────────────────────

/**
 * Platform-wide command registry. Each command has bilingual labels,
 * category, permission gates, and optional route/action bindings.
 */
export const COMMAND_REGISTRY: Command[] = [
  // Navigation commands
  { id: 'nav:dashboard',      labelEn: 'Go to Dashboard',        labelAr: 'الذهاب إلى لوحة المعلومات',  descriptionEn: 'Navigate to main dashboard',     descriptionAr: 'الانتقال إلى لوحة المعلومات الرئيسية', category: 'navigation', icon: 'dashboard',       route: '/dashboard',           requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], sortOrder: 1, isEnabled: true },
  { id: 'nav:risks',          labelEn: 'Go to Risk Register',    labelAr: 'الذهاب إلى سجل المخاطر',     descriptionEn: 'Navigate to risk register',       descriptionAr: 'الانتقال إلى سجل المخاطر',             category: 'navigation', icon: 'shield',          route: '/risks',               requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'risk', sortOrder: 2, isEnabled: true },
  { id: 'nav:compliance',     labelEn: 'Go to Compliance',       labelAr: 'الذهاب إلى الامتثال',         descriptionEn: 'Navigate to compliance hub',      descriptionAr: 'الانتقال إلى مركز الامتثال',            category: 'navigation', icon: 'check-circle',    route: '/compliance',          requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'compliance', sortOrder: 3, isEnabled: true },
  { id: 'nav:controls',       labelEn: 'Go to Controls',         labelAr: 'الذهاب إلى الضوابط',          descriptionEn: 'Navigate to controls library',    descriptionAr: 'الانتقال إلى مكتبة الضوابط',            category: 'navigation', icon: 'lock',            route: '/controls',            requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'controls', sortOrder: 4, isEnabled: true },
  { id: 'nav:evidence',       labelEn: 'Go to Evidence',         labelAr: 'الذهاب إلى الأدلة',           descriptionEn: 'Navigate to evidence vault',      descriptionAr: 'الانتقال إلى خزنة الأدلة',              category: 'navigation', icon: 'file-check',      route: '/evidence',            requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'evidence', sortOrder: 5, isEnabled: true },
  { id: 'nav:incidents',      labelEn: 'Go to Incidents',        labelAr: 'الذهاب إلى الحوادث',          descriptionEn: 'Navigate to incident center',     descriptionAr: 'الانتقال إلى مركز الحوادث',             category: 'navigation', icon: 'alert-triangle',  route: '/incidents',           requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'incident', sortOrder: 6, isEnabled: true },
  { id: 'nav:vendors',        labelEn: 'Go to Vendors',          labelAr: 'الذهاب إلى الموردين',         descriptionEn: 'Navigate to vendor management',   descriptionAr: 'الانتقال إلى إدارة الموردين',           category: 'navigation', icon: 'users',           route: '/vendors',             requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'vendor', sortOrder: 7, isEnabled: true },
  { id: 'nav:audit',          labelEn: 'Go to Audit',            labelAr: 'الذهاب إلى التدقيق',          descriptionEn: 'Navigate to audit center',        descriptionAr: 'الانتقال إلى مركز التدقيق',             category: 'navigation', icon: 'clipboard',       route: '/audit',               requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'audit', sortOrder: 8, isEnabled: true },
  { id: 'nav:policies',       labelEn: 'Go to Policies',         labelAr: 'الذهاب إلى السياسات',         descriptionEn: 'Navigate to policy library',      descriptionAr: 'الانتقال إلى مكتبة السياسات',           category: 'navigation', icon: 'book',            route: '/policies',            requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'policy', sortOrder: 9, isEnabled: true },
  { id: 'nav:workflows',      labelEn: 'Go to Workflows',        labelAr: 'الذهاب إلى سير العمل',        descriptionEn: 'Navigate to workflow center',     descriptionAr: 'الانتقال إلى مركز سير العمل',           category: 'navigation', icon: 'git-branch',      route: '/workflows',           requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'workflow', sortOrder: 10, isEnabled: true },
  { id: 'nav:reports',        labelEn: 'Go to Reports',          labelAr: 'الذهاب إلى التقارير',         descriptionEn: 'Navigate to reporting center',    descriptionAr: 'الانتقال إلى مركز التقارير',            category: 'navigation', icon: 'bar-chart',       route: '/reports',             requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'reporting', sortOrder: 11, isEnabled: true },
  { id: 'nav:settings',       labelEn: 'Go to Settings',         labelAr: 'الذهاب إلى الإعدادات',        descriptionEn: 'Navigate to tenant settings',     descriptionAr: 'الانتقال إلى إعدادات المنشأة',          category: 'navigation', icon: 'settings',        route: '/settings',            requiredRoles: ['operator', 'module_lead', 'executive_owner'], sortOrder: 12, isEnabled: true },

  // Action commands
  { id: 'act:create-risk',    labelEn: 'Create New Risk',        labelAr: 'إنشاء خطر جديد',              descriptionEn: 'Open new risk creation form',     descriptionAr: 'فتح نموذج إنشاء خطر جديد',             category: 'action',     icon: 'plus-circle',     route: '/risks/new',           requiredRoles: ['contributor', 'operator', 'module_lead', 'executive_owner'], requiredPermission: 'risk.risks.write', moduleCode: 'risk', sortOrder: 20, isEnabled: true },
  { id: 'act:create-incident',labelEn: 'Report Incident',        labelAr: 'الإبلاغ عن حادثة',            descriptionEn: 'Report a new incident',            descriptionAr: 'الإبلاغ عن حادثة جديدة',               category: 'action',     icon: 'alert-circle',    route: '/incidents/new',       requiredRoles: ['contributor', 'operator', 'module_lead', 'executive_owner'], requiredPermission: 'incident.incidents.write', moduleCode: 'incident', sortOrder: 21, isEnabled: true },
  { id: 'act:create-finding', labelEn: 'Log Finding',            labelAr: 'تسجيل ملاحظة',                descriptionEn: 'Log an audit finding',             descriptionAr: 'تسجيل ملاحظة تدقيق',                   category: 'action',     icon: 'search',          route: '/audit/findings/new',  requiredRoles: ['contributor', 'operator', 'module_lead', 'executive_owner'], requiredPermission: 'audit.findings.write', moduleCode: 'audit', sortOrder: 22, isEnabled: true },
  { id: 'act:upload-evidence',labelEn: 'Upload Evidence',        labelAr: 'رفع دليل',                    descriptionEn: 'Upload evidence artifact',         descriptionAr: 'رفع مستند دليل',                       category: 'action',     icon: 'upload',          route: '/evidence/upload',     requiredRoles: ['contributor', 'operator', 'module_lead', 'executive_owner'], requiredPermission: 'evidence.evidence.write', moduleCode: 'evidence', sortOrder: 23, isEnabled: true },

  // Workflow commands
  { id: 'wf:my-tasks',        labelEn: 'My Tasks',               labelAr: 'مهامي',                       descriptionEn: 'View your assigned tasks',         descriptionAr: 'عرض المهام المسندة إليك',               category: 'workflow',   icon: 'check-square',    route: '/workflow-profile/my-tasks', requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'workflow', sortOrder: 30, isEnabled: true },
  { id: 'wf:my-approvals',    labelEn: 'My Approvals',           labelAr: 'موافقاتي',                    descriptionEn: 'View pending approvals',           descriptionAr: 'عرض الموافقات المعلقة',                 category: 'workflow',   icon: 'thumbs-up',       route: '/workflow-profile/my-approvals', requiredRoles: ['approver', 'module_lead', 'executive_owner'], moduleCode: 'workflow', sortOrder: 31, isEnabled: true },

  // Search commands
  { id: 'search:global',      labelEn: 'Global Search',          labelAr: 'بحث شامل',                    descriptionEn: 'Search across all modules',        descriptionAr: 'البحث في جميع الوحدات',                 category: 'search',     icon: 'search',          action: 'openGlobalSearch',    requiredRoles: ['viewer', 'contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], shortcut: 'Ctrl+K', sortOrder: 40, isEnabled: true },

  // AI commands
  { id: 'ai:copilot',         labelEn: 'Open AI Copilot',        labelAr: 'فتح المساعد الذكي',           descriptionEn: 'Launch the AI copilot assistant',  descriptionAr: 'تشغيل مساعد الذكاء الاصطناعي',         category: 'ai',         icon: 'cpu',             action: 'openCopilot',         requiredRoles: ['contributor', 'operator', 'approver', 'module_lead', 'executive_owner'], moduleCode: 'ai', sortOrder: 50, isEnabled: true },

  // Admin commands
  { id: 'admin:users',        labelEn: 'Manage Users',           labelAr: 'إدارة المستخدمين',            descriptionEn: 'Open user management',             descriptionAr: 'فتح إدارة المستخدمين',                 category: 'admin',      icon: 'users',           route: '/settings/users',      requiredRoles: ['module_lead', 'executive_owner'], requiredPermission: 'foundation.users.manage', sortOrder: 60, isEnabled: true },
  { id: 'admin:modules',      labelEn: 'Module Configuration',   labelAr: 'إعدادات الوحدات',             descriptionEn: 'Configure enabled modules',        descriptionAr: 'إعداد الوحدات المفعّلة',                category: 'admin',      icon: 'package',         route: '/settings/modules',    requiredRoles: ['executive_owner'], requiredPermission: 'admin.modules.configure', sortOrder: 61, isEnabled: true },
];

// ── Label Helpers ────────────────────────────────────────────

/**
 * Returns the display label for a command in the specified language.
 */
export function getCommandLabel(command: Command, language: 'en' | 'ar' = 'en'): string {
  return language === 'ar' && command.labelAr ? command.labelAr : command.labelEn;
}

// ── Filtering ────────────────────────────────────────────────

/**
 * Returns commands by category.
 */
export function getCommandsByCategory(commands: Command[], category: CommandCategory): Command[] {
  return commands.filter(c => c.category === category && c.isEnabled);
}

/**
 * Returns a command by its ID, or undefined if not found.
 */
export function getCommandById(commands: Command[], commandId: string): Command | undefined {
  return commands.find(c => c.id === commandId);
}

/**
 * Filters commands by the user's role. A command is included if the
 * user's role appears in the command's requiredRoles list.
 */
export function filterCommandsByPermission(commands: Command[], userRole: string): Command[] {
  return commands.filter(c => c.isEnabled && c.requiredRoles.includes(userRole));
}

/**
 * Returns commands that match a specific role (alias for filterCommandsByPermission).
 */
export function getCommandsForRole(commands: Command[], role: string): Command[] {
  return filterCommandsByPermission(commands, role);
}

// ── Fuzzy Search ─────────────────────────────────────────────

/**
 * Fuzzy-matches a query against a command's label. Returns null if no match,
 * or a MatchType and score (0-100, higher = better).
 */
export function fuzzyMatchCommand(
  query: string,
  command: Command,
  language: 'en' | 'ar' = 'en',
): { matchType: MatchType; score: number } | null {
  const label = getCommandLabel(command, language).toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return { matchType: 'exact', score: 100 };

  // Exact match
  if (label === q) return { matchType: 'exact', score: 100 };

  // Prefix match
  if (label.startsWith(q)) return { matchType: 'prefix', score: 90 };

  // Contains match
  if (label.includes(q)) return { matchType: 'contains', score: 70 };

  // Fuzzy match: check if all query characters appear in order
  let qi = 0;
  for (let li = 0; li < label.length && qi < q.length; li++) {
    if (label[li] === q[qi]) qi++;
  }
  if (qi === q.length) {
    // Score based on how compact the match is
    const density = q.length / label.length;
    return { matchType: 'fuzzy', score: Math.round(30 + density * 30) };
  }

  // Also check description and ID
  const desc = (language === 'ar' ? command.descriptionAr : command.descriptionEn).toLowerCase();
  if (desc.includes(q)) return { matchType: 'contains', score: 40 };
  if (command.id.includes(q)) return { matchType: 'contains', score: 35 };

  return null;
}

/**
 * Searches commands by a query string, returning scored suggestions.
 */
export function searchCommands(
  query: string,
  commands: Command[],
  language: 'en' | 'ar' = 'en',
): CommandSuggestion[] {
  if (!query.trim()) {
    return commands
      .filter(c => c.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(c => ({
        command: c,
        matchType: 'exact' as MatchType,
        score: 100,
        displayLabel: getCommandLabel(c, language),
      }));
  }

  const results: CommandSuggestion[] = [];
  for (const cmd of commands) {
    if (!cmd.isEnabled) continue;
    const match = fuzzyMatchCommand(query, cmd, language);
    if (match) {
      results.push({
        command: cmd,
        matchType: match.matchType,
        score: match.score,
        displayLabel: getCommandLabel(cmd, language),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Sorts command suggestions by relevance, boosting commands that have
 * been used frequently by the current user.
 */
export function sortCommandsByRelevance(
  suggestions: CommandSuggestion[],
  history: CommandHistory[],
): CommandSuggestion[] {
  const usageMap = new Map(history.map(h => [h.commandId, h.usageCount]));
  return [...suggestions].sort((a, b) => {
    const aBoost = (usageMap.get(a.command.id) || 0) * 2;
    const bBoost = (usageMap.get(b.command.id) || 0) * 2;
    return (b.score + bBoost) - (a.score + aBoost);
  });
}

// ── In-Memory Usage Tracking ─────────────────────────────────

const _memoryUsage = new Map<string, CommandHistory>();

/**
 * Records a command usage in-memory (for session tracking).
 */
export function recordCommandUsageInMemory(userId: string, commandId: string): void {
  const key = `${userId}:${commandId}`;
  const existing = _memoryUsage.get(key);
  if (existing) {
    existing.usageCount++;
    existing.lastUsedAt = new Date().toISOString();
  } else {
    _memoryUsage.set(key, {
      commandId,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    });
  }
}

/**
 * Gets the most recent commands from in-memory history for a user.
 */
export function getRecentFromHistory(userId: string, limit = 10): CommandHistory[] {
  const entries: CommandHistory[] = [];
  for (const [key, entry] of _memoryUsage) {
    if (key.startsWith(`${userId}:`)) entries.push(entry);
  }
  return entries
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, limit);
}

/**
 * Gets the most frequently used commands from in-memory for a user.
 */
export function getMostFrequent(userId: string, limit = 10): CommandHistory[] {
  const entries: CommandHistory[] = [];
  for (const [key, entry] of _memoryUsage) {
    if (key.startsWith(`${userId}:`)) entries.push(entry);
  }
  return entries
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Sorts suggestions with frequency weighting from command history.
 */
export function sortWithFrequencyWeighting(
  suggestions: CommandSuggestion[],
  history: CommandHistory[],
): CommandSuggestion[] {
  return sortCommandsByRelevance(suggestions, history);
}

// ── In-Memory Favorites ──────────────────────────────────────

const _memoryFavorites = new Map<string, Set<string>>();

/**
 * Checks if a command is favorited in-memory for a user.
 */
export function isFavorite(userId: string, commandId: string): boolean {
  return _memoryFavorites.get(userId)?.has(commandId) ?? false;
}

/**
 * Toggles a command's favorite status in-memory. Returns new state.
 */
export function toggleFavoriteInMemory(userId: string, commandId: string): boolean {
  let userFavs = _memoryFavorites.get(userId);
  if (!userFavs) {
    userFavs = new Set();
    _memoryFavorites.set(userId, userFavs);
  }
  if (userFavs.has(commandId)) {
    userFavs.delete(commandId);
    return false;
  }
  userFavs.add(commandId);
  return true;
}

/**
 * Gets favorite commands, resolved to full Command objects.
 */
export function getFavoriteCommands(favorites: UserFavorite[], commands: Command[]): Command[] {
  const favIds = new Set(favorites.map(f => f.commandId));
  return commands.filter(c => favIds.has(c.id) && c.isEnabled);
}

// ── Persistent DB Storage ────────────────────────────────────

/**
 * Records a command usage in the database for persistent tracking.
 */
export async function recordCommandUsage(
  tenantId: string,
  userId: string,
  commandId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".command_palette_usage
         (user_id, command_id, usage_count, last_used_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (user_id, command_id) DO UPDATE
       SET usage_count = command_palette_usage.usage_count + 1,
           last_used_at = NOW()`,
      [userId, commandId],
    );
  } catch {
    // Table may not exist — track in memory as fallback
    recordCommandUsageInMemory(userId, commandId);
  }
}

/**
 * Gets recent commands for a user from persistent storage.
 */
export async function getRecentCommands(
  tenantId: string,
  userId: string,
  limit = 10,
): Promise<CommandHistory[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT command_id, usage_count, last_used_at
       FROM "${schema}".command_palette_usage
       WHERE user_id = $1
       ORDER BY last_used_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return rows.map((r: any) => ({
      commandId: r.command_id as string,
      usageCount: parseInt(r.usage_count, 10) || 0,
      lastUsedAt: r.last_used_at as string,
    }));
  } catch {
    // Fallback to in-memory
    return getRecentFromHistory(userId, limit);
  }
}

/**
 * Gets full command history for a user (all tracked commands).
 */
export async function getCommandHistory(
  tenantId: string,
  userId: string,
): Promise<CommandHistory[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT command_id, usage_count, last_used_at
       FROM "${schema}".command_palette_usage
       WHERE user_id = $1
       ORDER BY usage_count DESC`,
      [userId],
    );
    return rows.map((r: any) => ({
      commandId: r.command_id as string,
      usageCount: parseInt(r.usage_count, 10) || 0,
      lastUsedAt: r.last_used_at as string,
    }));
  } catch {
    const entries: CommandHistory[] = [];
    for (const [key, entry] of _memoryUsage) {
      if (key.startsWith(`${userId}:`)) entries.push(entry);
    }
    return entries.sort((a, b) => b.usageCount - a.usageCount);
  }
}

/**
 * Gets user favorites from persistent storage.
 */
export async function getUserFavorites(
  tenantId: string,
  userId: string,
): Promise<UserFavorite[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT command_id, created_at AS added_at
       FROM "${schema}".command_palette_favorites
       WHERE user_id = $1
       ORDER BY created_at`,
      [userId],
    );
    return rows.map((r: any) => ({
      commandId: r.command_id as string,
      addedAt: r.added_at as string,
    }));
  } catch {
    // Fallback to in-memory
    const favs = _memoryFavorites.get(userId);
    if (!favs) return [];
    return [...favs].map(id => ({ commandId: id, addedAt: new Date().toISOString() }));
  }
}

/**
 * Toggles a command favorite in persistent storage. Returns true if now favorited.
 */
export async function toggleFavorite(
  tenantId: string,
  userId: string,
  commandId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    // Check if already favorited
    const { rows } = await safeQuery(
      `SELECT 1 FROM "${schema}".command_palette_favorites
       WHERE user_id = $1 AND command_id = $2`,
      [userId, commandId],
    );

    if (rows.length > 0) {
      await safeQuery(
        `DELETE FROM "${schema}".command_palette_favorites
         WHERE user_id = $1 AND command_id = $2`,
        [userId, commandId],
      );
      return false;
    }

    await safeQuery(
      `INSERT INTO "${schema}".command_palette_favorites (user_id, command_id, created_at)
       VALUES ($1, $2, NOW())`,
      [userId, commandId],
    );
    return true;
  } catch {
    // Fallback to in-memory
    return toggleFavoriteInMemory(userId, commandId);
  }
}

// ── Dynamic Navigation → Command Palette Integration ─────────

/**
 * Merges dynamic navigation items from the composition engine
 * into the static COMMAND_REGISTRY for a unified command palette.
 *
 * This bridges navigation (DB-driven, role-filtered) with the
 * command palette (static + dynamic). Per Patch 10 §2.1:
 * "navigation items feed into command palette commands."
 */
export async function getUnifiedCommands(
  tenantId: string,
  _userId: string,
  roleCode: string,
  modules: string[],
): Promise<Command[]> {
  // Start with static commands filtered by role
  const staticCommands = filterCommandsByPermission(COMMAND_REGISTRY, roleCode);

  // Merge dynamic navigation items
  try {
    const { NavigationCacheService } = await import('../../navigation/navigation-cache.service');
    const cacheService = new NavigationCacheService();
    const paletteItems = await cacheService.getCommandPaletteItems({
      tenantId,
      roleCode,
      modules,
      productKey: (await import('../../../config/platform-identity')).getDefaultProductKey(),
      locale: 'en',
      includeSystemItems: false,
    });

    // Convert navigation items to Command format, avoiding duplicates
    const staticRoutes = new Set(staticCommands.filter(c => c.route).map(c => c.route));

    for (const navItem of paletteItems) {
      if (staticRoutes.has(navItem.route)) continue; // Already in static registry

      staticCommands.push({
        id: `nav:dynamic:${navItem.navKey}`,
        labelEn: `Go to ${navItem.labelEn}`,
        labelAr: navItem.labelAr ? `الذهاب إلى ${navItem.labelAr}` : '',
        descriptionEn: `Navigate to ${navItem.labelEn}`,
        descriptionAr: navItem.labelAr ? `الانتقال إلى ${navItem.labelAr}` : '',
        category: 'navigation',
        icon: navItem.icon ?? 'arrow-right',
        route: navItem.route,
        requiredRoles: [roleCode],
        moduleCode: navItem.moduleCode ?? undefined,
        sortOrder: 100 + (paletteItems.indexOf(navItem)),
        isEnabled: true,
      });
    }
  } catch {
    // Navigation composition engine not available — return static only
  }

  return staticCommands;
}

/**
 * Searches unified commands (static + dynamic navigation) with fuzzy matching.
 */
export async function searchUnifiedCommands(
  query: string,
  tenantId: string,
  userId: string,
  roleCode: string,
  modules: string[],
  language: 'en' | 'ar' = 'en',
): Promise<CommandSuggestion[]> {
  const commands = await getUnifiedCommands(tenantId, userId, roleCode, modules);
  return searchCommands(query, commands, language);
}
