import type { Express } from 'express';

export interface BaselineMountEntry {
  index: number;
  path: string;
  handlerName: string;
  handlerType: 'router' | 'middleware' | 'errorHandler' | 'any';
  hasStack: boolean;
  routeCount: number;
  methods: string[];
  subPaths: string[];
}

export interface RouteBaseline {
  generatedAt: string;
  expressVersion: string;
  totalMounts: number;
  totalEndpoints: number;
  mounts: BaselineMountEntry[];
}

function extractLayerName(layer: Record<string, any>): string {
  if (layer.name && layer.name !== '<anonymous>') return layer.name;
  if (layer.handle?.name && layer.handle.name !== '<anonymous>') return layer.handle.name;
  return '<anonymous>';
}

function extractSubRoutes(router: Record<string, any>): { methods: string[]; subPaths: string[] } {
  const methods = new Set<string>();
  const subPaths = new Set<string>();

  if (!router?.stack) return { methods: [], subPaths: [] };

  for (const layer of router.stack) {
    if (layer.route) {
      const routePath = layer.route.path;
      if (routePath) subPaths.add(String(routePath));
      if (layer.route.methods) {
        for (const m of Object.keys(layer.route.methods)) {
          if (layer.route.methods[m]) methods.add(m.toUpperCase());
        }
      }
    } else if (layer.handle?.stack) {
      const nested = extractSubRoutes(layer.handle);
      nested.methods.forEach(m => methods.add(m));
      nested.subPaths.forEach(p => subPaths.add(p));
    }
  }

  return {
    methods: [...methods].sort(),
    subPaths: [...subPaths].sort(),
  };
}

export function generateRouteBaseline(app: Express): RouteBaseline {
  const stack = ((app as any as { _router?: { stack?: any[] } })._router?.stack) ?? [];
  const mounts: BaselineMountEntry[] = [];
  let totalEndpoints = 0;

  for (let i = 0; i < stack.length; i++) {
    const layer = stack[i];
    const mountPath = layer.regexp?.source
      ? extractMountPath(layer)
      : '/';
    const hasStack = !!(layer.handle?.stack);
    const name = extractLayerName(layer);

    let handlerType: BaselineMountEntry['handlerType'] = 'any';
    if (hasStack) {
      handlerType = 'router';
    } else if (layer.handle?.length === 4) {
      handlerType = 'errorHandler';
    } else if (layer.handle?.length <= 3) {
      handlerType = 'middleware';
    }

    const { methods, subPaths } = hasStack
      ? extractSubRoutes(layer.handle)
      : { methods: [] as string[], subPaths: [] as string[] };

    const routeCount = hasStack ? countRoutes(layer.handle) : 0;
    totalEndpoints += routeCount;

    mounts.push({
      index: i,
      path: mountPath,
      handlerName: name,
      handlerType,
      hasStack,
      routeCount,
      methods,
      subPaths,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    expressVersion: require('express/package.json').version,
    totalMounts: mounts.length,
    totalEndpoints,
    mounts,
  };
}

function countRoutes(router: Record<string, any>): number {
  if (!router?.stack) return 0;
  let count = 0;
  for (const layer of router.stack) {
    if (layer.route) {
      count++;
    } else if (layer.handle?.stack) {
      count += countRoutes(layer.handle);
    }
  }
  return count;
}

function extractMountPath(layer: Record<string, any>): string {
  if (layer.keys?.length > 0) {
    return layer.path || '/?';
  }

  const src = layer.regexp?.source;
  if (!src) return '/';

  if (src === '^\\/?$' || src === '^\\/?(?=\\/|$)') return '/';

  let cleaned = src
    .replace(/^\^\\\//, '/')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\\//g, '/')
    .replace(/\$$/g, '');

  if (!cleaned.startsWith('/')) cleaned = '/' + cleaned;

  return cleaned || '/';
}
