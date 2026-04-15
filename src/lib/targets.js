import { join } from 'node:path';
import { homedir } from 'node:os';
import { TEMPLATES_ROOT } from './template.js';

export const DEFAULT_TARGET = 'claude';
export const TARGETS = ['claude', 'codex'];

export const MANIFEST_NAMES = {
  claude: '.company-cc-manifest.json',
  codex: '.company-cc-codex-manifest.json',
};

export function parseTargetFlag(value) {
  if (!value) return [DEFAULT_TARGET];
  if (value === 'both') return [...TARGETS];
  if (TARGETS.includes(value)) return [value];
  throw new Error(`Unknown target: ${value}. Use one of: claude, codex, both.`);
}

export function getTargetConfig(target) {
  switch (target) {
    case 'claude':
      return {
        target,
        displayName: 'Claude Code',
        userDest: join(homedir(), '.claude'),
        projectDest: process.cwd(),
        userManifestName: MANIFEST_NAMES.claude,
        projectManifestName: MANIFEST_NAMES.claude,
        userSrcs: [join(TEMPLATES_ROOT, 'shared'), join(TEMPLATES_ROOT, 'claude-user')],
        projectSrcs: [join(TEMPLATES_ROOT, 'claude-project')],
        requiredUserFiles: ['CLAUDE.md', 'settings.json', 'rules/coding-principles.md'],
      };
    case 'codex':
      return {
        target,
        displayName: 'Codex',
        userDest: process.env.CODEX_HOME || join(homedir(), '.codex'),
        projectDest: process.cwd(),
        userManifestName: MANIFEST_NAMES.codex,
        projectManifestName: MANIFEST_NAMES.codex,
        userSrcs: [join(TEMPLATES_ROOT, 'shared'), join(TEMPLATES_ROOT, 'codex-user')],
        projectSrcs: [join(TEMPLATES_ROOT, 'codex-project')],
        requiredUserFiles: ['AGENTS.md', 'rules/coding-principles.md'],
      };
    default:
      throw new Error(`Unsupported target: ${target}`);
  }
}
