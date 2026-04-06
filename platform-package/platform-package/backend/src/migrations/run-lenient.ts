import { runMigrations } from './runner';
import { logger } from '../platform/dos/observability/logger.service';

(async () => {
  const { query: dbQuery } = await import('../config/database/database');

  const MAX_PASSES = 5;
  let totalApplied = 0;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    logger.info(`\n[master] Pass ${pass}/${MAX_PASSES} — running with continueOnError...`);
    const result = await runMigrations(dbQuery, 'master', undefined, { continueOnError: true });
    logger.info(`  Pass ${pass}: applied=${result.applied.length}, skipped=${result.skipped.length}`);
    totalApplied += result.applied.length;

    if (result.applied.length === 0) {
      logger.info(`  No new migrations applied in pass ${pass} — stopping.`);
      break;
    }
  }

  logger.info(`\nTotal applied across all passes: ${totalApplied}`);
  process.exit(0);
})().catch(err => { logger.error('Lenient runner error:', err); process.exit(1); });
