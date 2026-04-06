// @ts-nocheck
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

let Queue: unknown = null;
let Worker: unknown = null;
let isInitialized = false;

const workers: any[] = [];
const queues = new Map<string, any>();

interface QueueConfig {
  name: string;
  concurrency: number;
  handler: (job: any) => Promise<void>;
}

function getRedisConfig() {
  return {
    host: process.env.DOS_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.DOS_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.DOS_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

export async function initBullMQWorkers(): Promise<boolean> {
  if (process.env.BULLMQ_ENABLED !== 'true') {
    logger.info('[BullMQ] Disabled (BULLMQ_ENABLED != true)');
    return false;
  }

  try {
    const bullmq = await import('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
    isInitialized = true;

    const connection = getRedisConfig();

    const queueConfigs: QueueConfig[] = [
      {
        name: 'report-generation',
        concurrency: 2,
        handler: handleReportGeneration,
      },
      {
        name: 'bulk-csv-import',
        concurrency: 1,
        handler: handleBulkCsvImport,
      },
      {
        name: 'evidence-collection',
        concurrency: 3,
        handler: handleEvidenceCollection,
      },
      {
        name: 'email-digest',
        concurrency: 2,
        handler: handleEmailDigest,
      },
      {
        name: 'ai-agent-run',
        concurrency: 2,
        handler: handleAiAgentRun,
      },
      {
        name: 'pdf-signing',
        concurrency: 1,
        handler: handlePdfSigning,
      },
    ];

    for (const config of queueConfigs) {
      const queue = new Queue(config.name, { connection });
      queues.set(config.name, queue);

      const worker = new Worker(config.name, config.handler, {
        connection,
        concurrency: config.concurrency,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      });

      worker.on('completed', (job: any) => {
        logger.info(`[BullMQ] Job ${job.id} completed on ${config.name}`);
      });
      worker.on('failed', (job: any, err: Error) => {
        logger.error(`[BullMQ] Job ${job?.id} failed on ${config.name}: ${err.message}`);
      });

      workers.push(worker);
    }

    logger.info(`[BullMQ] ${queueConfigs.length} workers initialized`);
    return true;
  } catch (err: unknown) {
    logger.warn(`[BullMQ] Init failed: ${toErrorMessage(err)}`);
    return false;
  }
}

export async function addJob(
  queueName: string,
  data: Record<string, unknown>,
  opts?: { priority?: number; delay?: number; attempts?: number },
): Promise<string | null> {
  if (!isInitialized) return null;
  const queue = queues.get(queueName);
  if (!queue) return null;

  try {
    const job = await queue.add(queueName, data, {
      priority: opts?.priority ?? 0,
      delay: opts?.delay ?? 0,
      attempts: opts?.attempts ?? 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return job.id;
  } catch (err: unknown) {
    logger.error(`[BullMQ] Add job failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function shutdownWorkers(): Promise<void> {
  for (const worker of workers) {
    try {
      await worker.close();
    } catch { /* ignore */ }
  }
  for (const queue of queues.values()) {
    try {
      await queue.close();
    } catch { /* ignore */ }
  }
  workers.length = 0;
  queues.clear();
  isInitialized = false;
  logger.info('[BullMQ] All workers shut down');
}

async function handleReportGeneration(job: any): Promise<void> {
  const { tenantId, reportType, params, format } = job.data;
  logger.info(`[BullMQ:report] Generating ${reportType} for tenant ${tenantId}`);

  if (format === 'pdf' || !format) {
    logger.info(`[BullMQ:report] PDF report ${reportType} queued for tenant ${tenantId}`);
  } else if (format === 'docx') {
    const { generateDocx } = await import('../../services/document-generation/docx-generator.service');
    await generateDocx(params?.title || reportType, params?.sections || []);
  } else if (format === 'xlsx') {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(reportType);
    if (params?.headers) {
      sheet.addRow(params.headers);
    }
    if (params?.rows) {
      for (const row of params.rows) {
        sheet.addRow(row);
      }
    }
    const buffer = await workbook.xlsx.writeBuffer();
    job.updateData({ ...job.data, output: Buffer.from(buffer).toString('base64') });
  }
}

async function handleBulkCsvImport(job: any): Promise<void> {
  const { tenantId, entity, csvData } = job.data;
  logger.info(`[BullMQ:csv] Importing ${entity} for tenant ${tenantId}`);

  const { parseCsv } = await import('../../services/migration/csv-parser.service');
  const parsed = parseCsv(csvData);
  job.updateProgress(50);

  logger.info(`[BullMQ:csv] Parsed ${parsed.meta.rowCount} rows for ${entity}`);
  job.updateProgress(100);
  job.updateData({ ...job.data, rowCount: parsed.meta.rowCount });
}

async function handleEvidenceCollection(job: any): Promise<void> {
  const { tenantId, controlId, _connectorId } = job.data;
  logger.info(`[BullMQ:evidence] Collecting for control ${controlId} tenant ${tenantId}`);
  job.updateProgress(100);
}

async function handleEmailDigest(job: any): Promise<void> {
  const { _tenantId, recipients, digestType, data } = job.data;
  logger.info(`[BullMQ:email] Sending ${digestType} digest to ${recipients?.length || 0} recipients`);

  const { renderEmailTemplate } = await import('../../../../modules/platform/services/email/email-template.service');
  const html = renderEmailTemplate({
    title: digestType,
    body: [JSON.stringify(data || {})],
  });

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    } : undefined,
  });

  for (const recipient of (recipients || [])) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dos-platform.local',
      to: recipient,
      subject: `[${(await import('../../branding/product-identity')).getProductName()}] ${digestType} Digest`,
      html,
    });
  }
}

async function handleAiAgentRun(job: any): Promise<void> {
  const { tenantId, agentId, _prompt, _context } = job.data;
  logger.info(`[BullMQ:ai] Running agent ${agentId} for tenant ${tenantId}`);
  job.updateProgress(100);
}

async function handlePdfSigning(job: any): Promise<void> {
  const { tenantId, reportId, certPath } = job.data;
  logger.info(`[BullMQ:sign] Signing PDF report ${reportId} for tenant ${tenantId}`);

  if (certPath) {
    const { signPdfWithFile } = await import('../../services/document-generation/pdf-signer.service');
    const pdfBuffer = Buffer.from(job.data.pdfBase64 || '', 'base64');
    const signed = await signPdfWithFile(pdfBuffer, certPath);
    job.updateData({ ...job.data, signedPdfBase64: signed.toString('base64') });
  }
}
