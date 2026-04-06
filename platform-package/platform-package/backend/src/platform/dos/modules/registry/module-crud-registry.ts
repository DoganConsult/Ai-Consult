export interface FieldDef {
  key: string;
  labelEn: string;
  labelAr: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'email' | 'toggle';
  required: boolean;
  options?: { value: string; labelEn: string; labelAr: string }[];
  showInList: boolean;
  showInForm: boolean;
  editable: boolean;
}

export interface FilterDef {
  key: string;
  labelEn: string;
  labelAr: string;
  type: 'text' | 'select' | 'date-range';
  options?: { value: string; labelEn: string; labelAr: string }[];
}

export interface ModuleCrudDef {
  module: string;
  /** Canonical parent module from module_workflow_registry. Sub-entities use the parent's module_code. */
  parentModule: string;
  moduleEn: string;
  moduleAr: string;
  icon: string;
  route: string;
  apiBase: string;
  readPerm: string;
  writePerm: string;
  deletePerm: string;
  exportable: boolean;
  bulkable: boolean;
  fields: FieldDef[];
  filters: FilterDef[];
}

const _registry = new Map<string, ModuleCrudDef>();

export function registerModuleCrud(def: ModuleCrudDef): void {
  _registry.set(def.module, def);
}

export function getModuleCrud(module: string): ModuleCrudDef | undefined {
  return _registry.get(module);
}

export function getAllModuleCruds(): ModuleCrudDef[] {
  return Array.from(_registry.values());
}
