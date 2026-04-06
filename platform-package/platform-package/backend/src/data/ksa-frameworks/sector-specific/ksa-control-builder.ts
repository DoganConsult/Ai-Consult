/** Re-export from canonical ksa-bulk location */
export { C, S, D, FW, controls } from '../../ksa-bulk/ksa-control-builder';

export interface BulkDomainSpec {
  id: string; code: string; nameEn: string; nameAr: string;
  controls: Array<[string,string,string,string,string,string,"critical"|"high"|"medium"|"low",boolean,string[],string[]?]>;
}

export function bulkDomain(id: string, code: string, nameEn: string, nameAr: string, subs: BulkDomainSpec[]): import('../../ksa-bulk/ksa-frameworks').DomainDef {
  return { id, code, nameEn, nameAr, subdomains: subs.map(s => ({ id: s.id, code: s.code, nameEn: s.nameEn, nameAr: s.nameAr, controls: [] })) };
}
