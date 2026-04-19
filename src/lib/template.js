import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashBuffer, hashFile } from './hash.js';

const __filename = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = join(dirname(__filename), '..', '..');
export const TEMPLATES_ROOT = join(PACKAGE_ROOT, 'templates');

/** Walk a directory and yield files relative to it (posix-style paths). */
export async function listTemplateFiles(root) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) out.push(relative(root, full).split(sep).join('/'));
    }
  }
  await walk(root);
  return out.sort();
}

export async function ensureWritable(dir) {
  await mkdir(dir, { recursive: true });
  const probe = join(dir, '.company-cc-probe');
  try {
    await writeFile(probe, '');
    await unlink(probe);
  } catch (err) {
    throw new Error(`Destination directory is not writable: ${dir} (${err.message})`);
  }
}

export function getManifestPath(destRoot, manifestName) {
  return join(destRoot, manifestName);
}

export async function readManifest(destRoot, manifestName) {
  const path = getManifestPath(destRoot, manifestName);
  if (!existsSync(path)) return { version: null, installed: null, files: {} };
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return { version: null, installed: null, files: {} };
  }
}

export async function writeManifest(destRoot, manifestName, manifest) {
  await mkdir(destRoot, { recursive: true });
  await writeFile(
    getManifestPath(destRoot, manifestName),
    JSON.stringify(manifest, null, 2) + '\n'
  );
}

/**
 * Copy a single template file into destRoot using safe-overwrite semantics.
 *
 * Returns one of: 'created' | 'updated' | 'unchanged' | 'skipped-modified'
 *
 * - created: file did not exist, now written
 * - updated: file existed, was unmodified from install, overwritten with new version
 * - unchanged: file existed and already matches new template
 * - skipped-modified: file existed and user had edited it; left alone unless opts.force
 */
export async function applyTemplateFile(srcRoot, destRoot, relPath, manifest, opts = {}) {
  const src = join(srcRoot, relPath);
  const dest = join(destRoot, relPath);
  const srcBuf = await readFile(src);
  const srcHash = hashBuffer(srcBuf);

  const destExists = existsSync(dest);

  if (!destExists) {
    if (opts.dryRun) return 'created';
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, srcBuf);
    manifest.files[relPath] = srcHash;
    return 'created';
  }

  const destHash = await hashFile(dest);
  if (destHash === srcHash) {
    manifest.files[relPath] = srcHash;
    return 'unchanged';
  }

  const recordedHash = manifest.files[relPath];
  const userModified = recordedHash && recordedHash !== destHash;

  if (userModified && !opts.force) {
    return 'skipped-modified';
  }

  if (opts.dryRun) return 'updated';
  await writeFile(dest, srcBuf);
  manifest.files[relPath] = srcHash;
  return 'updated';
}
