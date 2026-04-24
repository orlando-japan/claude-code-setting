import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { unlink, rmdir } from 'node:fs/promises';
import { log } from '../lib/log.js';
import { TEMPLATES_ROOT, readManifest, writeManifest, getManifestPath, getFileRecord } from '../lib/template.js';
import { hashFile } from '../lib/hash.js';
import { createBackup } from '../lib/backup.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';
import { listAllSkills, buildCatalog } from '../lib/skills.js';

export async function skills(flags, positional = []) {
  const sub = positional[0];

  if (!sub || sub === 'list') {
    return skillsList(flags);
  }
  if (sub === 'remove') {
    return skillsRemove(flags, positional.slice(1));
  }
  log.error(`Unknown subcommand: ${sub}. Use "list" or "remove".`);
  return 1;
}

async function skillsList(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const target = targets[0];
  const cfg = getTargetConfig(target, flags._customTargets);

  const manifestPath = getManifestPath(cfg.userDest, cfg.userManifestName);
  if (!existsSync(manifestPath)) {
    log.warn(`No user install found for ${target}. Run \`company-cc init --user\` first.`);
    return 1;
  }

  const manifest = await readManifest(cfg.userDest, cfg.userManifestName);
  const installedNames = Object.keys(manifest.files || {})
    .filter(p => p.startsWith('skills/'))
    .map(p => p.split('/')[1])
    .filter(Boolean);
  const installedSet = new Set(installedNames);

  const skillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');
  const allSkills = await listAllSkills(skillsDir);
  const catalog = buildCatalog(allSkills, [...installedSet]);

  if (flags.json) {
    const out = catalog.map(({ group, skills: groupSkills }) => ({
      group,
      skills: groupSkills.map(s => ({ name: s.name, description: s.description, installed: s.installed })),
    }));
    console.log(JSON.stringify(out, null, 2));
    return 0;
  }

  for (const { group, skills: groupSkills } of catalog) {
    const installedCount = groupSkills.filter(s => s.installed).length;
    const statusLabel = installedCount === groupSkills.length
      ? '[installed]'
      : installedCount > 0
        ? `[${installedCount}/${groupSkills.length} installed]`
        : '[not installed]';
    const header = `${group.padEnd(12)} ${String(groupSkills.length).padStart(2)} skills  ${statusLabel}`;
    log.step(header);
    for (const s of groupSkills) {
      const mark = s.installed ? '✓' : '-';
      const desc = s.description.length > 55 ? s.description.slice(0, 52) + '…' : s.description;
      console.log(`  ${mark} ${s.name.padEnd(28)} ${desc}`);
    }
  }

  return 0;
}

async function skillsRemove(flags, names) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const target = targets[0];
  const cfg = getTargetConfig(target, flags._customTargets);
  const dryRun = !flags.confirm;

  const manifestPath = getManifestPath(cfg.userDest, cfg.userManifestName);
  if (!existsSync(manifestPath)) {
    log.warn(`No user install found for ${target}.`);
    return 1;
  }

  const manifest = await readManifest(cfg.userDest, cfg.userManifestName);
  const skillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');
  const allSkills = await listAllSkills(skillsDir);

  // Resolve targets: --group expands to all skills in that group, positional args are skill names
  const toRemove = new Set();

  if (flags.group) {
    const groupName = flags.group;
    let found = false;
    for (const [name, meta] of allSkills) {
      if (meta.group === groupName) {
        toRemove.add(name);
        found = true;
      }
    }
    if (!found) {
      const groups = [...new Set([...allSkills.values()].map(m => m.group).filter(Boolean))].sort();
      log.error(`Unknown group: ${groupName}. Available groups: ${groups.join(', ')}`);
      return 1;
    }
  }

  for (const name of names) {
    if (!allSkills.has(name)) {
      log.error(`Unknown skill: ${name}`);
      return 1;
    }
    toRemove.add(name);
  }

  if (toRemove.size === 0) {
    log.warn('No skills specified. Pass skill names or --group=<name>.');
    return 1;
  }

  // Find actually installed files for the targeted skills
  const installedFiles = Object.keys(manifest.files || {}).filter(rel => {
    if (!rel.startsWith('skills/')) return false;
    return toRemove.has(rel.split('/')[1]);
  });

  const notInstalled = [...toRemove].filter(name =>
    !installedFiles.some(rel => rel.startsWith(`skills/${name}/`))
  );
  for (const name of notInstalled) {
    log.warn(`${name} is not installed, skipping`);
  }

  if (installedFiles.length === 0) {
    log.info('Nothing to remove.');
    return 0;
  }

  if (dryRun) {
    log.info('Dry-run — pass --confirm to actually remove files\n');
    for (const rel of installedFiles.sort()) {
      log.info(`  would remove: ${rel}`);
    }
    return 0;
  }

  // Backup before any destructive changes
  try {
    const backupPath = await createBackup(cfg.userDest, cfg.userManifestName, manifest);
    log.dim(`  backup: ${backupPath}`);
  } catch (err) {
    log.warn(`backup failed (${err.message}) — continuing without backup`);
  }

  const removedDirs = new Set();
  let removedCount = 0;
  for (const rel of installedFiles.sort().reverse()) {
    const full = join(cfg.userDest, rel);
    if (!existsSync(full)) {
      delete manifest.files[rel];
      continue;
    }

    // Skip locally modified files unless --force
    if (!flags.force) {
      const record = getFileRecord(manifest, rel);
      if (record?.hash) {
        const currentHash = await hashFile(full);
        if (currentHash !== record.hash) {
          log.warn(`skipped (locally modified): ${rel}  — use --force to remove`);
          continue;
        }
      }
    }

    await unlink(full);
    removedDirs.add(dirname(full));
    delete manifest.files[rel];
    log.ok(`removed    ${rel}`);
    removedCount++;
  }

  // Clean up empty skill directories
  for (const dir of [...removedDirs].sort((a, b) => b.length - a.length)) {
    if (dir === cfg.userDest) continue;
    try { await rmdir(dir); } catch { /* not empty */ }
  }

  // Update manifest.extras
  if (Array.isArray(manifest.extras)) {
    manifest.extras = manifest.extras.filter(name => !toRemove.has(name));
  }

  await writeManifest(cfg.userDest, cfg.userManifestName, manifest);
  log.info(`Removed ${removedCount} file(s). Run \`company-cc rollback\` to undo.`);

  return 0;
}
