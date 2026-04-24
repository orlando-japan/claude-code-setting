import { join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export const SKILL_GROUPS = ['core', 'review', 'workflow', 'design', 'ops', 'dx'];

/** Parse YAML frontmatter from a SKILL.md file. Returns {} if not found. */
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    meta[key] = val.startsWith('[') ? val.slice(1, -1).split(',').map(s => s.trim()) : val;
  }
  return meta;
}

/** Read metadata from a skill directory (must contain SKILL.md). */
export async function readSkillMeta(skillDir) {
  const skillPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillPath)) return null;
  const text = await readFile(skillPath, 'utf8');
  return parseFrontmatter(text);
}

/** List all skills under extrasSkillsDir with their metadata. Returns Map<name, meta>. */
export async function listAllSkills(extrasSkillsDir) {
  const result = new Map();
  if (!existsSync(extrasSkillsDir)) return result;
  const entries = await readdir(extrasSkillsDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const meta = await readSkillMeta(join(extrasSkillsDir, e.name));
    if (meta) result.set(e.name, meta);
  }
  return result;
}

/**
 * Resolve --extras input into a list of skill directory names.
 *
 * selection: true (all), string "core,code-review", or string[]
 * Returns deduplicated string[] of skill names.
 * Throws on unknown group or skill name.
 */
export async function resolveSkillNames(selection, extrasSkillsDir) {
  const allSkills = await listAllSkills(extrasSkillsDir);
  if (!allSkills.size) return [];
  if (selection === true) return [...allSkills.keys()];

  // Build group → skill names map
  const byGroup = new Map();
  for (const [name, meta] of allSkills) {
    const g = meta.group;
    if (!g) continue;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(name);
  }

  const tokens = Array.isArray(selection)
    ? selection
    : String(selection).split(',').map(s => s.trim()).filter(Boolean);

  const resolved = new Set();
  const unknown = [];

  for (const token of tokens) {
    if (byGroup.has(token)) {
      for (const name of byGroup.get(token)) resolved.add(name);
    } else if (allSkills.has(token)) {
      resolved.add(token);
    } else {
      unknown.push(token);
    }
  }

  if (unknown.length > 0) {
    const groups = [...byGroup.keys()].sort().join(', ');
    const skills = [...allSkills.keys()].sort().join(', ');
    throw new Error(
      `Unknown skill or group: ${unknown.join(', ')}\nAvailable groups: ${groups}\nAvailable skills: ${skills}`
    );
  }

  return [...resolved];
}

/**
 * Filter a file list to include only selected skills (from the extra dir).
 * Non-skill files pass through unchanged.
 */
export function filterSkillFiles(files, selectedSkills) {
  return files.filter(rel =>
    !rel.startsWith('skills/') ||
    selectedSkills.some(name => rel.startsWith(`skills/${name}/`))
  );
}

/**
 * Build a grouped catalog for display.
 * Returns array of { group, skills: [{ name, description, installed }] }
 * sorted by SKILL_GROUPS order.
 */
export function buildCatalog(allSkills, installedNames) {
  const installed = new Set(installedNames);
  const byGroup = new Map();

  for (const [name, meta] of allSkills) {
    const g = meta.group || 'other';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push({ name, description: meta.description || '', installed: installed.has(name) });
  }

  // Sort groups: known order first, then any extras
  const order = [...SKILL_GROUPS, ...[...byGroup.keys()].filter(g => !SKILL_GROUPS.includes(g)).sort()];
  return order
    .filter(g => byGroup.has(g))
    .map(g => ({ group: g, skills: byGroup.get(g).sort((a, b) => a.name.localeCompare(b.name)) }));
}
