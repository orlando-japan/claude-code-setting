import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { TEMPLATES_ROOT, listTemplateFiles, applyTemplateFile, writeManifest } from './template.js';
import { filterSkillFiles } from './skills.js';
import { log } from './log.js';

const extraDir = join(TEMPLATES_ROOT, 'extra');

export async function applyProfileSources({ srcRoots, destRoot, manifest, selectedExtras, force, dryRun, skippedModifiedMessage, quiet = false }) {
  const counts = { created: 0, updated: 0, unchanged: 0, 'skipped-modified': 0 };

  for (const srcRoot of srcRoots) {
    const allFiles = await listTemplateFiles(srcRoot);
    const files = (selectedExtras !== null && selectedExtras !== undefined && srcRoot === extraDir)
      ? filterSkillFiles(allFiles, selectedExtras)
      : allFiles;

    for (const rel of files) {
      const result = await applyTemplateFile(srcRoot, destRoot, rel, manifest, { force, dryRun });
      counts[result]++;
      if (!quiet) {
        if (result === 'skipped-modified') {
          log.warn(`${skippedModifiedMessage}${rel}`);
        } else if (result === 'created' || result === 'updated') {
          log.ok(`${result.padEnd(9)} ${rel}`);
        }
      }
    }
  }

  return counts;
}

export async function finalizeProfileManifest({ manifest, target, profileName, selectedExtras, destRoot, manifestName, dryRun }) {
  manifest.version = await getPackageVersion();
  manifest.installed = new Date().toISOString();
  manifest.target = target;
  if (profileName === 'user' && selectedExtras !== null && selectedExtras !== undefined) {
    manifest.extras = selectedExtras;
  }
  if (!dryRun) {
    await writeManifest(destRoot, manifestName, manifest);
  }
}

export function formatCounts(counts, removedCount = 0) {
  return `${counts.created} created, ${counts.updated} updated, ` +
    `${counts.unchanged} unchanged, ${counts['skipped-modified']} skipped` +
    (removedCount > 0 ? `, ${removedCount} removed` : '');
}

async function getPackageVersion() {
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  return pkg.version;
}
