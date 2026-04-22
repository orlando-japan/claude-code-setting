import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { log } from '../lib/log.js';
import { loadOverlays } from '../lib/config.js';
import { listTemplateFiles as walkTree } from '../lib/template.js';
import {
  TEMPLATES_ROOT,
  listTemplateFiles,
  readManifest,
  writeManifest,
  applyTemplateFile,
  ensureWritable,
} from '../lib/template.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';
import { listAllSkills, resolveSkillNames, buildCatalog } from '../lib/skills.js';

async function promptForInitFlags(flags) {
  if (!process.stdin.isTTY) return;

  const skillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');
  const allSkills = await listAllSkills(skillsDir);

  const questions = [
    {
      type: 'select',
      name: 'target',
      message: 'Installation target',
      choices: [
        { title: 'Claude Code  (~/.claude/)', value: 'claude' },
        { title: 'Codex        (~/.codex/)',  value: 'codex'  },
        { title: 'Both',                      value: 'both'   },
      ],
      initial: 0,
    },
    {
      type: 'select',
      name: 'scope',
      message: 'What to install',
      choices: [
        { title: 'User profile + project file', value: 'both'    },
        { title: 'User profile only',           value: 'user'    },
        { title: 'Project file only',           value: 'project' },
      ],
      initial: 0,
    },
  ];

  if (allSkills.size > 0) {
    const catalog = buildCatalog(allSkills, []);
    questions.push({
      type: 'multiselect',
      name: 'extras',
      message: 'Install skill groups  (space to toggle, enter to skip)',
      choices: catalog.map(({ group, skills }) => {
        const preview = skills.slice(0, 3).map(s => s.name).join(', ');
        const suffix = skills.length > 3 ? ` +${skills.length - 3}` : '';
        return {
          title: `${group.padEnd(10)} — ${preview}${suffix}`,
          value: group,
          selected: group === 'core',
        };
      }),
      instructions: false,
      hint: 'optional',
    });
  }

  const res = await prompts(questions, {
    onCancel: () => { log.info('Cancelled.'); process.exit(0); },
  });

  if (!res.target) return; // Ctrl+C or empty response

  if (res.target !== 'claude') flags.target = res.target;
  if (res.scope === 'user') flags.user = true;
  else if (res.scope === 'project') flags.project = true;
  // Always record the user's explicit choice: '' means "user deselected everything"
  if (res.extras !== undefined) {
    flags.extras = res.extras.length > 0 ? res.extras.join(',') : '';
  }
}

async function resolveExtras(extrasFlag) {
  const skillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');
  if (!existsSync(skillsDir)) {
    log.warn('extras directory not found in package, skipping');
    return null;
  }

  // '' means user went through interactive prompt and deselected everything
  if (extrasFlag === '' || extrasFlag === false) return [];

  // Translate special sentinels before passing to resolveSkillNames
  let selection;
  if (extrasFlag === undefined || extrasFlag === null || extrasFlag === true) {
    selection = 'core'; // bare --extras or no flag → default to core group
  } else if (extrasFlag === 'all') {
    selection = true;   // --extras=all → install everything
  } else {
    selection = extrasFlag; // group names, skill names, or mixed
  }

  return resolveSkillNames(selection, skillsDir);
}

function filterExtrasFiles(files, selected) {
  return files.filter(rel =>
    !rel.startsWith('skills/') ||
    selected.some(name => rel.startsWith(`skills/${name}/`))
  );
}

export async function init(flags) {
  const isDefaultCall = !flags.user && !flags.project && flags.extras === undefined && !flags.target;
  if (isDefaultCall) await promptForInitFlags(flags);

  const doUser = flags.user || (!flags.user && !flags.project);
  const doProject = flags.project || (!flags.user && !flags.project);
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const selectedExtras = await resolveExtras(flags.extras);

  const userOverlays = await loadOverlays(homedir());
  const projectOverlays = await loadOverlays(process.cwd());

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    if (doUser) {
      const srcRoots = [...cfg.userSrcs];
      if (selectedExtras) srcRoots.push(join(TEMPLATES_ROOT, 'extra'));
      srcRoots.push(...userOverlays);
      await installProfile(target, 'user', srcRoots, cfg.userDest, cfg.userManifestName, flags, selectedExtras);
    }
    if (doProject) {
      const srcRoots = [...cfg.projectSrcs, ...projectOverlays];
      await installProfile(target, 'project', srcRoots, cfg.projectDest, cfg.projectManifestName, flags, null);
    }
  }

  log.step('Next steps');
  log.dim('  1. Restart your coding tool to pick up new settings');
  log.dim('  2. Install OpenSpec if you want spec commands:');
  log.dim('       npm i -g @fission-ai/openspec');
  log.dim('  3. Run `company-cc doctor` to verify');
}

async function installProfile(target, name, srcRoots, destRoot, manifestName, flags, selectedExtras) {
  const label = target === 'claude' ? `${name} profile` : `${target} ${name} profile`;
  log.step(`Installing ${label} → ${destRoot}`);
  if (!flags['dry-run']) await ensureWritable(destRoot);
  const manifest = await readManifest(destRoot, manifestName);

  const extraDir = join(TEMPLATES_ROOT, 'extra');
  const counts = { created: 0, updated: 0, unchanged: 0, 'skipped-modified': 0 };
  for (const srcRoot of srcRoots) {
    const allFiles = await listTemplateFiles(srcRoot);
    const files = (selectedExtras && srcRoot === extraDir)
      ? filterExtrasFiles(allFiles, selectedExtras)
      : allFiles;
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
  manifest.target = target;
  if (name === 'user' && selectedExtras !== null) {
    manifest.extras = selectedExtras;
  }
  if (!flags['dry-run']) {
    await writeManifest(destRoot, manifestName, manifest);
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
