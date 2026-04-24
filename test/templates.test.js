import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, '..', 'templates');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    fm[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return fm;
}

async function findFiles(dir, predicate) {
  if (!existsSync(dir)) return [];
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...await findFiles(full, predicate));
    } else if (predicate(e.name)) {
      results.push(full);
    }
  }
  return results;
}

// ─── Skill frontmatter ───────────────────────────────────────────────────────

test('all SKILL.md files have required frontmatter (name, description, group)', async () => {
  const files = await findFiles(TEMPLATES, n => n === 'SKILL.md');
  assert.ok(files.length > 0, 'should find at least one SKILL.md');

  const problems = [];
  for (const file of files) {
    const rel = relative(TEMPLATES, file);
    const content = await readFile(file, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      problems.push(`${rel}: missing frontmatter block`);
      continue;
    }
    if (!fm.name || !fm.name.trim()) problems.push(`${rel}: missing "name"`);
    if (!fm.description || !fm.description.trim()) problems.push(`${rel}: missing "description"`);
    if (!fm.group || !fm.group.trim()) problems.push(`${rel}: missing "group" (required for skill grouping)`);
  }

  assert.deepEqual(problems, [], `SKILL.md frontmatter issues:\n${problems.join('\n')}`);
});

// ─── Command frontmatter ─────────────────────────────────────────────────────

test('all command .md files have required frontmatter (description)', async () => {
  const commandsDir = join(TEMPLATES, 'claude-user', 'commands');
  const files = await findFiles(commandsDir, n => n.endsWith('.md'));
  assert.ok(files.length > 0, 'should find at least one command .md');

  const problems = [];
  for (const file of files) {
    const rel = relative(TEMPLATES, file);
    const content = await readFile(file, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      problems.push(`${rel}: missing frontmatter block`);
      continue;
    }
    if (!fm.description || !fm.description.trim()) problems.push(`${rel}: missing "description"`);
    if ('allowed-tools' in fm && !fm['allowed-tools'].trim()) {
      problems.push(`${rel}: "allowed-tools" is empty — remove it or list the tools`);
    }
  }

  assert.deepEqual(problems, [], `command frontmatter issues:\n${problems.join('\n')}`);
});

// ─── Agent frontmatter ───────────────────────────────────────────────────────

test('all agent .md files have required frontmatter (name, description, tools, model)', async () => {
  const agentsDir = join(TEMPLATES, 'claude-user', 'agents');
  const files = await findFiles(agentsDir, n => n.endsWith('.md'));
  assert.ok(files.length > 0, 'should find at least one agent .md');

  const VALID_MODELS = new Set(['opus', 'sonnet', 'haiku']);
  const problems = [];

  for (const file of files) {
    const rel = relative(TEMPLATES, file);
    const content = await readFile(file, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) {
      problems.push(`${rel}: missing frontmatter block`);
      continue;
    }
    if (!fm.name || !fm.name.trim()) problems.push(`${rel}: missing "name"`);
    if (!fm.description || !fm.description.trim()) problems.push(`${rel}: missing "description"`);
    if (!fm.tools || !fm.tools.trim()) problems.push(`${rel}: missing "tools"`);
    if (!fm.model || !fm.model.trim()) {
      problems.push(`${rel}: missing "model"`);
    } else if (!VALID_MODELS.has(fm.model.trim())) {
      problems.push(`${rel}: "model" must be one of: ${[...VALID_MODELS].join(', ')} (got "${fm.model}")`);
    }
    if (fm.name && fm.name.trim() !== file.slice(file.lastIndexOf('/') + 1, -3)) {
      problems.push(`${rel}: "name" (${fm.name}) does not match filename`);
    }
  }

  assert.deepEqual(problems, [], `agent frontmatter issues:\n${problems.join('\n')}`);
});

// ─── @rule import resolution ─────────────────────────────────────────────────

test('@rule imports in instruction files resolve to actual template files', async () => {
  const instructionFiles = [
    join(TEMPLATES, 'claude-user', 'CLAUDE.md'),
    join(TEMPLATES, 'codex-user', 'AGENTS.md'),
  ];
  const rulesRoot = join(TEMPLATES, 'shared', 'rules');
  const problems = [];

  for (const filePath of instructionFiles) {
    if (!existsSync(filePath)) continue;
    const rel = relative(TEMPLATES, filePath);
    const content = await readFile(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^@(rules\/[\w.-]+\.md)/);
      if (!match) continue;
      const rulePath = match[1];
      const fullPath = join(rulesRoot, rulePath.replace('rules/', ''));
      if (!existsSync(fullPath)) {
        problems.push(`${rel}: @${rulePath} → not found`);
      }
    }
  }

  assert.deepEqual(problems, [], `broken @rule imports:\n${problems.join('\n')}`);
});

// ─── settings.json validity ──────────────────────────────────────────────────

test('claude settings.json is valid JSON with required "permissions" key', async () => {
  const settingsPath = join(TEMPLATES, 'claude-user', 'settings.json');
  assert.ok(existsSync(settingsPath), 'settings.json should exist');

  const raw = await readFile(settingsPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    assert.fail(`settings.json is not valid JSON: ${err.message}`);
  }

  assert.ok(
    parsed.permissions && typeof parsed.permissions === 'object',
    'settings.json must have a "permissions" object key',
  );
});
