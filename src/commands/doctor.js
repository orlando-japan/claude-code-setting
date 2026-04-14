import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { log } from '../lib/log.js';

const USER_CLAUDE_DIR = join(homedir(), '.claude');
const USER_MANIFEST = join(USER_CLAUDE_DIR, '.company-cc-manifest.json');

const REQUIRED_USER_FILES = [
  'CLAUDE.md',
  'settings.json',
  'rules/coding-principles.md',
];

export async function doctor() {
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
  const userDirExists = existsSync(USER_CLAUDE_DIR);
  const manifestExists = existsSync(USER_MANIFEST);

  if (!userDirExists) {
    uninitialized('user profile', `not initialized yet — run \`company-cc init --user\` to create ${USER_CLAUDE_DIR}`);
  } else if (!manifestExists) {
    uninitialized('user profile manifest', 'missing — run `company-cc init --user`');
  } else {
    ok('user profile', USER_CLAUDE_DIR);
    ok('manifest present', USER_MANIFEST);

    for (const rel of REQUIRED_USER_FILES) {
      const fullPath = join(USER_CLAUDE_DIR, rel);
      if (!existsSync(fullPath)) {
        fatal(`user/${rel}`, 'missing');
      } else {
        ok(`user/${rel}`, 'present');
      }
    }

    const settingsPath = join(USER_CLAUDE_DIR, 'settings.json');
    if (!existsSync(settingsPath)) {
      fatal('settings.json is valid JSON', 'missing');
    } else {
      try {
        JSON.parse(await readFile(settingsPath, 'utf8'));
        ok('settings.json is valid JSON', 'parsed');
      } catch (err) {
        fatal('settings.json is valid JSON', err.message);
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
