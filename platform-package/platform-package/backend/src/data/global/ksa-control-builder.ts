/** Re-export from canonical ksa-bulk location */
export { C, S, D, FW, controls } from '../ksa-bulk/ksa-control-builder';

/** Legacy alias for bulk subdomain spec */
export interface BulkSubSpec {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  controls: unknown[];
}

/** Create subdomains in bulk */
export function bulkDomain(id: string, code: string, nameEn: string, nameAr: string, subs: BulkSubSpec[]): unknown {
  return { id, code, nameEn, nameAr, subdomains: subs };
}
