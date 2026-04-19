import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyTemplateFile, readManifest } from '../src/lib/template.js';
import { MANIFEST_NAMES } from '../src/lib/targets.js';

async function makeFixture() {
  const root = await mkdtemp(join(tmpdir(), 'company-cc-test-'));
  const srcRoot = join(root, 'src');
  const destRoot = join(root, 'dest');
  await mkdir(srcRoot, { recursive: true });
  await mkdir(destRoot, { recursive: true });
  return { root, srcRoot, destRoot };
}

test('applyTemplateFile creates a missing file and records hash', async () => {
  const { srcRoot, destRoot } = await makeFixture();
  const rel = 'rules/example.md';
  await mkdir(join(srcRoot, 'rules'), { recursive: true });
  await writeFile(join(srcRoot, rel), '# example\n');

  const manifest = await readManifest(destRoot, MANIFEST_NAMES.claude);
  const result = await applyTemplateFile(srcRoot, destRoot, rel, manifest, {});

  assert.equal(result, 'created');
  assert.equal(existsSync(join(destRoot, rel)), true);
  assert.match(manifest.files[rel].hash, /^sha256:/);
  assert.equal(manifest.files[rel].source, srcRoot);
});

test('applyTemplateFile skips locally modified files without --force', async () => {
  const { srcRoot, destRoot } = await makeFixture();
  const rel = 'rules/example.md';
  await mkdir(join(srcRoot, 'rules'), { recursive: true });
  await mkdir(join(destRoot, 'rules'), { recursive: true });

  await writeFile(join(srcRoot, rel), '# upstream\n');
  await writeFile(join(destRoot, rel), '# local edit\n');

  const manifest = {
    version: '0.1.0',
    installed: new Date().toISOString(),
    files: {
      [rel]: 'sha256:oldhash',
    },
  };

  const result = await applyTemplateFile(srcRoot, destRoot, rel, manifest, {});
  const content = await readFile(join(destRoot, rel), 'utf8');

  assert.equal(result, 'skipped-modified');
  assert.equal(content, '# local edit\n');
});

test('applyTemplateFile updates locally modified files with --force', async () => {
  const { srcRoot, destRoot } = await makeFixture();
  const rel = 'rules/example.md';
  await mkdir(join(srcRoot, 'rules'), { recursive: true });
  await mkdir(join(destRoot, 'rules'), { recursive: true });

  await writeFile(join(srcRoot, rel), '# upstream\n');
  await writeFile(join(destRoot, rel), '# local edit\n');

  const manifest = {
    version: '0.1.0',
    installed: new Date().toISOString(),
    files: {
      [rel]: 'sha256:oldhash',
    },
  };

  const result = await applyTemplateFile(srcRoot, destRoot, rel, manifest, { force: true });
  const content = await readFile(join(destRoot, rel), 'utf8');

  assert.equal(result, 'updated');
  assert.equal(content, '# upstream\n');
  assert.match(manifest.files[rel].hash, /^sha256:/);
  assert.equal(manifest.files[rel].source, srcRoot);
});
