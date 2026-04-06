// ============================================
// AGRC-OS — Platform Statistics & Module LOC Service
// Computes lines-of-code, file counts, route counts,
// and module-level functionality evaluation
// ============================================

import { readdirSync, readFileSync, existsSync } from "fs";
import * as path from "path";

// === Interfaces ===

export interface FileStat {
  filePath: string;
  lines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
}

export interface ModuleLOC {
  module: string;
  description: string;
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  blankLines: number;
  commentLines: number;
  fileTypes: Record<string, number>;
  topFiles: { file: string; codeLines: number }[];
}

export interface PlatformOverview {
  projectName: string;
  computedAt: string;
  summary: {
    totalFiles: number;
    totalLines: number;
    totalCodeLines: number;
    totalBlankLines: number;
    totalCommentLines: number;
    backendFiles: number;
    frontendFiles: number;
    backendCodeLines: number;
    frontendCodeLines: number;
  };
  languages: Record<string, { files: number; codeLines: number }>;
  backendModules: ModuleLOC[];
  frontendModules: ModuleLOC[];
  routeStats: {
    totalRouteFiles: number;
    totalManifestEntries: number;
    routesByDomain: Record<string, number>;
  };
  serviceStats: {
    totalServices: number;
    totalMiddleware: number;
    totalMigrations: number;
  };
  frontendStats: {
    totalComponents: number;
    totalServices: number;
    totalPages: number;
    totalFeatures: number;
  };
}

// === Helpers ===

const CODE_EXTENSIONS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".html", ".css", ".scss",
  ".json", ".sql", ".yaml", ".yml", ".sh",
]);

const IGNORE_DIRS = new Set([
  "node_modules", "dist", ".git", ".angular", "coverage",
  ".vscode", ".idea", "__pycache__", ".next",
]);

function walkDir(dir: string, extensions?: Set<string>): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkDir(fullPath, extensions));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!extensions || extensions.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Permission errors or broken symlinks — skip silently
  }
  return results;
}

function analyzeFile(filePath: string): FileStat {
  try {
    const content = readFileSync(filePath, "utf-8");
    const allLines = content.split("\n");
    const totalLines = allLines.length;
    let blankLines = 0;
    let commentLines = 0;
    let inBlockComment = false;

    for (const line of allLines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        blankLines++;
        continue;
      }
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes("*/")) inBlockComment = false;
        continue;
      }
      if (trimmed.startsWith("/*")) {
        commentLines++;
        if (!trimmed.includes("*/")) inBlockComment = true;
        continue;
      }
      if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("<!--")) {
        commentLines++;
      }
    }

    return {
      filePath,
      lines: totalLines,
      blankLines,
      commentLines,
      codeLines: totalLines - blankLines - commentLines,
    };
  } catch {
    return { filePath, lines: 0, blankLines: 0, commentLines: 0, codeLines: 0 };
  }
}

function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase() || "other";
}

function buildModuleLOC(moduleName: string, description: string, dir: string): ModuleLOC {
  const files = walkDir(dir, CODE_EXTENSIONS);
  const stats = files.map(analyzeFile);

  const fileTypes: Record<string, number> = {};
  for (const f of files) {
    const ext = getExtension(f);
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  }

  const topFiles = stats
    .sort((a, b) => b.codeLines - a.codeLines)
    .slice(0, 5)
    .map(f => ({
      file: path.relative(dir, f.filePath),
      codeLines: f.codeLines,
    }));

  return {
    module: moduleName,
    description,
    totalFiles: files.length,
    totalLines: stats.reduce((s, f) => s + f.lines, 0),
    codeLines: stats.reduce((s, f) => s + f.codeLines, 0),
    blankLines: stats.reduce((s, f) => s + f.blankLines, 0),
    commentLines: stats.reduce((s, f) => s + f.commentLines, 0),
    fileTypes,
    topFiles,
  };
}

// === Main Statistics Computation ===

