import { homedir } from 'node:os';
import { log } from '../lib/log.js';
import { loadOverlays } from '../lib/config.js';
import { createBackup } from '../lib/backup.js';
import { buildUpdatePlans } from '../lib/profile-plans.js';
import { applyProfileSources, finalizeProfileManifest, formatCounts } from '../lib/profile-runner.js';
import { removeStaleSkills } from '../lib/update-cleanup.js';

export async function update(flags) {
  const json = !!flags.json;
  const userOverlays = await loadOverlays(homedir());
  const projectOverlays = await loadOverlays(process.cwd());
  const { plans, warnings, targetLabel, selectedTargets } = await buildUpdatePlans({ flags, userOverlays, projectOverlays });
  const profiles = [];

  if (!json) {
    for (const warning of warnings) {
      if (warning.startsWith('  ')) log.dim(warning);
      else log.warn(warning);
    }
  }

  if (plans.length === 0) {
    if (json) {
      console.log(JSON.stringify({
        ok: true,
        command: 'update',
        targets: selectedTargets,
        profiles: [],
        warnings,
        summary: { profileCount: 0 },
      }, null, 2));
      return;
    }
    log.warn(`No existing install found for ${targetLabel}.`);
    log.dim('Run `company-cc init` first.');
    return;
  }

  for (const plan of plans) {
    const { target, profileName, destRoot, manifestName, manifest, srcRoots, selectedExtras, needsBackup } = plan;
    const label = target === 'claude' ? `${profileName} profile` : `${target} ${profileName} profile`;
    if (!json) log.step(`Updating ${label} → ${destRoot}${flags['dry-run'] ? ' (dry-run)' : ''}`);

    let backup = { created: false, path: null, error: null };
    if (needsBackup && !flags['dry-run']) {
      try {
        const backupPath = await createBackup(destRoot, manifestName, manifest);
        backup = { created: true, path: backupPath, error: null };
        if (!json) log.dim(`  backup: ${backupPath}`);
      } catch (err) {
        backup = { created: false, path: null, error: err.message };
        if (!json) log.warn(`backup failed (${err.message}) — continuing without backup`);
      }
    }

    const counts = await applyProfileSources({
      srcRoots,
      destRoot,
      manifest,
      selectedExtras,
      force: flags.force,
      dryRun: flags['dry-run'],
      skippedModifiedMessage: 'skipped (locally modified): ',
      quiet: json,
    });

    const removedCount = selectedExtras !== null
      ? await removeStaleSkills(destRoot, selectedExtras, manifest, flags['dry-run'])
      : 0;

    await finalizeProfileManifest({
      manifest,
      target,
      profileName,
      selectedExtras,
      destRoot,
      manifestName,
      dryRun: flags['dry-run'],
    });

    if (!json && !flags['dry-run']) {
      if (removedCount > 0) log.dim('  Run `company-cc rollback` to undo');
    }

    if (!json) log.info(formatCounts(counts, removedCount));

    profiles.push({
      target,
      profile: profileName,
      dest: destRoot,
      manifestName,
      dryRun: !!flags['dry-run'],
      counts: {
        created: counts.created,
        updated: counts.updated,
        unchanged: counts.unchanged,
        skippedModified: counts['skipped-modified'],
        removed: removedCount,
      },
      backup,
      cleanup: {
        performed: selectedExtras !== null,
        removed: removedCount,
      },
    });
  }

  if (json) {
    console.log(JSON.stringify({
      ok: true,
      command: 'update',
      targets: selectedTargets,
      profiles,
      warnings,
      summary: { profileCount: profiles.length },
    }, null, 2));
  }
}


