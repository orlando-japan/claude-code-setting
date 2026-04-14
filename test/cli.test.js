import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

test('doctor runs and reports environment section', () => {
  const res = runCli(['doctor']);
  assert.equal(typeof res.status, 'number');
  assert.match(res.stdout, /Environment/);
  assert.match(res.stdout, /User profile/);
});
