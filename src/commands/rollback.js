import { join, dirname } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';
import { log } from '../lib/log.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';
import { listBackups, getBackupInfo, getBackupDir, walkBackupDir, BACKUPS_DIR } from '../lib/backup.js';

export async function rollback(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const confirm = !!flags.confirm;
  const listOnly = !!flags.list;
  const json = !!flags.json;
  const results = [];

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    const backups = await listBackups(cfg.userDest);
    const label = target === 'claude' ? 'user profile' : `${target} user profile`;

    if (backups.length === 0) {
      if (!json) log.warn(`${label}: no backups found in ${cfg.userDest}`);
      results.push({ target, dest: cfg.userDest, backups: [], selectedBackup: null, restoredFiles: [], warning: 'no backups found' });
      continue;
    }

    if (listOnly) {
      const backupEntries = [];
      if (!json) log.step(`${label} — ${backups.length} backup(s)`);
      for (const name of backups) {
        const info = await getBackupInfo(cfg.userDest, name);
        backupEntries.push({ name, info });
        if (!json) {
          const detail = info ? `${info.fileCount} files, v${info.version ?? '?'}` : '';
          log.info(`  ${name}${detail ? `  (${detail})` : ''}`);
        }
      }
      results.push({ target, dest: cfg.userDest, backups: backupEntries, selectedBackup: null, restoredFiles: [], listOnly: true });
      continue;
    }

    const backupName = backups[0];
    const backupDir = getBackupDir(cfg.userDest, backupName);
    const info = await getBackupInfo(cfg.userDest, backupName);

    if (!json) {
      log.step(`${label} — rollback to ${backupName}`);
      if (info) {
        log.dim(`  ${info.fileCount} file(s), v${info.version ?? '?'}, created ${info.timestamp}`);
      }
    }

    const allFiles = (await walkBackupDir(backupDir)).filter(f => f !== '.backup-info.json');
    const restoredFiles = [];

    if (!confirm) {
      if (!json) {
        log.dim('  Dry-run — pass --confirm to restore\n');
        for (const rel of allFiles) {
          log.info(`  would restore: ${rel}`);
        }
      }
      results.push({ target, dest: cfg.userDest, backups: [], selectedBackup: { name: backupName, info }, restoredFiles: allFiles, dryRun: true });
      continue;
    }

    for (const rel of allFiles) {
      const src = join(backupDir, rel);
      const dst = join(cfg.userDest, rel);
      await mkdir(dirname(dst), { recursive: true });
      await copyFile(src, dst);
      restoredFiles.push(rel);
      if (!json) log.ok(`  restored: ${rel}`);
    }
    if (!json) log.ok(`${label}: rollback complete`);
    results.push({ target, dest: cfg.userDest, backups: [], selectedBackup: { name: backupName, info }, restoredFiles, dryRun: false });
  }

  if (json) {
    console.log(JSON.stringify({
      ok: true,
      command: 'rollback',
      targets,
      mode: listOnly ? 'list' : confirm ? 'confirm' : 'dry-run',
      profiles: results,
      warnings: results.filter(r => r.warning).map(r => `${r.target}: ${r.warning}`),
      summary: { profileCount: results.length },
    }, null, 2));
  }
}
