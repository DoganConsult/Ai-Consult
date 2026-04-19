import { Injectable, computed, inject, signal } from '@angular/core';
import { PermissionService } from '../../dauth/services/permission.service';

export interface MenuItem {
  route: string;
  icon: string;
  label: string;
  requires?: string[];
  section?: string;
}

/**
 * Central registry for platform-admin navigation. Menu items are filtered
 * at render time by PermissionService, so zero code changes are needed to
 * enable/disable a surface per user — only the permission assignment.
 */
@Injectable({ providedIn: 'root' })
export class DynamicMenuService {
  private perm = inject(PermissionService);

  private readonly _items = signal<MenuItem[]>([
    { route: '/overview',       icon: 'pi pi-home',         label: 'Overview' },
    { route: '/tenants',        icon: 'pi pi-building',     label: 'Tenants & Workspaces', requires: ['platform.tenant.create', 'platform.tenant.suspend'] },
    { route: '/identity',       icon: 'pi pi-id-card',      label: 'Identity & Access',    requires: ['platform.user.invite', 'platform.role.assign', 'platform.permission.assign'] },
    { route: '/modules',        icon: 'pi pi-th-large',     label: 'Module Registry',      requires: ['platform.module.enable', 'platform.module.disable'] },
    { route: '/products',       icon: 'pi pi-box',          label: 'Products',             requires: ['platform.product.enable', 'platform.product.disable'], section: 'catalog' },
    { route: '/feature-flags',  icon: 'pi pi-flag',         label: 'Feature Flags',        requires: ['platform.feature.toggle'], section: 'catalog' },
    { route: '/activations',    icon: 'pi pi-check-square', label: 'Tenant Activations',   requires: ['platform.tenant.create', 'platform.product.enable'], section: 'catalog' },
    { route: '/config-center',  icon: 'pi pi-server',       label: 'Config Center',        requires: ['platform.config.read', 'platform.config.write'], section: 'governance' },
    { route: '/governance',     icon: 'pi pi-shield',       label: 'Governance Matrix',    requires: ['platform.config.read', 'platform.permission.assign'], section: 'governance' },
    { route: '/sod',            icon: 'pi pi-ban',          label: 'SoD Rules',            requires: ['platform.sod.manage'], section: 'governance' },
    { route: '/delegations',    icon: 'pi pi-share-alt',    label: 'Delegations',          requires: ['platform.delegation.create'], section: 'governance' },
    { route: '/settings',       icon: 'pi pi-cog',          label: 'Platform Settings',    requires: ['platform.config.write'] },
    { route: '/workflows',      icon: 'pi pi-sitemap',      label: 'Workflow & Lifecycle' },
    { route: '/audit',          icon: 'pi pi-list',         label: 'Audit & Events',       requires: ['platform.audit.read'] },
    { route: '/integrations',   icon: 'pi pi-link',         label: 'Integrations' },
    { route: '/ai-governance',  icon: 'pi pi-microchip',    label: 'AI Governance',        requires: ['platform.ai.govern'] },
    { route: '/ai-registries',  icon: 'pi pi-database',     label: 'AI Registries',        requires: ['platform.ai.govern'], section: 'ai' },
    { route: '/ai-graphs',      icon: 'pi pi-sitemap',      label: 'AI Graphs',            requires: ['platform.ai.govern'], section: 'ai' },

    { route: '/page-catalog',   icon: 'pi pi-objects-column', label: 'Page Catalog',       requires: ['platform.config.write', 'platform.schema.manage'], section: 'lowcode' },
    { route: '/api-builder',    icon: 'pi pi-code',         label: 'API Builder',          requires: ['platform.config.write', 'platform.schema.manage'], section: 'lowcode' },
    { route: '/module-builder', icon: 'pi pi-hammer',       label: 'Module Builder',       requires: ['platform.config.write', 'platform.schema.manage'], section: 'lowcode' },
    { route: '/workflow-designer', icon: 'pi pi-share-alt', label: 'Workflow Designer',    requires: ['platform.config.write', 'platform.schema.manage'], section: 'lowcode' },
    { route: '/schema-designer',icon: 'pi pi-table',        label: 'Schema Designer',      requires: ['platform.schema.manage'], section: 'lowcode' },
    { route: '/plugins',        icon: 'pi pi-box',          label: 'Plugins',              requires: ['platform.schema.manage'], section: 'lowcode' },
    { route: '/approvals',      icon: 'pi pi-verified',     label: 'Approvals',            requires: ['platform.audit.read', 'platform.permission.assign'], section: 'governance' },

    { route: '/diagnostics',    icon: 'pi pi-wrench',       label: 'Diagnostics',          requires: ['platform.observability.read'] },
    { route: '/pillars',        icon: 'pi pi-wave-pulse',   label: 'NOC + SOC Console',    requires: ['platform.observability.read'] },
  ]);

  /** All registered items (unfiltered). */
  readonly all = this._items.asReadonly();

  /** Items visible to the current user. */
  readonly visible = computed(() =>
    this._items().filter(i => this.perm.hasAny(i.requires))
  );

  /** Allow plugins / dynamic modules to register additional items at runtime. */
  register(item: MenuItem): void {
    const next = [...this._items(), item];
    this._items.set(next);
  }
}
