// @ts-nocheck
// ============================================
// F06: OpenAPI 3.0 / Swagger Documentation
// Auto-generates spec from JSDoc annotations.
// Exposes /api-docs and /api-docs.json.
// Bridges gap: 220 routes, zero docs → full.
// ============================================

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

import { logger } from '../../platform/dos/observability/logger.service';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: process.env.API_TITLE || 'DOS Platform API',
      version: process.env.PLATFORM_VERSION || '1.0.0',
      description: process.env.API_DESCRIPTION || `**Dogan-AI-OS** — Multi-tenant Platform API

DOS is a multi-tenant SaaS platform with autonomous AI agents,
Temporal durable workflows, and cryptographic evidence hash-chain.`,
      contact: {
        name: process.env.API_CONTACT_NAME || 'Platform Support',
        email: process.env.API_CONTACT_EMAIL || '',
      },
      license: { name: 'Proprietary' },
    },
    servers: [
      { url: '/api', description: 'API Base Path' },
    ],
    tags: [
      { name: 'Risk', description: 'Risk register, scoring, KRI tracking' },
      { name: 'Controls', description: 'Control management and effectiveness' },
      { name: 'Compliance', description: 'Framework compliance posture' },
      { name: 'Evidence', description: 'Evidence collection and hash-chain' },
      { name: 'Governance', description: 'Governance workflow and board reporting' },
      { name: 'Audit', description: 'Internal and external audit management' },
      { name: 'Vendors', description: 'Third-party risk management (TPRM)' },
      { name: 'AI Agents', description: 'Autonomous AI agent management' },
      { name: 'AI OS - Decisions', description: 'AI decision engine, run traces, recommendations' },
      { name: 'AI OS - Policy & Rules', description: 'Policy rules, event triggers, route rules' },
      { name: 'AI OS - Agent Runtime', description: 'Agent runtime configs, circuit breakers, stuck runs' },
      { name: 'AI OS - Signals & Alerts', description: 'Signals, observations, alerts, activity feed' },
      { name: 'AI OS - Operations', description: 'Maintenance, trends, regressions, A/B tests, tools, cost' },
      { name: 'AI OS - Introspection', description: 'AI self-assessment, capability map, explainability' },
      { name: 'Regulatory', description: 'Regulatory content library' },
      { name: 'RCSA', description: 'Risk & Control Self-Assessment campaigns' },
      { name: 'Attestation', description: 'Policy attestation campaigns' },
      { name: 'Analytics', description: 'Predictive analytics and forecasting' },
      { name: 'Webhooks', description: 'Outbound webhook subscriptions' },
      { name: 'CCM', description: 'Continuous Control Monitoring' },
      { name: 'Board Reports', description: 'Board-level executive reporting' },
      { name: 'Onboarding', description: 'Tenant provisioning and onboarding' },
      { name: 'Auth', description: 'Authentication, registration, MFA, token refresh' },
      { name: 'Incidents', description: 'Incident management, investigation, post-incident review' },
      { name: 'Policy', description: 'Policy lifecycle, attestation, version control' },
      { name: 'Foundation', description: 'Organization structure, users, roles, locations, reference data' },
      { name: 'Admin', description: 'Tenant configuration, branding, feature toggles' },
      { name: 'Integrations', description: 'Connector hub, webhooks, marketplace' },
      { name: 'BCP', description: 'Business continuity planning, BIA, exercises' },
      { name: 'Training', description: 'Security awareness, campaigns, completion tracking' },
      { name: 'Exceptions', description: 'Exception cases, waivers, approvals' },
      { name: 'Remediation', description: 'Remediation tasks, SLA tracking, closure' },
      { name: 'Actions', description: 'Action items, ownership, status tracking' },
      { name: 'Assets', description: 'Asset inventory, criticality, risk linkage' },
      { name: 'Workflow', description: 'Workflow instances, approvals, SLA enforcement' },
      { name: 'Notification', description: 'Notification channels, preferences, delivery' },
      { name: 'AI Governance', description: 'AI model/prompt/agent registry, HITL, fairness, explainability' },
      { name: 'Qiyas', description: 'Maturity assessment, scoring, calibration' },
      { name: 'Teams', description: 'Team management, roster, workload' },
      { name: 'Reports', description: 'Report builder, scheduled reports, exports' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from POST /api/auth/login',
        },
        vendorToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Vendor-Token',
          description: 'Vendor portal access token (issued via POST /api/vendors/portal/token)',
        },
      },
      schemas: {
        Risk: {
          type: 'object',
          required: ['title', 'likelihood', 'impact'],
          properties: {
            risk_id: { type: 'string', format: 'uuid', readOnly: true },
            title: { type: 'string', maxLength: 500 },
            description: { type: 'string' },
            likelihood: { type: 'integer', minimum: 1, maximum: 5 },
            impact: { type: 'integer', minimum: 1, maximum: 5 },
            risk_score: { type: 'number', readOnly: true },
            status: { type: 'string', enum: ['open', 'mitigated', 'accepted', 'closed', 'under_review'] },
            owner_id: { type: 'string', format: 'uuid' },
            treatment_plan: { type: 'string' },
            due_date: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time', readOnly: true },
          },
        },
        Control: {
          type: 'object',
          properties: {
            control_id: { type: 'string', readOnly: true },
            title: { type: 'string' },
            description: { type: 'string' },
            effectiveness_score: { type: 'number', minimum: 0, maximum: 1 },
            framework_code: { type: 'string' },
            status: { type: 'string', enum: ['active', 'draft', 'retired', 'implemented', 'not_implemented'] },
            owner_id: { type: 'string', format: 'uuid' },
          },
        },
        Policy: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', format: 'uuid', readOnly: true },
            title: { type: 'string' },
            version: { type: 'integer' },
            approval_status: { type: 'string', enum: ['draft', 'approved', 'retired', 'under_review'] },
            owner_id: { type: 'string', format: 'uuid' },
            next_review_date: { type: 'string', format: 'date' },
          },
        },
        Evidence: {
          type: 'object',
          properties: {
            evidence_id: { type: 'string', format: 'uuid', readOnly: true },
            control_id: { type: 'string' },
            content_hash: { type: 'string', description: 'SHA-256 hash of evidence content' },
            chain_position: { type: 'integer', readOnly: true },
            status: { type: 'string', enum: ['pending', 'submitted', 'reviewed', 'approved', 'expired'] },
            submitted_at: { type: 'string', format: 'date-time' },
          },
        },
        MonteCarloResult: {
          type: 'object',
          properties: {
            meanLoss: { type: 'number', description: 'Mean financial loss (SAR)' },
            p95Loss: { type: 'number', description: '95th percentile loss' },
            p99Loss: { type: 'number', description: '99th percentile loss' },
            var95: { type: 'number', description: 'Value-at-Risk at 95%' },
            distribution: { type: 'array', items: { type: 'number' } },
            iterations: { type: 'integer' },
          },
        },
        RCSACampaign: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['individual', 'workshop'] },
            status: { type: 'string', enum: ['draft', 'active', 'closed', 'archived'] },
            dueDate: { type: 'string', format: 'date' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        },
        Incident: {
          type: 'object',
          required: ['title', 'severity'],
          properties: {
            incident_id: { type: 'string', format: 'uuid', readOnly: true },
            title: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['open', 'investigating', 'contained', 'resolved', 'closed'] },
            category: { type: 'string' },
            owner: { type: 'string' },
            reported_at: { type: 'string', format: 'date-time' },
            closed_at: { type: 'string', format: 'date-time' },
            root_cause: { type: 'string' },
            created_at: { type: 'string', format: 'date-time', readOnly: true },
          },
        },
        Vendor: {
          type: 'object',
          required: ['name'],
          properties: {
            vendor_id: { type: 'string', format: 'uuid', readOnly: true },
            name: { type: 'string', maxLength: 255 },
            category: { type: 'string' },
            tier: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['active', 'inactive', 'pending', 'suspended'] },
            contact_email: { type: 'string', format: 'email' },
            sla_notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time', readOnly: true },
          },
        },
        AuditEngagement: {
          type: 'object',
          required: ['title', 'audit_type'],
          properties: {
            engagement_id: { type: 'string', format: 'uuid', readOnly: true },
            title: { type: 'string', maxLength: 255 },
            audit_type: { type: 'string' },
            status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'cancelled'] },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            owner: { type: 'string' },
            created_at: { type: 'string', format: 'date-time', readOnly: true },
          },
        },
        AuditFinding: {
          type: 'object',
          required: ['title'],
          properties: {
            finding_id: { type: 'string', format: 'uuid', readOnly: true },
            title: { type: 'string', maxLength: 255 },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['open', 'in_remediation', 'closed'] },
            engagement_id: { type: 'string', format: 'uuid' },
            owner: { type: 'string' },
            created_at: { type: 'string', format: 'date-time', readOnly: true },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/routes/*.ts',
    './src/modules/*/routes/*.ts',
    './src/modules/*/routes/**/*.ts',
    './src/modules/**/routes/*.ts',
  ],
};

export function setupSwagger(app: Express): void {
  let spec: unknown;
  try {
    spec = swaggerJsdoc(options);
    if (!spec || !spec.paths || Object.keys(spec.paths).length === 0) {
      throw new Error('Swagger spec generated 0 paths. Ensure JSDoc annotations are correct.');
    }
  } catch (err) {
    if (logger.fatal) {
      logger.fatal('[Swagger] CRITICAL_STARTUP_FAILURE — Failed to generate OpenAPI spec:', { error: (err as Error).message });
    } else {
      logger.error('[Swagger] CRITICAL_STARTUP_FAILURE — Failed to generate OpenAPI spec:', { error: (err as Error).message });
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[Swagger] Silent failure prevented in production. API docs are required: ${(err as Error).message}`);
    }
    return;
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: process.env.API_TITLE ? `${process.env.API_TITLE} Documentation` : 'DOS API Documentation',
    customCss: `
      .swagger-ui .topbar { background: #1e40af; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #1e293b; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
    },
  }));

  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
  });
}
