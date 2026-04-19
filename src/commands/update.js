import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { log } from '../lib/log.js';
import { loadOverlays } from '../lib/config.js';
import { createBackup } from '../lib/backup.js';
import {
  getManifestPath,
  TEMPLATES_ROOT,
  listTemplateFiles,
  readManifest,
  writeManifest,
  applyTemplateFile,
} from '../lib/template.js';
import { getTargetConfig, parseTargetFlag, TARGETS } from '../lib/targets.js';

export async function update(flags) {
  const selectedTargets = parseTargetFlag(flags.target, flags._customTargets);
  const targets = [];

  for (const target of selectedTargets) {
    const cfg = getTargetConfig(target, flags._customTargets);

    const userManifestExists = existsSync(getManifestPath(cfg.userDest, cfg.userManifestName));
    if (userManifestExists) {
      targets.push({
        target,
        name: 'user',
        srcs: [...cfg.userSrcs],
        dest: cfg.userDest,
        manifestName: cfg.userManifestName,
      });
    } else if (existsSync(cfg.userDest)) {
      const flag = target === 'claude' ? '--user' : `--user --target ${target}`;
      log.warn(`manifest missing in ${cfg.userDest} — run \`company-cc init ${flag}\` to restore`);
    }

    if (existsSync(getManifestPath(cfg.projectDest, cfg.projectManifestName))) {
      targets.push({
        target,
        name: 'project',
        srcs: [...cfg.projectSrcs],
        dest: cfg.projectDest,
        manifestName: cfg.projectManifestName,
      });
    }
  }

  if (targets.length === 0) {
    const targetLabel = selectedTargets.length === TARGETS.length ? 'any selected target' : selectedTargets[0];
    log.warn(`No existing install found for ${targetLabel}.`);
    log.dim('Run `company-cc init` first.');
    return;
  }

  const userOverlays = await loadOverlays(homedir());
  const projectOverlays = await loadOverlays(process.cwd());

  for (const t of targets) {
    const label = t.target === 'claude' ? `${t.name} profile` : `${t.target} ${t.name} profile`;
    log.step(`Updating ${label} → ${t.dest}${flags['dry-run'] ? ' (dry-run)' : ''}`);
    const manifest = await readManifest(t.dest, t.manifestName);
    const extraDir = join(TEMPLATES_ROOT, 'extra');
    let extrasSelection = null; // null = install all extras; array = install only those

    if (t.name === 'user' && manifest.extras) {
      if (!existsSync(extraDir)) {
        log.warn(`extras were enabled at install time but template directory is missing: ${extraDir}`);
      } else {
        t.srcs.push(extraDir);
        extrasSelection = Array.isArray(manifest.extras) ? manifest.extras : null;
      }
    }

    const overlays = t.name === 'user' ? userOverlays : projectOverlays;
    t.srcs.push(...overlays);

    if (t.name === 'user' && !flags['dry-run']) {
      try {
        const backupPath = await createBackup(t.dest, t.manifestName, manifest);
        log.dim(`  backup: ${backupPath}`);
      } catch (err) {
        log.warn(`backup failed (${err.message}) — continuing without backup`);
      }
    }

    const counts = { created: 0, updated: 0, unchanged: 0, 'skipped-modified': 0 };
    for (const src of t.srcs) {
      const allFiles = await listTemplateFiles(src);
      const files = (extrasSelection && src === extraDir)
        ? allFiles.filter(rel =>
            !rel.startsWith('skills/') ||
            extrasSelection.some(name => rel.startsWith(`skills/${name}/`))
          )
        : allFiles;
      for (const rel of files) {
        const result = await applyTemplateFile(src, t.dest, rel, manifest, {
          force: flags.force,
          dryRun: flags['dry-run'],
        });
        counts[result]++;
        if (result === 'skipped-modified') {
          log.warn(`skipped (locally modified): ${rel}  — use --force to overwrite`);
        } else if (result === 'created' || result === 'updated') {
          log.ok(`${result.padEnd(9)} ${rel}`);
        }
      }
    }

    if (!flags['dry-run']) {
      manifest.version = await getPackageVersion();
      manifest.installed = new Date().toISOString();
      manifest.target = t.target;
      await writeManifest(t.dest, t.manifestName, manifest);
    }

    log.info(
      `${counts.created} created, ${counts.updated} updated, ` +
      `${counts.unchanged} unchanged, ${counts['skipped-modified']} skipped`
    );
  }
}

async function getPackageVersion() {
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  return pkg.version;
}
