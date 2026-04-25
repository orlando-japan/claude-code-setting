import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { log } from '../lib/log.js';
import { getManifestPath, readManifest, getFileRecord } from '../lib/template.js';
import { hashFile } from '../lib/hash.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

const REQUIRED_CLAUDE_SECTIONS = [
  { prefix: '## 1.', label: 'What this project is' },
  { prefix: '## 2.', label: 'How to run and verify' },
  { prefix: '## 4.', label: 'Current priorities' },
  { prefix: '## 6.', label: 'Guardrails / do-not-touch' },
];

export async function doctor(flags) {
  const targets = parseTargetFlag(flags.target, flags._customTargets);
  const json = !!flags.json;
  const summary = { fatal: 0, optional: 0, uninitialized: 0, stubs: 0 };
  const checks = [];

  const ok = (name, detail) => {
    checks.push({ name, status: 'ok', detail });
    if (!json) log.ok(`${name}${detail ? ` — ${detail}` : ''}`);
  };
  const fatal = (name, detail) => {
    checks.push({ name, status: 'fatal', detail });
    if (!json) log.error(`${name}${detail ? ` — ${detail}` : ''}`);
    summary.fatal++;
  };
  const optional = (name, detail) => {
    checks.push({ name, status: 'warn', detail });
    if (!json) log.warn(`${name}${detail ? ` — ${detail}` : ''}`);
    summary.optional++;
  };
  const uninitialized = (name, detail) => {
    checks.push({ name, status: 'uninitialized', detail });
    if (!json) log.warn(`${name}${detail ? ` — ${detail}` : ''}`);
    summary.uninitialized++;
  };
  const stub = (name, detail) => {
    checks.push({ name, status: 'stub', detail });
    if (!json) log.warn(`${name}${detail ? ` — ${detail}` : ''}`);
    summary.stubs++;
  };

  if (!json) log.step('Environment');
  try {
    const [maj] = process.versions.node.split('.').map(Number);
    if (maj < 20) {
      fatal('node >= 20', `found ${process.versions.node}`);
    } else {
      ok('node >= 20', process.versions.node);
    }
  } catch (err) {
    fatal('node >= 20', err.message);
  }

  if (!json) log.step('User profile');
  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    const manifestPath = getManifestPath(cfg.userDest, cfg.userManifestName);
    const userDirExists = existsSync(cfg.userDest);
    const manifestExists = existsSync(manifestPath);
    const prefix = target === 'claude' ? 'user profile' : `${target} user profile`;

    if (!userDirExists) {
      uninitialized(prefix, `not initialized yet — run \`company-cc init --user --target ${target}\` to create ${cfg.userDest}`);
      continue;
    }
    if (!manifestExists) {
      uninitialized(`${prefix} manifest`, `missing — run \`company-cc init --user --target ${target}\``);
      continue;
    }

    ok(prefix, cfg.userDest);
    ok(`${prefix} manifest`, manifestPath);

    for (const rel of cfg.requiredUserFiles) {
      const fullPath = join(cfg.userDest, rel);
      if (!existsSync(fullPath)) {
        fatal(`${target}/user/${rel}`, 'missing');
      } else {
        ok(`${target}/user/${rel}`, 'present');
      }
    }

    const settingsPath = join(cfg.userDest, 'settings.json');
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(await readFile(settingsPath, 'utf8'));
        ok(`${target}/settings.json is valid JSON`, 'parsed');
        if (!settings.permissions || typeof settings.permissions !== 'object') {
          fatal(`${target}/settings.json`, 'missing required "permissions" key — re-run `company-cc init --user --force`');
        } else {
          ok(`${target}/settings.json permissions`, 'present');
        }
      } catch (err) {
        fatal(`${target}/settings.json is valid JSON`, err.message);
      }
    }
  }

  if (!json) log.step('Project profile');
  for (const target of targets) {
    const cfg = getTargetConfig(target, flags._customTargets);
    const manifestPath = getManifestPath(cfg.projectDest, cfg.projectManifestName);
    const prefix = target === 'claude' ? 'project profile' : `${target} project profile`;
    const instructionFile = cfg.instructionFile;

    if (!existsSync(manifestPath)) {
      uninitialized(prefix, `not initialized — run \`company-cc init --project --target ${target}\` to add ${instructionFile}`);
      continue;
    }

    const manifest = await readManifest(cfg.projectDest, cfg.projectManifestName);
    const filePath = join(cfg.projectDest, instructionFile);

    if (!existsSync(filePath)) {
      fatal(`${target}/project/${instructionFile}`, 'missing');
      continue;
    }

    const record = getFileRecord(manifest, instructionFile);
    let isStub = false;
    if (record) {
      const diskHash = await hashFile(filePath);
      if (diskHash === record.hash) {
        stub(`${target}/project/${instructionFile}`, 'still contains template stubs — fill in sections before using the AI on this repo');
        isStub = true;
      } else {
        ok(`${target}/project/${instructionFile}`, 'customized');
      }
    } else {
      ok(`${target}/project/${instructionFile}`, 'present');
    }

    if (!isStub) {
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      for (const { prefix, label } of REQUIRED_CLAUDE_SECTIONS) {
        if (!lines.some(l => l.startsWith(prefix))) {
          optional(`${target}/project/${instructionFile} — "${label}"`, 'section missing — add it or Claude will lack key context');
        }
      }
    }
  }

  if (!json) log.step('Optional integrations');
  try {
    const version = execSync('openspec --version', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    ok('OpenSpec CLI', version);
  } catch {
    optional('OpenSpec CLI', 'not installed — optional, install with `npm i -g @fission-ai/openspec` if you want spec commands');
  }

  if (json) {
    console.log(JSON.stringify({ summary, checks }, null, 2));
    if (summary.fatal > 0) process.exit(1);
    return;
  }

  log.step('Summary');
  if (summary.fatal > 0) {
    log.error(`${summary.fatal} fatal issue(s) found`);
    if (summary.uninitialized > 0) {
      log.warn(`${summary.uninitialized} setup area(s) not initialized`);
    }
    if (summary.optional > 0) {
      log.warn(`${summary.optional} optional integration(s) missing`);
    }
    process.exit(1);
  }

  if (summary.uninitialized > 0) {
    log.warn(`not fully initialized yet — ${summary.uninitialized} setup area(s) still need \`company-cc init\``);
  } else {
    log.ok('core install checks passed');
  }

  if (summary.stubs > 0) {
    log.warn(`${summary.stubs} project file(s) still have template stubs — fill them in`);
  }

  if (summary.optional > 0) {
    log.warn(`${summary.optional} optional integration(s) missing`);
  } else {
    log.ok('optional integrations look good');
  }
}
