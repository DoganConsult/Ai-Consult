// @ts-nocheck
// ============================================
// DOS Navigation — Platform Service (Facade)
// Delegates to NavigationCompositionEngine.
// Provides backward-compatible getMenu() plus
// new breadcrumb and command palette APIs.
// ============================================

import { emptyResult, query } from '../../../../config/database/database';
import { NavigationMenuResponseDto } from './navigation.types';
import { swallowDefault, EC } from '../../resilience/resilient-catch';
import { NavigationCompositionEngine } from './navigation-composition.engine';
import { getDefaultProductKey } from '../../config/platform-identity';
import { NavigationCompositionContext, NavigationBreadcrumbDto, NavigationCommandPaletteItemDto } from './navigation.types';
import { NavigationCommandPaletteItemDto, NavigationBreadcrumbDto, NavigationCompositionContext } from './navigation.types';

const DEFAULT_PRODUCT_KEY = getDefaultProductKey();

export class NavigationMenuService {
  private engine = new NavigationCompositionEngine();

  /**
   * Resolve the full navigation tree for a tenant/role/module context.
   * Backward-compatible entry point used by the platform controller.
   */
  async getMenu(params: {
    tenantId: string;
    roleCode: string | null;
    modules: string[];
    productKey?: string;
    includeSystemItems?: boolean;
  }): Promise<NavigationMenuResponseDto> {
    const ctx: NavigationCompositionContext = {
      tenantId: params.tenantId,
      roleCode: params.roleCode,
      modules: params.modules,
      productKey: params.productKey ?? DEFAULT_PRODUCT_KEY,
      locale: 'en',
      includeSystemItems: params.includeSystemItems ?? false,
    };

    return this.engine.resolve(ctx);
  }

  /**
   * Full multi-layer resolution — accepts the complete composition context.
   * Used by the enhanced controller that resolves all 7 layers.
   */
  async getMenuFullContext(ctx: NavigationCompositionContext): Promise<NavigationMenuResponseDto> {
    return this.engine.resolve(ctx);
  }

  /**
   * Resolve breadcrumb chain for a given route.
   */
  async getBreadcrumbs(
    tenantId: string,
    route: string,
    productKey?: string,
  ): Promise<NavigationBreadcrumbDto[]> {
    return this.engine.resolveBreadcrumbs(tenantId, route, productKey ?? DEFAULT_PRODUCT_KEY);
  }

  /**
   * Flatten navigation into command palette actions.
   */
  async getCommandPaletteItems(params: {
    tenantId: string;
    roleCode: string | null;
    modules: string[];
    productKey?: string;
  }): Promise<NavigationCommandPaletteItemDto[]> {
    const ctx: NavigationCompositionContext = {
      tenantId: params.tenantId,
      roleCode: params.roleCode,
      modules: params.modules,
      productKey: params.productKey ?? DEFAULT_PRODUCT_KEY,
      locale: 'en',
      includeSystemItems: false,
    };

    return this.engine.resolveCommandPalette(ctx);
  }

  /**
   * Preview a draft nav entry merged into the live tree.
   * Used by admin preview surfaces.
   */
  async getMenuWithPreview(params: {
    tenantId: string;
    roleCode: string | null;
    modules: string[];
    draftNavKey: string;
    productKey?: string;
  }): Promise<NavigationMenuResponseDto> {
    const ctx: NavigationCompositionContext = {
      tenantId: params.tenantId,
      roleCode: params.roleCode,
      modules: params.modules,
      productKey: params.productKey ?? DEFAULT_PRODUCT_KEY,
      locale: 'en',
      includeSystemItems: true,
    };

    return this.engine.resolveWithPreview(ctx, params.draftNavKey);
  }
}
