/**
 * Pagination utility for standardized paginated responses.
 * Requirements: 1.2, 1.3, 4.1, 4.2, 4.3
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_DIR: 'ASC' | 'DESC' = 'DESC';

/**
 * Parses and validates pagination query params, enforcing defaults and caps.
 * - page defaults to 1, minimum 1
 * - pageSize defaults to 25, capped at 100, minimum 1
 * - sortBy defaults to 'created_at'
 * - sortDir defaults to 'DESC', only 'ASC' or 'DESC' accepted
 */
export function parsePaginationParams(query: Record<string, any>): PaginationParams {
  let page = parseInt(String(query.page || ''), 10);
  if (isNaN(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  let pageSize = parseInt(String(query.pageSize || ''), 10);
  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = DEFAULT_PAGE_SIZE;
  }
  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  const sortBy = typeof query.sortBy === 'string' && query.sortBy.trim()
    ? query.sortBy.trim()
    : DEFAULT_SORT_BY;

  const rawDir = typeof query.sortDir === 'string' ? query.sortDir.toUpperCase() : '';
  const sortDir: 'ASC' | 'DESC' = rawDir === 'ASC' || rawDir === 'DESC'
    ? rawDir
    : DEFAULT_SORT_DIR;

  return { page, pageSize, sortBy, sortDir };
}

/**
 * Wraps raw query results into the standard paginated envelope.
 * Requirement 4.1: { data: T[], meta: { page, pageSize, total, totalPages } }
 * Requirement 4.2: page beyond range returns empty data with correct meta
 * Requirement 4.3: pageSize capped at 100
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}
