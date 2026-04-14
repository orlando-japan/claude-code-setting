import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { log } from '../lib/log.js';
import {
  TEMPLATES_ROOT,
  listTemplateFiles,
  readManifest,
  writeManifest,
  applyTemplateFile,
} from '../lib/template.js';

const USER_CLAUDE_DIR = join(homedir(), '.claude');

export async function update(flags) {
  const targets = [];
  if (existsSync(join(USER_CLAUDE_DIR, '.company-cc-manifest.json'))) {
    targets.push({ name: 'user', srcs: [join(TEMPLATES_ROOT, 'user')], dest: USER_CLAUDE_DIR });
  }
  const cwdManifest = join(process.cwd(), '.company-cc-manifest.json');
  if (existsSync(cwdManifest)) {
    targets.push({
      name: 'project',
      srcs: [join(TEMPLATES_ROOT, 'project')],
      dest: process.cwd(),
    });
  }

  if (targets.length === 0) {
    log.warn('No existing install found (no manifest at ~/.claude/ or cwd).');
    log.dim('Run `company-cc init` first.');
    return;
  }

  for (const t of targets) {
    log.step(`Updating ${t.name} profile → ${t.dest}${flags['dry-run'] ? ' (dry-run)' : ''}`);
    const manifest = await readManifest(t.dest);
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
      manifest.installed = new Date().toISOString();
      await writeManifest(t.dest, manifest);
    }

    log.info(
      `${counts.created} created, ${counts.updated} updated, ` +
        `${counts.unchanged} unchanged, ${counts['skipped-modified']} skipped`
    );
  }
}
