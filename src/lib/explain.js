import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { loadOverlays } from './config.js';
import { resolveExtras } from './extras.js';
import { buildInitPlans, buildUpdatePlans } from './profile-plans.js';
import { getTargetConfig, parseTargetFlag } from './targets.js';
import { getFileRecord, getManifestPath, readManifest } from './template.js';
import { hashFile } from './hash.js';

export async function explainInit(flags) {
  const selectedExtras = await resolveExtras(flags.extras);
  const userOverlays = await loadOverlays(homedir());
  const projectOverlays = await loadOverlays(process.cwd());
  const plans = buildInitPlans({ flags, selectedExtras, userOverlays, projectOverlays });

  return {
    ok: true,
    command: 'explain',
    mode: 'init',
    targets: [...new Set(plans.map(plan => plan.target))],
    userOverlays,
    projectOverlays,
    profiles: plans.map(plan => normalizePlan(plan, { cleanup: false })),
    summary: {
      profileCount: plans.length,
      targetCount: new Set(plans.map(plan => plan.target)).size,
    },
  };
}

export async function explainUpdate(flags) {
  const userOverlays = await loadOverlays(homedir());
  const projectOverlays = await loadOverlays(process.cwd());
  const { selectedTargets, targetLabel, plans, warnings } = await buildUpdatePlans({
    flags,
    userOverlays,
    projectOverlays,
  });

  return {
    ok: true,
    command: 'explain',
    mode: 'update',
    targets: selectedTargets,
    targetLabel,
    userOverlays,
    projectOverlays,
    warnings,
    profiles: plans.map(plan => normalizePlan(plan, {
      cleanup: plan.selectedExtras !== null,
      manifestVersion: plan.manifest?.version,
      installed: !!plan.manifest?.installed,
    })),
    summary: {
      profileCount: plans.length,
      targetCount: new Set(plans.map(plan => plan.target)).size,
      warningCount: warnings.length,
    },
  };
}

export async function explainPath(relPath, flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const matches = [];

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    const profiles = [
      { profile: 'user', destRoot: cfg.userDest, manifestName: cfg.userManifestName },
      { profile: 'project', destRoot: cfg.projectDest, manifestName: cfg.projectManifestName },
    ];

    for (const { profile, destRoot, manifestName } of profiles) {
      if (!existsSync(getManifestPath(destRoot, manifestName))) continue;
      const manifest = await readManifest(destRoot, manifestName);
      const record = getFileRecord(manifest, relPath);
      if (!record) continue;

      const fullPath = join(destRoot, relPath);
      const existsOnDisk = existsSync(fullPath);
      const diskHash = existsOnDisk ? await hashFile(fullPath) : null;
      const state = !existsOnDisk
        ? 'missing'
        : diskHash === record.hash
          ? 'unchanged'
          : 'locally-modified';

      matches.push({
        target,
        profile,
        path: relPath,
        destRoot,
        manifestName,
        manifestVersion: manifest.version ?? null,
        installed: !!manifest.installed,
        recordedHash: record.hash ?? null,
        source: record.source ?? null,
        diskState: state,
        existsOnDisk,
        likelyUpdateBehavior: inferLikelyUpdateBehavior({ existsOnDisk, diskHash, recordHash: record.hash }),
      });
    }
  }

  return {
    ok: true,
    command: 'explain',
    mode: 'path',
    path: relPath,
    targets,
    matches,
    summary: {
      matchCount: matches.length,
    },
  };
}

function normalizePlan(plan, extra = {}) {
  return {
    target: plan.target,
    profile: plan.profileName,
    destRoot: plan.destRoot,
    manifestName: plan.manifestName,
    srcRoots: [...plan.srcRoots],
    selectedExtras: normalizeExtras(plan.selectedExtras),
    needsBackup: !!plan.needsBackup,
    cleanup: !!extra.cleanup,
    ...('manifestVersion' in extra ? { manifestVersion: extra.manifestVersion ?? null } : {}),
    ...('installed' in extra ? { installed: extra.installed } : {}),
  };
}

function normalizeExtras(selectedExtras) {
  if (selectedExtras === null || selectedExtras === undefined) return null;
  return [...selectedExtras];
}

function inferLikelyUpdateBehavior({ existsOnDisk, diskHash, recordHash }) {
  if (!existsOnDisk) {
    return {
      action: 'create',
      reason: 'tracked in manifest but missing on disk',
    };
  }

  if (diskHash === recordHash) {
    return {
      action: 'safe-overwrite',
      reason: 'disk matches recorded manifest hash, so update can replace it safely',
    };
  }

  return {
    action: 'skipped-modified',
    reason: 'disk differs from recorded manifest hash, so update will skip unless --force is used',
  };
}
