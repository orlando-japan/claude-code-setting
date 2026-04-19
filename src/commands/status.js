import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { log } from '../lib/log.js';
import { readManifest, getManifestPath, getFileRecord } from '../lib/template.js';
import { hashFile } from '../lib/hash.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function status(flags) {
  const targets = parseTargetFlag(flags.target);
  let anyFound = false;

  for (const target of targets) {
    const cfg = getTargetConfig(target);

    const profiles = [
      { name: 'user', dest: cfg.userDest, manifestName: cfg.userManifestName },
      { name: 'project', dest: cfg.projectDest, manifestName: cfg.projectManifestName },
    ];

    for (const { name, dest, manifestName } of profiles) {
      if (!existsSync(getManifestPath(dest, manifestName))) continue;
      anyFound = true;

      const manifest = await readManifest(dest, manifestName);
      const files = Object.keys(manifest.files || {});
      if (files.length === 0) continue;

      const label = target === 'claude' ? `${name} profile` : `${target} ${name} profile`;
      log.step(`${label} — ${dest}`);

      const counts = { unchanged: 0, modified: 0, missing: 0 };

      for (const relPath of files.sort()) {
        const full = join(dest, relPath);
        if (!existsSync(full)) {
          log.warn(`missing          ${relPath}`);
          counts.missing++;
          continue;
        }
        const diskHash = await hashFile(full);
        const { hash } = getFileRecord(manifest, relPath);
        if (diskHash === hash) {
          log.ok(`unchanged        ${relPath}`);
          counts.unchanged++;
        } else {
          log.warn(`locally-modified ${relPath}`);
          counts.modified++;
        }
      }

      const parts = [`${counts.unchanged} unchanged`];
      if (counts.modified > 0) parts.push(`${counts.modified} locally-modified`);
      if (counts.missing > 0) parts.push(`${counts.missing} missing`);
      log.info(parts.join(', '));
    }
  }

  if (!anyFound) {
    log.warn('No install found. Run `company-cc init` first.');
  }
}
