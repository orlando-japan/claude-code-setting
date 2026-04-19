import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { log } from './log.js';

const CONFIG_NAME = '.company-cc.json';

export async function loadOverlays(configDir) {
  const configPath = join(configDir, CONFIG_NAME);
  if (!existsSync(configPath)) return [];

  let raw;
  try {
    raw = JSON.parse(await readFile(configPath, 'utf8'));
  } catch {
    log.warn(`invalid JSON in ${configPath} — overlays ignored`);
    return [];
  }

  if (!Array.isArray(raw.overlays) || raw.overlays.length === 0) return [];

  const paths = [];
  for (const overlay of raw.overlays) {
    const resolved = resolveOverlayPath(String(overlay), configDir);
    if (!resolved) {
      log.warn(`overlay not found: ${overlay} (configured in ${configPath})`);
      continue;
    }
    paths.push(resolved);
  }
  return paths;
}

function resolveOverlayPath(overlay, configDir) {
  if (overlay.startsWith('./') || overlay.startsWith('../')) {
    const p = join(configDir, overlay);
    return existsSync(p) ? p : null;
  }
  if (overlay.startsWith('/')) {
    return existsSync(overlay) ? overlay : null;
  }
  // npm package: walk up from configDir looking for node_modules/<overlay>
  let dir = configDir;
  for (let i = 0; i < 15; i++) {
    const candidate = join(dir, 'node_modules', overlay);
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
