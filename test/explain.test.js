import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { run } from '../src/cli.js';
import { MANIFEST_NAMES } from '../src/lib/targets.js';

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

test('explain init shows codex user plan and resolved extras', async () => {
  await withTempHome(async (home) => {
    const codexHome = join(home, '.codex');

    const res = await withEnv({ CODEX_HOME: codexHome }, () =>
      captureConsole(() => run(['explain', 'init', '--user', '--target', 'codex', '--extras=think-before-coding']))
    );

    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Explain init/);
    assert.match(res.stdout, /codex user profile/);
    assert.match(res.stdout, /manifest: \.company-cc-codex-manifest\.json/);
    assert.match(res.stdout, /extras: think-before-coding/);
    assert.match(res.stdout, /profile\(s\) across 1 target\(s\)/);
  });
});

test('explain init --json returns structured plans without writing files', async () => {
  await withTempHome(async (home) => {
    const claudeHome = join(home, '.claude');

    const res = await withEnv({ HOME: home }, () =>
      captureConsole(() => run(['explain', 'init', '--user', '--json']))
    );

    assert.equal(res.status, 0, res.stderr);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.command, 'explain');
    assert.equal(payload.mode, 'init');
    assert.equal(Array.isArray(payload.profiles), true);
    assert.equal(payload.profiles[0].profile, 'user');
    assert.equal(Array.isArray(payload.profiles[0].srcRoots), true);
    assert.equal(existsSync(claudeHome), false, 'explain must not create files');
  });
});

test('explain update --json shows backup and cleanup intent for existing install', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const codexHome = join(home, '.codex');
      await withEnv({ CODEX_HOME: codexHome }, () =>
        captureConsole(() => run(['init', '--user', '--target', 'codex', '--extras=think-before-coding']))
      );

      const res = await withEnv({ CODEX_HOME: codexHome }, () =>
        captureConsole(() => run(['explain', 'update', '--target', 'codex', '--json']))
      );

      assert.equal(res.status, 0, res.stderr);
      const payload = JSON.parse(res.stdout);
      assert.equal(payload.mode, 'update');
      assert.equal(payload.targets[0], 'codex');
      assert.equal(payload.summary.profileCount >= 1, true);
      const userProfile = payload.profiles.find((p) => p.target === 'codex' && p.profile === 'user');
      assert.ok(userProfile);
      assert.equal(userProfile.needsBackup, true);
      assert.equal(userProfile.cleanup, true);
      assert.equal(userProfile.installed, true);
      assert.equal(userProfile.manifestName, MANIFEST_NAMES.codex);

      const manifest = JSON.parse(await readFile(join(codexHome, MANIFEST_NAMES.codex), 'utf8'));
      assert.equal(userProfile.manifestVersion, manifest.version);
    });
  });
});

test('explain path --json returns source, state, and likely update behavior', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const codexHome = join(home, '.codex');
      const targetPath = join(codexHome, 'rules', 'coding-principles.md');

      await withEnv({ CODEX_HOME: codexHome }, () =>
        captureConsole(() => run(['init', '--user', '--target', 'codex']))
      );
      await writeFile(targetPath, 'locally modified\n');

      const res = await withEnv({ CODEX_HOME: codexHome }, () =>
        captureConsole(() => run(['explain', 'path', 'rules/coding-principles.md', '--target', 'codex', '--json']))
      );

      assert.equal(res.status, 0, res.stderr);
      const payload = JSON.parse(res.stdout);
      assert.equal(payload.mode, 'path');
      assert.equal(payload.path, 'rules/coding-principles.md');
      assert.equal(payload.summary.matchCount, 1);
      assert.equal(payload.matches[0].target, 'codex');
      assert.equal(payload.matches[0].profile, 'user');
      assert.match(payload.matches[0].source, /templates\/shared/);
      assert.equal(payload.matches[0].diskState, 'locally-modified');
      assert.equal(payload.matches[0].likelyUpdateBehavior.action, 'skipped-modified');
    });
  });
});

test('explain path text output explains missing tracked file behavior', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const codexHome = join(home, '.codex');
      const targetPath = join(codexHome, 'rules', 'coding-principles.md');

      await withEnv({ CODEX_HOME: codexHome }, () =>
        captureConsole(() => run(['init', '--user', '--target', 'codex']))
      );
      await rm(targetPath);

      const res = await withEnv({ CODEX_HOME: codexHome }, () =>
        captureConsole(() => run(['explain', 'path', 'rules/coding-principles.md', '--target', 'codex']))
      );

      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /state: missing/);
      assert.match(res.stdout, /likely update: create/);
      assert.match(res.stdout, /tracked in manifest but missing on disk/);
    });
  });
});

test('explain requires a supported mode', async () => {
  const res = await captureConsole(() => run(['explain']));
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Usage: company-cc explain <init\|update\|path>/);
});
