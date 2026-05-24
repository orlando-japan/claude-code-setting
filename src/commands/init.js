import { join } from 'node:path';
import { homedir } from 'node:os';
import { chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import prompts from 'prompts';
import { log } from '../lib/log.js';
import { loadOverlays } from '../lib/config.js';
import { listTemplateFiles as walkTree } from '../lib/template.js';
import {
  TEMPLATES_ROOT,
  readManifest,
  ensureWritable,
} from '../lib/template.js';
import { listAllSkills, buildCatalog } from '../lib/skills.js';
import { resolveExtras } from '../lib/extras.js';
import { buildInitPlans } from '../lib/profile-plans.js';
import { applyProfileSources, finalizeProfileManifest, formatCounts } from '../lib/profile-runner.js';

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

export async function init(flags) {
  const isDefaultCall = !flags.user && !flags.project && flags.extras === undefined && !flags.target;
  if (isDefaultCall) await promptForInitFlags(flags);

  const json = !!flags.json;
  const selectedExtras = await resolveExtras(flags.extras);

  const userOverlays = await loadOverlays(homedir());
  const projectOverlays = await loadOverlays(process.cwd());
  const plans = buildInitPlans({ flags, selectedExtras, userOverlays, projectOverlays });
  const profiles = [];

  for (const plan of plans) {
    profiles.push(await installProfile(plan, flags));
  }

  if (json) {
    console.log(JSON.stringify({
      ok: true,
      command: 'init',
      targets: [...new Set(plans.map(plan => plan.target))],
      profiles,
      warnings: [],
      summary: {
        profileCount: profiles.length,
      },
    }, null, 2));
    return;
  }

  log.step('Next steps');
  log.dim('  1. Restart your coding tool to pick up new settings');
  log.dim('  2. Install OpenSpec if you want spec commands:');
  log.dim('       npm i -g @fission-ai/openspec');
  log.dim('  3. Run `company-cc doctor` to verify');
}

async function installProfile(plan, flags) {
  const { target, profileName, srcRoots, destRoot, manifestName, selectedExtras } = plan;
  const label = target === 'claude' ? `${profileName} profile` : `${target} ${profileName} profile`;
  const json = !!flags.json;
  if (!json) log.step(`Installing ${label} → ${destRoot}`);
  if (!flags['dry-run']) await ensureWritable(destRoot);
  const manifest = await readManifest(destRoot, manifestName);

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

  await finalizeProfileManifest({
    manifest,
    target,
    profileName,
    selectedExtras,
    destRoot,
    manifestName,
    dryRun: flags['dry-run'],
  });

  if (!flags['dry-run']) {
    await makeHooksExecutable(destRoot);
  }

  if (!json) log.info(formatCounts(counts));

  return {
    target,
    profile: profileName,
    dest: destRoot,
    manifestName,
    dryRun: !!flags['dry-run'],
    selectedExtras,
    counts: {
      created: counts.created,
      updated: counts.updated,
      unchanged: counts.unchanged,
      skippedModified: counts['skipped-modified'],
      removed: 0,
    },
  };
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

