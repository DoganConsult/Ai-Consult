import * as yaml from 'js-yaml';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export function parseYaml<T = Record<string, unknown>>(content: string): T | null {
  try {
    return yaml.load(content) as T;
  } catch (err: unknown) {
    logger.error('[YamlConfig] Parse failed', { error: toErrorMessage(err) });
    return null;
  }
}

export function toYaml(data: unknown): string {
  return yaml.dump(data, { indent: 2, lineWidth: 120, noRefs: true });
}

export function loadYamlFile<T = Record<string, unknown>>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    logger.warn(`[YamlConfig] File not found: ${filePath}`);
    return null;
  }
  const content = readFileSync(filePath, 'utf-8');
  return parseYaml<T>(content);
}

export function saveYamlFile(filePath: string, data: unknown): boolean {
  try {
    writeFileSync(filePath, toYaml(data), 'utf-8');
    return true;
  } catch (err: unknown) {
    logger.error('[YamlConfig] Save failed', { error: toErrorMessage(err) });
    return false;
  }
}
