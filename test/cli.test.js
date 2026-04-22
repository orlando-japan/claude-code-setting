import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
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

test('cli fails on unknown flag with helpful message', async () => {
  const res = await captureConsole(() => run(['init', '--trget', 'claude']));
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Unknown flag: --trget/);
  assert.match(res.stdout, /Usage:/);
});

test('doctor reports uninitialized user profile without fatal failure', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const res = await withEnv({ HOME: home, PATH: '' }, () =>
        captureConsole(() => run(['doctor']))
      );

      assert.equal(res.status, 0);
      assert.match(res.stdout, /Environment/);
      assert.match(res.stdout, /User profile/);
      assert.match(res.stdout, /not initialized yet/);
      assert.match(res.stdout, /Project profile/);
      assert.match(res.stdout, /Optional integrations/);
      assert.match(res.stdout, /optional integration\(s\) missing/);
      assert.equal(res.stderr, '');
    });
  });
});

test('doctor warns when project file is still a template stub', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--project'])));

      const res = await withEnv({ HOME: home, PATH: '' }, () =>
        captureConsole(() => run(['doctor']))
      );

      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /Project profile/);
      assert.match(res.stdout, /still contains template stubs/);
      assert.match(res.stdout, /project file\(s\) still have template stubs/);
    });
  });
});

test('doctor reports project file as customized after editing', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async (cwd) => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--project'])));
      await writeFile(join(cwd, 'CLAUDE.md'), '# My Project\n\nCustomized content.\n');

      const res = await withEnv({ HOME: home, PATH: '' }, () =>
        captureConsole(() => run(['doctor']))
      );

      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /CLAUDE\.md.*customized/);
      assert.doesNotMatch(res.stdout, /template stubs/);
    });
  });
});

test('init --user --dry-run writes no files to disk', async () => {
  await withTempHome(async (home) => {
    const claudeDir = join(home, '.claude');
    const res = await withEnv({ HOME: home }, () =>
      captureConsole(() => run(['init', '--user', '--dry-run']))
    );
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /created/);
    assert.equal(existsSync(claudeDir), false, 'dry-run must not create .claude directory');
  });
});

test('init with no flags in non-TTY falls back to default (user+project)', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async (cwd) => {
      // process.stdin.isTTY is false in test env, so interactive prompts are skipped
      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /Installing user profile/);
      assert.match(res.stdout, /Installing project profile/);
      assert.equal(existsSync(join(home, '.claude', 'CLAUDE.md')), true);
      assert.equal(existsSync(join(cwd, 'CLAUDE.md')), true);
    });
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
    assert.match(manifest.files['CLAUDE.md'].hash, /^sha256:/);
    assert.ok(manifest.files['CLAUDE.md'].source);
    assert.match(manifest.files['settings.json'].hash, /^sha256:/);
    assert.match(manifest.files['rules/coding-principles.md'].hash, /^sha256:/);

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
    assert.equal(typeof updatedManifest.version, 'string');
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
    assert.equal(existsSync(join(codexHome, 'skills', 'think-before-coding', 'SKILL.md')), true);
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.target, 'codex');
    assert.match(manifest.files['AGENTS.md'].hash, /^sha256:/);
    assert.ok(manifest.files['AGENTS.md'].source);
    assert.match(manifest.files['rules/coding-principles.md'].hash, /^sha256:/);
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
    assert.match(manifest.files['CLAUDE.md'].hash, /^sha256:/);

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
    assert.match(manifest.files['AGENTS.md'].hash, /^sha256:/);

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

test('status shows unchanged files after clean install', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['status']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /user profile/);
      assert.match(res.stdout, /unchanged/);
      assert.doesNotMatch(res.stdout, /locally-modified/);
      assert.doesNotMatch(res.stdout, /missing/);
    });
  });
});

test('status shows locally-modified and missing files', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));

      await writeFile(join(claudeDir, 'settings.json'), '{ "modified": true }');
      await rm(join(claudeDir, 'rules', 'coding-principles.md'));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['status']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /locally-modified.*settings\.json/);
      assert.match(res.stdout, /missing.*rules\/coding-principles\.md/);
    });
  });
});

test('diff shows differences for a locally-modified file', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      await writeFile(join(claudeDir, 'settings.json'), '{ "modified": true }\n');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['diff', 'settings.json']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /---/);
      assert.match(res.stdout, /\+\+\+/);
    });
  });
});

