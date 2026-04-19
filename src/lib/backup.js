import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { getManifestPath } from './template.js';

export const BACKUPS_DIR = '.company-cc-backups';
const BACKUP_INFO = '.backup-info.json';

export async function createBackup(dest, manifestName, manifest) {
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const backupDir = join(dest, BACKUPS_DIR, ts);
  await mkdir(backupDir, { recursive: true });

  for (const rel of Object.keys(manifest.files || {})) {
    const src = join(dest, rel);
    if (!existsSync(src)) continue;
    const dst = join(backupDir, rel);
    await mkdir(dirname(dst), { recursive: true });
    await copyFile(src, dst);
  }

  const manifestSrc = getManifestPath(dest, manifestName);
  if (existsSync(manifestSrc)) {
    await copyFile(manifestSrc, join(backupDir, manifestName));
  }

  await writeFile(join(backupDir, BACKUP_INFO), JSON.stringify({
    timestamp: new Date().toISOString(),
    version: manifest.version ?? null,
    target: manifest.target ?? null,
    fileCount: Object.keys(manifest.files || {}).length,
  }, null, 2));

  return backupDir;
}

export async function listBackups(dest) {
  const backupsDir = join(dest, BACKUPS_DIR);
  if (!existsSync(backupsDir)) return [];
  const entries = await readdir(backupsDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()
    .reverse();
}

export async function getBackupInfo(dest, backupName) {
  const infoPath = join(dest, BACKUPS_DIR, backupName, BACKUP_INFO);
  if (!existsSync(infoPath)) return null;
  try {
    return JSON.parse(await readFile(infoPath, 'utf8'));
  } catch {
    return null;
  }
}

export function getBackupDir(dest, backupName) {
  return join(dest, BACKUPS_DIR, backupName);
}

export async function walkBackupDir(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = full.slice(baseDir.length + 1);
    if (e.isDirectory()) {
      files.push(...await walkBackupDir(full, baseDir));
    } else {
      files.push(rel);
    }
  }
  return files;
}
