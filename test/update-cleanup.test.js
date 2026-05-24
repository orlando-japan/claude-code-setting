import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { removeStaleSkills } from '../src/lib/update-cleanup.js';

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'company-cc-cleanup-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('removeStaleSkills removes stale skill files and updates manifest in memory', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, 'skills', 'keep-skill'), { recursive: true });
    await mkdir(join(dir, 'skills', 'drop-skill'), { recursive: true });
    await writeFile(join(dir, 'skills', 'keep-skill', 'SKILL.md'), '# keep');
    await writeFile(join(dir, 'skills', 'drop-skill', 'SKILL.md'), '# drop');

    const manifest = {
      files: {
        'skills/keep-skill/SKILL.md': { hash: 'sha256:keep' },
        'skills/drop-skill/SKILL.md': { hash: 'sha256:drop' },
        'AGENTS.md': { hash: 'sha256:agents' },
      },
    };

    const removed = await removeStaleSkills(dir, ['keep-skill'], manifest, false);

    assert.equal(removed, 1);
    assert.equal(existsSync(join(dir, 'skills', 'drop-skill', 'SKILL.md')), false);
    assert.equal(existsSync(join(dir, 'skills', 'keep-skill', 'SKILL.md')), true);
    assert.ok(!manifest.files['skills/drop-skill/SKILL.md']);
    assert.ok(manifest.files['skills/keep-skill/SKILL.md']);
    assert.equal(await readFile(join(dir, 'skills', 'keep-skill', 'SKILL.md'), 'utf8'), '# keep');
  });
});

test('removeStaleSkills dry-run reports count but keeps files and manifest entries', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, 'skills', 'drop-skill'), { recursive: true });
    await writeFile(join(dir, 'skills', 'drop-skill', 'SKILL.md'), '# drop');

    const manifest = {
      files: {
        'skills/drop-skill/SKILL.md': { hash: 'sha256:drop' },
      },
    };

    const removed = await removeStaleSkills(dir, [], manifest, true);

    assert.equal(removed, 1);
    assert.equal(existsSync(join(dir, 'skills', 'drop-skill', 'SKILL.md')), true);
    assert.ok(manifest.files['skills/drop-skill/SKILL.md']);
  });
});
