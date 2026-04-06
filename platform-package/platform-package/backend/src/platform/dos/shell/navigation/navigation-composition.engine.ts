// ============================================
// DOS Navigation — Composition Engine
// Central resolver: merges registry + overrides
// + role bindings, filters by modules/role/DAuth,
// builds hierarchical tree with section split.
// Patch 10 §2.1(A): Registry-driven composition.
// DOS-owned — Law 2.
// ============================================

import { query, emptyResult } from '../../../../config/database';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';
import type {
  NavigationCompositionContext,
  NavigationMenuItemDto,
  NavigationMenuResponseDto,
  NavigationBreadcrumbDto,
  NavigationCommandPaletteItemDto,
  NavigationSection,
} from './navigation.types';

export class NavigationCompositionEngine {
  // ------------------------------------------------------------------
  // Public: resolve full navigation tree for a given context
  // ------------------------------------------------------------------
  async resolve(ctx: NavigationCompositionContext): Promise<NavigationMenuResponseDto> {
    const schema = await this.resolveTenantSchema(ctx.tenantId);

    let rows: Record<string, any>[];
    try {
      rows = await this.loadMergedRows(schema, ctx.roleCode, ctx.productKey);
    } catch {
      return this.emptyResponse(ctx);
    }

    // Load DB-driven tenant nav rules if not already provided in context
    if (!ctx.tenantSettings?.customNavRules) {
      try {
        const rulesResult = await query(
          `SELECT nav_key, module_code, action FROM "${schema}".tenant_nav_rules
           WHERE tenant_id = $1 AND is_active = true ORDER BY priority DESC`,
          [ctx.tenantId],
        );
        if (rulesResult.rows.length > 0) {
          const customNavRules: Record<string, boolean> = {};
          for (const rule of rulesResult.rows) {
            const key = rule.nav_key ?? rule.module_code;
            if (key) customNavRules[key] = rule.action !== 'hide';
          }
          ctx = { ...ctx, tenantSettings: { ...ctx.tenantSettings, customNavRules } };
        }
      } catch {
        // tenant_nav_rules may not exist yet
      }
    }

    const filtered = this.filterRows(rows, ctx);
    const tree = this.buildTree(filtered);
    const personalized = this.applyUserPersonalization(tree, ctx);
    const sections = this.splitSections(personalized);

    const allItems = [...sections.primary, ...sections.secondary, ...sections.utility];
    const itemCount = this.countItems(allItems);

    return {
      primary: sections.primary,
      secondary: sections.secondary,
      utility: sections.utility,
      meta: {
        tenantId: ctx.tenantId,
        roleCode: ctx.roleCode,
        moduleCount: ctx.modules.length,
        itemCount,
        resolvedAt: new Date().toISOString(),
        fromCache: false,
      },
    };
  }

  // ------------------------------------------------------------------
  // Public: resolve breadcrumb chain for a given route
  // ------------------------------------------------------------------
  async resolveBreadcrumbs(
    tenantId: string,
    route: string,
    productKey: string,
  ): Promise<NavigationBreadcrumbDto[]> {
    const schema = await this.resolveTenantSchema(tenantId);

    const result = await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      query(
        `SELECT nav_key, parent_nav_key, label_en, label_ar, route, icon
         FROM "${schema}".navigation_registry
         WHERE is_active = true AND (status = 'published' OR status IS NULL)
           AND (product_key IS NULL OR product_key = $1)
         ORDER BY sort_order`,
        [productKey],
      ),
      { tenantId, operation: 'breadcrumb lookup' },
    );

    const rows = result.rows;
    if (rows.length === 0) return [];

    // Build lookup maps
    const byRoute = new Map<string, Record<string, any>>();
    const byKey = new Map<string, Record<string, any>>();
    for (const row of rows) {
      if (row.route) byRoute.set(row.route, row);
      byKey.set(row.nav_key, row);
    }

    // Find the nav item matching this route (exact or prefix match)
    let current = byRoute.get(route);
    if (!current) {
      // Try prefix match: /risk/scoring -> /risk
      const segments = route.split('/').filter(Boolean);
      while (segments.length > 0 && !current) {
        segments.pop();
        current = byRoute.get('/' + segments.join('/'));
      }
    }
    if (!current) return [];

    // Walk up the parent chain
    const crumbs: NavigationBreadcrumbDto[] = [];
    const visited = new Set<string>();
    let node: Record<string, any> | undefined = current;

    while (node && !visited.has(node.nav_key)) {
      visited.add(node.nav_key);
      crumbs.unshift({
        navKey: node.nav_key,
        labelEn: node.label_en,
        labelAr: node.label_ar,
        route: node.route,
        icon: node.icon,
      });
      node = node.parent_nav_key ? byKey.get(node.parent_nav_key) : undefined;
    }

