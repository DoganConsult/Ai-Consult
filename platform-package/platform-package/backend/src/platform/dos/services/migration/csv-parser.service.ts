import * as Papa from 'papaparse';
import { logger } from '../../observability/services/logger.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export interface CsvParseResult<T = Record<string, string>> {
  data: T[];
  errors: { row: number; message: string }[];
  meta: { fields: string[]; rowCount: number };
}

export function parseCsv<T = Record<string, string>>(
  csvString: string,
  options?: { header?: boolean; skipEmptyLines?: boolean; delimiter?: string },
): CsvParseResult<T> {
  try {
    const result = Papa.parse<T>(csvString, {
      header: options?.header ?? true,
      skipEmptyLines: options?.skipEmptyLines ?? true,
      delimiter: options?.delimiter,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    return {
      data: result.data,
      errors: (result.errors || []).map(e => ({ row: e.row ?? -1, message: e.message })),
      meta: {
        fields: result.meta.fields || [],
        rowCount: result.data.length,
      },
    };
  } catch (err: unknown) {
    logger.error('[CsvParser] Parse failed', { error: toErrorMessage(err) });
    return { data: [], errors: [{ row: -1, message: toErrorMessage(err) }], meta: { fields: [], rowCount: 0 } };
  }
}

export function toCsv(
  data: Record<string, unknown>[],
  options?: { columns?: string[]; header?: boolean },
): string {
  return Papa.unparse(data, {
    columns: options?.columns,
    header: options?.header ?? true,
  });
}
