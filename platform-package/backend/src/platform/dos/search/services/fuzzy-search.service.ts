import Fuse, { IFuseOptions } from 'fuse.js';

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches: { key: string; value: string; indices: [number, number][] }[];
}

export function createFuzzyIndex<T extends Record<string, unknown>>(
  items: T[],
  keys: string[],
  options?: Partial<IFuseOptions<T>>,
): Fuse<T> {
  return new Fuse(items, {
    keys,
    threshold: 0.4,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    ...options,
  });
}

export function fuzzySearch<T extends Record<string, unknown>>(
  fuse: Fuse<T>,
  query: string,
  limit = 20,
): FuzzySearchResult<T>[] {
  const results = fuse.search(query, { limit });
  return results.map(r => ({
    item: r.item,
    score: r.score ?? 0,
    matches: (r.matches || []).map(m => ({
      key: m.key || '',
      value: m.value || '',
      indices: m.indices as [number, number][],
    })),
  }));
}

export function quickSearch<T extends Record<string, unknown>>(
  items: T[],
  keys: string[],
  query: string,
  limit = 20,
): T[] {
  const fuse = createFuzzyIndex(items, keys);
  return fuzzySearch(fuse, query, limit).map(r => r.item);
}
