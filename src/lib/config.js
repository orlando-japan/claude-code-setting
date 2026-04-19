import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { log } from './log.js';

const CONFIG_NAME = '.company-cc.json';

// ─── Overlays ────────────────────────────────────────────────────────────────

export async function loadOverlays(configDir) {
  const raw = await readConfigFile(configDir);
  if (!raw || !Array.isArray(raw.overlays) || raw.overlays.length === 0) return [];

  const paths = [];
  const configPath = join(configDir, CONFIG_NAME);
  for (const overlay of raw.overlays) {
    const resolved = resolveNodePath(String(overlay), configDir);
    if (!resolved) {
      log.warn(`overlay not found: ${overlay} (configured in ${configPath})`);
      continue;
    }
    paths.push(resolved);
  }
  return paths;
}

// ─── Custom targets ──────────────────────────────────────────────────────────

/**
 * Load custom target configs from .company-cc.json files and any listed
 * adapterPackages. Returns a { [targetName]: TargetConfig } map.
 * configDirs: list of directories to scan (typically [homedir(), cwd()])
 */
export async function loadCustomTargets(configDirs) {
  const customTargets = {};

  for (const dir of configDirs) {
    const raw = await readConfigFile(dir);
    if (!raw) continue;

    // Inline target definitions
    if (raw.targets && typeof raw.targets === 'object') {
      for (const [name, def] of Object.entries(raw.targets)) {
        if (def && typeof def === 'object') {
          customTargets[name] = buildCustomTargetConfig(name, def, dir);
        }
      }
    }

    // npm adapter packages
    if (Array.isArray(raw.adapterPackages)) {
      for (const pkgName of raw.adapterPackages) {
        const pkg = findPackage(String(pkgName), dir);
        if (!pkg) {
          log.warn(`adapterPackage not found: ${pkgName}`);
          continue;
        }
        const adapterTargets = pkg.manifest['company-cc']?.targets;
        if (!adapterTargets || typeof adapterTargets !== 'object') continue;
        for (const [name, def] of Object.entries(adapterTargets)) {
          if (def && typeof def === 'object') {
            customTargets[name] = buildCustomTargetConfig(name, def, pkg.dir);
          }
        }
      }
    }
  }

  return customTargets;
}

function buildCustomTargetConfig(name, def, baseDir) {
  const resolve = (p) => {
    if (!p) return null;
    const expanded = p.replace(/^~(?=$|\/)/, homedir());
    return expanded.startsWith('/') ? expanded : join(baseDir, expanded);
  };

  return {
    target: name,
    displayName: def.displayName ?? name,
    instructionFile: def.instructionFile ?? 'AGENTS.md',
    userDest: resolve(def.userDest) ?? join(homedir(), `.${name}`),
    projectDest: process.cwd(),
    userManifestName: def.userManifestName ?? `.company-cc-${name}-manifest.json`,
    projectManifestName: def.projectManifestName ?? `.company-cc-${name}-manifest.json`,
    userSrcs: (def.userSrcs ?? []).map(resolve).filter(Boolean),
    projectSrcs: (def.projectSrcs ?? []).map(resolve).filter(Boolean),
    requiredUserFiles: def.requiredUserFiles ?? [],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readConfigFile(dir) {
  const configPath = join(dir, CONFIG_NAME);
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(await readFile(configPath, 'utf8'));
  } catch {
    log.warn(`invalid JSON in ${configPath} — ignored`);
    return null;
  }
}

function resolveNodePath(path, baseDir) {
  if (path.startsWith('./') || path.startsWith('../')) {
    const p = join(baseDir, path);
    return existsSync(p) ? p : null;
  }
  if (path.startsWith('/')) {
    return existsSync(path) ? path : null;
  }
  // npm package: walk up node_modules
  let dir = baseDir;
  for (let i = 0; i < 15; i++) {
    const candidate = join(dir, 'node_modules', path);
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function findPackage(pkgName, startDir) {
  const pkgPath = resolveNodePath(pkgName, startDir);
  if (!pkgPath) return null;
  const manifestPath = join(pkgPath, 'package.json');
  if (!existsSync(manifestPath)) return null;
  try {
    return { dir: pkgPath, manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) };
  } catch {
    return null;
  }
}
