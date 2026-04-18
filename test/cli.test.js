import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { run } from '../src/cli.js';
import { MANIFEST_NAMES } from '../src/lib/targets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

async function captureConsole(fn) {
  const calls = { stdout: '', stderr: '' };
  const origLog = console.log;
  const origErr = console.error;

  console.log = (...args) => {
    calls.stdout += `${args.join(' ')}\n`;
  };
  console.error = (...args) => {
    calls.stderr += `${args.join(' ')}\n`;
  };

  try {
    const status = await fn();
    return { status, ...calls };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

async function withTempHome(fn) {
  const home = await mkdtemp(join(tmpdir(), 'company-cc-home-'));
  try {
    await fn(home);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

async function withTempCwd(fn) {
  const cwd = await mkdtemp(join(tmpdir(), 'company-cc-project-'));
  const oldCwd = process.cwd();

  try {
    process.chdir(cwd);
    await fn(cwd);
  } finally {
    process.chdir(oldCwd);
    await rm(cwd, { recursive: true, force: true });
  }
}

async function withEnv(overrides, fn) {
  const oldEnv = {};
  for (const [key, value] of Object.entries(overrides)) {
    oldEnv[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('cli shows usage with --help', async () => {
  const res = await captureConsole(() => run(['--help']));
  assert.equal(res.status, 0);
  assert.match(res.stdout, /company-cc — AI coding harness installer/);
  assert.match(res.stdout, /Usage:/);
});

test('cli fails on unknown command', async () => {
  const res = await captureConsole(() => run(['nope']));
  assert.equal(res.status, 1);
  assert.match(res.stdout, /Usage:/);
  assert.match(res.stderr, /Unknown command: nope/);
});

test('doctor reports uninitialized user profile without fatal failure', async () => {
  await withTempHome(async (home) => {
    const res = await withEnv({ HOME: home, PATH: '' }, () =>
      captureConsole(() => run(['doctor']))
    );

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
    const claudeDir = join(home, '.claude');
    const manifestPath = join(claudeDir, MANIFEST_NAMES.claude);
    const settingsPath = join(claudeDir, 'settings.json');
    const rulePath = join(claudeDir, 'rules', 'coding-principles.md');

    const initRes = await withEnv({ HOME: home }, () =>
      captureConsole(() => run(['init', '--user']))
    );
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

    const updateRes = await withEnv({ HOME: home }, () =>
      captureConsole(() => run(['update']))
    );
    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /Updating user profile/);
    assert.match(updateRes.stdout, /created\s+settings\.json/);
    assert.equal(existsSync(settingsPath), true);

    const updatedManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(updatedManifest.version, '0.1.1');
  });
});

test('init --user --target codex installs shared assets into CODEX_HOME', async () => {
  await withTempHome(async (home) => {
    const codexHome = join(home, '.codex');
    const manifestPath = join(codexHome, MANIFEST_NAMES.codex);

    const res = await withEnv({ CODEX_HOME: codexHome }, () =>
      captureConsole(() => run(['init', '--user', '--target', 'codex']))
    );

    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Installing codex user profile/);
    assert.equal(existsSync(join(codexHome, 'AGENTS.md')), true);
    assert.equal(existsSync(join(codexHome, 'rules', 'coding-principles.md')), true);
    assert.equal(existsSync(join(codexHome, 'skills', 'tdd', 'SKILL.md')), true);
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.target, 'codex');
    assert.match(manifest.files['AGENTS.md'], /^sha256:/);
    assert.match(manifest.files['rules/coding-principles.md'], /^sha256:/);
  });
});

test('init --project installs project CLAUDE.md and update restores it', async () => {
  await withTempCwd(async (projectDir) => {
    const manifestPath = join(projectDir, MANIFEST_NAMES.claude);
    const claudePath = join(projectDir, 'CLAUDE.md');

    const initRes = await captureConsole(() =>
      run(['init', '--project'])
    );

    assert.equal(initRes.status, 0, initRes.stderr);
    assert.match(initRes.stdout, /Installing project profile/);
    assert.equal(existsSync(claudePath), true);
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.target, 'claude');
    assert.equal(typeof manifest.version, 'string');
    assert.ok(manifest.installed);
    assert.match(manifest.files['CLAUDE.md'], /^sha256:/);

    await rm(claudePath);
    assert.equal(existsSync(claudePath), false);

    const updateRes = await captureConsole(() =>
      run(['update'])
    );

    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /Updating project profile/);
    assert.match(updateRes.stdout, /created\s+CLAUDE\.md/);
    assert.equal(existsSync(claudePath), true);
  });
});

test('init --project --target codex installs project AGENTS.md and update restores it', async () => {
  await withTempCwd(async (projectDir) => {
    const manifestPath = join(projectDir, MANIFEST_NAMES.codex);
    const agentsPath = join(projectDir, 'AGENTS.md');

    const initRes = await captureConsole(() =>
      run(['init', '--project', '--target', 'codex'])
    );

    assert.equal(initRes.status, 0, initRes.stderr);
    assert.match(initRes.stdout, /Installing codex project profile/);
    assert.equal(existsSync(agentsPath), true);
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.target, 'codex');
    assert.equal(typeof manifest.version, 'string');
    assert.ok(manifest.installed);
    assert.match(manifest.files['AGENTS.md'], /^sha256:/);

    await rm(agentsPath);
    assert.equal(existsSync(agentsPath), false);

    const updateRes = await captureConsole(() =>
      run(['update', '--target', 'codex'])
    );

    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /Updating codex project profile/);
    assert.match(updateRes.stdout, /created\s+AGENTS\.md/);
    assert.equal(existsSync(agentsPath), true);
  });
});
