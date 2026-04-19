import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { unlink, rmdir } from 'node:fs/promises';
import { log } from '../lib/log.js';
import { readManifest, getManifestPath } from '../lib/template.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function uninstall(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const dryRun = !flags.confirm;

  if (dryRun) {
    log.info('Dry-run — pass --confirm to actually remove files\n');
  }

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);

    const profiles = [
      { name: 'user', dest: cfg.userDest, manifestName: cfg.userManifestName },
      { name: 'project', dest: cfg.projectDest, manifestName: cfg.projectManifestName },
    ];

    for (const { name, dest, manifestName } of profiles) {
      const manifestPath = getManifestPath(dest, manifestName);
      if (!existsSync(manifestPath)) continue;

      const label = target === 'claude' ? `${name} profile` : `${target} ${name} profile`;
      log.step(`${dryRun ? '[dry-run] ' : ''}Uninstalling ${label} — ${dest}`);

      const manifest = await readManifest(dest, manifestName);
      const trackedFiles = Object.keys(manifest.files || {}).sort().reverse();

      const removedDirs = new Set();

      for (const relPath of trackedFiles) {
        const full = join(dest, relPath);
        if (!existsSync(full)) {
          log.dim(`  already gone: ${relPath}`);
          continue;
        }
        if (dryRun) {
          log.info(`  would remove: ${relPath}`);
        } else {
          await unlink(full);
          log.ok(`  removed: ${relPath}`);
          removedDirs.add(dirname(full));
        }
      }

      if (dryRun) {
        log.info(`  would remove: ${manifestName}`);
      } else {
        // remove empty parent dirs (deepest first, already sorted reversed)
        for (const dir of [...removedDirs].sort((a, b) => b.length - a.length)) {
          if (dir === dest) continue;
          try { await rmdir(dir); } catch { /* not empty, skip */ }
        }
        await unlink(manifestPath);
        log.ok(`  removed: ${manifestName}`);
        log.info(`Uninstall complete. Run \`company-cc init\` to reinstall.`);
      }
    }
  }
}
