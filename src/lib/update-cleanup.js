import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { log } from './log.js';

export async function removeStaleSkills(destRoot, newSelection, manifest, dryRun) {
  const newSet = new Set(newSelection);
  const stale = Object.keys(manifest.files).filter(rel => {
    if (!rel.startsWith('skills/')) return false;
    return !newSet.has(rel.split('/')[1]);
  });

  for (const rel of stale) {
    if (dryRun) {
      log.warn(`would remove: ${rel}`);
    } else {
      await rm(join(destRoot, rel), { force: true });
      delete manifest.files[rel];
      log.ok(`removed    ${rel}`);
    }
  }

  return stale.length;
}
