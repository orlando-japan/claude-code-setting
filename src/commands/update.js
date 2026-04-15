import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { log } from '../lib/log.js';
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
  const selectedTargets = parseTargetFlag(flags.target);
  const targets = [];

  for (const target of selectedTargets) {
    const cfg = getTargetConfig(target);
    if (existsSync(getManifestPath(cfg.userDest, cfg.userManifestName))) {
      targets.push({
        target,
        name: 'user',
        srcs: [...cfg.userSrcs],
        dest: cfg.userDest,
        manifestName: cfg.userManifestName,
      });
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

  for (const t of targets) {
    const label = t.target === 'claude' ? `${t.name} profile` : `${t.target} ${t.name} profile`;
    log.step(`Updating ${label} → ${t.dest}${flags['dry-run'] ? ' (dry-run)' : ''}`);
    const manifest = await readManifest(t.dest, t.manifestName);
    if (t.name === 'user' && manifest.extras) {
      t.srcs.push(join(TEMPLATES_ROOT, 'extra'));
    }

    const counts = { created: 0, updated: 0, unchanged: 0, 'skipped-modified': 0 };
    for (const src of t.srcs) {
      const files = await listTemplateFiles(src);
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