test('diff exits 1 for a path not in any manifest', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['diff', 'nonexistent/file.md']))
      );
      assert.equal(res.status, 1);
    });
  });
});

test('restore reverts a locally-modified file to template', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');
      const settingsPath = join(claudeDir, 'settings.json');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      const original = await readFile(settingsPath, 'utf8');

      await writeFile(settingsPath, '{ "modified": true }\n');
      assert.notEqual(await readFile(settingsPath, 'utf8'), original);

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['restore', 'settings.json', '--force']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /restored.*settings\.json/);
      assert.equal(await readFile(settingsPath, 'utf8'), original);
    });
  });
});

test('uninstall dry-run shows files without removing them', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['uninstall']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /would remove/);
      assert.equal(existsSync(join(claudeDir, 'CLAUDE.md')), true, 'dry-run must not delete files');
    });
  });
});

test('uninstall --confirm removes tracked files and manifest', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');
      const manifestPath = join(claudeDir, MANIFEST_NAMES.claude);

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['uninstall', '--confirm']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /removed/);
      assert.equal(existsSync(join(claudeDir, 'CLAUDE.md')), false);
      assert.equal(existsSync(manifestPath), false);
    });
  });
});

test('init --extras=all installs all extra skills', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=all']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'infra-as-code', 'SKILL.md')), true);

      const manifest = JSON.parse(await readFile(join(claudeDir, MANIFEST_NAMES.claude), 'utf8'));
      assert.ok(Array.isArray(manifest.extras), 'extras should be stored as array');
      assert.ok(manifest.extras.includes('evals-design'));
    });
  });
});

test('init --extras=evals-design installs only that skill', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=evals-design']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'infra-as-code', 'SKILL.md')), false);

      const manifest = JSON.parse(await readFile(join(claudeDir, MANIFEST_NAMES.claude), 'utf8'));
      assert.deepEqual(manifest.extras, ['evals-design']);
    });
  });
});

test('init --extras=unknown exits 1 with helpful error', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=no-such-skill']))
      );
      assert.equal(res.status, 1);
      assert.match(res.stderr, /Unknown skill or group/);
      assert.match(res.stderr, /Available groups:/);
    });
  });
});

test('update respects extras selection stored in manifest', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=evals-design']))
      );

      await rm(join(claudeDir, 'skills', 'evals-design', 'SKILL.md'));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['update']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'infra-as-code', 'SKILL.md')), false);
    });
  });
});

test('init --extras=core installs core group skills only', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'simplicity-first', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), false);

      const manifest = JSON.parse(await readFile(join(claudeDir, MANIFEST_NAMES.claude), 'utf8'));
      assert.ok(Array.isArray(manifest.extras));
      assert.ok(manifest.extras.includes('think-before-coding'));
      assert.ok(!manifest.extras.includes('evals-design'));
    });
  });
});

test('init --extras=core,code-review installs group + individual skill', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core,code-review']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'code-review', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), false);

      const manifest = JSON.parse(await readFile(join(claudeDir, MANIFEST_NAMES.claude), 'utf8'));
      assert.ok(manifest.extras.includes('think-before-coding'));
      assert.ok(manifest.extras.includes('code-review'));
    });
  });
});

test('update migrates old manifest (extras: null) to full skill set', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core']))
      );

      // Simulate old-format manifest by setting extras to null
      const manifestPath = join(claudeDir, MANIFEST_NAMES.claude);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest.extras = null;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['update']))
      );
      assert.equal(res.status, 0, res.stderr);
      // After migration, all skills should be installed
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), true);
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), true);
    });
  });
});

test('update handles manifest extras: false (old install, no extras) without error', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core']))
      );

      // Simulate old-format manifest with extras: false
      const manifestPath = join(claudeDir, MANIFEST_NAMES.claude);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest.extras = false;
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['update']))
      );
      assert.equal(res.status, 0, res.stderr);
    });
  });
});

test('update removes stale skills when extras selection narrows', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      // Install core + evals-design
      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core,evals-design']))
      );
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), true);

      // Narrow to core only in manifest
      const manifestPath = join(claudeDir, MANIFEST_NAMES.claude);
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest.extras = manifest.extras.filter(n => n !== 'evals-design');
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['update']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), false);
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), true);
    });
  });
});

