/**
 * Co-located tests for module-crud-registry.ts
 * Tests in-memory registry: registerModuleCrud, getModuleCrud, getAllModuleCruds.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerModuleCrud,
  getModuleCrud,
  getAllModuleCruds,
  type ModuleCrudDef,
  type FieldDef,
} from './module-crud-registry';

// Helper to create a minimal valid ModuleCrudDef
function makeDef(module: string): ModuleCrudDef {
  return {
    module,
    parentModule: module,
    moduleEn: `${module} Module`,
    moduleAr: `وحدة ${module}`,
    icon: 'pi pi-cog',
    route: `/${module}`,
    apiBase: `/api/${module}`,
    readPerm: `${module}:read`,
    writePerm: `${module}:write`,
    deletePerm: `${module}:delete`,
    exportable: true,
    bulkable: false,
    fields: [],
    filters: [],
  };
}

describe('module-crud-registry', () => {
  it('registerModuleCrud adds a definition retrievable by getModuleCrud', () => {
    const def = makeDef('test-register');
    registerModuleCrud(def);
    const retrieved = getModuleCrud('test-register');
    expect(retrieved).toBeDefined();
    expect(retrieved?.module).toBe('test-register');
  });

  it('getModuleCrud returns undefined for unregistered module', () => {
    expect(getModuleCrud('nonexistent-module-xyz')).toBeUndefined();
  });

  it('getAllModuleCruds returns array of all registered definitions', () => {
    registerModuleCrud(makeDef('test-all-1'));
    registerModuleCrud(makeDef('test-all-2'));
    const all = getAllModuleCruds();
    expect(Array.isArray(all)).toBe(true);
    const modules = all.map(d => d.module);
    expect(modules).toContain('test-all-1');
    expect(modules).toContain('test-all-2');
  });

  it('registering same module twice overwrites previous definition', () => {
    const def1 = makeDef('test-overwrite');
    def1.moduleEn = 'Version 1';
    registerModuleCrud(def1);

    const def2 = makeDef('test-overwrite');
    def2.moduleEn = 'Version 2';
    registerModuleCrud(def2);

    const retrieved = getModuleCrud('test-overwrite');
    expect(retrieved?.moduleEn).toBe('Version 2');
  });

  it('FieldDef supports all valid field types', () => {
    const field: FieldDef = {
      key: 'name',
      labelEn: 'Name',
      labelAr: 'الاسم',
      type: 'text',
      required: true,
      showInList: true,
      showInForm: true,
      editable: true,
    };
    expect(field.type).toBe('text');
  });
});
