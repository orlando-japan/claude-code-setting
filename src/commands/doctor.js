import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { log } from '../lib/log.js';

const USER_CLAUDE_DIR = join(homedir(), '.claude');

const REQUIRED_USER_FILES = [
  'CLAUDE.md',
  'settings.json',
  'rules/coding-principles.md',
];

export async function doctor() {
  let failed = 0;
  const check = async (name, fn) => {
    try {
      const msg = await fn();
      if (msg === false) {
        log.error(name);
        failed++;
      } else {
        log.ok(`${name}${msg ? ` — ${msg}` : ''}`);
      }
    } catch (err) {
      log.error(`${name} — ${err.message}`);
      failed++;
    }
  };

  log.step('Environment');
  await check('node >= 20', () => {
    const [maj] = process.versions.node.split('.').map(Number);
    if (maj < 20) throw new Error(`found ${process.versions.node}`);
    return process.versions.node;
  });

  log.step('User profile');
  await check('~/.claude/ exists', () => {
    if (!existsSync(USER_CLAUDE_DIR)) throw new Error(USER_CLAUDE_DIR);
    return USER_CLAUDE_DIR;
  });

  await check('manifest present', () => {
    const p = join(USER_CLAUDE_DIR, '.company-cc-manifest.json');
    if (!existsSync(p)) throw new Error('run `company-cc init --user`');
    return 'ok';
  });

  for (const rel of REQUIRED_USER_FILES) {
    await check(`user/${rel}`, () => {
      if (!existsSync(join(USER_CLAUDE_DIR, rel))) throw new Error('missing');
      return 'present';
    });
  }

  await check('settings.json is valid JSON', async () => {
    const p = join(USER_CLAUDE_DIR, 'settings.json');
    if (!existsSync(p)) throw new Error('missing');
    JSON.parse(await readFile(p, 'utf8'));
    return 'parsed';
  });

  log.step('Optional integrations');
  await check('OpenSpec CLI', () => {
    try {
      const v = execSync('openspec --version', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      return v;
    } catch {
      throw new Error('not installed (optional) — `npm i -g @fission-ai/openspec`');
    }
  });

  log.step('Summary');
  if (failed === 0) log.ok('all checks passed');
  else {
    log.error(`${failed} check(s) failed`);
    process.exit(1);
  }
}
