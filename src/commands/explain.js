import { log } from '../lib/log.js';
import { explainInit, explainPath, explainUpdate } from '../lib/explain.js';

export async function explain(flags, positional) {
  const [mode, relPath] = positional;

  if (mode !== 'init' && mode !== 'update' && mode !== 'path') {
    log.error('Usage: company-cc explain <init|update|path> [flags] [--json]');
    return 1;
  }

  if (mode === 'path' && !relPath) {
    log.error('Usage: company-cc explain path <relPath> [--target <claude|codex|both>] [--json]');
    return 1;
  }

  const result = mode === 'init'
    ? await explainInit(flags)
    : mode === 'update'
      ? await explainUpdate(flags)
      : await explainPath(relPath, flags);

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  renderExplain(result);
  return 0;
}

function renderExplain(result) {
  log.step(`Explain ${result.mode}`);

  if (result.mode === 'path') {
    return renderPathExplain(result);
  }

  if (result.warnings?.length) {
    for (const warning of result.warnings) {
      if (warning.startsWith('  ')) log.dim(warning);
      else log.warn(warning);
    }
  }

  if (result.profiles.length === 0) {
    log.warn(`No existing install found for ${result.targetLabel ?? 'selected target(s)'}.`);
    return;
  }

  for (const profile of result.profiles) {
    const label = profile.target === 'claude'
      ? `${profile.profile} profile`
      : `${profile.target} ${profile.profile} profile`;

    log.info(`${label} → ${profile.destRoot}`);
    log.dim(`  manifest: ${profile.manifestName}`);
    log.dim(`  srcRoots: ${profile.srcRoots.length > 0 ? profile.srcRoots.join(', ') : '(none)'}`);

    if (profile.selectedExtras !== null) {
      const extras = profile.selectedExtras.length > 0 ? profile.selectedExtras.join(', ') : '(none)';
      log.dim(`  extras: ${extras}`);
    }

    if (profile.needsBackup) log.dim('  backup: yes');
    if (profile.cleanup) log.dim('  cleanup: yes');
    if ('manifestVersion' in profile) log.dim(`  manifest version: ${profile.manifestVersion ?? '(unknown)'}`);
  }

  log.info(`${result.summary.profileCount} profile(s) across ${result.summary.targetCount} target(s)`);
}

function renderPathExplain(result) {
  if (result.matches.length === 0) {
    log.warn(`${result.path}: not tracked in any manifest for the selected target(s)`);
    return;
  }

  for (const match of result.matches) {
    const label = match.target === 'claude'
      ? `${match.profile} profile`
      : `${match.target} ${match.profile} profile`;

    log.info(`${label} → ${match.destRoot}/${match.path}`);
    log.dim(`  manifest: ${match.manifestName}`);
    log.dim(`  source: ${match.source ?? '(not recorded)'}`);
    log.dim(`  state: ${match.diskState}`);
    log.dim(`  likely update: ${match.likelyUpdateBehavior.action}`);
    log.dim(`  reason: ${match.likelyUpdateBehavior.reason}`);
  }

  log.info(`${result.summary.matchCount} match(es)`);
}
