import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildInitPlans, buildUpdatePlans } from '../src/lib/profile-plans.js';
import { MANIFEST_NAMES } from '../src/lib/targets.js';

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

test('buildInitPlans creates codex user and project plans with overlays and extras', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async (cwd) => {
      await withEnv({ HOME: home, CODEX_HOME: join(home, '.codex-custom') }, async () => {
        const plans = buildInitPlans({
          flags: { target: 'codex' },
          selectedExtras: ['core-skill'],
          userOverlays: ['/overlay/user'],
          projectOverlays: ['/overlay/project'],
        });

        assert.equal(plans.length, 2);
        const userPlan = plans.find((plan) => plan.profileName === 'user');
        const projectPlan = plans.find((plan) => plan.profileName === 'project');

        assert.ok(userPlan);
        assert.equal(userPlan.target, 'codex');
        assert.equal(userPlan.destRoot, join(home, '.codex-custom'));
        assert.equal(userPlan.manifestName, MANIFEST_NAMES.codex);
        assert.deepEqual(userPlan.selectedExtras, ['core-skill']);
        assert.ok(userPlan.srcRoots.some((src) => src.endsWith('templates/shared')));
        assert.ok(userPlan.srcRoots.some((src) => src.endsWith('templates/codex-user')));
        assert.ok(userPlan.srcRoots.some((src) => src.endsWith('templates/extra')));
        assert.ok(userPlan.srcRoots.includes('/overlay/user'));

        assert.ok(projectPlan);
        assert.equal(projectPlan.target, 'codex');
        assert.equal(projectPlan.destRoot, cwd);
        assert.equal(projectPlan.manifestName, MANIFEST_NAMES.codex);
        assert.equal(projectPlan.selectedExtras, null);
        assert.ok(projectPlan.srcRoots.some((src) => src.endsWith('templates/codex-project')));
        assert.ok(projectPlan.srcRoots.includes('/overlay/project'));
      });
    });
  });
});

test('buildUpdatePlans returns warning and empty plans when selected target has no manifests', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, async () => {
        const { plans, warnings, targetLabel } = await buildUpdatePlans({
          flags: { target: 'claude' },
          userOverlays: [],
          projectOverlays: [],
        });

        assert.equal(targetLabel, 'claude');
        assert.deepEqual(plans, []);
        assert.deepEqual(warnings, []);
      });
    });
  });
});

test('buildUpdatePlans migrates pre-0.3.0 extras manifests to full install plan', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async () => {
      await withEnv({ HOME: home }, async () => {
        const claudeDir = join(home, '.claude');
        await mkdir(claudeDir, { recursive: true });
        await writeFile(join(claudeDir, MANIFEST_NAMES.claude), JSON.stringify({
          version: '0.2.9',
          extras: ['jira', 'linear'],
          files: {},
        }));

        const { plans, warnings } = await buildUpdatePlans({
          flags: { target: 'claude' },
          userOverlays: ['/overlay/user'],
          projectOverlays: [],
        });

        assert.equal(plans.length, 1);
        const userPlan = plans[0];
        assert.equal(userPlan.profileName, 'user');
        assert.equal(userPlan.needsBackup, true);
        assert.ok(Array.isArray(userPlan.selectedExtras));
        assert.ok(userPlan.selectedExtras.length > 10);
        assert.ok(userPlan.srcRoots.some((src) => src.endsWith('templates/extra')));
        assert.ok(userPlan.srcRoots.includes('/overlay/user'));
        assert.ok(warnings.includes('  Migrating pre-0.3.0 extras format → installing all skills'));
      });
    });
  });
});

test('buildUpdatePlans includes project plan when only project manifest exists', async () => {
  await withTempHome(async (home) => {
    await withTempCwd(async (cwd) => {
      await withEnv({ HOME: home }, async () => {
        await writeFile(join(cwd, MANIFEST_NAMES.codex), JSON.stringify({ version: '0.6.0', files: {} }));

        const { plans, warnings, targetLabel } = await buildUpdatePlans({
          flags: { target: 'codex' },
          userOverlays: [],
          projectOverlays: ['/overlay/project'],
        });

        assert.equal(targetLabel, 'codex');
        assert.equal(warnings.length, 0);
        assert.equal(plans.length, 1);
        const projectPlan = plans[0];
        assert.equal(projectPlan.profileName, 'project');
        assert.equal(projectPlan.destRoot, cwd);
        assert.equal(projectPlan.needsBackup, false);
        assert.equal(projectPlan.selectedExtras, null);
        assert.ok(projectPlan.srcRoots.includes('/overlay/project'));
      });
    });
  });
});
