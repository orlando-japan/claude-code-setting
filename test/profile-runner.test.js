import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TEMPLATES_ROOT, readManifest, hashBuffer } from '../src/lib/template.js';
import { MANIFEST_NAMES } from '../src/lib/targets.js';
import { applyProfileSources, finalizeProfileManifest, formatCounts } from '../src/lib/profile-runner.js';

async function withFixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'company-cc-runner-'));
  try {
    const srcRoot = join(root, 'src');
    const destRoot = join(root, 'dest');
    await mkdir(srcRoot, { recursive: true });
    await mkdir(destRoot, { recursive: true });
    await fn({ root, srcRoot, destRoot });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function silentConsole(fn) {
  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

test('applyProfileSources counts created, updated, unchanged, and skipped-modified', async () => {
  await withFixture(async ({ srcRoot, destRoot }) => {
    await mkdir(join(srcRoot, 'rules'), { recursive: true });
    await writeFile(join(srcRoot, 'rules', 'created.md'), '# created\n');
    await writeFile(join(srcRoot, 'rules', 'updated.md'), '# upstream update\n');
    await writeFile(join(srcRoot, 'rules', 'unchanged.md'), '# same\n');
    await writeFile(join(srcRoot, 'rules', 'skipped.md'), '# upstream skipped\n');

    await mkdir(join(destRoot, 'rules'), { recursive: true });
    await writeFile(join(destRoot, 'rules', 'updated.md'), '# old\n');
    await writeFile(join(destRoot, 'rules', 'unchanged.md'), '# same\n');
    await writeFile(join(destRoot, 'rules', 'skipped.md'), '# local edit\n');

    const manifest = await readManifest(destRoot, MANIFEST_NAMES.claude);
    manifest.files['rules/updated.md'] = {
      hash: hashBuffer(Buffer.from('# old\n')),
      source: srcRoot,
    };
    manifest.files['rules/unchanged.md'] = {
      hash: hashBuffer(Buffer.from('# same\n')),
      source: srcRoot,
    };
    manifest.files['rules/skipped.md'] = {
      hash: hashBuffer(Buffer.from('# older upstream\n')),
      source: srcRoot,
    };

    const counts = await silentConsole(() => applyProfileSources({
      srcRoots: [srcRoot],
      destRoot,
      manifest,
      selectedExtras: null,
      force: false,
      dryRun: false,
      skippedModifiedMessage: 'skipped: ',
    }));

    assert.deepEqual(counts, {
      created: 1,
      updated: 1,
      unchanged: 1,
      'skipped-modified': 1,
    });
    assert.equal(await readFile(join(destRoot, 'rules', 'created.md'), 'utf8'), '# created\n');
    assert.equal(await readFile(join(destRoot, 'rules', 'updated.md'), 'utf8'), '# upstream update\n');
    assert.equal(await readFile(join(destRoot, 'rules', 'unchanged.md'), 'utf8'), '# same\n');
    assert.equal(await readFile(join(destRoot, 'rules', 'skipped.md'), 'utf8'), '# local edit\n');
  });
});

test('applyProfileSources filters extra skills to selectedExtras only', async () => {
  await withFixture(async ({ destRoot }) => {
    const manifest = await readManifest(destRoot, MANIFEST_NAMES.claude);
    const extraRoot = join(TEMPLATES_ROOT, 'extra');

    const counts = await silentConsole(() => applyProfileSources({
      srcRoots: [extraRoot],
      destRoot,
      manifest,
      selectedExtras: ['think-before-coding'],
      force: false,
      dryRun: false,
      skippedModifiedMessage: 'skipped: ',
    }));

    assert.ok(counts.created > 0);
    assert.equal(existsSync(join(destRoot, 'skills', 'think-before-coding', 'SKILL.md')), true);
    assert.equal(existsSync(join(destRoot, 'skills', 'code-review', 'SKILL.md')), false);
  });
});

test('finalizeProfileManifest writes manifest metadata and user extras', async () => {
  await withFixture(async ({ destRoot }) => {
    const manifest = { version: '0.0.0', installed: 'old', files: {} };

    await finalizeProfileManifest({
      manifest,
      target: 'codex',
      profileName: 'user',
      selectedExtras: ['think-before-coding'],
      destRoot,
      manifestName: MANIFEST_NAMES.codex,
      dryRun: false,
    });

    const written = JSON.parse(await readFile(join(destRoot, MANIFEST_NAMES.codex), 'utf8'));
    assert.equal(written.target, 'codex');
    assert.equal(written.version, '0.6.0');
    assert.ok(typeof written.installed === 'string' && written.installed.length > 10);
    assert.deepEqual(written.extras, ['think-before-coding']);
  });
});

test('finalizeProfileManifest dry-run mutates memory but does not write file, and project profile skips extras', async () => {
  await withFixture(async ({ destRoot }) => {
    const manifest = { version: '0.0.0', installed: 'old', files: {} };

    await finalizeProfileManifest({
      manifest,
      target: 'claude',
      profileName: 'project',
      selectedExtras: ['should-not-stick'],
      destRoot,
      manifestName: MANIFEST_NAMES.claude,
      dryRun: true,
    });

    assert.equal(manifest.target, 'claude');
    assert.equal(manifest.version, '0.6.0');
    assert.equal(manifest.extras, undefined);
    assert.equal(existsSync(join(destRoot, MANIFEST_NAMES.claude)), false);
  });
});

test('formatCounts renders removed suffix only when needed', () => {
  assert.equal(
    formatCounts({ created: 1, updated: 2, unchanged: 3, 'skipped-modified': 4 }),
    '1 created, 2 updated, 3 unchanged, 4 skipped'
  );
  assert.equal(
    formatCounts({ created: 1, updated: 2, unchanged: 3, 'skipped-modified': 4 }, 5),
    '1 created, 2 updated, 3 unchanged, 4 skipped, 5 removed'
  );
});
