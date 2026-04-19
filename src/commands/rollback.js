import { join, dirname } from 'node:path';
import { mkdir, copyFile } from 'node:fs/promises';
import { log } from '../lib/log.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';
import { listBackups, getBackupInfo, getBackupDir, walkBackupDir, BACKUPS_DIR } from '../lib/backup.js';

export async function rollback(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const confirm = !!flags.confirm;
  const listOnly = !!flags.list;

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    const backups = await listBackups(cfg.userDest);
    const label = target === 'claude' ? 'user profile' : `${target} user profile`;

    if (backups.length === 0) {
      log.warn(`${label}: no backups found in ${cfg.userDest}`);
      continue;
    }

    if (listOnly) {
      log.step(`${label} — ${backups.length} backup(s)`);
      for (const name of backups) {
        const info = await getBackupInfo(cfg.userDest, name);
        const detail = info ? `${info.fileCount} files, v${info.version ?? '?'}` : '';
        log.info(`  ${name}${detail ? `  (${detail})` : ''}`);
      }
      continue;
    }

    const backupName = backups[0];
    const backupDir = getBackupDir(cfg.userDest, backupName);
    const info = await getBackupInfo(cfg.userDest, backupName);

    log.step(`${label} — rollback to ${backupName}`);
    if (info) {
      log.dim(`  ${info.fileCount} file(s), v${info.version ?? '?'}, created ${info.timestamp}`);
    }

    const allFiles = (await walkBackupDir(backupDir)).filter(f => f !== '.backup-info.json');

    if (!confirm) {
      log.dim('  Dry-run — pass --confirm to restore\n');
      for (const rel of allFiles) {
        log.info(`  would restore: ${rel}`);
      }
      continue;
    }

    for (const rel of allFiles) {
      const src = join(backupDir, rel);
      const dst = join(cfg.userDest, rel);
      await mkdir(dirname(dst), { recursive: true });
      await copyFile(src, dst);
      log.ok(`  restored: ${rel}`);
    }
    log.ok(`${label}: rollback complete`);
  }
}
