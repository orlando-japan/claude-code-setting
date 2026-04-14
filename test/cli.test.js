import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const cliPath = join(repoRoot, 'src', 'cli.js');

function runCli(args = [], opts = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    ...opts,
  });
}

async function withTempHome(fn) {
  const home = await mkdtemp(join(tmpdir(), 'company-cc-home-'));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

test('cli shows usage with --help', () => {
  const res = runCli(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /company-cc — Claude Code harness installer/);
  assert.match(res.stdout, /Usage:/);
});

test('cli fails on unknown command', () => {
  const res = runCli(['nope']);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /Usage:/);
  assert.match(res.stderr, /Unknown command: nope/);
});

test('doctor reports uninitialized user profile without fatal failure', async () => {
  await withTempHome(async (home) => {
    const res = runCli(['doctor'], {
      env: { ...process.env, HOME: home, PATH: '' },
    });

    assert.equal(res.status, 0);
    assert.match(res.stdout, /Environment/);
    assert.match(res.stdout, /User profile/);
    assert.match(res.stdout, /not initialized yet/);
    assert.match(res.stdout, /Optional integrations/);
    assert.match(res.stdout, /optional integration\(s\) missing/);
    assert.equal(res.stderr, '');
  });
});

test('init --user performs a real isolated install and update restores missing tracked files', async () => {
  await withTempHome(async (home) => {
    const env = { ...process.env, HOME: home };
    const claudeDir = join(home, '.claude');
    const manifestPath = join(claudeDir, '.company-cc-manifest.json');
    const settingsPath = join(claudeDir, 'settings.json');
    const rulePath = join(claudeDir, 'rules', 'coding-principles.md');

    const initRes = runCli(['init', '--user'], { env });
    assert.equal(initRes.status, 0, initRes.stderr);
    assert.match(initRes.stdout, /Installing user profile/);
    assert.equal(existsSync(join(claudeDir, 'CLAUDE.md')), true);
    assert.equal(existsSync(settingsPath), true);
    assert.equal(existsSync(rulePath), true);
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.ok(manifest.installed);
    assert.equal(typeof manifest.version, 'string');
    assert.match(manifest.files['CLAUDE.md'], /^sha256:/);
    assert.match(manifest.files['settings.json'], /^sha256:/);
    assert.match(manifest.files['rules/coding-principles.md'], /^sha256:/);

    await rm(settingsPath);
    assert.equal(existsSync(settingsPath), false);

    const updateRes = runCli(['update'], { env });
    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /Updating user profile/);
    assert.match(updateRes.stdout, /created\s+settings\.json/);
    assert.equal(existsSync(settingsPath), true);
  });
});
