/**
 * Product identity -- configurable branding for platform-level templates.
 *
 * Products set their identity at startup via setProductIdentity().
 * Platform code reads from here instead of hardcoding product names.
 *
 * @owner DOS
 * Law 15 compliance: products must be removable without breaking DOS or DAuth.
 */

let _productName = process.env.PRODUCT_NAME || 'GRC Platform';
let _productUrl = process.env.APP_URL || 'https://app.example.com';

/**
 * Called by the product layer at startup to register branding identity.
 * Platform-level email templates, notifications, and UI strings read from
 * these values instead of hardcoding product names.
 */
export function setProductIdentity(name: string, url?: string): void {
  _productName = name;
  if (url) _productUrl = url;
}

/** Returns the configured product name for use in platform templates. */
export function getProductName(): string {
  return _productName;
}

/** Returns the configured product URL for use in platform templates. */
export function getProductUrl(): string {
  return _productUrl;
}
