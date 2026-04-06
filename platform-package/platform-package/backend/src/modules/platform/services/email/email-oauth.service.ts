// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/services/logger.service';
// ============================================
// Platform — OAuth2 Email Service
// Sends emails via Microsoft Graph API using
// OAuth2 authentication (Client Credentials Flow)
// Replaces deprecated SMTP basic authentication
// ============================================

import fetch from 'node-fetch';

// === Configuration ===
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token';
const GRAPH_API_ENDPOINT = process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0';
const __GRAPH_SEND_MAIL_ENDPOINT = '/me/sendMail';
const GRAPH_USERS_ENDPOINT = '/users';

// === Types ===
export interface OAuth2Config {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  emailFrom: string;
}

export interface OAuth2Token {
  accessToken: string;
  expiresAt: Date;
}

export interface GraphMailMessage {
  subject: string;
  body: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      address: string;
    };
  }>;
  importance?: 'low' | 'normal' | 'high';
}

export interface OAuth2EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts?: number;
}

// === Token Management ===
class TokenManager {
  private token: OAuth2Token | null = null;
  private config: OAuth2Config | null = null;

  /**
   * Initialize token manager with OAuth2 configuration
   */
  configure(config: OAuth2Config) {
    this.config = config;
    this.token = null; // Reset token when config changes
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('OAuth2 not configured. Call configure() first.');
    }

    // Check if we have a valid token
    if (this.token && this.token.expiresAt > new Date()) {
      return this.token.accessToken;
    }

