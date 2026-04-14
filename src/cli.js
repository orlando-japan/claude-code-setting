#!/usr/bin/env node
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { doctor } from './commands/doctor.js';
import { log } from './lib/log.js';

const USAGE = `company-cc — Claude Code harness installer

Usage:
  company-cc init [--user] [--project] [--extras] [--force]
  company-cc update [--dry-run] [--force]
  company-cc doctor

Options:
  --user       Install user-level assets to ~/.claude/
  --project    Install project-level assets to <cwd>/.claude/ and CLAUDE.md
  --extras     Also install opt-in advanced skills (ops, frontend, infra, evals)
  --force      Overwrite locally modified files (default: skip with warning)
  --dry-run    Print what would change without touching files
  -h, --help   Show this help
`;

function parseFlags(argv) {
  const flags = {};
  for (const a of argv) {
    if (a.startsWith('--')) flags[a.slice(2)] = true;
  }
  return flags;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const flags = parseFlags(rest);

  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(USAGE);
    return;
  }

  try {
    switch (cmd) {
      case 'init':
        await init(flags);
        break;
      case 'update':
        await update(flags);
        break;
      case 'doctor':
        await doctor(flags);
        break;
      default:
        log.error(`Unknown command: ${cmd}`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (err) {
    log.error(err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
