import { Request, Response, NextFunction } from 'express';

const V1_SEGMENT_MAP: Record<string, string> = {
  auth: 'auth', Auth: 'auth',
  landing: 'content/landing',
  Landing: 'content/landing',
  Governance: 'governance',
  Risk: 'risks',
  Compliance: 'compliance',
  Audit: 'audit',
  Incident: 'incidents',
  Vendor: 'vendors',
  BCP: 'bcp',
  AI: 'ai',
  Evidence: 'evidence',
  Workflow: 'workflows',
  Assessment: 'assessments',
  Report: 'reports',
  Notification: 'notifications',
  Analytics: 'analytics',
  Copilot: 'copilot',
  Admin: 'admin',
  Registry: 'registry',
  Profile: 'profiles',
  Onboarding: 'onboarding',
  Dashboard: 'dashboard',
  Payment: 'payment',
  Automation: 'automation',
  Ontology: 'ontology',
  Inference: 'inference',
};

export function v1ApiRewriteMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length > 0 && V1_SEGMENT_MAP[segments[0]]) {
    segments[0] = V1_SEGMENT_MAP[segments[0]];
  }
  const newPath = '/api/' + segments.join('/');
  req.url = newPath;
  req.originalUrl = newPath + (req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '');
  next();
}
