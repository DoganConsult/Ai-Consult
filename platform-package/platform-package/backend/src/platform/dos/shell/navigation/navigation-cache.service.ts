// ============================================
// DOS Navigation — Tenant-Scoped Cache
// Wraps the composition engine with Redis/memory
// cache, keyed by tenant+role+moduleHash.
// Invalidation via events and explicit API calls.
// ============================================

import { cacheGetOrSet, cacheInvalidatePattern, CacheTTL } from '../../cache/cache.service';
import { NavigationCompositionEngine } from './navigation-composition.engine';
import type {
  NavigationCompositionContext,
  NavigationMenuResponseDto,
  NavigationBreadcrumbDto,
  NavigationCommandPaletteItemDto,
} from './navigation.types';
import { createHash } from 'crypto';

const CACHE_NS = 'nav:';
const CACHE_TTL = CacheTTL.MEDIUM; // 10 min — nav changes are infrequent

export class NavigationCacheService {
  private engine = new NavigationCompositionEngine();

  // ------------------------------------------------------------------
  // Public: cached menu resolution
  // ------------------------------------------------------------------
  async getMenu(ctx: NavigationCompositionContext): Promise<NavigationMenuResponseDto> {
    const key = this.menuCacheKey(ctx);

    const result = await cacheGetOrSet<NavigationMenuResponseDto>(
      key,
      () => this.engine.resolve(ctx),
      CACHE_TTL,
    );

    // Mark as from-cache
    return {
      ...result,
      meta: { ...result.meta, fromCache: true },
    };
  }

  // ------------------------------------------------------------------
  // Public: cached breadcrumb resolution
  // ------------------------------------------------------------------
  async getBreadcrumbs(
    tenantId: string,
    route: string,
    productKey: string,
  ): Promise<NavigationBreadcrumbDto[]> {
    const key = `${CACHE_NS}breadcrumb:${tenantId}:${this.hashString(route)}`;

    return cacheGetOrSet<NavigationBreadcrumbDto[]>(
      key,
      () => this.engine.resolveBreadcrumbs(tenantId, route, productKey),
      CACHE_TTL,
    );
  }

  // ------------------------------------------------------------------
  // Public: cached command palette items
  // ------------------------------------------------------------------
  async getCommandPaletteItems(
    ctx: NavigationCompositionContext,
  ): Promise<NavigationCommandPaletteItemDto[]> {
    const key = `${CACHE_NS}palette:${ctx.tenantId}:${ctx.roleCode ?? 'anon'}`;

    return cacheGetOrSet<NavigationCommandPaletteItemDto[]>(
      key,
      () => this.engine.resolveCommandPalette(ctx),
      CACHE_TTL,
    );
  }

  // ------------------------------------------------------------------
  // Public: uncached preview (admin use — always fresh)
  // ------------------------------------------------------------------
  async getMenuWithPreview(
    ctx: NavigationCompositionContext,
    draftNavKey: string,
  ): Promise<NavigationMenuResponseDto> {
    return this.engine.resolveWithPreview(ctx, draftNavKey);
  }

  // ------------------------------------------------------------------
  // Invalidation
  // ------------------------------------------------------------------

  /** Invalidate all nav caches for a tenant */
  async invalidateForTenant(tenantId: string): Promise<number> {
    return cacheInvalidatePattern(`${CACHE_NS}*:${tenantId}:*`);
  }

  /** Invalidate nav caches for a specific tenant+role */
  async invalidateForRole(tenantId: string, roleCode: string): Promise<number> {
    return cacheInvalidatePattern(`${CACHE_NS}*:${tenantId}:${roleCode}*`);
  }

  /** Emergency: invalidate ALL nav caches across all tenants */
  async invalidateAll(): Promise<number> {
    return cacheInvalidatePattern(`${CACHE_NS}*`);
  }

  // ------------------------------------------------------------------
  // Private: cache key generation
  // ------------------------------------------------------------------
  private menuCacheKey(ctx: NavigationCompositionContext): string {
    const moduleHash = this.hashModules(ctx.modules);
    return `${CACHE_NS}menu:${ctx.tenantId}:${ctx.roleCode ?? 'anon'}:${moduleHash}`;
  }

  private hashModules(modules: string[]): string {
    if (modules.length === 0) return 'all';
    const sorted = [...modules].sort().join(',');
    return this.hashString(sorted);
  }

  private hashString(input: string): string {
    return createHash('md5').update(input).digest('hex').substring(0, 8);
  }
}