    return crumbs;
  }

  // ------------------------------------------------------------------
  // Public: flatten navigation into command palette items
  // ------------------------------------------------------------------
  async resolveCommandPalette(
    ctx: NavigationCompositionContext,
  ): Promise<NavigationCommandPaletteItemDto[]> {
    const resolved = await this.resolve(ctx);
    const items: NavigationCommandPaletteItemDto[] = [];

    const flatten = (nodes: NavigationMenuItemDto[], section: NavigationSection) => {
      for (const node of nodes) {
        if (node.route && node.itemType === 'link') {
          const keywords: string[] = [node.labelEn.toLowerCase()];
          if (node.labelAr) keywords.push(node.labelAr);
          if (node.moduleCode) keywords.push(node.moduleCode);
          if (node.metadata?.keywords && Array.isArray(node.metadata.keywords)) {
            keywords.push(...(node.metadata.keywords as string[]));
          }

          items.push({
            navKey: node.navKey,
            labelEn: node.labelEn,
            labelAr: node.labelAr,
            route: node.route,
            icon: node.icon,
            moduleCode: node.moduleCode,
            section,
            keywords,
          });
        }
        if (node.children?.length) flatten(node.children, section);
      }
    };

    flatten(resolved.primary, 'primary');
    flatten(resolved.secondary, 'secondary');
    flatten(resolved.utility, 'utility');

    return items;
  }

  // ------------------------------------------------------------------
  // Public: preview a single draft entry merged into the live tree
  // ------------------------------------------------------------------
  async resolveWithPreview(
    ctx: NavigationCompositionContext,
    draftNavKey: string,
  ): Promise<NavigationMenuResponseDto> {
    const schema = await this.resolveTenantSchema(ctx.tenantId);

    // Load all rows including drafts for the specific nav key
    let rows: Record<string, any>[];
    try {
      rows = await this.loadMergedRowsWithDraft(schema, ctx.roleCode, ctx.productKey, draftNavKey);
    } catch {
      return this.emptyResponse(ctx);
    }

    const filtered = this.filterRows(rows, ctx);
    const tree = this.buildTree(filtered);
    const sections = this.splitSections(tree);
    const itemCount = this.countItems([...sections.primary, ...sections.secondary, ...sections.utility]);

    return {
      ...sections,
      meta: {
        tenantId: ctx.tenantId,
        roleCode: ctx.roleCode,
        moduleCount: ctx.modules.length,
        itemCount,
        resolvedAt: new Date().toISOString(),
        fromCache: false,
      },
    };
  }

  // ------------------------------------------------------------------
  // Private: resolve tenant schema name
  // ------------------------------------------------------------------
  private async resolveTenantSchema(tenantId: string): Promise<string> {
    const result = await swallowDefault(
      EC.FALLBACK_QUERY,
      emptyResult(),
      query(
        `SELECT schema_name FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
      ),
      { tenantId, operation: 'schema resolution' },
    );
    return result.rows[0]?.schema_name ?? `tenant_${tenantId}`;
  }

  // ------------------------------------------------------------------
  // Private: load merged rows (registry + overrides + bindings)
  // ------------------------------------------------------------------
  private async loadMergedRows(
    schema: string,
    roleCode: string | null,
    productKey: string,
  ): Promise<Record<string, any>[]> {
    const result = await query(
      `
      SELECT
        r.nav_key,
        r.parent_nav_key,
        COALESCE(o.label_en, r.label_en) AS label_en,
        COALESCE(o.label_ar, r.label_ar) AS label_ar,
        COALESCE(o.route, r.route) AS route,
        COALESCE(o.icon, r.icon) AS icon,
        COALESCE(o.module_code, r.module_code) AS module_code,
        r.item_type,
        COALESCE(o.sort_order, r.sort_order) AS sort_order,
        COALESCE(o.enabled, r.is_active) AS enabled,
        b.is_allowed,
        COALESCE(r.section, 'primary') AS section,
        r.permission_code,
        r.page_code,
        r.metadata,
        r.is_system,
        r.status,
        r.version,
        r.product_key
      FROM "${schema}".navigation_registry r
      LEFT JOIN "${schema}".navigation_overrides o
        ON o.nav_key = r.nav_key
       AND o.is_active = true
       AND (o.applies_to_role IS NULL OR o.applies_to_role = $1::text)
      LEFT JOIN "${schema}".navigation_role_bindings b
        ON b.nav_key = r.nav_key
       AND b.role_code = COALESCE($1::text, '')
      WHERE r.is_active = true
        AND (r.status = 'published' OR r.status IS NULL)
        AND (r.product_key IS NULL OR r.product_key = $2)
      ORDER BY COALESCE(o.sort_order, r.sort_order), r.nav_key
      `,
      [roleCode ?? null, productKey],
    );

    return result.rows;
  }

  // ------------------------------------------------------------------
  // Private: load merged rows with a specific draft item included
  // ------------------------------------------------------------------
  private async loadMergedRowsWithDraft(
    schema: string,
    roleCode: string | null,
    productKey: string,
    draftNavKey: string,
  ): Promise<Record<string, any>[]> {
    const result = await query(
      `
      SELECT
        r.nav_key,
        r.parent_nav_key,
        COALESCE(o.label_en, r.label_en) AS label_en,
        COALESCE(o.label_ar, r.label_ar) AS label_ar,
        COALESCE(o.route, r.route) AS route,
        COALESCE(o.icon, r.icon) AS icon,
        COALESCE(o.module_code, r.module_code) AS module_code,
        r.item_type,
        COALESCE(o.sort_order, r.sort_order) AS sort_order,
        COALESCE(o.enabled, r.is_active) AS enabled,
        b.is_allowed,
        COALESCE(r.section, 'primary') AS section,
        r.permission_code,
        r.page_code,
        r.metadata,
        r.is_system,
        r.status,
        r.version,
        r.product_key
      FROM "${schema}".navigation_registry r
      LEFT JOIN "${schema}".navigation_overrides o
        ON o.nav_key = r.nav_key
       AND o.is_active = true
       AND (o.applies_to_role IS NULL OR o.applies_to_role = $1::text)
      LEFT JOIN "${schema}".navigation_role_bindings b
        ON b.nav_key = r.nav_key
       AND b.role_code = COALESCE($1::text, '')
      WHERE r.is_active = true
        AND (r.product_key IS NULL OR r.product_key = $3)
        AND (
          r.status = 'published' OR r.status IS NULL
          OR r.nav_key = $2
        )
      ORDER BY COALESCE(o.sort_order, r.sort_order), r.nav_key
      `,
      [roleCode ?? null, draftNavKey, productKey],
    );

    return result.rows;
  }

  // ------------------------------------------------------------------
  // Private: multi-layer filter (7 layers)
  //   L1: Platform — enabled/system flags
  //   L2: Module — module entitlement visibility
  //   L3: Tenant — tenant custom nav rules
  //   L4: Role — role bindings + functional role matching
  //   L5: Permission — permission_code gating
  //   L6: User — hidden nav keys from user preferences
  //   L7: Scope — scope-based filtering (future)
  // ------------------------------------------------------------------
  private filterRows(
    rows: Record<string, any>[],
    ctx: NavigationCompositionContext,
  ): Record<string, any>[] {
    const moduleSet = new Set(ctx.modules);
    const hasModuleFilter = ctx.modules.length > 0;
    const permissionSet = ctx.permissions ? new Set(ctx.permissions) : null;
    const hiddenNavKeys = ctx.userPreferences?.hiddenNavKeys
      ? new Set(ctx.userPreferences.hiddenNavKeys) : null;
    const tenantRules = ctx.tenantSettings?.customNavRules ?? null;

    return rows.filter((row) => {
      // L1: Platform — must be enabled
      if (row.enabled === false) return false;

      // L1: System items only shown when explicitly requested
      if (row.is_system && !ctx.includeSystemItems) return false;

      // L2: Module entitlement — DAuth-provided visible modules
      if (hasModuleFilter && row.module_code) {
        if (!moduleSet.has(row.module_code)) return false;
      }

      // L3: Tenant custom rules — per-tenant nav visibility overrides
      if (tenantRules && row.nav_key in tenantRules) {
        if (tenantRules[row.nav_key] === false) return false;
      }

      // L4: Role binding — Law 11: deny by default
      if (row.is_allowed === false) return false;

      // L4: Functional role matching — metadata.requiredFunctionalRole
      if (row.metadata?.requiredFunctionalRole && ctx.functionalRoles) {
        const required = row.metadata.requiredFunctionalRole as string;
        if (!ctx.functionalRoles.includes(required)) return false;
      }

      // L4: Access profile matching — metadata.requiredAccessProfile
      if (row.metadata?.requiredAccessProfile && ctx.accessProfiles) {
        const required = row.metadata.requiredAccessProfile as string;
        if (!ctx.accessProfiles.includes(required)) return false;
      }

      // L5: Permission gating — if nav item has permission_code, user must have it
      if (row.permission_code && permissionSet) {
        if (!permissionSet.has(row.permission_code)) return false;
      }

      // L6: User preferences — user-hidden items
      if (hiddenNavKeys && hiddenNavKeys.has(row.nav_key)) return false;

      return true;
    });
  }

  // ------------------------------------------------------------------
  // Private: apply user-level personalization (pinned items, frequency)
  // ------------------------------------------------------------------
  private applyUserPersonalization(
    tree: NavigationMenuItemDto[],
    ctx: NavigationCompositionContext,
  ): NavigationMenuItemDto[] {
    if (!ctx.userPreferences) return tree;

    const pinned = ctx.userPreferences.pinnedNavKeys;
    if (pinned && pinned.length > 0) {
      const pinnedSet = new Set(pinned);
      // Pinned items get sort boost (sortOrder -= 1000)
      for (const item of tree) {
        if (pinnedSet.has(item.navKey)) {
          item.sortOrder = Math.max(0, item.sortOrder - 1000);
          item.metadata = { ...item.metadata, pinned: true };
        }
      }
      this.sortRecursive(tree);
    }

    return tree;
  }

  // ------------------------------------------------------------------
  // Private: build hierarchical tree with orphan reparenting
  // ------------------------------------------------------------------
  private buildTree(rows: Record<string, any>[]): NavigationMenuItemDto[] {
    const map = new Map<string, NavigationMenuItemDto>();

    for (const row of rows) {
      map.set(row.nav_key, {
        navKey: row.nav_key,
        parentNavKey: row.parent_nav_key,
        labelEn: row.label_en,
        labelAr: row.label_ar,
        route: row.route,
        icon: row.icon,
        moduleCode: row.module_code,
        itemType: row.item_type,
        sortOrder: row.sort_order ?? 0,
        section: row.section ?? 'primary',
        permissionCode: row.permission_code ?? null,
        pageCode: row.page_code ?? null,
        metadata: row.metadata ?? null,
        status: row.status ?? 'published',
        isSystem: row.is_system ?? false,
        children: [],
      });
    }

    const roots: NavigationMenuItemDto[] = [];

    for (const item of map.values()) {
      if (item.parentNavKey && map.has(item.parentNavKey)) {
        // Normal: attach to parent
        map.get(item.parentNavKey)!.children!.push(item);
      } else if (item.parentNavKey && !map.has(item.parentNavKey)) {
        // Orphan reparenting: parent not found (filtered out or missing)
        // Try to find a matching module group to reparent to
        const moduleGroup = this.findModuleGroup(map, item.moduleCode);
        if (moduleGroup) {
          moduleGroup.children!.push(item);
        } else {
          // Last resort: promote to root
          roots.push(item);
        }
      } else {
        roots.push(item);
      }
    }

    this.sortRecursive(roots);
    return roots;
  }

  // ------------------------------------------------------------------
  // Private: find a group node matching the module code (for reparenting)
  // ------------------------------------------------------------------
  private findModuleGroup(
    map: Map<string, NavigationMenuItemDto>,
    moduleCode: string | null,
  ): NavigationMenuItemDto | null {
    if (!moduleCode) return null;
    for (const item of map.values()) {
      if (item.itemType === 'group' && item.moduleCode === moduleCode) {
        return item;
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Private: split tree into sections
  // ------------------------------------------------------------------
  private splitSections(tree: NavigationMenuItemDto[]): {
    primary: NavigationMenuItemDto[];
    secondary: NavigationMenuItemDto[];
    utility: NavigationMenuItemDto[];
  } {
    const primary: NavigationMenuItemDto[] = [];
    const secondary: NavigationMenuItemDto[] = [];
    const utility: NavigationMenuItemDto[] = [];

    for (const item of tree) {
      switch (item.section) {
        case 'secondary':
          secondary.push(item);
          break;
        case 'utility':
          utility.push(item);
          break;
        default:
          primary.push(item);
      }
    }

    return { primary, secondary, utility };
  }

  // ------------------------------------------------------------------
  // Private: recursive sort by sortOrder
  // ------------------------------------------------------------------
  private sortRecursive(items: NavigationMenuItemDto[]): void {
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of items) {
      if (item.children?.length) this.sortRecursive(item.children);
    }
  }

  // ------------------------------------------------------------------
  // Private: count all items including nested children
  // ------------------------------------------------------------------
  private countItems(items: NavigationMenuItemDto[]): number {
    let count = 0;
    for (const item of items) {
      count++;
      if (item.children?.length) count += this.countItems(item.children);
    }
    return count;
  }

  // ------------------------------------------------------------------
  // Private: empty response for graceful degradation
  // ------------------------------------------------------------------
  private emptyResponse(ctx: NavigationCompositionContext): NavigationMenuResponseDto {
    return {
      primary: [],
      secondary: [],
      utility: [],
      meta: {
        tenantId: ctx.tenantId,
        roleCode: ctx.roleCode,
        moduleCount: ctx.modules.length,
        itemCount: 0,
        resolvedAt: new Date().toISOString(),
        fromCache: false,
      },
    };
  }
}
