import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { toErrorMessage } from '../../../errors/http-error.util';
import { logger } from '../logger';

const ML_PYTHON = process.env.ML_PYTHON_BIN || '/root/Dr-Dogan-AGRC-OS/ml-venv/bin/python3';
const ML_SCRIPTS_ROOT = path.resolve(process.env.ML_SCRIPTS_ROOT || path.join(__dirname, '../../../../scripts/ml'));

export interface MlTaskRequest {
  script: string;
  args?: string[];
  input?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface MlTaskResult {
  success: boolean;
  output: Record<string, unknown>;
  stderr?: string;
  durationMs: number;
}

function assertSafeScript(script: string): string {
  const resolved = path.resolve(ML_SCRIPTS_ROOT, script);
  if (!resolved.startsWith(ML_SCRIPTS_ROOT + path.sep) && resolved !== ML_SCRIPTS_ROOT) {
    throw new Error('Script path traversal attempt blocked');
  }
  if (!resolved.endsWith('.py')) {
    throw new Error('Only .py scripts are allowed');
  }
  return resolved;
}

export async function runMlTask(req: MlTaskRequest): Promise<MlTaskResult> {
  const start = Date.now();
  const timeout = req.timeoutMs || 60_000;
  const resolvedScript = assertSafeScript(req.script);

  return new Promise((resolve) => {
    const args = [resolvedScript, ...(req.args || [])];
    execFile(ML_PYTHON, args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, ML_INPUT: JSON.stringify(req.input || {}) },
    }, (err, stdout, stderr) => {
      const durationMs = Date.now() - start;
      if (err) {
        logger.warn(`[MLBridge] task failed: ${toErrorMessage(err)}`);
        resolve({ success: false, output: { error: toErrorMessage(err) }, stderr, durationMs });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({ success: true, output: parsed, durationMs });
      } catch {
        resolve({ success: true, output: { raw: stdout.trim() }, stderr, durationMs });
      }
    });
  });
}

export function isMlVenvAvailable(): boolean {
  return fs.existsSync(ML_PYTHON);
}
