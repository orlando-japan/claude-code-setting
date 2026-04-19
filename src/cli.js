#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { doctor } from './commands/doctor.js';
import { status } from './commands/status.js';
import { diff } from './commands/diff.js';
import { restore } from './commands/restore.js';
import { uninstall } from './commands/uninstall.js';
import { log } from './lib/log.js';

export const USAGE = `company-cc — AI coding harness installer

Usage:
  company-cc init [--user] [--project] [--extras] [--force] [--target <claude|codex|both>]
  company-cc update [--dry-run] [--force] [--target <claude|codex|both>]
  company-cc doctor [--target <claude|codex|both>]
  company-cc status [--target <claude|codex|both>]
  company-cc diff <path> [--target <claude|codex>]
  company-cc restore <path> [--target <claude|codex>] [--force]
  company-cc uninstall [--target <claude|codex|both>] [--confirm]

Options:
  --user       Install user-level assets to the selected target home
  --project    Install project-level assets to <cwd>
  --extras[=s1,s2]  Install opt-in skills: bare flag = all; =name,name = selected only
  --force      Overwrite locally modified files (default: skip with warning)
  --dry-run    Print what would change without touching files
  --confirm    For uninstall: actually remove files (default is dry-run)
  --target     Installation target (default: claude)
  -h, --help   Show this help
`;

const VALID_FLAGS = {
  init:      new Set(['user', 'project', 'extras', 'force', 'target', 'dry-run']),
  update:    new Set(['force', 'target', 'dry-run']),
  doctor:    new Set(['target']),
  status:    new Set(['target']),
  diff:      new Set(['target']),
  restore:   new Set(['target', 'force']),
  uninstall: new Set(['target', 'confirm']),
};

export function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      flags[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--') && key === 'target') {
      flags[key] = next;
      i++;
      continue;
    }
    flags[key] = true;
  }
  return flags;
}

export async function run(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  const flags = parseFlags(rest);

  // positional args: non-flag tokens that weren't consumed as flag values
  const positional = rest.filter((token, i) => {
    if (token.startsWith('-')) return false;
    return rest[i - 1] !== '--target';
  });

  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(USAGE);
    return 0;
  }

  const knownFlags = VALID_FLAGS[cmd];
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (!knownFlags.has(key)) {
        log.error(`Unknown flag: --${key}`);
        console.log(USAGE);
        return 1;
      }
    }
  }

  try {
    switch (cmd) {
      case 'init':
        await init(flags);
        return 0;
      case 'update':
        await update(flags);
        return 0;
      case 'doctor':
        await doctor(flags);
        return 0;
      case 'status':
        await status(flags);
        return 0;
      case 'diff':
        return await diff(flags, positional);
      case 'restore':
        return await restore(flags, positional);
      case 'uninstall':
        await uninstall(flags);
        return 0;
      default:
        log.error(`Unknown command: ${cmd}`);
        console.log(USAGE);
        return 1;
    }
  } catch (err) {
    log.error(err.message);
    if (process.env.DEBUG) console.error(err.stack);
    return 1;
  }
}

async function main() {
  const exitCode = await run();
  if (exitCode !== 0) process.exit(exitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