test('skills list shows grouped catalog with install markers', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core']))
      );

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['skills', 'list']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /core/);
      assert.match(res.stdout, /think-before-coding/);
      assert.match(res.stdout, /✓/);
    });
  });
});

test('skills list --json emits valid grouped JSON', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core']))
      );

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['skills', 'list', '--json']))
      );
      assert.equal(res.status, 0, res.stderr);
      const parsed = JSON.parse(res.stdout);
      assert.ok(Array.isArray(parsed));
      const coreGroup = parsed.find(g => g.group === 'core');
      assert.ok(coreGroup, 'core group should be present');
      assert.ok(Array.isArray(coreGroup.skills));
      assert.ok(coreGroup.skills.every(s => typeof s.installed === 'boolean'));
    });
  });
});

test('skills remove --group=<name> --confirm removes that group', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core,evals-design']))
      );
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), true);

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['skills', 'remove', '--group=core', '--confirm']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), false);
      assert.equal(existsSync(join(claudeDir, 'skills', 'evals-design', 'SKILL.md')), true);

      const manifest = JSON.parse(await readFile(join(claudeDir, MANIFEST_NAMES.claude), 'utf8'));
      assert.ok(!manifest.extras.includes('think-before-coding'));
      assert.ok(manifest.extras.includes('evals-design'));
    });
  });
});

test('skills remove without --confirm is a dry-run', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--extras=core']))
      );

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['skills', 'remove', '--group=core']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /would remove/);
      assert.equal(existsSync(join(claudeDir, 'skills', 'think-before-coding', 'SKILL.md')), true);
    });
  });
});

test('doctor --json emits valid JSON with checks array', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--project'])));

      const res = await withEnv({ HOME: home, PATH: '' }, () =>
        captureConsole(() => run(['doctor', '--json']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(res.stderr, '');

      const parsed = JSON.parse(res.stdout);
      assert.ok(Array.isArray(parsed.checks), 'checks must be an array');
      assert.ok(typeof parsed.summary === 'object', 'summary must be an object');
      assert.ok('fatal' in parsed.summary);
      assert.ok('stubs' in parsed.summary);
      assert.ok(parsed.checks.some(c => c.name.includes('CLAUDE.md')));
    });
  });
});

test('status --json emits valid JSON with profiles array', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['status', '--json']))
      );
      assert.equal(res.status, 0, res.stderr);

      const parsed = JSON.parse(res.stdout);
      assert.equal(parsed.initialized, true);
      assert.ok(Array.isArray(parsed.profiles));
      assert.ok(parsed.profiles.length > 0);
      const p = parsed.profiles[0];
      assert.ok(Array.isArray(p.files));
      assert.ok(p.files.every(f => ['unchanged', 'locally-modified', 'missing'].includes(f.state)));
    });
  });
});

test('ci exits 1 when no project manifest', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['ci']))
      );
      assert.equal(res.status, 1);
      assert.match(res.stderr, /no manifest/);
    });
  });
});

test('ci exits 1 when project file is still a template stub', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--project'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['ci']))
      );
      assert.equal(res.status, 1);
      assert.match(res.stderr, /template stubs/);
    });
  });
});

test('ci exits 0 when project file is customized', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async (cwd) => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--project'])));
      await writeFile(join(cwd, 'CLAUDE.md'), '# My Project\n\nCustom content.\n');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['ci']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /customized/);
    });
  });
});

test('ci --json emits valid JSON', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async (cwd) => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--project'])));
      await writeFile(join(cwd, 'CLAUDE.md'), '# My Project\n\nCustom content.\n');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['ci', '--json']))
      );
      assert.equal(res.status, 0, res.stderr);

      const parsed = JSON.parse(res.stdout);
      assert.equal(parsed.exitCode, 0);
      assert.ok(Array.isArray(parsed.results));
      assert.equal(parsed.results[0].status, 'ok');
    });
  });
});

