// @ts-nocheck
// ============================================
// DOS Platform — Tenant Branding Service
// Loads tenant logo, org name, and colors from public.tenants
// for use in PDF/Excel report exports (enterprise headers/footers).
// ============================================

import { safeQuery } from "../../../../config/database";
import { getFirstRow } from '../../../../utils/db-utils';

const LOGO_FETCH_TIMEOUT_MS = 5000;
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const HOST_NAME = process.env.PLATFORM_NAME || process.env.BRAND_NAME || "DOS Platform";

export interface TenantBranding {
  logo?: Buffer;
  orgName: string;
  orgNameAr?: string;
  tenantNameEn: string;
  tenantNameAr?: string;
  primaryColor?: string;
  hostName?: string;
}

/**
 * Load tenant branding from public.tenants and resolve logo_url to a Buffer.
 * Safe: missing columns or failed logo fetch yield partial branding (no logo).
 */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  let row: unknown;
  try {
    const q = await safeQuery(
      `SELECT logo_url, org_name, org_name_ar, primary_color,
              COALESCE(tenant_name_en, org_name) AS tenant_name_en,
              tenant_name_ar
       FROM public.tenants
       WHERE tenant_id = $1`,
      [tenantId]
    );
    row = getFirstRow(q);
  } catch {
    row = null;
  }

  const orgName = row?.org_name ?? tenantId;
  const tenantNameEn = row?.tenant_name_en ?? row?.org_name ?? tenantId;
  const tenantNameAr = row?.tenant_name_ar ?? row?.org_name_ar ?? undefined;
  const primaryColor = row?.primary_color ?? undefined;

  let logo: Buffer | undefined;
  const logoUrl = row?.logo_url;
  if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("http")) {
    try {
      logo = await fetchLogoAsBuffer(logoUrl);
    } catch {
      // Non-fatal: continue without logo
    }
  }

  return {
    logo,
    orgName,
    orgNameAr: row?.org_name_ar ?? undefined,
    tenantNameEn,
    tenantNameAr,
    primaryColor,
    hostName: HOST_NAME,
  };
}

/**
 * Fetch logo URL with timeout and size limit; return Buffer or throw.
 */
async function fetchLogoAsBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > LOGO_MAX_BYTES) {
      throw new Error("Logo too large");
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > LOGO_MAX_BYTES) throw new Error("Logo too large");
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
