import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { log } from '../lib/log.js';
import { readManifest, getManifestPath, getFileRecord } from '../lib/template.js';
import { hashFile } from '../lib/hash.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function status(flags) {
  const targets = parseTargetFlag(flags.target);
  const json = !!flags.json;
  let anyFound = false;
  const results = [];

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
      if (!json) log.step(`${label} — ${dest}`);

      const counts = { unchanged: 0, modified: 0, missing: 0 };
      const fileEntries = [];

      for (const relPath of files.sort()) {
        const full = join(dest, relPath);
        if (!existsSync(full)) {
          if (!json) log.warn(`missing          ${relPath}`);
          counts.missing++;
          fileEntries.push({ path: relPath, state: 'missing' });
          continue;
        }
        const diskHash = await hashFile(full);
        const { hash } = getFileRecord(manifest, relPath);
        if (diskHash === hash) {
          if (!json) log.ok(`unchanged        ${relPath}`);
          counts.unchanged++;
          fileEntries.push({ path: relPath, state: 'unchanged' });
        } else {
          if (!json) log.warn(`locally-modified ${relPath}`);
          counts.modified++;
          fileEntries.push({ path: relPath, state: 'locally-modified' });
        }
      }

      if (!json) {
        const parts = [`${counts.unchanged} unchanged`];
        if (counts.modified > 0) parts.push(`${counts.modified} locally-modified`);
        if (counts.missing > 0) parts.push(`${counts.missing} missing`);
        log.info(parts.join(', '));
      }

      results.push({ target, profile: name, dest, counts, files: fileEntries });
    }
  }

  if (json) {
    console.log(JSON.stringify({ initialized: anyFound, profiles: results }, null, 2));
    return;
  }

  if (!anyFound) {
    log.warn('No install found. Run `company-cc init` first.');
  }
}