export function computePlatformStats(projectRoot: string): PlatformOverview {
  const backendSrc = path.join(projectRoot, "backend/src");
  const frontendSrc = path.join(projectRoot, "frontend/src");

  // Collect all source files
  const backendFiles = walkDir(backendSrc, CODE_EXTENSIONS);
  const frontendFiles = walkDir(frontendSrc, CODE_EXTENSIONS);
  const allFiles = [...backendFiles, ...frontendFiles];
  const allStats = allFiles.map(analyzeFile);

  // Language breakdown
  const languages: Record<string, { files: number; codeLines: number }> = {};
  for (let i = 0; i < allFiles.length; i++) {
    const ext = getExtension(allFiles[i]);
    if (!languages[ext]) languages[ext] = { files: 0, codeLines: 0 };
    languages[ext].files++;
    languages[ext].codeLines += allStats[i].codeLines;
  }

  const backendStats = backendFiles.map(analyzeFile);
  const frontendFileStats = frontendFiles.map(analyzeFile);

  // Backend modules
  const backendModules: ModuleLOC[] = [];

  // Core backend directories
  const backendDirs: [string, string, string][] = [
    ["routes", "API Route Handlers", path.join(backendSrc, "routes")],
    ["services", "Business Logic Services", path.join(backendSrc, "services")],
    ["middleware", "Middleware Stack", path.join(backendSrc, "middleware")],
    ["config", "Configuration", path.join(backendSrc, "config")],
    ["migrations", "Database Migrations", path.join(backendSrc, "migrations")],
    ["schemas", "Validation Schemas", path.join(backendSrc, "schemas")],
    ["ai", "AI/LLM Integration", path.join(backendSrc, "ai")],
    ["data", "Seed Data", path.join(backendSrc, "data")],
    ["utils", "Utilities", path.join(backendSrc, "utils")],
    ["platform", "Platform Core", path.join(backendSrc, "platform")],
    ["products", "Product Definitions", path.join(backendSrc, "products")],
    ["i18n", "Internationalization", path.join(backendSrc, "i18n")],
    ["temporal", "Temporal Workflows", path.join(backendSrc, "temporal")],
  ];

  for (const [name, desc, dir] of backendDirs) {
    if (existsSync(dir)) {
      backendModules.push(buildModuleLOC(name, desc, dir));
    }
  }

  // Backend sub-modules (backend/src/modules/*)
  const modulesDir = path.join(backendSrc, "modules");
  if (existsSync(modulesDir)) {
    try {
      const subModules = readdirSync(modulesDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
      for (const sub of subModules) {
        backendModules.push(
          buildModuleLOC(
            `modules/${sub}`,
            `Backend Module: ${sub}`,
            path.join(modulesDir, sub)
          )
        );
      }
    } catch { /* skip */ }
  }

  // Frontend modules
  const frontendModules: ModuleLOC[] = [];

  const frontendDirs: [string, string, string][] = [
    ["core", "Core Services & Guards", path.join(frontendSrc, "app/core")],
    ["shared", "Shared Components & Pipes", path.join(frontendSrc, "app/shared")],
    ["services", "Global Services", path.join(frontendSrc, "app/services")],
    ["pages", "Public Pages", path.join(frontendSrc, "app/pages")],
    ["registries", "Component Registries", path.join(frontendSrc, "app/registries")],
    ["styles", "Global Styles", path.join(frontendSrc, "styles")],
    ["assets", "Static Assets", path.join(frontendSrc, "assets")],
  ];

  for (const [name, desc, dir] of frontendDirs) {
    if (existsSync(dir)) {
      frontendModules.push(buildModuleLOC(name, desc, dir));
    }
  }

  // Frontend feature modules (frontend/src/app/features/*)
  const featuresDir = path.join(frontendSrc, "app/features");
  if (existsSync(featuresDir)) {
    try {
      const features = readdirSync(featuresDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
      for (const feat of features) {
        frontendModules.push(
          buildModuleLOC(
            `features/${feat}`,
            `Feature Module: ${feat}`,
            path.join(featuresDir, feat)
          )
        );
      }
    } catch { /* skip */ }
  }

  // Route stats
  const routeFiles = walkDir(path.join(backendSrc, "routes"), new Set([".ts"]));
  const routesByDomain: Record<string, number> = {};
  for (const rf of routeFiles) {
    const name = path.basename(rf, ".routes.ts").replace(".ts", "");
    const domain = name.split("-")[0] || "other";
    routesByDomain[domain] = (routesByDomain[domain] || 0) + 1;
  }

  // Count manifest entries from route manifest file
  let manifestEntries = 0;
  try {
    // Platform-only mode: no product route manifest
    manifestEntries = 0;
  } catch { /* skip */ }

  // Service/middleware/migration counts
  const serviceFiles = walkDir(path.join(backendSrc, "services"), new Set([".ts"]));
  const middlewareFiles = walkDir(path.join(backendSrc, "middleware"), new Set([".ts"]));
  const migrationDir = path.join(projectRoot, "backend/migrations");
  const migrationFiles = existsSync(migrationDir) ? walkDir(migrationDir, new Set([".sql", ".ts"])) : [];

  // Frontend component/service/page counts
  const allFrontendTs = walkDir(frontendSrc, new Set([".ts"]));
  const componentCount = allFrontendTs.filter(f => f.endsWith(".component.ts")).length;
  const feServiceCount = allFrontendTs.filter(f => f.endsWith(".service.ts")).length;
  const pageCount = allFrontendTs.filter(f => f.includes("/pages/") && f.endsWith(".component.ts")).length;
  const featureCount = existsSync(featuresDir)
    ? readdirSync(featuresDir, { withFileTypes: true }).filter(e => e.isDirectory()).length
    : 0;

  return {
    projectName: "AGRC-OS (Autonomous Governance, Risk & Compliance Operating System)",
    computedAt: new Date().toISOString(),
    summary: {
      totalFiles: allFiles.length,
      totalLines: allStats.reduce((s, f) => s + f.lines, 0),
      totalCodeLines: allStats.reduce((s, f) => s + f.codeLines, 0),
      totalBlankLines: allStats.reduce((s, f) => s + f.blankLines, 0),
      totalCommentLines: allStats.reduce((s, f) => s + f.commentLines, 0),
      backendFiles: backendFiles.length,
      frontendFiles: frontendFiles.length,
      backendCodeLines: backendStats.reduce((s, f) => s + f.codeLines, 0),
      frontendCodeLines: frontendFileStats.reduce((s, f) => s + f.codeLines, 0),
    },
    languages,
    backendModules: backendModules.sort((a, b) => b.codeLines - a.codeLines),
    frontendModules: frontendModules.sort((a, b) => b.codeLines - a.codeLines),
    routeStats: {
      totalRouteFiles: routeFiles.length,
      totalManifestEntries: manifestEntries,
      routesByDomain,
    },
    serviceStats: {
      totalServices: serviceFiles.length,
      totalMiddleware: middlewareFiles.length,
      totalMigrations: migrationFiles.length,
    },
    frontendStats: {
      totalComponents: componentCount,
      totalServices: feServiceCount,
      totalPages: pageCount,
      totalFeatures: featureCount,
    },
  };
}

// === Module Functionality Evaluation ===

export interface ModuleFunctionalityEval {
  module: string;
  category: string;
  functionalityScore: number; // 0-100
  metrics: {
    codeLines: number;
    fileCount: number;
    avgFileSize: number;
    hasRoutes: boolean;
    hasServices: boolean;
    hasTests: boolean;
    hasTypes: boolean;
    hasMigrations: boolean;
    routeCount: number;
    serviceCount: number;
    complexity: "low" | "medium" | "high" | "very-high";
  };
}

export function evaluateModuleFunctionality(projectRoot: string): ModuleFunctionalityEval[] {
  const backendSrc = path.join(projectRoot, "backend/src");
  const results: ModuleFunctionalityEval[] = [];

  // Define modules to evaluate with their categories
  const moduleMap: [string, string, string][] = [
    ["governance", "Core GRC", path.join(backendSrc, "routes")],
    ["risk", "Core GRC", path.join(backendSrc, "routes")],
    ["compliance", "Core GRC", path.join(backendSrc, "routes")],
    ["audit", "Core GRC", path.join(backendSrc, "routes")],
    ["evidence", "Core GRC", path.join(backendSrc, "routes")],
    ["vendor", "Third-Party", path.join(backendSrc, "routes")],
    ["incident", "Incident & BCP", path.join(backendSrc, "routes")],
    ["bcp", "Incident & BCP", path.join(backendSrc, "routes")],
    ["ai", "AI/ML", path.join(backendSrc, "routes")],
    ["policy", "Policy", path.join(backendSrc, "routes")],
    ["report", "Reporting", path.join(backendSrc, "routes")],
    ["workflow", "Automation", path.join(backendSrc, "routes")],
    ["foundation", "Organization", path.join(backendSrc, "routes")],
    ["team", "Organization", path.join(backendSrc, "routes")],
    ["analytics", "Analytics", path.join(backendSrc, "routes")],
    ["assessment", "Assessment", path.join(backendSrc, "routes")],
    ["notification", "Communication", path.join(backendSrc, "routes")],
  ];

  for (const [moduleName, category] of moduleMap) {
    // Find route files for this module
    const routeDir = path.join(backendSrc, "routes");
    const serviceDir = path.join(backendSrc, "services");
    const allRouteFiles = existsSync(routeDir) ? walkDir(routeDir, new Set([".ts"])) : [];
    const allServiceFiles = existsSync(serviceDir) ? walkDir(serviceDir, new Set([".ts"])) : [];

    const moduleRouteFiles = allRouteFiles.filter(f =>
      path.basename(f).startsWith(moduleName) || path.basename(f).includes(`-${moduleName}`)
    );
    const moduleServiceFiles = allServiceFiles.filter(f =>
      path.basename(f).startsWith(moduleName) || path.basename(f).includes(`-${moduleName}`)
    );

    const moduleSubDir = path.join(backendSrc, "modules", moduleName);
    const moduleSubFiles = existsSync(moduleSubDir)
      ? walkDir(moduleSubDir, CODE_EXTENSIONS)
      : [];

    const allModuleFiles = [...moduleRouteFiles, ...moduleServiceFiles, ...moduleSubFiles];
    const stats = allModuleFiles.map(analyzeFile);
    const totalCodeLines = stats.reduce((s, f) => s + f.codeLines, 0);
    const totalFiles = allModuleFiles.length;
    const avgFileSize = totalFiles > 0 ? Math.round(totalCodeLines / totalFiles) : 0;

    // Check for tests
    const testDir = path.join(projectRoot, "backend");
    const testFiles = existsSync(testDir)
      ? walkDir(testDir, new Set([".ts"])).filter(f =>
          (f.includes(".test.") || f.includes(".spec.")) &&
          (path.basename(f).includes(moduleName))
        )
      : [];

    // Check for types
    const hasTypes = allModuleFiles.some(f =>
      f.includes(".types.") || f.includes(".schema.") || f.includes("interface") || f.includes("/schemas/")
    );

    // Check for migrations
    const migDir = path.join(projectRoot, "backend/migrations");
    const hasMigrations = existsSync(migDir) &&
      walkDir(migDir, new Set([".sql"])).some(f =>
        path.basename(f).toLowerCase().includes(moduleName)
      );

    // Complexity assessment
    let complexity: "low" | "medium" | "high" | "very-high" = "low";
    if (totalCodeLines > 5000) complexity = "very-high";
    else if (totalCodeLines > 2000) complexity = "high";
    else if (totalCodeLines > 500) complexity = "medium";

    // Functionality score (heuristic: code coverage, route count, service count, tests)
    let score = 0;
    if (totalCodeLines > 0) score += 20;
    if (totalCodeLines > 200) score += 10;
    if (totalCodeLines > 1000) score += 10;
    if (moduleRouteFiles.length > 0) score += 15;
    if (moduleRouteFiles.length > 2) score += 5;
    if (moduleServiceFiles.length > 0) score += 15;
    if (moduleServiceFiles.length > 2) score += 5;
    if (testFiles.length > 0) score += 10;
    if (hasTypes) score += 5;
    if (hasMigrations) score += 5;
    score = Math.min(score, 100);

    results.push({
      module: moduleName,
      category,
      functionalityScore: score,
      metrics: {
        codeLines: totalCodeLines,
        fileCount: totalFiles,
        avgFileSize,
        hasRoutes: moduleRouteFiles.length > 0 || moduleSubFiles.some(f => f.includes('.routes.')),
        hasServices: moduleServiceFiles.length > 0 || moduleSubFiles.some(f => f.includes('.service.')),
        hasTests: testFiles.length > 0,
        hasTypes,
        hasMigrations,
        routeCount: moduleRouteFiles.length + moduleSubFiles.filter(f => f.includes('.routes.')).length,
        serviceCount: moduleServiceFiles.length + moduleSubFiles.filter(f => f.includes('.service.')).length,
        complexity,
      },
    });
  }

  return results.sort((a, b) => b.functionalityScore - a.functionalityScore);
}