test('overlay: files from .company-cc.json overlays are installed', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');
      const overlayDir = join(home, 'team-overlay');
      await mkdir(join(overlayDir, 'rules'), { recursive: true });
      await writeFile(join(overlayDir, 'rules', 'team-security.md'), '# Team security rules\n');

      await writeFile(
        join(home, '.company-cc.json'),
        JSON.stringify({ overlays: ['./team-overlay'] }),
      );

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user']))
      );
      assert.equal(res.status, 0, res.stderr);

      const installedPath = join(claudeDir, 'rules', 'team-security.md');
      assert.equal(existsSync(installedPath), true, 'overlay file should be installed');

      const manifest = JSON.parse(await readFile(join(claudeDir, MANIFEST_NAMES.claude), 'utf8'));
      const record = manifest.files['rules/team-security.md'];
      assert.ok(record, 'overlay file should be tracked in manifest');
      assert.match(record.hash, /^sha256:/);
      assert.equal(record.source, overlayDir);
    });
  });
});

test('overlay: update re-applies overlay files', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');
      const overlayDir = join(home, 'team-overlay');
      await mkdir(join(overlayDir, 'rules'), { recursive: true });
      await writeFile(join(overlayDir, 'rules', 'team-security.md'), '# Team security rules\n');
      await writeFile(join(home, '.company-cc.json'), JSON.stringify({ overlays: ['./team-overlay'] }));

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      await rm(join(claudeDir, 'rules', 'team-security.md'));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['update']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(claudeDir, 'rules', 'team-security.md')), true);
    });
  });
});

test('custom target: init --target custom installs files to custom userDest', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const customHome = join(home, '.myai');
      const templateDir = join(home, 'myai-templates');
      await mkdir(join(templateDir, 'rules'), { recursive: true });
      await writeFile(join(templateDir, 'rules', 'myai-style.md'), '# My AI style\n');

      await writeFile(join(home, '.company-cc.json'), JSON.stringify({
        targets: {
          myai: {
            displayName: 'My AI Tool',
            userDest: customHome,
            instructionFile: 'MYAI.md',
            userSrcs: ['./myai-templates'],
            projectSrcs: [],
            requiredUserFiles: [],
          },
        },
      }));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user', '--target', 'myai']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(join(customHome, 'rules', 'myai-style.md')), true);

      const manifest = JSON.parse(await readFile(
        join(customHome, '.company-cc-myai-manifest.json'), 'utf8'
      ));
      assert.equal(manifest.target, 'myai');
      assert.match(manifest.files['rules/myai-style.md'].hash, /^sha256:/);
    });
  });
});

test('overlay: missing overlay path warns and continues', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await writeFile(
        join(home, '.company-cc.json'),
        JSON.stringify({ overlays: ['./no-such-overlay'] }),
      );

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['init', '--user']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /overlay not found/);
    });
  });
});

test('update creates a backup of the user profile before applying changes', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');
      const backupsDir = join(claudeDir, '.company-cc-backups');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      assert.equal(existsSync(backupsDir), false, 'no backup before first update');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['update']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.equal(existsSync(backupsDir), true, 'backup dir created after update');

      const entries = await import('node:fs/promises').then(m => m.readdir(backupsDir));
      assert.ok(entries.length >= 1, 'at least one backup exists');
    });
  });
});

test('rollback --list shows available backups', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      await withEnv({ HOME: home }, () => captureConsole(() => run(['update'])));

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['rollback', '--list']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /backup/i);
    });
  });
});

test('rollback dry-run shows files without restoring', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      await withEnv({ HOME: home }, () => captureConsole(() => run(['update'])));

      // delete a file after backup was created
      const target = join(claudeDir, 'settings.json');
      await rm(target);

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['rollback']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /would restore/);
      assert.equal(existsSync(target), false, 'dry-run must not restore files');
    });
  });
});

test('rollback --confirm restores files from the most recent backup', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const claudeDir = join(home, '.claude');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['init', '--user'])));
      const original = await readFile(join(claudeDir, 'settings.json'), 'utf8');

      await withEnv({ HOME: home }, () => captureConsole(() => run(['update'])));

      // corrupt the file after backup
      await writeFile(join(claudeDir, 'settings.json'), '{ "corrupted": true }');

      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['rollback', '--confirm']))
      );
      assert.equal(res.status, 0, res.stderr);
      assert.match(res.stdout, /restored/);
      assert.equal(await readFile(join(claudeDir, 'settings.json'), 'utf8'), original);
    });
  });
});

test('rollback warns when no backups exist', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      const res = await withEnv({ HOME: home }, () =>
        captureConsole(() => run(['rollback']))
      );
      assert.equal(res.status, 0);
      assert.match(res.stdout, /no backups found/);
    });
  });
});
