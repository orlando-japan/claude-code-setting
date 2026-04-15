import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { log } from '../lib/log.js';
import { getManifestPath } from '../lib/template.js';
import { getTargetConfig, parseTargetFlag } from '../lib/targets.js';

export async function doctor(flags) {
  const targets = parseTargetFlag(flags.target);
  const summary = {
    fatal: 0,
    optional: 0,
    uninitialized: 0,
  };

  const ok = (name, details) => log.ok(`${name}${details ? ` — ${details}` : ''}`);
  const fatal = (name, details) => {
    log.error(`${name}${details ? ` — ${details}` : ''}`);
    summary.fatal++;
  };
  const optional = (name, details) => {
    log.warn(`${name}${details ? ` — ${details}` : ''}`);
    summary.optional++;
  };
  const uninitialized = (name, details) => {
    log.warn(`${name}${details ? ` — ${details}` : ''}`);
    summary.uninitialized++;
  };

  log.step('Environment');
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

  log.step('User profile');
  for (const target of targets) {
    const cfg = getTargetConfig(target);
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
        JSON.parse(await readFile(settingsPath, 'utf8'));
        ok(`${target}/settings.json is valid JSON`, 'parsed');
      } catch (err) {
        fatal(`${target}/settings.json is valid JSON`, err.message);
      }
    }
  }

  log.step('Optional integrations');
  try {
    const version = execSync('openspec --version', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    ok('OpenSpec CLI', version);
  } catch {
    optional('OpenSpec CLI', 'not installed — optional, install with `npm i -g @fission-ai/openspec` if you want spec commands');
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

  if (summary.optional > 0) {
    log.warn(`${summary.optional} optional integration(s) missing`);
  } else {
    log.ok('optional integrations look good');
  }
}
