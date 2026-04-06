import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));

    if (!environment.production) {
      console.error('[DOS-Platform] Unhandled error:', err);
    }

    if (environment.observability?.enabled && environment.observability?.errorReportingUrl) {
      this.reportError(err);
    }
  }

  private reportError(error: Error): void {
    try {
      const payload = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };

      fetch(environment.observability.errorReportingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => { /* silently fail */ });
    } catch { /* silently fail */ }
  }
}