    // Acquire new token
    return this.acquireToken();
  }

  /**
   * Acquire a new OAuth2 token using client credentials flow
   */
  private async acquireToken(): Promise<string> {
    if (!this.config) {
      throw new Error('OAuth2 configuration missing');
    }

    const tokenUrl = TOKEN_ENDPOINT.replace('{tenantId}', this.config.tenantId);

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token acquisition failed (${response.status}): ${errorText}`);
      }

      const data: unknown = await response.json();

      // Store token with expiration (subtract 5 minutes for safety)
      this.token = {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in - 300) * 1000)
      };

      logger.info('[OAuth2] Token acquired successfully, expires at:', this.token.expiresAt);
      return this.token.accessToken;

    } catch (error) {
      logger.error('[OAuth2] Token acquisition failed:', error);
      throw error;
    }
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  clearToken() {
    this.token = null;
  }
}

// === Email Service ===
class OAuth2EmailService {
  private tokenManager = new TokenManager();
  private config: OAuth2Config | null = null;

  /**
   * Initialize the OAuth2 email service
   */
  initialize(config?: OAuth2Config) {
    // Use provided config or read from environment
    this.config = config || {
      tenantId: process.env.AZURE_TENANT_ID || '',
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      emailFrom: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@dos-platform.local'
    };

    // Validate configuration
    if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
      logger.warn('[OAuth2] Email service not fully configured. Required: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET');
      return;
    }

    this.tokenManager.configure(this.config);
    logger.info('[OAuth2] Email service initialized with tenant:', this.config.tenantId);
  }

  /**
   * Check if OAuth2 email is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config?.tenantId &&
      this.config?.clientId &&
      this.config?.clientSecret
    );
  }

  /**
   * Send an email using Microsoft Graph API
   */
  async sendMail(
    to: string | string[],
    subject: string,
    htmlContent: string,
    options?: {
      cc?: string[];
      importance?: 'low' | 'normal' | 'high';
      retryCount?: number;
    }
  ): Promise<OAuth2EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'OAuth2 email service not configured'
      };
    }

    const toAddresses = Array.isArray(to) ? to : [to];
    const maxRetries = options?.retryCount ?? 3;
    let lastError: string | undefined;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.sendMailInternal(toAddresses, subject, htmlContent, options);
        return {
          ...result,
          attempts: attempt + 1
        };
      } catch (error) {
        lastError = (error as Error)?.message || String(error);
        logger.error(`[OAuth2] Send attempt ${attempt + 1} failed:`, lastError);

        // Don't sleep after the last attempt
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: maxRetries
    };
  }

  /**
   * Internal method to send email via Graph API
   */
  private async sendMailInternal(
    to: string[],
    subject: string,
    htmlContent: string,
    options?: {
      cc?: string[];
      importance?: 'low' | 'normal' | 'high';
    }
  ): Promise<OAuth2EmailResult> {
    // Get access token
    const accessToken = await this.tokenManager.getAccessToken();

    // Prepare the message
    const message: GraphMailMessage = {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlContent
      },
      toRecipients: to.map(email => ({
        emailAddress: { address: email }
      })),
      importance: options?.importance || 'normal'
    };

    // Add CC recipients if provided
    if (options?.cc && options.cc.length > 0) {
      message.ccRecipients = options.cc.map(email => ({
        emailAddress: { address: email }
      }));
    }

    // Prepare the request body
    const requestBody = {
      message,
      saveToSentItems: true
    };

    // Send email using the "from" user's context
    const sendUrl = `${GRAPH_API_ENDPOINT}${GRAPH_USERS_ENDPOINT}/${this.config!.emailFrom}/sendMail`;

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Graph API error (${response.status}): ${errorText}`;

      // Parse specific Graph API errors
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = `${errorData.error}: ${errorData.error_description || errorText}`;
        }
      } catch {
        // Keep original error text if not JSON
      }

      throw new Error(errorMessage);
    }

    // Success - Graph API returns 202 Accepted with no body
    logger.info(`[OAuth2] Email sent successfully to: ${to.join(', ')}`);

    return {
      success: true,
      messageId: `graph-${Date.now()}` // Generate a pseudo message ID
    };
  }

  /**
   * Send a templated email (compatible with existing email service)
   */
  async sendTemplatedEmail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<OAuth2EmailResult> {
    return this.sendMail(to, subject, htmlContent);
  }

  /**
   * Test OAuth2 configuration by acquiring a token
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'OAuth2 not configured'
        };
      }

      const token = await this.tokenManager.getAccessToken();

      // Try to get user profile to verify token works
      const response = await fetch(`${GRAPH_API_ENDPOINT}/users/${this.config!.emailFrom}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Graph API test failed: ${errorText}`
        };
      }

      const userData: unknown = await response.json();
      logger.info('[OAuth2] Connection test successful. User:', userData.displayName || userData.userPrincipalName);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: (error as Error)?.message || String(error)
      };
    }
  }

  /**
   * Helper method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// === Singleton Export ===
export const oauth2EmailService = new OAuth2EmailService();

// === Convenience Functions ===

/**
 * Send email using OAuth2 (drop-in replacement for existing sendEmail)
 */
export async function sendOAuth2Email(
  to: string,
  subject: string,
  htmlBody: string
): Promise<OAuth2EmailResult> {
  // Initialize if not already done
  if (!oauth2EmailService.isConfigured()) {
    oauth2EmailService.initialize();
  }

  return oauth2EmailService.sendMail(to, subject, htmlBody);
}

/**
 * Check if OAuth2 email is available
 */
export function isOAuth2EmailAvailable(): boolean {
  // Check if OAuth2 is preferred
  if (process.env.EMAIL_AUTH_TYPE !== 'oauth2') {
    return false;
  }

  // Initialize if needed
  if (!oauth2EmailService.isConfigured()) {
    oauth2EmailService.initialize();
  }

  return oauth2EmailService.isConfigured();
}

/**
 * Test OAuth2 email configuration
 */
export async function testOAuth2Email(): Promise<{ success: boolean; error?: string }> {
  if (!oauth2EmailService.isConfigured()) {
    oauth2EmailService.initialize();
  }

  return oauth2EmailService.testConnection();
}

// Auto-initialize on module load if environment is configured
if (process.env.EMAIL_AUTH_TYPE === 'oauth2') {
  oauth2EmailService.initialize();
}