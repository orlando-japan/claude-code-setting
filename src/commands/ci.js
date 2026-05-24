import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { log } from '../lib/log.js';
import { getManifestPath, readManifest, getFileRecord } from '../lib/template.js';
import { hashFile } from '../lib/hash.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';
import { findMissingProjectSections } from '../lib/project-checks.js';

export async function ci(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const json = !!flags.json;
  let exitCode = 0;
  const results = [];

  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    const manifestPath = getManifestPath(cfg.projectDest, cfg.projectManifestName);
    const instructionFile = cfg.instructionFile;
    const filePath = join(cfg.projectDest, instructionFile);
    const label = target === 'claude' ? 'project' : `${target} project`;

    if (!existsSync(manifestPath)) {
      if (!json) log.error(`${label}: no manifest — run \`company-cc init --project\``);
      results.push({ target, status: 'missing-manifest', file: instructionFile });
      exitCode = 1;
      continue;
    }

    if (!existsSync(filePath)) {
      if (!json) log.error(`${label}: ${instructionFile} missing`);
      results.push({ target, status: 'missing-file', file: instructionFile });
      exitCode = 1;
      continue;
    }

    const manifest = await readManifest(cfg.projectDest, cfg.projectManifestName);
    const record = getFileRecord(manifest, instructionFile);

    if (record) {
      const diskHash = await hashFile(filePath);
      if (diskHash === record.hash) {
        if (!json) log.error(`${label}: ${instructionFile} still contains template stubs — fill it in before merging`);
        results.push({ target, status: 'stub', file: instructionFile });
        exitCode = 1;
        continue;
      }
    }

    const content = await readFile(filePath, 'utf8');
    const missingSections = findMissingProjectSections(content, target, flags._customTargets);
    if (missingSections.length > 0) {
      const detail = missingSections.map(s => s.label).join(', ');
      if (!json) log.error(`${label}: ${instructionFile} missing required sections — ${detail}`);
      results.push({ target, status: 'missing-sections', file: instructionFile, missing: missingSections.map(s => s.label) });
      exitCode = 1;
      continue;
    }

    if (!json) log.ok(`${label}: ${instructionFile} is present, customized, and structurally complete`);
    results.push({ target, status: 'ok', file: instructionFile });
  }

  if (json) {
    console.log(JSON.stringify({ exitCode, results }, null, 2));
  }

  return exitCode;
}
