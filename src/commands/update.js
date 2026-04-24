import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
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
import { resolveSkillNames, filterSkillFiles } from '../lib/skills.js';

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
    const extrasSkillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');
    let extrasSelection = null; // null = project profile, no extras handling

    if (t.name === 'user') {
      if (!existsSync(extraDir)) {
        log.warn(`extras template directory missing: ${extraDir}`);
      } else {
        t.srcs.push(extraDir);
        if (manifest.extras == null) {
          // Old install (pre-0.3.0): shared/skills/ always had all 33 skills → migrate to full set
          extrasSelection = await resolveSkillNames(true, extrasSkillsDir);
        } else if (manifest.extras === false) {
          // Old install: false meant "user chose no extras"
          extrasSelection = [];
        } else if (isPreGroupsManifest(manifest)) {
          // Old install (pre-0.3.0): extras was a subset of the 7 old opt-ins; shared/skills
          // (33 skills) were always installed separately. Migrate to full set so the 33 aren't lost.
          log.dim('  Migrating pre-0.3.0 extras format → installing all skills');
          extrasSelection = await resolveSkillNames(true, extrasSkillsDir);
        } else {
          extrasSelection = await resolveSkillNames(manifest.extras, extrasSkillsDir);
        }
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
      const files = (extrasSelection !== null && src === extraDir)
        ? filterSkillFiles(allFiles, extrasSelection)
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

    const removedCount = extrasSelection !== null
      ? await removeStaleSkills(t.dest, extrasSelection, manifest, flags['dry-run'])
      : 0;

    if (!flags['dry-run']) {
      manifest.version = await getPackageVersion();
      manifest.installed = new Date().toISOString();
      manifest.target = t.target;
      if (t.name === 'user' && extrasSelection !== null) {
        manifest.extras = extrasSelection;
      }
      await writeManifest(t.dest, t.manifestName, manifest);
      if (removedCount > 0) log.dim('  Run `company-cc rollback` to undo');
    }

    log.info(
      `${counts.created} created, ${counts.updated} updated, ` +
      `${counts.unchanged} unchanged, ${counts['skipped-modified']} skipped` +
      (removedCount > 0 ? `, ${removedCount} removed` : '')
    );
  }
}

async function removeStaleSkills(dest, newSelection, manifest, dryRun) {
  const newSet = new Set(newSelection);
  const stale = Object.keys(manifest.files).filter(rel => {
    if (!rel.startsWith('skills/')) return false;
    return !newSet.has(rel.split('/')[1]);
  });
  for (const rel of stale) {
    if (dryRun) {
      log.warn(`would remove: ${rel}`);
    } else {
      await rm(join(dest, rel), { force: true });
      delete manifest.files[rel];
      log.ok(`removed    ${rel}`);
    }
  }
  return stale.length;
}

async function getPackageVersion() {
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  return pkg.version;
}

// 0.3.0 introduced skill groups and moved 33 shared skills into extra/.
// Pre-0.3.0 manifests stored only the 7 opt-in extras; the 33 shared skills were always installed.
function isPreGroupsManifest(manifest) {
  if (!Array.isArray(manifest.extras) || manifest.extras.length === 0) return false;
  const ver = manifest.version;
  if (!ver) return true; // very old manifest with no version field
  const [major, minor] = ver.split('.').map(Number);
  return major === 0 && minor < 3;
}
