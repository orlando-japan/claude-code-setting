import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { log } from '../lib/log.js';
import { listTemplateFiles as walkTree } from '../lib/template.js';
import {
  TEMPLATES_ROOT,
  listTemplateFiles,
  readManifest,
  writeManifest,
  applyTemplateFile,
} from '../lib/template.js';

const USER_CLAUDE_DIR = join(homedir(), '.claude');

export async function init(flags) {
  const doUser = flags.user || (!flags.user && !flags.project);
  const doProject = flags.project || (!flags.user && !flags.project);

  if (doUser) {
    const srcRoots = [join(TEMPLATES_ROOT, 'user')];
    if (flags.extras) srcRoots.push(join(TEMPLATES_ROOT, 'extra'));
    await installProfile('user', srcRoots, USER_CLAUDE_DIR, flags);
  }
  if (doProject) {
    const projectRoot = process.cwd();
    await installProfile('project', [join(TEMPLATES_ROOT, 'project')], projectRoot, flags);
  }

  log.step('Next steps');
  log.dim('  1. Restart Claude Code to pick up new settings');
  log.dim('  2. Install OpenSpec if you want spec commands:');
  log.dim('       npm i -g @fission-ai/openspec');
  log.dim('  3. Run `company-cc doctor` to verify');
}

async function installProfile(name, srcRoots, destRoot, flags) {
  log.step(`Installing ${name} profile → ${destRoot}`);
  const manifest = await readManifest(destRoot);

  const counts = { created: 0, updated: 0, unchanged: 0, 'skipped-modified': 0 };
  for (const srcRoot of srcRoots) {
    const files = await listTemplateFiles(srcRoot);
    for (const rel of files) {
      const result = await applyTemplateFile(srcRoot, destRoot, rel, manifest, {
        force: flags.force,
        dryRun: flags['dry-run'],
      });
      counts[result]++;
      if (result === 'skipped-modified') {
        log.warn(`skipped (locally modified): ${rel}`);
      } else if (result === 'created' || result === 'updated') {
        log.ok(`${result.padEnd(9)} ${rel}`);
      }
    }
  }

  manifest.version = await getPackageVersion();
  manifest.installed = new Date().toISOString();
  if (name === 'user') manifest.extras = !!flags.extras || manifest.extras === true;
  if (!flags['dry-run']) {
    await writeManifest(destRoot, manifest);
    await makeHooksExecutable(destRoot);
  }

  log.info(
    `${counts.created} created, ${counts.updated} updated, ` +
      `${counts.unchanged} unchanged, ${counts['skipped-modified']} skipped`
  );
}

async function makeHooksExecutable(destRoot) {
  const hooksDir = join(destRoot, 'hooks');
  if (!existsSync(hooksDir)) return;
  const files = await walkTree(hooksDir);
  for (const rel of files) {
    if (rel.endsWith('.sh') || rel.endsWith('.js') || rel.endsWith('.py')) {
      await chmod(join(hooksDir, rel), 0o755);
    }
  }
}

async function getPackageVersion() {
  const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  return pkg.version;
}
