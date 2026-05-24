import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { TEMPLATES_ROOT, getManifestPath, readManifest } from './template.js';
import { getTargetConfig, parseTargetFlag, TARGETS } from './targets.js';
import { resolveSkillNames } from './skills.js';

const extraDir = join(TEMPLATES_ROOT, 'extra');
const extrasSkillsDir = join(TEMPLATES_ROOT, 'extra', 'skills');

export function buildInitPlans({ flags, selectedExtras, userOverlays, projectOverlays }) {
  const doUser = flags.user || (!flags.user && !flags.project);
  const doProject = flags.project || (!flags.user && !flags.project);
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const plans = [];

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);

    if (doUser) {
      const srcRoots = [...cfg.userSrcs];
      if (selectedExtras) srcRoots.push(extraDir);
      srcRoots.push(...userOverlays);
      plans.push({
        target,
        profileName: 'user',
        destRoot: cfg.userDest,
        manifestName: cfg.userManifestName,
        srcRoots,
        selectedExtras,
      });
    }

    if (doProject) {
      plans.push({
        target,
        profileName: 'project',
        destRoot: cfg.projectDest,
        manifestName: cfg.projectManifestName,
        srcRoots: [...cfg.projectSrcs, ...projectOverlays],
        selectedExtras: null,
      });
    }
  }

  return plans;
}

export async function buildUpdatePlans({ flags, userOverlays, projectOverlays }) {
  const selectedTargets = parseTargetFlag(flags.target, flags._customTargets);
  const plans = [];
  const warnings = [];

  for (const target of selectedTargets) {
    const cfg = getTargetConfig(target, flags._customTargets);

    const userManifestPath = getManifestPath(cfg.userDest, cfg.userManifestName);
    if (existsSync(userManifestPath)) {
      const manifest = await readManifest(cfg.userDest, cfg.userManifestName);
      const extras = await resolveUpdateExtrasSelection(manifest);
      warnings.push(...extras.warnings);
      const srcRoots = [...cfg.userSrcs];
      if (extras.includeExtraDir) srcRoots.push(extraDir);
      srcRoots.push(...userOverlays);
      plans.push({
        target,
        profileName: 'user',
        destRoot: cfg.userDest,
        manifestName: cfg.userManifestName,
        srcRoots,
        selectedExtras: extras.selectedExtras,
        manifest,
        needsBackup: true,
      });
    } else if (existsSync(cfg.userDest)) {
      const flag = target === 'claude' ? '--user' : `--user --target ${target}`;
      warnings.push(`manifest missing in ${cfg.userDest} — run \`company-cc init ${flag}\` to restore`);
    }

    const projectManifestPath = getManifestPath(cfg.projectDest, cfg.projectManifestName);
    if (existsSync(projectManifestPath)) {
      plans.push({
        target,
        profileName: 'project',
        destRoot: cfg.projectDest,
        manifestName: cfg.projectManifestName,
        srcRoots: [...cfg.projectSrcs, ...projectOverlays],
        selectedExtras: null,
        manifest: await readManifest(cfg.projectDest, cfg.projectManifestName),
        needsBackup: false,
      });
    }
  }

  return {
    selectedTargets,
    targetLabel: selectedTargets.length === TARGETS.length ? 'any selected target' : selectedTargets[0],
    plans,
    warnings,
  };
}

async function resolveUpdateExtrasSelection(manifest) {
  if (!existsSync(extraDir)) {
    return {
      includeExtraDir: false,
      selectedExtras: null,
      warnings: [`extras template directory missing: ${extraDir}`],
    };
  }

  if (manifest.extras == null) {
    return {
      includeExtraDir: true,
      selectedExtras: await resolveSkillNames(true, extrasSkillsDir),
      warnings: [],
    };
  }

  if (manifest.extras === false) {
    return {
      includeExtraDir: true,
      selectedExtras: [],
      warnings: [],
    };
  }

  if (isPreGroupsManifest(manifest)) {
    return {
      includeExtraDir: true,
      selectedExtras: await resolveSkillNames(true, extrasSkillsDir),
      warnings: ['  Migrating pre-0.3.0 extras format → installing all skills'],
    };
  }

  return {
    includeExtraDir: true,
    selectedExtras: await resolveSkillNames(manifest.extras, extrasSkillsDir),
    warnings: [],
  };
}

function isPreGroupsManifest(manifest) {
  if (!Array.isArray(manifest.extras) || manifest.extras.length === 0) return false;
  const ver = manifest.version;
  if (!ver) return true;
  const [major, minor] = ver.split('.').map(Number);
  return major === 0 && minor < 3;
}
