import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import prompts from 'prompts';
import { log } from '../lib/log.js';
import { readManifest, writeManifest, getManifestPath, getFileRecord, hashBuffer } from '../lib/template.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function restore(flags, args) {
  const [relPath] = args;
  if (!relPath) {
    log.error('Usage: company-cc restore <path> [--target <claude|codex>] [--force]');
    return 1;
  }

  const targets = parseTargetFlag(flags.target, flags._customTargets);
  let found = false;

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);

    const profiles = [
      { dest: cfg.userDest, manifestName: cfg.userManifestName },
      { dest: cfg.projectDest, manifestName: cfg.projectManifestName },
    ];

    for (const { dest, manifestName } of profiles) {
      if (!existsSync(getManifestPath(dest, manifestName))) continue;
      const manifest = await readManifest(dest, manifestName);
      const record = getFileRecord(manifest, relPath);
      if (!record) continue;
      found = true;

      if (!record.source) {
        log.warn(`${relPath}: source not recorded — re-run \`company-cc init --force\` to update the manifest`);
        continue;
      }

      const templateFile = join(record.source, relPath);
      if (!existsSync(templateFile)) {
        log.error(`Template file not found: ${templateFile}`);
        continue;
      }

      if (!flags.force) {
        const { confirmed } = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: `Restore ${relPath} from template? Your local changes will be lost.`,
          initial: false,
        });
        if (!confirmed) {
          log.info('Cancelled.');
          continue;
        }
      }

      const buf = await readFile(templateFile);
      await writeFile(join(dest, relPath), buf);
      manifest.files[relPath] = { hash: hashBuffer(buf), source: record.source };
      await writeManifest(dest, manifestName, manifest);
      log.ok(`restored: ${relPath}`);
    }
  }

  if (!found) {
    log.error(`${relPath}: not tracked in any manifest for the selected target(s)`);
    return 1;
  }
  return 0;
}
