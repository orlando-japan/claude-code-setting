import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { unlink, rmdir } from 'node:fs/promises';
import { log } from '../lib/log.js';
import { readManifest, getManifestPath } from '../lib/template.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function uninstall(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const dryRun = !flags.confirm;
  const json = !!flags.json;
  const results = [];

  if (dryRun && !json) {
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
      if (!json) log.step(`${dryRun ? '[dry-run] ' : ''}Uninstalling ${label} — ${dest}`);

      const manifest = await readManifest(dest, manifestName);
      const trackedFiles = Object.keys(manifest.files || {}).sort().reverse();

      const removedDirs = new Set();
      const files = [];
      let removedCount = 0;
      let alreadyGoneCount = 0;

      for (const relPath of trackedFiles) {
        const full = join(dest, relPath);
        if (!existsSync(full)) {
          if (!json) log.dim(`  already gone: ${relPath}`);
          files.push({ path: relPath, action: 'already-gone' });
          alreadyGoneCount++;
          continue;
        }
        if (dryRun) {
          if (!json) log.info(`  would remove: ${relPath}`);
          files.push({ path: relPath, action: 'would-remove' });
        } else {
          await unlink(full);
          if (!json) log.ok(`  removed: ${relPath}`);
          files.push({ path: relPath, action: 'removed' });
          removedCount++;
          removedDirs.add(dirname(full));
        }
      }

      let manifestRemoved = false;
      if (dryRun) {
        if (!json) log.info(`  would remove: ${manifestName}`);
      } else {
        for (const dir of [...removedDirs].sort((a, b) => b.length - a.length)) {
          if (dir === dest) continue;
          try { await rmdir(dir); } catch { /* not empty, skip */ }
        }
        await unlink(manifestPath);
        manifestRemoved = true;
        if (!json) {
          log.ok(`  removed: ${manifestName}`);
          log.info(`Uninstall complete. Run \`company-cc init\` to reinstall.`);
        }
      }

      results.push({
        target,
        profile: name,
        dest,
        manifestName,
        dryRun,
        files,
        summary: {
          trackedCount: trackedFiles.length,
          removedCount,
          alreadyGoneCount,
          manifestRemoved,
        },
      });
    }
  }

  if (json) {
    console.log(JSON.stringify({
      ok: true,
      command: 'uninstall',
      targets,
      profiles: results,
      warnings: [],
      summary: { profileCount: results.length },
    }, null, 2));
  }
}
