import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { log } from '../lib/log.js';
import { readManifest, getManifestPath, getFileRecord } from '../lib/template.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function diff(flags, args) {
  const [relPath] = args;
  if (!relPath) {
    log.error('Usage: company-cc diff <path> [--target <claude|codex>]');
    return 1;
  }

  const targets = parseTargetFlag(flags.target);

  for (const target of targets) {
    const cfg = getTargetConfig(target);

    const profiles = [
      { name: 'user', dest: cfg.userDest, manifestName: cfg.userManifestName },
      { name: 'project', dest: cfg.projectDest, manifestName: cfg.projectManifestName },
    ];

    for (const { dest, manifestName } of profiles) {
      if (!existsSync(getManifestPath(dest, manifestName))) continue;
      const manifest = await readManifest(dest, manifestName);
      const record = getFileRecord(manifest, relPath);
      if (!record) continue;

      const destFile = join(dest, relPath);
      if (!existsSync(destFile)) {
        log.warn(`${relPath}: tracked in manifest but missing on disk`);
        return 0;
      }

      if (!record.source) {
        log.warn(`${relPath}: source not recorded — re-run \`company-cc init --force\` to update the manifest`);
        return 0;
      }

      const templateFile = join(record.source, relPath);
      if (!existsSync(templateFile)) {
        log.warn(`Template file not found at ${templateFile} — package may have been updated`);
        return 0;
      }

      const result = spawnSync('diff', [
        '-u',
        '--label', `template/${relPath}`,
        '--label', `${dest}/${relPath}`,
        templateFile,
        destFile,
      ], { encoding: 'utf8' });

      if (result.status === 0) {
        log.ok(`${relPath}: no differences from template`);
      } else if (result.status === 1) {
        console.log(result.stdout);
      } else {
        throw new Error(`diff failed: ${result.stderr}`);
      }

      return 0;
    }
  }

  log.error(`${relPath}: not tracked in any manifest for the selected target(s)`);
  return 1;
}
